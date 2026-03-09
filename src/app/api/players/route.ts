import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Search players by username
export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

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
        `).all(user.id, user.id, user.id, user.id, `%${search}%`, user.id);

        return NextResponse.json({ success: true, data: players });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
