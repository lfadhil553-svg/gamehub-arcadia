import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
        const dailyActive = db.prepare('SELECT COUNT(*) as c FROM daily_logins WHERE login_date = ?').get(today) as { c: number };
        const totalParties = db.prepare('SELECT COUNT(*) as c FROM parties').get() as { c: number };
        const activeParties = db.prepare("SELECT COUNT(*) as c FROM parties WHERE status = 'open'").get() as { c: number };
        const totalTournaments = db.prepare('SELECT COUNT(*) as c FROM tournaments').get() as { c: number };
        const activeTournaments = db.prepare("SELECT COUNT(*) as c FROM tournaments WHERE status IN ('registration','ongoing')").get() as { c: number };
        const totalPoints = db.prepare('SELECT SUM(arcadia_points) as total FROM users').get() as { total: number };
        const newUsersToday = db.prepare("SELECT COUNT(*) as c FROM users WHERE date(created_at) = ?").get(today) as { c: number };

        const recentUsers = db.prepare('SELECT id, username, email, role, is_banned, created_at FROM users ORDER BY created_at DESC LIMIT 20').all();
        const games = db.prepare('SELECT * FROM games ORDER BY name').all();
        const rewards = db.prepare('SELECT * FROM reward_items ORDER BY created_at DESC').all();
        const pendingTournaments = db.prepare("SELECT t.*, g.name as game_name FROM tournaments t JOIN games g ON t.game_id = g.id WHERE t.status = 'draft' ORDER BY t.created_at DESC").all();
        const allTournaments = db.prepare("SELECT t.id, t.name, t.status, t.max_participants, t.entry_fee, t.prize_pool, t.created_at, g.name as game_name FROM tournaments t JOIN games g ON t.game_id = g.id ORDER BY t.created_at DESC").all();

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    total_users: totalUsers.c,
                    daily_active_users: dailyActive.c,
                    total_parties: totalParties.c,
                    active_parties: activeParties.c,
                    total_tournaments: totalTournaments.c,
                    active_tournaments: activeTournaments.c,
                    total_points_circulation: totalPoints.total || 0,
                    new_users_today: newUsersToday.c,
                },
                recentUsers,
                games,
                rewards,
                pendingTournaments,
                allTournaments,
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Admin actions (ban/unban user, manage games, etc.)
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const { action, target_id, data } = await req.json();
        const db = getDb();

        switch (action) {
            case 'ban_user':
                db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(target_id);
                return NextResponse.json({ success: true, message: 'User berhasil di-ban' });
            case 'unban_user':
                db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(target_id);
                return NextResponse.json({ success: true, message: 'User berhasil di-unban' });
            case 'approve_tournament':
                db.prepare("UPDATE tournaments SET status = 'registration' WHERE id = ?").run(target_id);
                return NextResponse.json({ success: true, message: 'Tournament berhasil diapprove' });
            case 'update_game':
                if (data) {
                    db.prepare('UPDATE games SET name = ?, is_active = ? WHERE id = ?').run(data.name, data.is_active ? 1 : 0, target_id);
                }
                return NextResponse.json({ success: true, message: 'Game berhasil diperbarui' });
            case 'promote_admin': {
                if (user.role !== 'superadmin') {
                    return NextResponse.json({ success: false, error: 'Hanya superadmin yang bisa promote admin' }, { status: 403 });
                }
                const target = db.prepare('SELECT role FROM users WHERE id = ?').get(target_id) as { role: string } | undefined;
                if (!target) return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
                if (target.role === 'admin' || target.role === 'superadmin') return NextResponse.json({ success: false, error: 'User sudah admin' }, { status: 400 });
                db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', target_id);
                return NextResponse.json({ success: true, message: 'User berhasil dipromote jadi Admin' });
            }
            case 'demote_admin': {
                if (user.role !== 'superadmin') {
                    return NextResponse.json({ success: false, error: 'Hanya superadmin yang bisa demote admin' }, { status: 403 });
                }
                const target = db.prepare('SELECT role FROM users WHERE id = ?').get(target_id) as { role: string } | undefined;
                if (!target) return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
                if (target.role === 'superadmin') return NextResponse.json({ success: false, error: 'Tidak bisa demote superadmin' }, { status: 400 });
                db.prepare('UPDATE users SET role = ? WHERE id = ?').run('user', target_id);
                return NextResponse.json({ success: true, message: 'Admin berhasil didemote jadi User' });
            }
            case 'toggle_game': {
                const game = db.prepare('SELECT is_active FROM games WHERE id = ?').get(target_id) as { is_active: number } | undefined;
                if (!game) return NextResponse.json({ success: false, error: 'Game tidak ditemukan' }, { status: 404 });
                const newStatus = game.is_active ? 0 : 1;
                db.prepare('UPDATE games SET is_active = ? WHERE id = ?').run(newStatus, target_id);
                return NextResponse.json({ success: true, message: `Game berhasil di-${newStatus ? 'aktifkan' : 'nonaktifkan'}` });
            }
            case 'toggle_tournament': {
                const tournament = db.prepare('SELECT status FROM tournaments WHERE id = ?').get(target_id) as { status: string } | undefined;
                if (!tournament) return NextResponse.json({ success: false, error: 'Tournament tidak ditemukan' }, { status: 404 });
                const newStatus = tournament.status === 'cancelled' ? 'registration' : 'cancelled';
                db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run(newStatus, target_id);
                return NextResponse.json({ success: true, message: `Tournament berhasil di-${newStatus === 'cancelled' ? 'nonaktifkan' : 'aktifkan'}` });
            }
            case 'toggle_reward': {
                const reward = db.prepare('SELECT is_active FROM reward_items WHERE id = ?').get(target_id) as { is_active: number } | undefined;
                if (!reward) return NextResponse.json({ success: false, error: 'Reward tidak ditemukan' }, { status: 404 });
                const newStatus = reward.is_active ? 0 : 1;
                db.prepare('UPDATE reward_items SET is_active = ? WHERE id = ?').run(newStatus, target_id);
                return NextResponse.json({ success: true, message: `Reward berhasil di-${newStatus ? 'aktifkan' : 'nonaktifkan'}` });
            }
            default:
                return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
