import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const games = db.prepare('SELECT * FROM games WHERE is_active = 1 ORDER BY name').all();

        // Get ranks, modes, roles for each game
        const gamesWithDetails = games.map((game: Record<string, unknown>) => {
            const ranks = db.prepare('SELECT * FROM ranks WHERE game_id = ? ORDER BY tier').all(game.id);
            const modes = db.prepare('SELECT * FROM game_modes WHERE game_id = ?').all(game.id);
            const roles = db.prepare('SELECT * FROM game_roles WHERE game_id = ?').all(game.id);
            return { ...game, ranks, modes, roles };
        });

        return NextResponse.json({ success: true, data: gamesWithDetails });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
