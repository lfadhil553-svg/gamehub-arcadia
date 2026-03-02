import { NextResponse } from 'next/server';
import { registerUser, sanitize } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { username, email, password, confirmPassword } = await req.json();

        if (!username || !email || !password || !confirmPassword) {
            return NextResponse.json({ success: false, error: 'Semua field wajib diisi' }, { status: 400 });
        }

        if (password !== confirmPassword) {
            return NextResponse.json({ success: false, error: 'Password tidak cocok' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ success: false, error: 'Format email tidak valid' }, { status: 400 });
        }

        const result = await registerUser(sanitize(username), email.toLowerCase().trim(), password);

        if ('error' in result) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        const { user, accessToken, refreshToken } = result;

        const response = NextResponse.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    arcadia_points: user.arcadia_points,
                    onboarding_done: user.onboarding_done,
                },
                accessToken,
            },
        });

        response.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60,
            path: '/',
        });

        response.cookies.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
