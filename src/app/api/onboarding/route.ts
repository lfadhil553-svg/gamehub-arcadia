import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const { games } = await req.json();
        if (!games || !Array.isArray(games) || games.length === 0) {
            return NextResponse.json({ success: false, error: 'Pilih minimal 1 game' }, { status: 400 });
        }

        const db = getDb();
        const insert = db.prepare('INSERT OR REPLACE INTO user_games (id, user_id, game_id, rank_id, role_id, is_favorite) VALUES (?, ?, ?, ?, ?, ?)');

        for (const g of games) {
            insert.run(uuidv4(), user.id, g.game_id, g.rank_id || null, g.role_id || null, g.is_favorite ? 1 : 0);
        }

        db.prepare('UPDATE users SET onboarding_done = 1 WHERE id = ?').run(user.id);

        return NextResponse.json({ success: true, message: 'Onboarding selesai!' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
