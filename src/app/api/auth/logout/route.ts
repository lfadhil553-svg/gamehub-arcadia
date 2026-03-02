import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export async function POST() {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get('refresh_token')?.value;

        if (refreshToken) {
            const db = getDb();
            db.prepare('DELETE FROM sessions WHERE refresh_token = ?').run(refreshToken);
        }

        const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
        response.cookies.set('access_token', '', { maxAge: 0, path: '/' });
        response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' });
        return response;
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
