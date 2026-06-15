'use client';
import { useState, useEffect, use } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import PlayerAvatar from '@/components/PlayerAvatar';
import { motion } from 'framer-motion';
import BackButton from '@/components/BackButton';

interface TournamentDetail {
    id: string; name: string; description: string; game_name: string; game_icon: string;
    mode: string; format: string; max_participants: number; current_participants: number;
    status: string; prize_pool: string; entry_fee: number; team_size: number;
    registration_start: string; registration_end: string; start_date: string; rules: string;
    organizer_name: string;
    participants: Array<{ user_id: string; username: string; avatar: string; seed: number; status: string }>;
    matches: Array<{
        id: string; round: number; match_number: number;
        player1_id: string; player2_id: string; winner_id: string;
        player1_name: string | null; player2_name: string | null; winner_name: string | null;
        score1: number | null; score2: number | null; status: string; scheduled_at: string | null;
    }>;
}

const formatLabels: Record<string, string> = {
    single_elimination: '⚔️ Single Elimination',
    double_elimination: '⚔️ Double Elimination',
    battle_royale: '🏝️ Battle Royale',
    round_robin: '🔄 Round Robin',
    time_trial: '⏱️ Time Trial',
};

function teamLabel(mode: string, teamSize: number): string {
    if (mode === 'solo') return '👤 Solo';
    if (teamSize === 2) return '👥 Duo';
    if (teamSize === 3) return '👥 Trio (3 pemain)';
    if (teamSize === 4) return '👥 Squad (4 pemain)';
    if (teamSize === 5) return '👥 5v5 (5 pemain)';
    return `👥 ${teamSize} pemain/tim`;
}

function formatSchedule(dateStr: string | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' });
}

function roundLabel(round: number, totalRounds: number, format: string): string {
    const isElim = format.includes('elimination');
    if (isElim) {
        if (round === totalRounds) return '🏆 Grand Final';
        if (round === totalRounds - 1) return '⚔️ Semi Final';
        if (round === totalRounds - 2 && totalRounds > 2) return '⚔️ Quarter Final';
    }
    if (format === 'battle_royale') return `🏝️ Ronde ${round}`;
    if (format === 'time_trial') return '⏱️ Time Trial Slots';
    return `📋 Round ${round}`;
}

