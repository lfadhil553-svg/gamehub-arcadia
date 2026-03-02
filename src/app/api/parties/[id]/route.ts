import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();

        const party = db.prepare(`SELECT p.*, g.name as game_name, g.icon as game_icon, u.username as creator_name, u.avatar as creator_avatar
      FROM parties p
      JOIN games g ON p.game_id = g.id
      JOIN users u ON p.creator_id = u.id
      WHERE p.id = ?`).get(id);

        if (!party) {
            return NextResponse.json({ success: false, error: 'Party tidak ditemukan' }, { status: 404 });
        }

        const members = db.prepare(`SELECT pm.*, u.username, u.avatar, u.reputation_score
      FROM party_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.party_id = ?`).all(id);

        const chat = db.prepare(`SELECT pc.*, u.username, u.avatar
      FROM party_chat pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.party_id = ?
      ORDER BY pc.created_at DESC
      LIMIT 100`).all(id);

        return NextResponse.json({ success: true, data: { ...party as object, members, chat: (chat as Array<Record<string, unknown>>).reverse() } });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Join party
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const db = getDb();

        const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(id) as Record<string, unknown> | undefined;
        if (!party) return NextResponse.json({ success: false, error: 'Party tidak ditemukan' }, { status: 404 });
        if (party.status !== 'open') return NextResponse.json({ success: false, error: 'Party sudah penuh atau ditutup' }, { status: 400 });

        const existing = db.prepare('SELECT id FROM party_members WHERE party_id = ? AND user_id = ?').get(id, user.id);
        if (existing) return NextResponse.json({ success: false, error: 'Kamu sudah bergabung di party ini' }, { status: 400 });

        db.prepare('INSERT INTO party_members (id, party_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), id, user.id);

        const newCount = (party.current_players as number) + 1;
        const newStatus = newCount >= (party.max_players as number) ? 'full' : 'open';
        db.prepare('UPDATE parties SET current_players = ?, status = ? WHERE id = ?').run(newCount, newStatus, id);

        db.prepare('UPDATE users SET arcadia_points = arcadia_points + 5 WHERE id = ?').run(user.id);

        return NextResponse.json({ success: true, message: 'Berhasil bergabung! +5 Arcadia Points' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Leave party
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const db = getDb();

        db.prepare('DELETE FROM party_members WHERE party_id = ? AND user_id = ?').run(id, user.id);
        db.prepare('UPDATE parties SET current_players = MAX(current_players - 1, 0), status = "open" WHERE id = ?').run(id);

        return NextResponse.json({ success: true, message: 'Berhasil keluar dari party' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
