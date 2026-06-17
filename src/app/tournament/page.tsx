'use client';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import BackButton from '@/components/BackButton';
import GameIcon from '@/components/GameIcon';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Game { id: string; name: string; icon: string }
interface TournamentItem {
    id: string; name: string; description: string; game_name: string; game_icon: string;
    mode: string; format: string; max_participants: number; current_participants: number;
    status: string; prize_pool: string; entry_fee: number; start_date: string; organizer_name: string;
    team_size: number;
}

const formatLabels: Record<string, string> = {
    single_elimination: '⚔️ Single Elim',
    double_elimination: '⚔️ Double Elim',
    battle_royale: '🏝️ Battle Royale',
    round_robin: '🔄 Round Robin',
    time_trial: '⏱️ Time Trial',
};

function teamLabel(mode: string, teamSize: number): string {
    if (mode === 'solo') return '👤 Solo';
    if (teamSize === 2) return '👥 Duo';
    if (teamSize === 3) return '👥 Trio';
    if (teamSize === 4) return '👥 Squad (4)';
    if (teamSize === 5) return '👥 5v5';
    return `👥 ${teamSize}v${teamSize}`;
}

export default function TournamentPage() {
    const { user, loading: authLoading } = useApp();
    const router = useRouter();
    const { t } = useLanguage();
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
            <BackButton fallback="/dashboard" />
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{t('tourney.title')}</h1>
                        <p className="text-text-muted text-sm">{t('tourney.subtitle')}</p>
                    </div>
                    {(user.role === 'organizer' || user.role === 'admin') && (
                        <Link href="/tournament/create" className="btn-primary">{t('tourney.create')}</Link>
                    )}
                </div>

                {/* Game Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button onClick={() => setGameFilter('')}
                        className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${!gameFilter ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
                        {t('tourney.filter_all')}
                    </button>
                    {games.map(g => (
                        <button key={g.id} onClick={() => setGameFilter(g.id)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${gameFilter === g.id ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
                            <GameIcon icon={g.icon} name={g.name} size="sm" /> {g.name}
                        </button>
                    ))}
                </div>

                {/* Tournament List */}
                {loading ? (
                    <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-40" />)}</div>
                ) : tournaments.length > 0 ? (
                    <div className="space-y-4">
                        {tournaments.map((tr, i) => (
                            <motion.div key={tr.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Link href={`/tournament/${tr.id}`} className="card block hover:glow-secondary">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <GameIcon icon={tr.game_icon} name={tr.game_name} size="xl" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-bold">{tr.name}</h3>
                                                    <span className={`badge ${tr.status === 'registration' ? 'badge-primary' : tr.status === 'ongoing' ? 'badge-warning' : 'badge-success'}`}>{tr.status}</span>
                                                </div>
                                                <p className="text-sm text-text-muted line-clamp-1 mb-1.5">{tr.description}</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">{teamLabel(tr.mode, tr.team_size)}</span>
                                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-accent/10 text-accent border border-accent/20">{formatLabels[tr.format] || tr.format}</span>
                                                    <span className="text-xs text-text-muted">🎮 {tr.game_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-text-muted md:text-right">
                                            <div><p className="text-text font-bold">{tr.current_participants}/{tr.max_participants}</p><p className="text-xs">{tr.mode === 'team' ? 'Tim' : t('tourney.participants')}</p></div>
                                            <div><p className="text-text font-bold">{tr.prize_pool || '-'}</p><p className="text-xs">{t('tourney.prize')}</p></div>
                                            <div><p className="text-text font-bold">{tr.entry_fee > 0 ? `${tr.entry_fee} pts` : t('tourney.free')}</p><p className="text-xs">{t('tourney.entry')}</p></div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="card text-center !py-12">
                        <span className="text-5xl block mb-4">🏆</span>
                        <p className="font-bold text-lg mb-1">{t('tourney.no_tournament')}</p>
                        <p className="text-text-muted text-sm">Nantikan tournament seru dari ARCADIA!</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
