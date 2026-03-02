import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const db = getDb();
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
                    referral_code: user.referral_code, created_at: user.created_at,
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

        const { games } = await req.json();
        const db = getDb();

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
