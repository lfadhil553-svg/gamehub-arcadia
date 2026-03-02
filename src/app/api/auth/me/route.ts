import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                arcadia_points: user.arcadia_points,
                reputation_score: user.reputation_score,
                onboarding_done: user.onboarding_done,
                created_at: user.created_at,
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
