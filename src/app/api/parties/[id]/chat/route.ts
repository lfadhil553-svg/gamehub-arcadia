import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, checkRateLimit, sanitize } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        // Rate limit: 1 message per 3 seconds per user
        if (!checkRateLimit(`chat:${user.id}`, 1, 3)) {
            return NextResponse.json({ success: false, error: 'Tunggu 3 detik sebelum mengirim pesan lagi' }, { status: 429 });
        }

        const { id } = await params;
        const { message } = await req.json();
        if (!message || message.trim().length === 0) {
            return NextResponse.json({ success: false, error: 'Pesan tidak boleh kosong' }, { status: 400 });
        }

        const db = getDb();

        // Check membership
        const member = db.prepare('SELECT id FROM party_members WHERE party_id = ? AND user_id = ?').get(id, user.id);
        if (!member) return NextResponse.json({ success: false, error: 'Kamu bukan anggota party ini' }, { status: 403 });

        const chatId = uuidv4();
        const sanitizedMessage = sanitize(message.slice(0, 500));

        db.prepare('INSERT INTO party_chat (id, party_id, user_id, message) VALUES (?, ?, ?, ?)')
            .run(chatId, id, user.id, sanitizedMessage);

        return NextResponse.json({
            success: true,
            data: {
                id: chatId,
                party_id: id,
                user_id: user.id,
                username: user.username,
                avatar: user.avatar,
                message: sanitizedMessage,
                created_at: new Date().toISOString(),
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
