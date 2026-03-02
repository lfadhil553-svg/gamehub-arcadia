'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Game { id: string; name: string; icon: string }
interface TournamentItem {
    id: string; name: string; description: string; game_name: string; game_icon: string;
    mode: string; format: string; max_participants: number; current_participants: number;
    status: string; prize_pool: string; entry_fee: number; start_date: string; organizer_name: string;
}

export default function TournamentPage() {
    const { user, loading: authLoading } = useApp();
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameFilter, setGameFilter] = useState('');

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);
    useEffect(() => { fetch('/api/games').then(r => r.json()).then(d => { if (d.success) setGames(d.data); }); }, []);

    const fetchTournaments = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (gameFilter) params.set('game_id', gameFilter);
        const res = await fetch(`/api/tournaments?${params}`);
        const data = await res.json();
        if (data.success) setTournaments(data.data);
        setLoading(false);
    }, [gameFilter]);

    useEffect(() => { if (user) fetchTournaments(); }, [user, fetchTournaments]);

    if (authLoading || !user) return null;

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">🏆 Tournament</h1>
                        <p className="text-text-muted text-sm">Kompetisi seru untuk semua game</p>
                    </div>
                    {(user.role === 'organizer' || user.role === 'admin') && (
                        <Link href="/tournament/create" className="btn-primary">➕ Buat Tournament</Link>
                    )}
                </div>

                {/* Game Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button onClick={() => setGameFilter('')}
                        className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${!gameFilter ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
                        Semua
                    </button>
                    {games.map(g => (
                        <button key={g.id} onClick={() => setGameFilter(g.id)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${gameFilter === g.id ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
                            {g.icon} {g.name}
                        </button>
                    ))}
                </div>

                {/* Tournament List */}
                {loading ? (
                    <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-40" />)}</div>
                ) : tournaments.length > 0 ? (
                    <div className="space-y-4">
                        {tournaments.map((t, i) => (
                            <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Link href={`/tournament/${t.id}`} className="card block hover:glow-secondary">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <GameIcon icon={t.game_icon} name={t.game_name} size="xl" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-bold">{t.name}</h3>
                                                    <span className={`badge ${t.status === 'registration' ? 'badge-primary' : t.status === 'ongoing' ? 'badge-warning' : 'badge-success'}`}>{t.status}</span>
                                                    <span className="badge badge-secondary">{t.mode}</span>
                                                </div>
                                                <p className="text-sm text-text-muted line-clamp-1">{t.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-text-muted md:text-right">
                                            <div><p className="text-text font-bold">{t.current_participants}/{t.max_participants}</p><p className="text-xs">Peserta</p></div>
                                            <div><p className="text-text font-bold">{t.prize_pool || '-'}</p><p className="text-xs">Hadiah</p></div>
                                            <div><p className="text-text font-bold">{t.entry_fee > 0 ? `${t.entry_fee} pts` : 'Gratis'}</p><p className="text-xs">Entry</p></div>
                                            <div><p className="text-text font-bold">{t.format.replace('_', ' ')}</p><p className="text-xs">Format</p></div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="card text-center !py-12">
                        <span className="text-5xl block mb-4">🏆</span>
                        <p className="font-bold text-lg mb-1">Belum Ada Tournament</p>
                        <p className="text-text-muted text-sm">Nantikan tournament seru dari ARCADIA!</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
