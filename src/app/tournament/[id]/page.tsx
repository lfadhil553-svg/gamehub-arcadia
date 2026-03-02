'use client';
import { useState, useEffect, use } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import { motion } from 'framer-motion';

interface TournamentDetail {
    id: string; name: string; description: string; game_name: string; game_icon: string;
    mode: string; format: string; max_participants: number; current_participants: number;
    status: string; prize_pool: string; entry_fee: number; team_size: number;
    registration_start: string; registration_end: string; start_date: string; rules: string;
    organizer_name: string;
    participants: Array<{ user_id: string; username: string; avatar: string; seed: number; status: string }>;
    matches: Array<{ id: string; round: number; match_number: number; player1_id: string; player2_id: string; winner_id: string; score1: number; score2: number; status: string }>;
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [tournament, setTournament] = useState<TournamentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'info' | 'participants' | 'bracket'>('info');

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    const fetchTournament = async () => {
        const res = await fetch(`/api/tournaments/${id}`);
        const data = await res.json();
        if (data.success) setTournament(data.data);
        setLoading(false);
    };

    useEffect(() => { if (user) fetchTournament(); }, [user, id]);

    const isRegistered = tournament?.participants.some(p => p.user_id === user?.id);

    const registerTournament = async () => {
        const res = await fetch(`/api/tournaments/${id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'success'); fetchTournament(); }
        else addToast(data.error, 'error');
    };

    if (authLoading || !user) return null;

    return (
        <AppLayout>
            {loading ? <div className="skeleton h-96" /> : tournament ? (
                <div className="space-y-6">
                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="card bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/20">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <GameIcon icon={tournament.game_icon} name={tournament.game_name} size="xl" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h1 className="text-2xl font-bold">{tournament.name}</h1>
                                    <span className={`badge ${tournament.status === 'registration' ? 'badge-primary' : tournament.status === 'ongoing' ? 'badge-warning' : 'badge-success'}`}>{tournament.status}</span>
                                </div>
                                <p className="text-text-muted text-sm">{tournament.game_name} • {tournament.mode} • {tournament.format.replace('_', ' ')}</p>
                                <p className="text-text-muted text-xs mt-1">by {tournament.organizer_name}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {tournament.status === 'registration' && !isRegistered && (
                                    <button onClick={registerTournament} className="btn-primary">
                                        🏆 Daftar {tournament.entry_fee > 0 ? `(${tournament.entry_fee} pts)` : '(Gratis)'}
                                    </button>
                                )}
                                {isRegistered && <div className="badge badge-success">✓ Terdaftar</div>}
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card !p-4 text-center"><p className="text-2xl font-bold">{tournament.current_participants}/{tournament.max_participants}</p><p className="text-xs text-text-muted">Peserta</p></div>
                        <div className="card !p-4 text-center"><p className="text-2xl font-bold gradient-text">{tournament.prize_pool || '-'}</p><p className="text-xs text-text-muted">Hadiah</p></div>
                        <div className="card !p-4 text-center"><p className="text-2xl font-bold">{tournament.team_size}</p><p className="text-xs text-text-muted">Team Size</p></div>
                        <div className="card !p-4 text-center"><p className="text-2xl font-bold">{tournament.entry_fee > 0 ? tournament.entry_fee : 'Free'}</p><p className="text-xs text-text-muted">Entry Fee</p></div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-border pb-2">
                        {(['info', 'participants', 'bracket'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`px-4 py-2 rounded-t-xl text-sm font-medium transition-all ${tab === t ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}>
                                {t === 'info' ? '📋 Info' : t === 'participants' ? '👥 Peserta' : '🏟️ Bracket'}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {tab === 'info' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                            <h3 className="font-bold mb-3">📋 Informasi Tournament</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-text-muted">Game</span><span>{tournament.game_name}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Mode</span><span>{tournament.mode}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Format</span><span>{tournament.format.replace('_', ' ')}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Registrasi</span><span>{new Date(tournament.registration_end).toLocaleDateString('id')}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Mulai</span><span>{new Date(tournament.start_date).toLocaleDateString('id')}</span></div>
                            </div>
                            {tournament.description && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <h4 className="font-medium mb-2">Deskripsi</h4>
                                    <p className="text-sm text-text-muted">{tournament.description}</p>
                                </div>
                            )}
                            {tournament.rules && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <h4 className="font-medium mb-2">Rules</h4>
                                    <p className="text-sm text-text-muted whitespace-pre-line">{tournament.rules}</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {tab === 'participants' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                            <h3 className="font-bold mb-3">👥 Peserta ({tournament.participants.length})</h3>
                            {tournament.participants.length > 0 ? (
                                <div className="space-y-2">
                                    {tournament.participants.map((p, i) => (
                                        <div key={p.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-light transition-colors">
                                            <span className="text-text-muted font-bold w-6 text-center">#{i + 1}</span>
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold">
                                                {p.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium flex-1">{p.username}</span>
                                            <span className={`badge ${p.status === 'winner' ? 'badge-success' : p.status === 'eliminated' ? 'badge-danger' : 'badge-primary'}`}>{p.status}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-text-muted text-sm">Belum ada peserta</p>}
                        </motion.div>
                    )}

                    {tab === 'bracket' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                            <h3 className="font-bold mb-3">🏟️ Bracket</h3>
                            {tournament.matches.length > 0 ? (
                                <div className="space-y-4">
                                    {Array.from(new Set(tournament.matches.map(m => m.round))).sort().map(round => (
                                        <div key={round}>
                                            <h4 className="text-sm font-medium text-text-muted mb-2">Round {round}</h4>
                                            <div className="grid md:grid-cols-2 gap-2">
                                                {tournament.matches.filter(m => m.round === round).map(match => (
                                                    <div key={match.id} className="p-3 rounded-xl bg-surface-light border border-border">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className={match.winner_id === match.player1_id ? 'text-success font-bold' : ''}>
                                                                {tournament.participants.find(p => p.user_id === match.player1_id)?.username || 'TBD'}
                                                            </span>
                                                            <span className="text-text-muted">{match.score1 ?? '-'} : {match.score2 ?? '-'}</span>
                                                            <span className={match.winner_id === match.player2_id ? 'text-success font-bold' : ''}>
                                                                {tournament.participants.find(p => p.user_id === match.player2_id)?.username || 'TBD'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-text-muted">
                                    <span className="text-4xl block mb-2">🏟️</span>
                                    <p>Bracket akan ditampilkan setelah tournament dimulai</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            ) : <p className="text-text-muted">Tournament tidak ditemukan</p>}
        </AppLayout>
    );
}
