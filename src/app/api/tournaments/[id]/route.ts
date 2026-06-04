import { NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDbAsync();

        const tournament = db.prepare(`SELECT t.*, g.name as game_name, g.icon as game_icon, u.username as organizer_name
      FROM tournaments t JOIN games g ON t.game_id = g.id JOIN users u ON t.organizer_id = u.id
      WHERE t.id = ?`).get(id);

        if (!tournament) return NextResponse.json({ success: false, error: 'Tournament tidak ditemukan' }, { status: 404 });

        const participants = db.prepare(`SELECT tp.*, u.username, u.avatar
      FROM tournament_participants tp JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ? ORDER BY tp.seed`).all(id);

        const matches = db.prepare('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, match_number').all(id) as Array<Record<string, unknown>>;

        // Enrich matches with player names
        const pMap = new Map((participants as Array<{ user_id: string; username: string }>).map(p => [p.user_id, p.username]));
        const enrichedMatches = matches.map(m => ({
            ...m,
            player1_name: pMap.get(m.player1_id as string) || (m.player1_id ? 'Unknown' : null),
            player2_name: pMap.get(m.player2_id as string) || (m.player2_id ? 'Unknown' : null),
            winner_name: pMap.get(m.winner_id as string) || null,
        }));

        return NextResponse.json({ success: true, data: { ...tournament as object, participants, matches: enrichedMatches } });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Register for tournament
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const db = await getDbAsync();

        const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as Record<string, unknown>;
        if (!tournament) return NextResponse.json({ success: false, error: 'Tournament tidak ditemukan' }, { status: 404 });
        if (tournament.status !== 'registration') return NextResponse.json({ success: false, error: 'Pendaftaran sudah ditutup' }, { status: 400 });
        if ((tournament.current_participants as number) >= (tournament.max_participants as number)) return NextResponse.json({ success: false, error: 'Tournament sudah penuh' }, { status: 400 });

        const existing = db.prepare('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?').get(id, user.id);
        if (existing) return NextResponse.json({ success: false, error: 'Kamu sudah terdaftar' }, { status: 400 });

        // Check entry fee
        const fee = tournament.entry_fee as number;
        if (fee > 0) {
            if (user.arcadia_points < fee) return NextResponse.json({ success: false, error: 'Arcadia Points tidak cukup' }, { status: 400 });
            db.prepare('UPDATE users SET arcadia_points = arcadia_points - ? WHERE id = ?').run(fee, user.id);
            const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(user.id) as { id: string };
            if (wallet) {
                db.prepare('UPDATE wallets SET balance = balance - ? WHERE user_id = ?').run(fee, user.id);
                db.prepare('INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), wallet.id, 'spend', fee, `Entry fee: ${tournament.name}`, 'tournament', id);
            }
        }

        const seed = (tournament.current_participants as number) + 1;
        db.prepare('INSERT INTO tournament_participants (id, tournament_id, user_id, seed) VALUES (?, ?, ?, ?)').run(uuidv4(), id, user.id, seed);
        db.prepare('UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = ?').run(id);

        return NextResponse.json({ success: true, message: 'Berhasil mendaftar tournament!' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Admin: Start tournament / generate bracket
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return NextResponse.json({ success: false, error: 'Hanya admin yang bisa memulai tournament' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const action = (body as { action?: string }).action || 'start';
        const db = await getDbAsync();

        const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as Record<string, unknown>;
        if (!tournament) return NextResponse.json({ success: false, error: 'Tournament tidak ditemukan' }, { status: 404 });

        if (action === 'start') {
            if (tournament.status === 'ongoing') return NextResponse.json({ success: false, error: 'Tournament sudah berjalan' }, { status: 400 });
            if (tournament.status === 'completed') return NextResponse.json({ success: false, error: 'Tournament sudah selesai' }, { status: 400 });

            const participants = db.prepare('SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY seed')
                .all(id) as Array<{ user_id: string; seed: number }>;

            if (participants.length < 2) {
                return NextResponse.json({ success: false, error: 'Minimal 2 peserta untuk memulai tournament' }, { status: 400 });
            }

            // Clear existing matches
            db.prepare('DELETE FROM matches WHERE tournament_id = ?').run(id);

            const format = tournament.format as string;
            const now = new Date();

            if (format === 'single_elimination' || format === 'double_elimination') {
                generateEliminationBracket(db, id as string, participants, now, format === 'double_elimination');
            } else if (format === 'battle_royale') {
                generateBattleRoyaleMatches(db, id as string, participants, now);
            } else if (format === 'round_robin') {
                generateRoundRobinMatches(db, id as string, participants, now);
            } else if (format === 'time_trial') {
                generateTimeTrialMatches(db, id as string, participants, now);
            } else {
                // fallback: single elimination
                generateEliminationBracket(db, id as string, participants, now, false);
            }

            // Update tournament status
            db.prepare('UPDATE tournaments SET status = ?, start_date = ? WHERE id = ?')
                .run('ongoing', now.toISOString(), id);

            // Update all participants to checked_in
            db.prepare('UPDATE tournament_participants SET status = ? WHERE tournament_id = ? AND status = ?')
                .run('checked_in', id, 'registered');

            return NextResponse.json({ success: true, message: 'Tournament berhasil dimulai! Bracket sudah di-generate.' });
        }

        return NextResponse.json({ success: false, error: 'Action tidak dikenal' }, { status: 400 });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ─── Bracket Generators ───

interface Participant { user_id: string; seed: number }
interface CompatDb {
    prepare(sql: string): { run(...args: unknown[]): void; all(...args: unknown[]): unknown[]; get(...args: unknown[]): unknown };
}

function generateEliminationBracket(db: CompatDb, tournamentId: string, participants: Participant[], startTime: Date, isDouble: boolean) {
    // Shuffle participants by seed but add some randomness to pairings
    const players = [...participants];
    const numPlayers = players.length;

    // Find next power of 2
    let bracketSize = 1;
    while (bracketSize < numPlayers) bracketSize *= 2;

    const totalRounds = Math.log2(bracketSize);
    const firstRoundMatches = bracketSize / 2;

    // Generate Round 1 matches with real players + byes
    for (let m = 0; m < firstRoundMatches; m++) {
        const p1Idx = m;
        const p2Idx = bracketSize - 1 - m; // seeded pairing (1 vs last, 2 vs 2nd-last, etc.)

        const p1 = p1Idx < numPlayers ? players[p1Idx].user_id : null;
        const p2 = p2Idx < numPlayers ? players[p2Idx].user_id : null;

        // Schedule: space matches 30 min apart within the round
        const matchTime = new Date(startTime.getTime() + m * 30 * 60000);

        // If one player is null (bye), auto-advance the other
        const isBye = !p1 || !p2;
        const winner = isBye ? (p1 || p2) : null;
        const status = isBye ? 'completed' : 'pending';

        db.prepare('INSERT INTO matches (id, tournament_id, round, match_number, player1_id, player2_id, winner_id, score1, score2, status, scheduled_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), tournamentId, 1, m + 1, p1, p2, winner, isBye ? 1 : null, isBye ? 0 : null, status, matchTime.toISOString(), isBye ? matchTime.toISOString() : null);
    }

    // Generate empty subsequent rounds
    for (let r = 2; r <= totalRounds; r++) {
        const matchesInRound = bracketSize / Math.pow(2, r);
        const roundTime = new Date(startTime.getTime() + (r - 1) * 24 * 3600000); // 1 day between rounds
        for (let m = 0; m < matchesInRound; m++) {
            const matchTime = new Date(roundTime.getTime() + m * 30 * 60000);
            db.prepare('INSERT INTO matches (id, tournament_id, round, match_number, player1_id, player2_id, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), tournamentId, r, m + 1, null, null, 'pending', matchTime.toISOString());
        }
    }

    // For double elimination: add loser bracket rounds
    if (isDouble && totalRounds > 1) {
        const loserRounds = (totalRounds - 1) * 2;
        for (let r = 1; r <= loserRounds; r++) {
            const matchesInRound = Math.max(1, Math.ceil(firstRoundMatches / Math.pow(2, Math.ceil(r / 2))));
            const roundTime = new Date(startTime.getTime() + (totalRounds + r) * 24 * 3600000);
            for (let m = 0; m < matchesInRound; m++) {
                const matchTime = new Date(roundTime.getTime() + m * 30 * 60000);
                db.prepare('INSERT INTO matches (id, tournament_id, round, match_number, player1_id, player2_id, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                    .run(uuidv4(), tournamentId, totalRounds + r, m + 1, null, null, 'pending', matchTime.toISOString());
            }
        }
        // Grand final
        const gfTime = new Date(startTime.getTime() + (totalRounds + loserRounds + 1) * 24 * 3600000);
        db.prepare('INSERT INTO matches (id, tournament_id, round, match_number, player1_id, player2_id, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), tournamentId, totalRounds + loserRounds + 1, 1, null, null, 'pending', gfTime.toISOString());
    }
}

function generateBattleRoyaleMatches(db: CompatDb, tournamentId: string, participants: Participant[], startTime: Date) {
    // Battle Royale: multiple rounds, all players compete in each round
    const numRounds = 3;
    for (let r = 1; r <= numRounds; r++) {
        const roundTime = new Date(startTime.getTime() + (r - 1) * 2 * 3600000); // 2 hours between rounds
        // Create one "match" per round representing the lobby
        db.prepare('INSERT INTO matches (id, tournament_id, round, match_number, player1_id, player2_id, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), tournamentId, r, 1, 'LOBBY', `${participants.length} participants`, 'pending', roundTime.toISOString());
    }
}

function generateRoundRobinMatches(db: CompatDb, tournamentId: string, participants: Participant[], startTime: Date) {
    // Round Robin: every participant plays against every other
    const players = [...participants];
    let roundNum = 1;
    const matchesPerDay = 4;
    let matchCount = 0;

    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            matchCount++;
            const dayOffset = Math.floor((matchCount - 1) / matchesPerDay);
            const matchInDay = (matchCount - 1) % matchesPerDay;
            const matchTime = new Date(startTime.getTime() + dayOffset * 24 * 3600000 + matchInDay * 60 * 60000);

            if (matchCount > 1 && (matchCount - 1) % matchesPerDay === 0) roundNum++;

            db.prepare('INSERT INTO matches (id, tournament_id, round, match_number, player1_id, player2_id, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), tournamentId, roundNum, matchInDay + 1, players[i].user_id, players[j].user_id, 'pending', matchTime.toISOString());
        }
    }
}

function generateTimeTrialMatches(db: CompatDb, tournamentId: string, participants: Participant[], startTime: Date) {
    // Time Trial: each participant has a slot to perform their run
    for (let i = 0; i < participants.length; i++) {
        const slotTime = new Date(startTime.getTime() + i * 15 * 60000); // 15 min per slot
        db.prepare('INSERT INTO matches (id, tournament_id, round, match_number, player1_id, player2_id, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), tournamentId, 1, i + 1, participants[i].user_id, null, 'pending', slotTime.toISOString());
    }
}
