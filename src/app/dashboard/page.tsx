'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface DashboardData {
    user: { id: string; username: string; avatar: string; arcadia_points: number; reputation_score: number; role: string };
    favoriteGames: Array<{ game_name: string; game_icon: string }>;
    activeParties: Array<{ id: string; title: string; game_name: string; game_icon: string; current_players: number; max_players: number; creator_name: string; status: string; region: string }>;
    activeTournaments: Array<{ id: string; name: string; game_name: string; game_icon: string; current_participants: number; max_participants: number; status: string; prize_pool: string; mode: string }>;
    leaderboard: Array<{ id: string; username: string; avatar: string; arcadia_points: number }>;
    stats: { parties_joined: number; tournaments_played: number; total_points: number };
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useApp();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user) {
            fetch('/api/dashboard').then(r => r.json()).then(d => {
                if (d.success) setData(d.data);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) return null;

    return (
        <AppLayout>
            {loading ? <DashboardSkeleton /> : data ? (
                <div className="space-y-6">
                    {/* Welcome */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold">
                                {data.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Hey, {data.user.username}! 👋</h1>
                                <p className="text-text-muted">Selamat datang kembali di ARCADIA</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Arcadia Points', value: data.stats.total_points.toLocaleString(), icon: '⭐', color: 'primary' },
                            { label: 'Party Joined', value: data.stats.parties_joined, icon: '🎮', color: 'secondary' },
                            { label: 'Tournament', value: data.stats.tournaments_played, icon: '🏆', color: 'accent' },
                            { label: 'Reputation', value: data.user.reputation_score.toFixed(1), icon: '💎', color: 'success' },
                        ].map((stat, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className="card !p-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{stat.icon}</span>
                                    <div>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                        <p className="text-xs text-text-muted">{stat.label}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/party" className="card !p-4 flex items-center gap-3 hover:glow-primary cursor-pointer group">
                            <span className="text-3xl">🎮</span>
                            <div>
                                <p className="font-bold group-hover:text-primary transition-colors">Cari Party</p>
                                <p className="text-xs text-text-muted">Temukan teman mabar</p>
                            </div>
                        </Link>
                        <Link href="/tournament" className="card !p-4 flex items-center gap-3 hover:glow-secondary cursor-pointer group">
                            <span className="text-3xl">🏆</span>
                            <div>
                                <p className="font-bold group-hover:text-secondary transition-colors">Tournament</p>
                                <p className="text-xs text-text-muted">Ikuti kompetisi</p>
                            </div>
                        </Link>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Active Parties */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">🎮 Party Aktif</h2>
                                <Link href="/party" className="text-sm text-primary hover:underline">Lihat Semua →</Link>
                            </div>
                            <div className="space-y-3">
                                {data.activeParties.length > 0 ? data.activeParties.map((party, i) => (
                                    <motion.div key={party.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                                        <Link href={`/party/${party.id}`} className="card !p-4 block hover:glow-primary">
                                            <div className="flex items-center gap-3">
                                                <GameIcon icon={party.game_icon} name={party.game_name} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold truncate">{party.title}</p>
                                                    <p className="text-xs text-text-muted">{party.game_name} • {party.region}</p>
                                                </div>
                                                <div className={`badge ${party.status === 'open' ? 'badge-success' : 'badge-warning'}`}>
                                                    {party.current_players}/{party.max_players}
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                )) : <p className="text-text-muted text-sm card !p-4">Belum ada party aktif untuk game favoritmu</p>}
                            </div>
                        </div>

                        {/* Active Tournaments */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">🏆 Tournament Aktif</h2>
                                <Link href="/tournament" className="text-sm text-primary hover:underline">Lihat Semua →</Link>
                            </div>
                            <div className="space-y-3">
                                {data.activeTournaments.length > 0 ? data.activeTournaments.map((t, i) => (
                                    <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                                        <Link href={`/tournament/${t.id}`} className="card !p-4 block hover:glow-secondary">
                                            <div className="flex items-center gap-3">
                                                <GameIcon icon={t.game_icon} name={t.game_name} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold truncate">{t.name}</p>
                                                    <p className="text-xs text-text-muted">{t.game_name} • {t.mode}</p>
                                                </div>
                                                <div className={`badge ${t.status === 'registration' ? 'badge-primary' : 'badge-warning'}`}>
                                                    {t.status}
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                )) : <p className="text-text-muted text-sm card !p-4">Belum ada tournament aktif</p>}
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div>
                        <h2 className="text-lg font-bold mb-4">🏅 Leaderboard</h2>
                        <div className="card !p-0 overflow-hidden">
                            {data.leaderboard.map((entry, i) => (
                                <div key={entry.id}
                                    className={`flex items-center gap-4 px-5 py-3 border-b border-border last:border-b-0 ${i < 3 ? 'bg-gradient-to-r from-primary/5 to-transparent' : ''}`}>
                                    <span className={`text-xl font-bold w-8 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-text-muted'}`}>
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold">
                                        {entry.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium flex-1">{entry.username}</span>
                                    <span className="font-bold text-primary">⭐ {entry.arcadia_points.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : <p className="text-text-muted">Gagal memuat dashboard</p>}
        </AppLayout>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="skeleton h-24 w-full" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-20" />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[1, 2].map(i => <div key={i} className="skeleton h-20" />)}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
                {[1, 2].map(i => <div key={i} className="skeleton h-64" />)}
            </div>
        </div>
    );
}
