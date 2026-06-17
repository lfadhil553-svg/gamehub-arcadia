import { NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getCurrentUser, checkRateLimit, sanitize } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        if (!checkRateLimit(`chat:${user.id}`, 1, 3)) {
            return NextResponse.json({ success: false, error: 'Tunggu 3 detik sebelum mengirim pesan lagi' }, { status: 429 });
        }

        const { id } = await params;

        const contentType = req.headers.get('content-type') || '';
        let messageText = '';
        let imageUrl = '';

        if (contentType.includes('multipart/form-data')) {
            // Photo upload
            const formData = await req.formData();
            const file = formData.get('image') as File | null;
            const textMsg = formData.get('message') as string || '';

            if (file) {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    return NextResponse.json({ success: false, error: 'Format: JPG, PNG, GIF, WebP' }, { status: 400 });
                }
                if (file.size > 1 * 1024 * 1024) {
                    return NextResponse.json({ success: false, error: 'Ukuran gambar maks 1MB' }, { status: 400 });
                }
                const bytes = await file.arrayBuffer();
                const base64 = Buffer.from(bytes).toString('base64');
                imageUrl = `data:${file.type};base64,${base64}`;
            }
            messageText = textMsg ? sanitize(textMsg.slice(0, 500)) : '';
        } else {
            // Regular text message
            const body = await req.json();
            messageText = body.message ? sanitize(body.message.slice(0, 500)) : '';
        }

        if (!messageText && !imageUrl) {
            return NextResponse.json({ success: false, error: 'Pesan tidak boleh kosong' }, { status: 400 });
        }

        const db = await getDbAsync();
        const member = db.prepare('SELECT id FROM party_members WHERE party_id = ? AND user_id = ?').get(id, user.id);
        if (!member) return NextResponse.json({ success: false, error: 'Kamu bukan anggota party ini' }, { status: 403 });

        const chatId = uuidv4();
        // Store image as [IMG]data:... prefix so we can distinguish it in the frontend
        const finalMessage = imageUrl ? `[IMG]${imageUrl}${messageText ? `[/IMG]${messageText}` : ''}` : messageText;

        db.prepare('INSERT INTO party_chat (id, party_id, user_id, message) VALUES (?, ?, ?, ?)')
            .run(chatId, id, user.id, finalMessage);

        return NextResponse.json({
            success: true,
            data: {
                id: chatId,
                party_id: id,
                user_id: user.id,
                username: user.username,
                avatar: user.avatar,
                message: finalMessage,
                created_at: new Date().toISOString(),
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
