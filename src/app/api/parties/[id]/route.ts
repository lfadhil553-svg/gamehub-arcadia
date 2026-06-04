import { NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = await getDbAsync();

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
        const db = await getDbAsync();

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
        const db = await getDbAsync();

        db.prepare('DELETE FROM party_members WHERE party_id = ? AND user_id = ?').run(id, user.id);
        db.prepare('UPDATE parties SET current_players = MAX(current_players - 1, 0), status = "open" WHERE id = ?').run(id);

        return NextResponse.json({ success: true, message: 'Berhasil keluar dari party' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Invite or Kick member (leader only)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const db = await getDbAsync();
        const body = await req.json();
        const { action, target_user_id } = body;

        const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(id) as Record<string, unknown> | undefined;
        if (!party) return NextResponse.json({ success: false, error: 'Party tidak ditemukan' }, { status: 404 });

        if (action === 'kick') {
            if (party.creator_id !== user.id) return NextResponse.json({ success: false, error: 'Hanya leader yang bisa melakukan aksi ini' }, { status: 403 });
            if (target_user_id === user.id) return NextResponse.json({ success: false, error: 'Tidak bisa kick diri sendiri' }, { status: 400 });
            const member = db.prepare('SELECT id FROM party_members WHERE party_id = ? AND user_id = ?').get(id, target_user_id);
            if (!member) return NextResponse.json({ success: false, error: 'Player tidak ada di party ini' }, { status: 400 });

            db.prepare('DELETE FROM party_members WHERE party_id = ? AND user_id = ?').run(id, target_user_id);
            db.prepare('UPDATE parties SET current_players = MAX(current_players - 1, 0), status = "open" WHERE id = ?').run(id);

            return NextResponse.json({ success: true, message: 'Player berhasil dikeluarkan dari party' });
        }

        if (action === 'invite') {
            if (party.creator_id !== user.id) return NextResponse.json({ success: false, error: 'Hanya leader yang bisa invite' }, { status: 403 });
            if (party.status === 'full' || (party.current_players as number) >= (party.max_players as number)) {
                return NextResponse.json({ success: false, error: 'Party sudah penuh' }, { status: 400 });
            }
            const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(target_user_id) as { id: string; username: string } | undefined;
            if (!targetUser) return NextResponse.json({ success: false, error: 'Player tidak ditemukan' }, { status: 404 });

            const existing = db.prepare('SELECT id FROM party_members WHERE party_id = ? AND user_id = ?').get(id, target_user_id);
            if (existing) return NextResponse.json({ success: false, error: 'Player sudah ada di party ini' }, { status: 400 });

            db.prepare('INSERT INTO party_members (id, party_id, user_id, role) VALUES (?, ?, ?, ?)').run(uuidv4(), id, target_user_id, 'member');
            const newCount = (party.current_players as number) + 1;
            const newStatus = newCount >= (party.max_players as number) ? 'full' : 'open';
            db.prepare('UPDATE parties SET current_players = ?, status = ? WHERE id = ?').run(newCount, newStatus, id);

            return NextResponse.json({ success: true, message: `${targetUser.username} berhasil diundang ke party!` });
        }

        // Ready toggle — any member can toggle
        if (action === 'ready') {
            const member = db.prepare('SELECT id, role FROM party_members WHERE party_id = ? AND user_id = ?').get(id, user.id) as { id: string; role: string } | undefined;
            if (!member) return NextResponse.json({ success: false, error: 'Kamu bukan member party ini' }, { status: 403 });
            // Toggle ready: role 'member' <-> 'ready', or 'leader' <-> 'leader_ready'
            const isReady = member.role === 'ready' || member.role === 'leader_ready';
            const newRole = member.role === 'leader' ? 'leader_ready' : member.role === 'leader_ready' ? 'leader' : isReady ? 'member' : 'ready';
            db.prepare('UPDATE party_members SET role = ? WHERE party_id = ? AND user_id = ?').run(newRole, id, user.id);
            return NextResponse.json({ success: true, message: isReady ? 'Status: Belum siap' : 'Status: Siap! ✅', ready: !isReady });
        }

        // Launch game — leader only, requires all members ready
        if (action === 'launch') {
            if (party.creator_id !== user.id) return NextResponse.json({ success: false, error: 'Hanya leader yang bisa launch game' }, { status: 403 });
            if (party.status === 'in_game') return NextResponse.json({ success: false, error: 'Party sudah dalam game' }, { status: 400 });

            const members = db.prepare('SELECT user_id, role FROM party_members WHERE party_id = ?').all(id) as Array<{ user_id: string; role: string }>;
            if (members.length < 2) return NextResponse.json({ success: false, error: 'Minimal 2 member untuk launch' }, { status: 400 });

            const notReady = members.filter(m => m.role !== 'ready' && m.role !== 'leader_ready');
            if (notReady.length > 0) {
                return NextResponse.json({ success: false, error: `${notReady.length} member belum siap! Semua harus Ready untuk launch.` }, { status: 400 });
            }

            // Update party status
            db.prepare('UPDATE parties SET status = ? WHERE id = ?').run('in_game', id);

            // Award points to all members
            for (const m of members) {
                db.prepare('UPDATE users SET arcadia_points = arcadia_points + 10 WHERE id = ?').run(m.user_id);
            }

            // Auto system chat message
            db.prepare('INSERT INTO party_chat (id, party_id, user_id, message) VALUES (?, ?, ?, ?)').run(
                uuidv4(), id, user.id, '🚀 Game launched! Semua pemain masuk ke game. Good luck & have fun! +10 Points untuk semua member.'
            );

            // Get game info for deep link
            const gameSlug = (db.prepare('SELECT g.slug FROM parties p JOIN games g ON p.game_id = g.id WHERE p.id = ?').get(id) as { slug: string })?.slug || '';

            return NextResponse.json({ success: true, message: 'Game launched! 🚀 +10 Points untuk semua member!', game_slug: gameSlug });
        }

        // End game — leader only
        if (action === 'end_game') {
            if (party.creator_id !== user.id) return NextResponse.json({ success: false, error: 'Hanya leader yang bisa mengakhiri game' }, { status: 403 });
            db.prepare('UPDATE parties SET status = ? WHERE id = ?').run('open', id);
            // Reset all members to not-ready
            db.prepare('UPDATE party_members SET role = ? WHERE party_id = ? AND role = ?').run('member', id, 'ready');
            db.prepare('UPDATE party_members SET role = ? WHERE party_id = ? AND role = ?').run('leader', id, 'leader_ready');

            db.prepare('INSERT INTO party_chat (id, party_id, user_id, message) VALUES (?, ?, ?, ?)').run(
                uuidv4(), id, user.id, '🏁 Game selesai! Party kembali ke lobby.'
            );

            return NextResponse.json({ success: true, message: 'Game berakhir. Party kembali ke lobby.' });
        }

        return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
