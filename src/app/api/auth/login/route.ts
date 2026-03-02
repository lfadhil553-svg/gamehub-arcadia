import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ success: false, error: 'Email dan password wajib diisi' }, { status: 400 });
        }

        const result = await loginUser(email, password);

        if ('error' in result) {
            return NextResponse.json({ success: false, error: result.error }, { status: 401 });
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
                    reputation_score: user.reputation_score,
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
    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
