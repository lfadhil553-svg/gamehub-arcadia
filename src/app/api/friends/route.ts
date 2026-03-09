import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET - List friends and pending requests
export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const db = getDb();
        const { searchParams } = new URL(req.url);
        const tab = searchParams.get('tab') || 'friends';

        if (tab === 'friends') {
            const friends = db.prepare(`
                SELECT u.id, u.username, u.avatar, u.role, u.arcadia_points, u.reputation_score, u.created_at,
                       f.id as friendship_id, f.created_at as friends_since
                FROM friendships f
                JOIN users u ON (CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END) = u.id
                WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
                ORDER BY u.username
            `).all(user.id, user.id, user.id);
            return NextResponse.json({ success: true, data: friends });
        }

        if (tab === 'pending') {
            const incoming = db.prepare(`
                SELECT u.id, u.username, u.avatar, u.role, u.arcadia_points, f.id as friendship_id, f.created_at as requested_at
                FROM friendships f
                JOIN users u ON f.requester_id = u.id
                WHERE f.addressee_id = ? AND f.status = 'pending'
                ORDER BY f.created_at DESC
            `).all(user.id);
            const outgoing = db.prepare(`
                SELECT u.id, u.username, u.avatar, u.role, u.arcadia_points, f.id as friendship_id, f.created_at as requested_at
                FROM friendships f
                JOIN users u ON f.addressee_id = u.id
                WHERE f.requester_id = ? AND f.status = 'pending'
                ORDER BY f.created_at DESC
            `).all(user.id);
            return NextResponse.json({ success: true, data: { incoming, outgoing } });
        }

        return NextResponse.json({ success: false, error: 'Invalid tab' }, { status: 400 });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Send friend request
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { target_user_id } = await req.json();
        if (!target_user_id) return NextResponse.json({ success: false, error: 'Target user required' }, { status: 400 });
        if (target_user_id === user.id) return NextResponse.json({ success: false, error: 'Tidak bisa add diri sendiri' }, { status: 400 });

        const db = getDb();

        // Check if target exists
        const target = db.prepare('SELECT id, username FROM users WHERE id = ?').get(target_user_id);
        if (!target) return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });

        // Check existing friendship
        const existing = db.prepare(`
            SELECT id, status FROM friendships 
            WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
        `).get(user.id, target_user_id, target_user_id, user.id) as { id: string; status: string } | undefined;

        if (existing) {
            if (existing.status === 'accepted') return NextResponse.json({ success: false, error: 'Sudah berteman' }, { status: 400 });
            if (existing.status === 'pending') return NextResponse.json({ success: false, error: 'Permintaan sudah dikirim' }, { status: 400 });
            // If rejected, allow re-request
            db.prepare('UPDATE friendships SET status = ?, requester_id = ?, addressee_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
                .run('pending', user.id, target_user_id, existing.id);
            return NextResponse.json({ success: true, message: 'Permintaan pertemanan dikirim!' });
        }

        db.prepare('INSERT INTO friendships (id, requester_id, addressee_id) VALUES (?, ?, ?)')
            .run(uuidv4(), user.id, target_user_id);

        return NextResponse.json({ success: true, message: 'Permintaan pertemanan dikirim!' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Accept or reject friend request
export async function PATCH(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { friendship_id, action } = await req.json();
        if (!friendship_id || !action) return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 });

        const db = getDb();
        const friendship = db.prepare('SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = ?')
            .get(friendship_id, user.id, 'pending') as { id: string } | undefined;

        if (!friendship) return NextResponse.json({ success: false, error: 'Permintaan tidak ditemukan' }, { status: 404 });

        if (action === 'accept') {
            db.prepare("UPDATE friendships SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(friendship_id);
            return NextResponse.json({ success: true, message: 'Permintaan diterima! 🎉' });
        } else if (action === 'reject') {
            db.prepare("UPDATE friendships SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(friendship_id);
            return NextResponse.json({ success: true, message: 'Permintaan ditolak' });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove friend
export async function DELETE(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const friendshipId = searchParams.get('id');
        if (!friendshipId) return NextResponse.json({ success: false, error: 'Friendship ID required' }, { status: 400 });

        const db = getDb();
        db.prepare('DELETE FROM friendships WHERE id = ? AND (requester_id = ? OR addressee_id = ?)')
            .run(friendshipId, user.id, user.id);

        return NextResponse.json({ success: true, message: 'Teman dihapus' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
