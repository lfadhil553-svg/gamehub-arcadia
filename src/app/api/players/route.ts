import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Search players by username with full profile data
export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || searchParams.get('q') || '';

        if (search.length < 2) {
            return NextResponse.json({ success: false, error: 'Minimal 2 karakter untuk pencarian' }, { status: 400 });
        }

        const db = getDb();
        const players = db.prepare(`
            SELECT u.id, u.username, u.avatar, u.role, u.arcadia_points, u.reputation_score, u.created_at,
                   CASE 
                       WHEN f.status = 'accepted' THEN 'friend'
                       WHEN f.status = 'pending' AND f.requester_id = ? THEN 'pending_sent'
                       WHEN f.status = 'pending' AND f.addressee_id = ? THEN 'pending_received'
                       ELSE 'none'
                   END as friendship_status
            FROM users u
            LEFT JOIN friendships f ON (
                (f.requester_id = ? AND f.addressee_id = u.id) OR 
                (f.requester_id = u.id AND f.addressee_id = ?)
            ) AND f.status IN ('accepted', 'pending')
            WHERE u.username LIKE ? AND u.id != ? AND u.is_banned = 0
            ORDER BY u.arcadia_points DESC
            LIMIT 20
        `).all(user.id, user.id, user.id, user.id, `%${search}%`, user.id) as Array<{
            id: string; username: string; avatar: string; role: string;
            arcadia_points: number; reputation_score: number; created_at: string;
            friendship_status: string;
        }>;

        // Enrich each player with games and stats
        const enrichedPlayers = players.map(p => {
            const games = db.prepare(`
                SELECT g.name as game_name, g.icon as game_icon, 
                       r.name as rank_name, r.icon as rank_icon,
                       gr.name as role_name, gr.icon as role_icon,
                       ug.is_favorite
                FROM user_games ug
                JOIN games g ON ug.game_id = g.id
                LEFT JOIN ranks r ON ug.rank_id = r.id
                LEFT JOIN game_roles gr ON ug.role_id = gr.id
                WHERE ug.user_id = ?
                ORDER BY ug.is_favorite DESC
            `).all(p.id) as Array<{
                game_name: string; game_icon: string; rank_name: string;
                rank_icon: string; role_name: string; role_icon: string; is_favorite: number;
            }>;

            const partiesJoined = db.prepare('SELECT COUNT(*) as c FROM party_members WHERE user_id = ?').get(p.id) as { c: number };
            const tournamentsPlayed = db.prepare('SELECT COUNT(*) as c FROM tournament_participants WHERE user_id = ?').get(p.id) as { c: number };
            const tournamentsWon = db.prepare("SELECT COUNT(*) as c FROM tournament_participants WHERE user_id = ? AND status = 'winner'").get(p.id) as { c: number };
            const ratings = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as c FROM user_ratings WHERE rated_id = ?').get(p.id) as { avg: number; c: number };

            return {
                ...p,
                games,
                stats: {
                    parties_joined: partiesJoined.c,
                    tournaments_played: tournamentsPlayed.c,
                    tournaments_won: tournamentsWon.c,
                    win_rate: tournamentsPlayed.c > 0 ? Math.round((tournamentsWon.c / tournamentsPlayed.c) * 100) : 0,
                    avg_rating: ratings.avg ? Number(ratings.avg.toFixed(1)) : 5.0,
                    total_ratings: ratings.c,
                },
            };
        });

        return NextResponse.json({ success: true, data: enrichedPlayers });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
