import { NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const db = await getDbAsync();
        const userGames = db.prepare(`SELECT ug.*, g.name as game_name, g.icon as game_icon, g.slug,
      r.name as rank_name, r.icon as rank_icon, r.tier,
      gr.name as role_name, gr.icon as role_icon
      FROM user_games ug
      JOIN games g ON ug.game_id = g.id
      LEFT JOIN ranks r ON ug.rank_id = r.id
      LEFT JOIN game_roles gr ON ug.role_id = gr.id
      WHERE ug.user_id = ?`).all(user.id);

        const partiesJoined = db.prepare('SELECT COUNT(*) as count FROM party_members WHERE user_id = ?').get(user.id) as { count: number };
        const tournamentsPlayed = db.prepare('SELECT COUNT(*) as count FROM tournament_participants WHERE user_id = ?').get(user.id) as { count: number };
        const tournamentsWon = db.prepare("SELECT COUNT(*) as count FROM tournament_participants WHERE user_id = ? AND status = 'winner'").get(user.id) as { count: number };

        const ratings = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM user_ratings WHERE rated_id = ?').get(user.id) as { avg_rating: number; count: number };

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: user.id, username: user.username, email: user.email, avatar: user.avatar,
                    role: user.role, arcadia_points: user.arcadia_points, reputation_score: user.reputation_score,
                    referral_code: user.referral_code, created_at: user.created_at, rename_count: user.rename_count || 0,
                },
                games: userGames,
                stats: {
                    parties_joined: partiesJoined.count,
                    tournaments_played: tournamentsPlayed.count,
                    tournaments_won: tournamentsWon.count,
                    win_rate: tournamentsPlayed.count > 0 ? Math.round((tournamentsWon.count / tournamentsPlayed.count) * 100) : 0,
                    avg_rating: ratings.avg_rating ? Number(ratings.avg_rating.toFixed(1)) : 5.0,
                    total_ratings: ratings.count,
                },
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Update profile (add/update games)
export async function PUT(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const { games, avatar } = await req.json();
        const db = await getDbAsync();

        // Update avatar if provided
        if (avatar && typeof avatar === 'string' && avatar.startsWith('/avatars/')) {
            db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, user.id);
        }

        if (games && Array.isArray(games)) {
            // Clear existing and re-insert
            db.prepare('DELETE FROM user_games WHERE user_id = ?').run(user.id);
            const insert = db.prepare('INSERT INTO user_games (id, user_id, game_id, rank_id, role_id, is_favorite) VALUES (?, ?, ?, ?, ?, ?)');
            for (const g of games) {
                insert.run(uuidv4(), user.id, g.game_id, g.rank_id || null, g.role_id || null, g.is_favorite ? 1 : 0);
            }
        }

        return NextResponse.json({ success: true, message: 'Profil berhasil diperbarui' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Rename username
export async function PATCH(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const { username } = await req.json();
        if (!username || typeof username !== 'string') {
            return NextResponse.json({ success: false, error: 'Username wajib diisi' }, { status: 400 });
        }

        const trimmed = username.trim();
        if (trimmed.length < 3) return NextResponse.json({ success: false, error: 'Username minimal 3 karakter' }, { status: 400 });
        if (trimmed.length > 20) return NextResponse.json({ success: false, error: 'Username maksimal 20 karakter' }, { status: 400 });
        if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) return NextResponse.json({ success: false, error: 'Username hanya boleh berisi huruf, angka, spasi, dan underscore' }, { status: 400 });
        if (trimmed === user.username) return NextResponse.json({ success: false, error: 'Username sama dengan yang sekarang' }, { status: 400 });

        const db = await getDbAsync();

        // Check if username is taken
        const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(trimmed, user.id);
        if (existing) return NextResponse.json({ success: false, error: 'Username sudah digunakan' }, { status: 400 });

        const renameCount = (user as Record<string, unknown>).rename_count as number || 0;
        const RENAME_COST = 1000;
        const isFree = renameCount === 0;

        if (!isFree) {
            if (user.arcadia_points < RENAME_COST) {
                return NextResponse.json({ success: false, error: `Arcadia Points tidak cukup. Butuh ${RENAME_COST} poin.` }, { status: 400 });
            }
            // Deduct points
            db.prepare('UPDATE users SET arcadia_points = arcadia_points - ? WHERE id = ?').run(RENAME_COST, user.id);
            const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(user.id) as { id: string } | undefined;
            if (wallet) {
                db.prepare('UPDATE wallets SET balance = balance - ? WHERE user_id = ?').run(RENAME_COST, user.id);
                db.prepare('INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, reference_type) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), wallet.id, 'spend', RENAME_COST, `Rename: ${user.username} → ${trimmed}`, 'rename');
            }
        }

        db.prepare('UPDATE users SET username = ?, rename_count = rename_count + 1, updated_at = datetime("now") WHERE id = ?').run(trimmed, user.id);

        return NextResponse.json({
            success: true,
            message: isFree ? 'Username berhasil diubah secara gratis! 🎉' : `Username berhasil diubah! (-${RENAME_COST} poin)`,
            data: { username: trimmed, cost: isFree ? 0 : RENAME_COST },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
