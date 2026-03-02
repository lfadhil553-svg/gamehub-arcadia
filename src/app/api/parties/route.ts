import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get('game_id');
        const status = searchParams.get('status') || 'open';
        const region = searchParams.get('region');

        let query = `SELECT p.*, g.name as game_name, g.icon as game_icon, u.username as creator_name, u.avatar as creator_avatar
      FROM parties p
      JOIN games g ON p.game_id = g.id
      JOIN users u ON p.creator_id = u.id
      WHERE p.status = ?`;
        const params: unknown[] = [status];

        if (gameId) {
            query += ' AND p.game_id = ?';
            params.push(gameId);
        }
        if (region) {
            query += ' AND p.region LIKE ?';
            params.push(`%${region}%`);
        }

        query += ' ORDER BY p.created_at DESC LIMIT 50';
        const parties = db.prepare(query).all(...params);

        return NextResponse.json({ success: true, data: parties });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        const { game_id, title, description, min_rank_tier, game_mode_id, max_players, region, scheduled_at } = await req.json();

        if (!game_id || !title) {
            return NextResponse.json({ success: false, error: 'Game dan judul wajib diisi' }, { status: 400 });
        }

        const db = getDb();
        const partyId = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        db.prepare(`INSERT INTO parties (id, game_id, creator_id, title, description, min_rank_tier, game_mode_id, max_players, region, scheduled_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(partyId, game_id, user.id, title, description || '', min_rank_tier || 0, game_mode_id || null, max_players || 5, region || '', scheduled_at || null, expiresAt);

        // Add creator as member
        db.prepare('INSERT INTO party_members (id, party_id, user_id, role) VALUES (?, ?, ?, ?)')
            .run(uuidv4(), partyId, user.id, 'leader');

        // Award points
        db.prepare('UPDATE users SET arcadia_points = arcadia_points + 5 WHERE id = ?').run(user.id);

        return NextResponse.json({ success: true, data: { id: partyId }, message: 'Party berhasil dibuat! +5 Arcadia Points' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
