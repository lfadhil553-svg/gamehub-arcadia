import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(req.url);
        const gameId = searchParams.get('game_id');
        const status = searchParams.get('status');

        let query = `SELECT t.*, g.name as game_name, g.icon as game_icon, u.username as organizer_name
      FROM tournaments t
      JOIN games g ON t.game_id = g.id
      JOIN users u ON t.organizer_id = u.id
      WHERE 1=1`;
        const params: unknown[] = [];

        if (gameId) { query += ' AND t.game_id = ?'; params.push(gameId); }
        if (status) { query += ' AND t.status = ?'; params.push(status); }
        else { query += ' AND t.status IN ("registration","ongoing")'; }

        query += ' ORDER BY t.created_at DESC LIMIT 50';
        const tournaments = db.prepare(query).all(...params);

        return NextResponse.json({ success: true, data: tournaments });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
        if (user.role !== 'organizer' && user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Hanya organizer atau admin yang bisa membuat tournament' }, { status: 403 });
        }

        const body = await req.json();
        const { game_id, name, description, mode, format, max_participants, team_size, prize_pool, entry_fee, registration_start, registration_end, start_date, rules } = body;

        if (!game_id || !name) {
            return NextResponse.json({ success: false, error: 'Game dan nama tournament wajib diisi' }, { status: 400 });
        }

        const db = getDb();
        const tournamentId = uuidv4();

        db.prepare(`INSERT INTO tournaments (id, game_id, organizer_id, name, description, mode, format, max_participants, team_size, prize_pool, entry_fee, status, registration_start, registration_end, start_date, rules)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(tournamentId, game_id, user.id, name, description || '', mode || 'solo', format || 'single_elimination', max_participants || 16, team_size || 1, prize_pool || '', entry_fee || 0, 'registration', registration_start || new Date().toISOString(), registration_end || '', start_date || '', rules || '');

        return NextResponse.json({ success: true, data: { id: tournamentId }, message: 'Tournament berhasil dibuat!' });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
