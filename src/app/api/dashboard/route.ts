import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const db = getDb();

        // User's favorite games
        const favoriteGames = db.prepare(`SELECT ug.*, g.name as game_name, g.icon as game_icon
      FROM user_games ug JOIN games g ON ug.game_id = g.id
      WHERE ug.user_id = ? AND ug.is_favorite = 1`).all(user.id);

        // Active parties for user's games
        const userGameIds = db.prepare('SELECT game_id FROM user_games WHERE user_id = ?').all(user.id) as Array<{ game_id: string }>;
        let activeParties: unknown[] = [];
        if (userGameIds.length > 0) {
            const placeholders = userGameIds.map(() => '?').join(',');
            activeParties = db.prepare(`SELECT p.*, g.name as game_name, g.icon as game_icon, u.username as creator_name
        FROM parties p JOIN games g ON p.game_id = g.id JOIN users u ON p.creator_id = u.id
        WHERE p.status = 'open' AND p.game_id IN (${placeholders})
        ORDER BY p.created_at DESC LIMIT 5`).all(...userGameIds.map(g => g.game_id));
        }

        // Active tournaments
        const activeTournaments = db.prepare(`SELECT t.*, g.name as game_name, g.icon as game_icon
      FROM tournaments t JOIN games g ON t.game_id = g.id
      WHERE t.status IN ('registration', 'ongoing')
      ORDER BY t.created_at DESC LIMIT 5`).all();

        // Weekly leaderboard (by arcadia_points)
        const leaderboard = db.prepare(`SELECT id, username, avatar, arcadia_points, reputation_score
      FROM users WHERE is_banned = 0
      ORDER BY arcadia_points DESC LIMIT 10`).all();

        // User stats
        const partiesJoined = db.prepare('SELECT COUNT(*) as c FROM party_members WHERE user_id = ?').get(user.id) as { c: number };
        const tournamentsPlayed = db.prepare('SELECT COUNT(*) as c FROM tournament_participants WHERE user_id = ?').get(user.id) as { c: number };

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: user.id, username: user.username, avatar: user.avatar,
                    arcadia_points: user.arcadia_points, reputation_score: user.reputation_score,
                    role: user.role,
                },
                favoriteGames,
                activeParties,
                activeTournaments,
                leaderboard,
                stats: {
                    parties_joined: partiesJoined.c,
                    tournaments_played: tournamentsPlayed.c,
                    total_points: user.arcadia_points,
                },
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