const statusBadge: Record<string, { class: string; label: string }> = {
    pending: { class: 'badge-secondary', label: '⏳ Pending' },
    ongoing: { class: 'badge-warning', label: '🔴 Live' },
    completed: { class: 'badge-success', label: '✅ Selesai' },
};

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [tournament, setTournament] = useState<TournamentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [tab, setTab] = useState<'info' | 'participants' | 'bracket' | 'schedule'>('info');

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    const fetchTournament = async () => {
        const res = await fetch(`/api/tournaments/${id}`);
        const data = await res.json();
        if (data.success) setTournament(data.data);
        setLoading(false);
    };

    useEffect(() => { if (user) fetchTournament(); }, [user, id]);

    const isRegistered = tournament?.participants.some(p => p.user_id === user?.id);
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const registerTournament = async () => {
        const res = await fetch(`/api/tournaments/${id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'success'); fetchTournament(); }
        else addToast(data.error, 'error');
    };

    const startTournament = async () => {
        if (!confirm('Mulai tournament sekarang? Bracket akan di-generate otomatis.')) return;
        setStarting(true);
        const res = await fetch(`/api/tournaments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start' }),
        });
        const data = await res.json();
        setStarting(false);
        if (data.success) { addToast(data.message, 'success'); fetchTournament(); setTab('bracket'); }
        else addToast(data.error, 'error');
    };

    if (authLoading || !user) return null;

    const totalRounds = tournament?.matches.length ? Math.max(...tournament.matches.map(m => m.round)) : 0;

    return (
        <AppLayout>
            <BackButton fallback="/tournament" />
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
                                <p className="text-text-muted text-sm">
                                    {tournament.game_name} • {teamLabel(tournament.mode, tournament.team_size)} • {formatLabels[tournament.format] || tournament.format}
                                </p>
                                <p className="text-text-muted text-xs mt-1">by {tournament.organizer_name}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {tournament.status === 'registration' && !isRegistered && (
                                    <button onClick={registerTournament} className="btn-primary">
                                        🏆 Daftar {tournament.entry_fee > 0 ? `(${tournament.entry_fee} pts)` : '(Gratis)'}
                                    </button>
                                )}
                                {isRegistered && <div className="badge badge-success">✓ Terdaftar</div>}
                                {/* Admin: Start Tournament */}
                                {isAdmin && (tournament.status === 'registration' || tournament.status === 'draft') && (
                                    <button onClick={startTournament} disabled={starting}
                                        className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50">
                                        {starting ? '⏳ Generating...' : '🚀 Mulai Tournament'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card !p-4 text-center"><p className="text-2xl font-bold">{tournament.current_participants}/{tournament.max_participants}</p><p className="text-xs text-text-muted">{tournament.mode === 'team' ? 'Tim' : 'Peserta'}</p></div>
                        <div className="card !p-4 text-center"><p className="text-2xl font-bold gradient-text">{tournament.prize_pool || '-'}</p><p className="text-xs text-text-muted">Hadiah</p></div>
                        <div className="card !p-4 text-center"><p className="text-2xl font-bold">{tournament.mode === 'solo' ? 'Solo' : `${tournament.team_size}v${tournament.team_size}`}</p><p className="text-xs text-text-muted">Mode</p></div>
                        <div className="card !p-4 text-center"><p className="text-2xl font-bold">{tournament.matches.length}</p><p className="text-xs text-text-muted">Total Match</p></div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto border-b border-border pb-2">
                        {(['info', 'participants', 'bracket', 'schedule'] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`shrink-0 px-4 py-2 rounded-t-xl text-sm font-medium transition-all ${tab === t ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}>
                                {t === 'info' ? '📋 Info' : t === 'participants' ? `👥 Peserta (${tournament.participants.length})` : t === 'bracket' ? '🏟️ Bracket' : '📅 Jadwal'}
                            </button>
                        ))}
                    </div>

                    {/* Info Tab */}
                    {tab === 'info' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                            <h3 className="font-bold mb-3">📋 Informasi Tournament</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-text-muted">Game</span><span>{tournament.game_name}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Mode</span><span>{teamLabel(tournament.mode, tournament.team_size)}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Format</span><span>{formatLabels[tournament.format] || tournament.format}</span></div>
                                {tournament.mode === 'team' && (
                                    <div className="flex justify-between"><span className="text-text-muted">Komposisi Tim</span><span>{tournament.team_size} pemain / tim</span></div>
                                )}
                                {tournament.mode === 'team' && (
                                    <div className="flex justify-between"><span className="text-text-muted">Total Pemain</span><span>{tournament.max_participants} tim × {tournament.team_size} = {tournament.max_participants * tournament.team_size} pemain</span></div>
                                )}
                                <div className="flex justify-between"><span className="text-text-muted">Status</span><span className={`badge ${tournament.status === 'registration' ? 'badge-primary' : tournament.status === 'ongoing' ? 'badge-warning' : 'badge-success'}`}>{tournament.status}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Registrasi</span><span>s/d {new Date(tournament.registration_end).toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Mulai</span><span>{new Date(tournament.start_date).toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                                {tournament.matches.length > 0 && (
                                    <div className="flex justify-between"><span className="text-text-muted">Total Match</span><span>{tournament.matches.length} pertandingan • {totalRounds} ronde</span></div>
                                )}
                            </div>
                            {tournament.description && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <h4 className="font-medium mb-2">Deskripsi</h4>
                                    <p className="text-sm text-text-muted">{tournament.description}</p>
                                </div>
                            )}
                            {tournament.rules && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <h4 className="font-medium mb-2">📜 Peraturan</h4>
                                    <div className="text-sm text-text-muted whitespace-pre-line bg-surface-light p-4 rounded-xl border border-border">{tournament.rules}</div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Participants Tab */}
                    {tab === 'participants' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div className="card">
                                <h3 className="font-bold mb-3">👥 Peserta ({tournament.participants.length}/{tournament.max_participants})</h3>
                                {tournament.participants.length > 0 ? (
                                    <div className="space-y-1">
                                        {tournament.participants.map((p, i) => {
                                            // Count matches this player is in
                                            const playerMatches = tournament.matches.filter(m =>
                                                m.player1_id === p.user_id || m.player2_id === p.user_id
                                            );
                                            const wins = playerMatches.filter(m => m.winner_id === p.user_id).length;
                                            const losses = playerMatches.filter(m => m.status === 'completed' && m.winner_id && m.winner_id !== p.user_id).length;

                                            return (
                                                <div key={p.user_id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${p.status === 'eliminated' ? 'opacity-50' : 'hover:bg-surface-light'}`}>
                                                    <span className="text-text-muted font-bold w-8 text-center text-sm">#{i + 1}</span>
                                                    <PlayerAvatar avatar={p.avatar} username={p.username} size="sm" className="w-8 h-8 text-xs" />
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-medium">{p.username}</span>
                                                        {tournament.matches.length > 0 && (
                                                            <p className="text-xs text-text-muted">
                                                                {wins}W {losses}L • {playerMatches.length} match
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`badge text-xs ${p.status === 'winner' ? 'badge-success' : p.status === 'eliminated' ? 'badge-danger' : p.status === 'checked_in' ? 'badge-primary' : 'badge-secondary'}`}>
                                                        {p.status === 'winner' ? '🏆 Winner' : p.status === 'eliminated' ? '❌ Eliminated' : p.status === 'checked_in' ? '✅ Active' : '📝 Registered'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <p className="text-text-muted text-sm">Belum ada peserta</p>}
                            </div>
                        </motion.div>
                    )}

                    {/* Bracket Tab */}
                    {tab === 'bracket' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            {tournament.matches.length > 0 ? (
                                Array.from(new Set(tournament.matches.map(m => m.round))).sort((a, b) => a - b).map(round => {
                                    const roundMatches = tournament.matches.filter(m => m.round === round);
                                    return (
                                        <div key={round} className="card">
                                            <h4 className="font-bold mb-3 flex items-center gap-2">
                                                <span>{roundLabel(round, totalRounds, tournament.format)}</span>
                                                <span className="text-xs text-text-muted font-normal">({roundMatches.length} match)</span>
                                            </h4>
                                            <div className="grid md:grid-cols-2 gap-3">
                                                {roundMatches.map(match => {
                                                    const isBR = match.player1_id === 'LOBBY';
                                                    const isTT = tournament.format === 'time_trial';

                                                    if (isBR) {
                                                        return (
                                                            <div key={match.id} className="p-4 rounded-xl bg-surface-light border border-border col-span-full">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="font-bold">🏝️ Lobby Ronde {match.round}</p>
                                                                        <p className="text-xs text-text-muted">{match.player2_id}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className={`badge ${statusBadge[match.status]?.class || 'badge-secondary'}`}>
                                                                            {statusBadge[match.status]?.label || match.status}
                                                                        </span>
                                                                        {match.scheduled_at && <p className="text-xs text-text-muted mt-1">📅 {formatSchedule(match.scheduled_at)}</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (isTT) {
                                                        return (
                                                            <div key={match.id} className="p-3 rounded-xl bg-surface-light border border-border">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs text-text-muted">#{match.match_number}</span>
                                                                        <span className="font-medium">{match.player1_name || 'TBD'}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        {match.score1 !== null && <span className="font-bold text-primary mr-2">{match.score1}s</span>}
                                                                        <span className={`badge text-xs ${statusBadge[match.status]?.class || 'badge-secondary'}`}>
                                                                            {statusBadge[match.status]?.label || match.status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {match.scheduled_at && <p className="text-xs text-text-muted mt-1">📅 {formatSchedule(match.scheduled_at)}</p>}
                                                            </div>
                                                        );
                                                    }

                                                    // Standard match card
                                                    return (
                                                        <div key={match.id} className={`p-4 rounded-xl border transition-all ${match.status === 'ongoing' ? 'bg-warning/5 border-warning/40' : match.status === 'completed' ? 'bg-surface-light border-success/30' : 'bg-surface-light border-border'}`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs text-text-muted">Match #{match.match_number}</span>
                                                                <span className={`badge text-xs ${statusBadge[match.status]?.class || 'badge-secondary'}`}>
                                                                    {statusBadge[match.status]?.label || match.status}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className={`flex items-center justify-between p-2 rounded-lg ${match.winner_id === match.player1_id ? 'bg-success/10 border border-success/30' : ''}`}>
                                                                    <span className={`font-medium ${match.winner_id === match.player1_id ? 'text-success' : ''}`}>
                                                                        {match.player1_name || 'TBD'}
                                                                    </span>
                                                                    <span className="font-bold">{match.score1 ?? '-'}</span>
                                                                </div>
                                                                <div className="text-center text-xs text-text-muted">VS</div>
                                                                <div className={`flex items-center justify-between p-2 rounded-lg ${match.winner_id === match.player2_id ? 'bg-success/10 border border-success/30' : ''}`}>
                                                                    <span className={`font-medium ${match.winner_id === match.player2_id ? 'text-success' : ''}`}>
                                                                        {match.player2_name || 'TBD'}
                                                                    </span>
                                                                    <span className="font-bold">{match.score2 ?? '-'}</span>
                                                                </div>
                                                            </div>
                                                            {match.scheduled_at && (
                                                                <p className="text-xs text-text-muted mt-2">📅 {formatSchedule(match.scheduled_at)}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="card text-center py-12 text-text-muted">
                                    <span className="text-5xl block mb-3">🏟️</span>
                                    {tournament.status === 'registration' ? (
                                        <>
                                            <p className="font-medium mb-1">Bracket belum di-generate</p>
                                            <p className="text-sm">
                                                {isAdmin
                                                    ? 'Klik "🚀 Mulai Tournament" di header untuk generate bracket dan memulai tournament.'
                                                    : 'Bracket akan muncul setelah admin memulai tournament.'}
                                            </p>
                                        </>
                                    ) : (
                                        <p>Belum ada data pertandingan</p>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Schedule Tab */}
                    {tab === 'schedule' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            {tournament.matches.length > 0 ? (
                                <div className="card">
                                    <h3 className="font-bold mb-4">📅 Jadwal Pertandingan</h3>
                                    <div className="space-y-3">
                                        {tournament.matches
                                            .filter(m => m.player1_id !== 'LOBBY')
                                            .sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''))
                                            .map(match => (
                                                <div key={match.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all ${match.status === 'ongoing' ? 'bg-warning/5 border-warning/40' : match.status === 'completed' ? 'bg-surface-light border-success/20' : 'bg-surface-light border-border'}`}>
                                                    <div className="shrink-0 text-center sm:text-left">
                                                        <p className="text-xs text-text-muted">{roundLabel(match.round, totalRounds, tournament.format)}</p>
                                                        <p className="text-xs text-text-muted">Match #{match.match_number}</p>
                                                    </div>
                                                    <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
                                                        <span className={`font-medium text-sm truncate ${match.winner_id === match.player1_id ? 'text-success font-bold' : ''}`}>
                                                            {match.player1_name || 'TBD'}
                                                        </span>
                                                        {tournament.format !== 'time_trial' && (
                                                            <>
                                                                <span className="text-text-muted font-bold text-xs px-2 py-1 rounded bg-surface border border-border">
                                                                    {match.score1 ?? '-'} : {match.score2 ?? '-'}
                                                                </span>
                                                                <span className={`font-medium text-sm truncate ${match.winner_id === match.player2_id ? 'text-success font-bold' : ''}`}>
                                                                    {match.player2_name || 'TBD'}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="shrink-0 flex items-center gap-2 justify-center sm:justify-end">
                                                        {match.scheduled_at && (
                                                            <span className="text-xs text-text-muted">📅 {formatSchedule(match.scheduled_at)}</span>
                                                        )}
                                                        <span className={`badge text-xs ${statusBadge[match.status]?.class || 'badge-secondary'}`}>
                                                            {statusBadge[match.status]?.label || match.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                    {/* BR lobbies */}
                                    {tournament.matches.filter(m => m.player1_id === 'LOBBY').length > 0 && (
                                        <div className="mt-6 pt-4 border-t border-border">
                                            <h4 className="font-bold mb-3">🏝️ Battle Royale Lobbies</h4>
                                            <div className="space-y-2">
                                                {tournament.matches.filter(m => m.player1_id === 'LOBBY').map(m => (
                                                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-light border border-border">
                                                        <div>
                                                            <p className="font-medium">Ronde {m.round}</p>
                                                            <p className="text-xs text-text-muted">{m.player2_id}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`badge text-xs ${statusBadge[m.status]?.class || 'badge-secondary'}`}>
                                                                {statusBadge[m.status]?.label || m.status}
                                                            </span>
                                                            {m.scheduled_at && <p className="text-xs text-text-muted mt-1">📅 {formatSchedule(m.scheduled_at)}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="card text-center py-12 text-text-muted">
                                    <span className="text-5xl block mb-3">📅</span>
                                    <p className="font-medium mb-1">Jadwal belum tersedia</p>
                                    <p className="text-sm">Jadwal match akan muncul setelah tournament dimulai.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            ) : <p className="text-text-muted">Tournament tidak ditemukan</p>}
        </AppLayout>
    );
}
