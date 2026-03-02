import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();

        const tournament = db.prepare(`SELECT t.*, g.name as game_name, g.icon as game_icon, u.username as organizer_name
      FROM tournaments t JOIN games g ON t.game_id = g.id JOIN users u ON t.organizer_id = u.id
      WHERE t.id = ?`).get(id);

        if (!tournament) return NextResponse.json({ success: false, error: 'Tournament tidak ditemukan' }, { status: 404 });

        const participants = db.prepare(`SELECT tp.*, u.username, u.avatar
      FROM tournament_participants tp JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ? ORDER BY tp.seed`).all(id);

        const matches = db.prepare('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, match_number').all(id);

        return NextResponse.json({ success: true, data: { ...tournament as object, participants, matches } });
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
        const db = getDb();

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
