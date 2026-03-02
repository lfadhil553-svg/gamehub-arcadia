'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import { motion } from 'framer-motion';

interface ProfileData {
    user: { id: string; username: string; email: string; avatar: string; role: string; arcadia_points: number; reputation_score: number; referral_code: string; created_at: string };
    games: Array<{ game_name: string; game_icon: string; rank_name: string; rank_icon: string; role_name: string; role_icon: string; is_favorite: number }>;
    stats: { parties_joined: number; tournaments_played: number; tournaments_won: number; win_rate: number; avg_rating: number; total_ratings: number };
}

export default function ProfilePage() {
    const { user, loading: authLoading, logout } = useApp();
    const router = useRouter();
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);
    useEffect(() => {
        if (user) {
            fetch('/api/profile').then(r => r.json()).then(d => {
                if (d.success) setData(d.data);
                setLoading(false);
            });
        }
    }, [user]);

    if (authLoading || !user) return null;

    return (
        <AppLayout>
            {loading ? <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}</div> : data ? (
                <div className="space-y-6 max-w-3xl mx-auto">
                    {/* Profile Header */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="card text-center !p-8">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-5xl font-bold mx-auto mb-4 glow-primary">
                            {data.user.username.charAt(0).toUpperCase()}
                        </div>
                        <h1 className="text-2xl font-bold mb-1">{data.user.username}</h1>
                        <p className="text-text-muted text-sm mb-2">{data.user.email}</p>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="badge badge-primary">{data.user.role}</span>
                            <span className="text-sm text-text-muted">Bergabung {new Date(data.user.created_at).toLocaleDateString('id')}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-light border border-border text-sm">
                            <span>🔗 Referral:</span>
                            <span className="font-mono font-bold text-primary">{data.user.referral_code}</span>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Points', value: data.user.arcadia_points.toLocaleString(), icon: '⭐' },
                            { label: 'Reputation', value: data.stats.avg_rating.toFixed(1), icon: '💎' },
                            { label: 'Party Joined', value: data.stats.parties_joined, icon: '🎮' },
                            { label: 'Win Rate', value: `${data.stats.win_rate}%`, icon: '🏆' },
                        ].map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className="card !p-4 text-center">
                                <span className="text-2xl block mb-1">{s.icon}</span>
                                <p className="text-xl font-bold">{s.value}</p>
                                <p className="text-xs text-text-muted">{s.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Games */}
                    <div className="card">
                        <h3 className="font-bold mb-4">🎮 Game Saya</h3>
                        {data.games.length > 0 ? (
                            <div className="space-y-3">
                                {data.games.map((game, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-light">
                                        <GameIcon icon={game.game_icon} name={game.game_name} size="lg" />
                                        <div className="flex-1">
                                            <p className="font-medium">{game.game_name} {game.is_favorite ? '❤️' : ''}</p>
                                            <div className="flex items-center gap-3 text-xs text-text-muted">
                                                {game.rank_name && <span>{game.rank_icon} {game.rank_name}</span>}
                                                {game.role_name && <span>{game.role_icon} {game.role_name}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-text-muted text-sm">Belum ada game. <button onClick={() => router.push('/onboarding')} className="text-primary hover:underline">Tambah game →</button></p>}
                    </div>

                    {/* More Stats */}
                    <div className="card">
                        <h3 className="font-bold mb-4">📊 Statistik Detail</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-text-muted">Tournament Dimainkan</span><span>{data.stats.tournaments_played}</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">Tournament Menang</span><span className="text-success">{data.stats.tournaments_won}</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">Win Rate</span><span>{data.stats.win_rate}%</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">Total Rating</span><span>{data.stats.total_ratings} reviews</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">Rating Rata-rata</span><span>⭐ {data.stats.avg_rating}</span></div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={() => router.push('/onboarding')} className="btn-secondary flex-1">🎮 Edit Game</button>
                        <button onClick={() => { logout(); router.push('/'); }} className="btn-danger flex-1">🚪 Logout</button>
                    </div>
                </div>
            ) : <p className="text-text-muted">Gagal memuat profil</p>}
        </AppLayout>
    );
}
