'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import { motion } from 'framer-motion';

interface AdminData {
    stats: { total_users: number; daily_active_users: number; total_parties: number; active_parties: number; total_tournaments: number; active_tournaments: number; total_points_circulation: number; new_users_today: number };
    recentUsers: Array<{ id: string; username: string; email: string; role: string; is_banned: number; created_at: string }>;
    games: Array<{ id: string; name: string; icon: string; slug: string; is_active: number }>;
    rewards: Array<{ id: string; name: string; category: string; cost: number; stock: number; is_active: number }>;
    pendingTournaments: Array<{ id: string; name: string; game_name: string; status: string }>;
    allTournaments: Array<{ id: string; name: string; game_name: string; status: string; max_participants: number; entry_fee: number; prize_pool: string; created_at: string }>;
}

export default function AdminPage() {
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'overview' | 'users' | 'games' | 'tournaments' | 'rewards'>('overview');

    useEffect(() => {
        if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'superadmin'))) router.push('/dashboard');
    }, [user, authLoading, router]);

    const fetchData = async () => {
        const res = await fetch('/api/admin');
        const d = await res.json();
        if (d.success) setData(d.data);
        setLoading(false);
    };

    useEffect(() => { if (user?.role === 'admin' || user?.role === 'superadmin') fetchData(); }, [user]);

    const adminAction = async (action: string, target_id: string, actionData?: Record<string, unknown>) => {
        const res = await fetch('/api/admin', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, target_id, data: actionData }),
        });
        const result = await res.json();
        if (result.success) { addToast(result.message, 'success'); fetchData(); }
        else addToast(result.error, 'error');
    };

    if (authLoading || !user || (user.role !== 'admin' && user.role !== 'superadmin')) return null;

    const tabItems = [
        { key: 'overview' as const, label: '📊 Overview' },
        { key: 'users' as const, label: '👥 Users' },
        { key: 'games' as const, label: '🎮 Games' },
        { key: 'tournaments' as const, label: '🏆 Tournaments' },
        { key: 'rewards' as const, label: '🎁 Rewards' },
    ];

    return (
        <AppLayout>
            {loading ? <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}</div> : data ? (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold">⚙️ Admin Panel</h1>
                        <p className="text-text-muted text-sm">
                            Logged in as <span className={user.role === 'superadmin' ? 'text-yellow-400 font-bold' : 'text-primary font-bold'}>{user.role === 'superadmin' ? '👑 Super Admin' : '🛡️ Admin'}</span>
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {tabItems.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Overview Tab */}
                    {tab === 'overview' && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Users', value: data.stats.total_users, icon: '👥', color: 'text-primary' },
                                { label: 'DAU', value: data.stats.daily_active_users, icon: '📊', color: 'text-success' },
                                { label: 'Active Parties', value: data.stats.active_parties, icon: '🎮', color: 'text-secondary' },
                                { label: 'Active Tournaments', value: data.stats.active_tournaments, icon: '🏆', color: 'text-warning' },
                                { label: 'Total Parties', value: data.stats.total_parties, icon: '📋', color: 'text-text' },
                                { label: 'Total Tournaments', value: data.stats.total_tournaments, icon: '📝', color: 'text-text' },
                                { label: 'Points Circulation', value: data.stats.total_points_circulation.toLocaleString(), icon: '⭐', color: 'text-primary' },
                                { label: 'New Users Today', value: data.stats.new_users_today, icon: '🆕', color: 'text-success' },
                            ].map((stat, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    className="card !p-4">
                                    <span className="text-2xl">{stat.icon}</span>
                                    <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
                                    <p className="text-xs text-text-muted">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Users Tab */}
                    {tab === 'users' && (
                        <div className="card !p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-light">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-text-muted font-medium">User</th>
                                            <th className="px-4 py-3 text-left text-text-muted font-medium">Email</th>
                                            <th className="px-4 py-3 text-left text-text-muted font-medium">Role</th>
                                            <th className="px-4 py-3 text-left text-text-muted font-medium">Status</th>
                                            <th className="px-4 py-3 text-left text-text-muted font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recentUsers.map(u => (
                                            <tr key={u.id} className="border-t border-border hover:bg-surface-light transition-colors">
                                                <td className="px-4 py-3 font-medium">{u.username}</td>
                                                <td className="px-4 py-3 text-text-muted">{u.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`badge ${u.role === 'superadmin' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black' : u.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>
                                                        {u.role === 'superadmin' ? '👑 SA' : u.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`badge ${u.is_banned ? 'badge-danger' : 'badge-success'}`}>{u.is_banned ? 'Banned' : 'Active'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {/* Don't show ban/unban for superadmin users */}
                                                        {u.role !== 'superadmin' && (
                                                            u.is_banned ? (
                                                                <button onClick={() => adminAction('unban_user', u.id)} className="px-2 py-1 text-xs bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors">✓ Unban</button>
                                                            ) : (
                                                                <button onClick={() => adminAction('ban_user', u.id)} className="px-2 py-1 text-xs bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors">✕ Ban</button>
                                                            )
                                                        )}
                                                        {/* Promote/Demote only for superadmin */}
                                                        {user?.role === 'superadmin' && u.role !== 'superadmin' && (
                                                            u.role === 'admin' ? (
                                                                <button onClick={() => adminAction('demote_admin', u.id)} className="px-2 py-1 text-xs bg-warning/10 text-warning rounded-lg hover:bg-warning/20 transition-colors">↓ Demote</button>
                                                            ) : (
                                                                <button onClick={() => adminAction('promote_admin', u.id)} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">↑ Admin</button>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Games Tab */}
                    {tab === 'games' && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.games.map((game, i) => (
                                <motion.div key={game.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    className={`card !p-4 border-2 transition-all ${game.is_active ? 'border-success/30' : 'border-danger/30 opacity-60'}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <GameIcon icon={game.icon} name={game.name} size="lg" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold">{game.name}</p>
                                            <p className="text-xs text-text-muted">{game.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`badge ${game.is_active ? 'badge-success' : 'badge-danger'}`}>
                                            {game.is_active ? '✓ Active' : '✕ Inactive'}
                                        </span>
                                        <button onClick={() => adminAction('toggle_game', game.id)}
                                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${game.is_active
                                                ? 'bg-danger/10 text-danger hover:bg-danger/20'
                                                : 'bg-success/10 text-success hover:bg-success/20'}`}>
                                            {game.is_active ? '⏸ Nonaktifkan' : '▶ Aktifkan'}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Tournaments Tab */}
                    {tab === 'tournaments' && (
                        <div className="space-y-4">
                            {/* Pending approvals */}
                            {data.pendingTournaments.length > 0 && (
                                <div>
                                    <h3 className="font-bold mb-3 text-warning">📋 Pending Approval</h3>
                                    <div className="space-y-2">
                                        {data.pendingTournaments.map(t => (
                                            <div key={t.id} className="card !p-4 flex items-center justify-between border-2 border-warning/30">
                                                <div>
                                                    <p className="font-bold">{t.name}</p>
                                                    <p className="text-xs text-text-muted">{t.game_name} • Draft</p>
                                                </div>
                                                <button onClick={() => adminAction('approve_tournament', t.id)} className="btn-primary text-sm">✓ Approve</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* All tournaments */}
                            <div>
                                <h3 className="font-bold mb-3">🏆 Semua Tournament</h3>
                                {data.allTournaments && data.allTournaments.length > 0 ? (
                                    <div className="space-y-3">
                                        {data.allTournaments.map((t, i) => {
                                            const isActive = t.status !== 'cancelled';
                                            const statusColors: Record<string, string> = {
                                                'registration': 'badge-success',
                                                'ongoing': 'badge-primary',
                                                'completed': 'badge-secondary',
                                                'cancelled': 'badge-danger',
                                                'draft': 'badge-warning',
                                            };
                                            return (
                                                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                                    className={`card !p-4 border-2 transition-all ${isActive ? 'border-border' : 'border-danger/30 opacity-60'}`}>
                                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold">{t.name}</p>
                                                            <div className="flex items-center gap-2 text-xs text-text-muted mt-1 flex-wrap">
                                                                <span>🎮 {t.game_name}</span>
                                                                <span>👥 Max {t.max_participants}</span>
                                                                {t.entry_fee > 0 && <span>💰 {t.entry_fee} pts</span>}
                                                                <span>🏆 {t.prize_pool}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`badge ${statusColors[t.status] || 'badge-secondary'}`}>{t.status}</span>
                                                            <button onClick={() => adminAction('toggle_tournament', t.id)}
                                                                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${isActive
                                                                    ? 'bg-danger/10 text-danger hover:bg-danger/20'
                                                                    : 'bg-success/10 text-success hover:bg-success/20'}`}>
                                                                {isActive ? '⏸ Cancel' : '▶ Aktifkan'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : <p className="card text-text-muted text-sm text-center !py-8">Belum ada tournament</p>}
                            </div>
                        </div>
                    )}

                    {/* Rewards Tab */}
                    {tab === 'rewards' && (
                        <div className="card !p-0 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-light">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-text-muted font-medium">Reward</th>
                                        <th className="px-4 py-3 text-left text-text-muted font-medium">Category</th>
                                        <th className="px-4 py-3 text-left text-text-muted font-medium">Cost</th>
                                        <th className="px-4 py-3 text-left text-text-muted font-medium">Stock</th>
                                        <th className="px-4 py-3 text-left text-text-muted font-medium">Status</th>
                                        <th className="px-4 py-3 text-left text-text-muted font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rewards.map(r => (
                                        <tr key={r.id} className={`border-t border-border hover:bg-surface-light transition-colors ${!r.is_active ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3 font-medium">{r.name}</td>
                                            <td className="px-4 py-3 text-text-muted">{r.category}</td>
                                            <td className="px-4 py-3">⭐ {r.cost}</td>
                                            <td className="px-4 py-3">{r.stock === -1 ? '∞' : r.stock}</td>
                                            <td className="px-4 py-3"><span className={`badge ${r.is_active ? 'badge-success' : 'badge-danger'}`}>{r.is_active ? 'Active' : 'Off'}</span></td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => adminAction('toggle_reward', r.id)}
                                                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${r.is_active
                                                        ? 'bg-danger/10 text-danger hover:bg-danger/20'
                                                        : 'bg-success/10 text-success hover:bg-success/20'}`}>
                                                    {r.is_active ? '⏸ Off' : '▶ On'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : <p className="text-text-muted">Admin access required</p>}
        </AppLayout>
    );
}
