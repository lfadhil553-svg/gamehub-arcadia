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
}

export default function AdminPage() {
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'overview' | 'users' | 'games' | 'tournaments' | 'rewards'>('overview');

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) router.push('/dashboard');
    }, [user, authLoading, router]);

    const fetchData = async () => {
        const res = await fetch('/api/admin');
        const d = await res.json();
        if (d.success) setData(d.data);
        setLoading(false);
    };

    useEffect(() => { if (user?.role === 'admin') fetchData(); }, [user]);

    const adminAction = async (action: string, target_id: string, actionData?: Record<string, unknown>) => {
        const res = await fetch('/api/admin', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, target_id, data: actionData }),
        });
        const result = await res.json();
        if (result.success) { addToast(result.message, 'success'); fetchData(); }
        else addToast(result.error, 'error');
    };

    if (authLoading || !user || user.role !== 'admin') return null;

    return (
        <AppLayout>
            {loading ? <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}</div> : data ? (
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold">⚙️ Admin Panel</h1>
                        <p className="text-text-muted text-sm">System management & analytics</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {(['overview', 'users', 'games', 'tournaments', 'rewards'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${tab === t ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
                                {t}
                            </button>
                        ))}
                    </div>

                    {tab === 'overview' && (
                        <div className="space-y-6">
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
                        </div>
                    )}

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
                                                <td className="px-4 py-3"><span className="badge badge-primary">{u.role}</span></td>
                                                <td className="px-4 py-3">
                                                    <span className={`badge ${u.is_banned ? 'badge-danger' : 'badge-success'}`}>{u.is_banned ? 'Banned' : 'Active'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {u.is_banned ? (
                                                        <button onClick={() => adminAction('unban_user', u.id)} className="text-xs text-success hover:underline">Unban</button>
                                                    ) : (
                                                        <button onClick={() => adminAction('ban_user', u.id)} className="text-xs text-danger hover:underline">Ban</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'games' && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.games.map(game => (
                                <div key={game.id} className="card">
                                    <div className="flex items-center gap-3 mb-2">
                                        <GameIcon icon={game.icon} name={game.name} size="lg" />
                                        <div>
                                            <p className="font-bold">{game.name}</p>
                                            <p className="text-xs text-text-muted">{game.slug}</p>
                                        </div>
                                    </div>
                                    <span className={`badge ${game.is_active ? 'badge-success' : 'badge-danger'}`}>
                                        {game.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'tournaments' && (
                        <div className="space-y-3">
                            {data.pendingTournaments.length > 0 ? data.pendingTournaments.map(t => (
                                <div key={t.id} className="card !p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold">{t.name}</p>
                                        <p className="text-xs text-text-muted">{t.game_name} • {t.status}</p>
                                    </div>
                                    <button onClick={() => adminAction('approve_tournament', t.id)} className="btn-primary text-sm">✓ Approve</button>
                                </div>
                            )) : <p className="card text-text-muted text-sm text-center !py-8">Tidak ada tournament pending</p>}
                        </div>
                    )}

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
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rewards.map(r => (
                                        <tr key={r.id} className="border-t border-border hover:bg-surface-light transition-colors">
                                            <td className="px-4 py-3 font-medium">{r.name}</td>
                                            <td className="px-4 py-3 text-text-muted">{r.category}</td>
                                            <td className="px-4 py-3">⭐ {r.cost}</td>
                                            <td className="px-4 py-3">{r.stock === -1 ? '∞' : r.stock}</td>
                                            <td className="px-4 py-3"><span className={`badge ${r.is_active ? 'badge-success' : 'badge-danger'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
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
