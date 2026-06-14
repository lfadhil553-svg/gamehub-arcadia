import { NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get('avatar') as File | null;
        if (!file) return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ success: false, error: 'Format file harus JPG, PNG, GIF, atau WebP' }, { status: 400 });
        }

        // Validate file size (max 2MB)
        const MAX_SIZE = 2 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, error: 'Ukuran file maksimal 2MB' }, { status: 400 });
        }

        // Convert to base64 data URL
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        // Save to database
        const db = await getDbAsync();
        db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(dataUrl, user.id);

        return NextResponse.json({
            success: true,
            message: 'Foto profil berhasil diubah!',
            data: { avatar: dataUrl },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
