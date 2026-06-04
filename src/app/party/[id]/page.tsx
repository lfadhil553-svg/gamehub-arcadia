'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import PlayerAvatar from '@/components/PlayerAvatar';
import { motion, AnimatePresence } from 'framer-motion';

interface PartyDetail {
    id: string; title: string; description: string; game_name: string; game_icon: string;
    current_players: number; max_players: number; status: string; region: string;
    creator_name: string; creator_id: string; created_at: string;
    members: Array<{ user_id: string; username: string; avatar: string; role: string; reputation_score: number }>;
    chat: Array<{ id: string; user_id: string; username: string; avatar: string; message: string; created_at: string }>;
}

interface SearchPlayer { id: string; username: string; avatar: string; arcadia_points: number }

const GAME_LINKS: Record<string, { label: string; url: string; color: string }> = {
    'valorant': { label: 'Launch Valorant', url: 'https://playvalorant.com/play', color: 'from-red-500 to-red-700' },
    'mobile-legends': { label: 'Buka Mobile Legends', url: 'https://play.google.com/store/apps/details?id=com.mobile.legends', color: 'from-blue-500 to-blue-700' },
    'pubg-mobile': { label: 'Buka PUBG Mobile', url: 'https://play.google.com/store/apps/details?id=com.tencent.ig', color: 'from-amber-500 to-orange-700' },
    'genshin-impact': { label: 'Launch Genshin Impact', url: 'https://genshin.hoyoverse.com/launcher', color: 'from-cyan-400 to-blue-600' },
    'free-fire': { label: 'Buka Free Fire', url: 'https://play.google.com/store/apps/details?id=com.dts.freefireth', color: 'from-yellow-500 to-amber-600' },
    'apex-legends': { label: 'Launch Apex Legends', url: 'https://www.ea.com/games/apex-legends', color: 'from-red-600 to-red-800' },
};

export default function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [party, setParty] = useState<PartyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchPlayer[]>([]);
    const [searching, setSearching] = useState(false);
    const [kickingId, setKickingId] = useState<string | null>(null);
    const [launching, setLaunching] = useState(false);
    const [gameSlug, setGameSlug] = useState('');
    const [showLaunchOverlay, setShowLaunchOverlay] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    const fetchParty = async () => {
        const res = await fetch(`/api/parties/${id}`);
        const data = await res.json();
        if (data.success) setParty(data.data);
        setLoading(false);
    };

    useEffect(() => { if (user) fetchParty(); }, [user, id]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [party?.chat]);

    // Poll for updates
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(fetchParty, 5000);
        return () => clearInterval(interval);
    }, [user, id]);

    const isMember = party?.members.some(m => m.user_id === user?.id);
    const isLeader = party?.creator_id === user?.id;
    const myRole = party?.members.find(m => m.user_id === user?.id)?.role;
    const myReady = myRole === 'ready' || myRole === 'leader_ready';
    const allReady = party?.members.every(m => m.role === 'ready' || m.role === 'leader_ready');
    const readyCount = party?.members.filter(m => m.role === 'ready' || m.role === 'leader_ready').length || 0;
    const isInGame = party?.status === 'in_game';

    const joinParty = async () => {
        const res = await fetch(`/api/parties/${id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'success'); fetchParty(); }
        else addToast(data.error, 'error');
    };

    const leaveParty = async () => {
        const res = await fetch(`/api/parties/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'info'); fetchParty(); }
        else addToast(data.error, 'error');
    };

    const kickMember = async (targetUserId: string) => {
        setKickingId(targetUserId);
        const res = await fetch(`/api/parties/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'kick', target_user_id: targetUserId }),
        });
        const data = await res.json();
        setKickingId(null);
        if (data.success) { addToast(data.message, 'success'); fetchParty(); }
        else addToast(data.error, 'error');
    };

    const invitePlayer = async (targetUserId: string) => {
        const res = await fetch(`/api/parties/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'invite', target_user_id: targetUserId }),
        });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'success'); fetchParty(); setShowInviteModal(false); setSearchQuery(''); setSearchResults([]); }
        else addToast(data.error, 'error');
    };

    const toggleReady = async () => {
        const res = await fetch(`/api/parties/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ready' }),
        });
        const data = await res.json();
        if (data.success) { addToast(data.message, data.ready ? 'success' : 'info'); fetchParty(); }
        else addToast(data.error, 'error');
    };

    const launchGame = async () => {
        setLaunching(true);
        const res = await fetch(`/api/parties/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'launch' }),
        });
        const data = await res.json();
        setLaunching(false);
        if (data.success) {
            addToast(data.message, 'success');
            setGameSlug(data.game_slug);
            setShowLaunchOverlay(true);
            fetchParty();
        } else addToast(data.error, 'error');
    };

    const endGame = async () => {
        const res = await fetch(`/api/parties/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'end_game' }),
        });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'success'); setShowLaunchOverlay(false); fetchParty(); }
        else addToast(data.error, 'error');
    };

    const searchPlayers = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        const res = await fetch(`/api/players?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
            const memberIds = party?.members.map(m => m.user_id) || [];
            setSearchResults((data.data as SearchPlayer[]).filter(p => !memberIds.includes(p.id)));
        }
        setSearching(false);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || sending) return;
        setSending(true);
        const res = await fetch(`/api/parties/${id}/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
        });
        const data = await res.json();
        setSending(false);
        if (data.success) {
            setMessage('');
            setParty(prev => prev ? { ...prev, chat: [...prev.chat, data.data] } : prev);
        } else addToast(data.error, 'error');
    };

    if (authLoading || !user) return null;

    const currentGameLink = party ? GAME_LINKS[Object.keys(GAME_LINKS).find(k =>
        party.game_name.toLowerCase().includes(k.replace('-', ' ')) || k.includes(party.game_name.toLowerCase().replace(' ', '-'))
    ) || gameSlug || ''] : null;

    return (
        <AppLayout>
            {loading ? <div className="skeleton h-96" /> : party ? (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Party Info */}
                    <div className="lg:col-span-1 space-y-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                            <div className="flex items-center gap-3 mb-4">
                                <GameIcon icon={party.game_icon} name={party.game_name} size="xl" />
                                <div>
                                    <h1 className="text-xl font-bold">{party.title}</h1>
                                    <p className="text-sm text-text-muted">{party.game_name}</p>
                                </div>
                            </div>
                            <p className="text-text-muted text-sm mb-4">{party.description}</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-text-muted">Status</span>
                                    <span className={`badge ${party.status === 'open' ? 'badge-success' : party.status === 'in_game' ? 'badge-warning' : party.status === 'full' ? 'badge-primary' : 'badge-secondary'}`}>
                                        {party.status === 'in_game' ? '🔴 In Game' : party.status}
                                    </span>
                                </div>
                                <div className="flex justify-between"><span className="text-text-muted">Player</span><span>{party.current_players}/{party.max_players}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Region</span><span>{party.region || 'Global'}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Host</span><span>{party.creator_name}</span></div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 space-y-2">
                                {!isMember && party.status === 'open' && (
                                    <button onClick={joinParty} className="btn-primary w-full">🚀 Gabung Party</button>
                                )}
                                {isMember && !isLeader && !isInGame && (
                                    <button onClick={leaveParty} className="btn-danger w-full">🚪 Keluar Party</button>
                                )}
                                {isLeader && (party.status === 'open' || party.status === 'full') && (
                                    <button onClick={() => setShowInviteModal(true)} className="btn-primary w-full">📨 Invite Player</button>
                                )}
                            </div>
                        </motion.div>

                        {/* Ready & Launch Section */}
                        {isMember && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className={`card border-2 ${isInGame ? 'border-warning/50 bg-warning/5' : allReady && party.members.length >= 2 ? 'border-success/50 bg-success/5' : 'border-border'}`}>

                                {isInGame ? (
                                    // In-game state
                                    <div className="text-center space-y-3">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-warning/10 border border-warning/30">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                            </span>
                                            <span className="font-bold text-warning">LIVE — Dalam Game</span>
                                        </div>
                                        <p className="text-sm text-text-muted">Party sedang bermain {party.game_name}</p>

                                        {/* Game Link */}
                                        {currentGameLink && (
                                            <a href={currentGameLink.url} target="_blank" rel="noopener noreferrer"
                                                className={`block w-full py-3 rounded-xl text-white font-bold text-center bg-gradient-to-r ${currentGameLink.color} hover:opacity-90 transition-all shadow-lg`}>
                                                🎮 {currentGameLink.label}
                                            </a>
                                        )}

                                        {isLeader && (
                                            <button onClick={endGame} className="w-full py-2 rounded-xl text-sm bg-surface-light border border-border text-text-muted hover:text-text transition-colors">
                                                🏁 Akhiri Game
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    // Ready-up state
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold">🎮 Ready Up</h3>
                                            <span className="text-sm text-text-muted">{readyCount}/{party.members.length} siap</span>
                                        </div>

                                        {/* Ready progress */}
                                        <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full rounded-full ${allReady ? 'bg-success' : 'bg-primary'}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(readyCount / (party.members.length || 1)) * 100}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>

                                        {/* Ready button */}
                                        <button onClick={toggleReady}
                                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${myReady
                                                ? 'bg-success/20 text-success border-2 border-success/40 hover:bg-success/30'
                                                : 'bg-surface-light border-2 border-border text-text-muted hover:border-primary hover:text-primary'}`}>
                                            {myReady ? '✅ SIAP! (klik untuk batal)' : '⬜ Tekan untuk READY'}
                                        </button>

                                        {/* Launch button - leader only */}
                                        {isLeader && (
                                            <button onClick={launchGame} disabled={launching || !allReady || party.members.length < 2}
                                                className={`w-full py-3 rounded-xl font-bold text-center transition-all shadow-lg ${allReady && party.members.length >= 2
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 animate-pulse'
                                                    : 'bg-surface-light text-text-muted border border-border cursor-not-allowed'}`}>
                                                {launching ? '⏳ Launching...' : allReady && party.members.length >= 2 ? '🚀 LAUNCH GAME!' : `⏳ Menunggu ${party.members.length - readyCount} member...`}
                                            </button>
                                        )}

                                        {!isLeader && allReady && party.members.length >= 2 && (
                                            <p className="text-center text-sm text-success animate-pulse">✨ Semua siap! Menunggu leader launch game...</p>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Members */}
                        <div className="card">
                            <h3 className="font-bold mb-3">👥 Anggota ({party.members.length}/{party.max_players})</h3>
                            <div className="space-y-2">
                                {party.members.map(member => {
                                    const memberReady = member.role === 'ready' || member.role === 'leader_ready';
                                    const memberIsLeader = member.role === 'leader' || member.role === 'leader_ready';
                                    return (
                                        <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light transition-colors">
                                            <div className="relative">
                                                <PlayerAvatar avatar={member.avatar} username={member.username} size="sm" />
                                                {memberReady && (
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-surface flex items-center justify-center text-[8px]">✓</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{member.username}</p>
                                                <p className="text-xs text-text-muted">
                                                    {memberIsLeader ? '👑 Leader' : '🎮 Member'}
                                                    {memberReady && <span className="text-success ml-1">• Ready</span>}
                                                </p>
                                            </div>
                                            <span className="text-xs text-text-muted">⭐ {member.reputation_score?.toFixed(1)}</span>
                                            {isLeader && member.user_id !== user.id && !isInGame && (
                                                <button
                                                    onClick={() => kickMember(member.user_id)}
                                                    disabled={kickingId === member.user_id}
                                                    className="text-xs text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors"
                                                    title="Kick dari party"
                                                >
                                                    {kickingId === member.user_id ? '⏳' : '❌'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Chat */}
                    <div className="lg:col-span-2">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col h-[600px]">
                            <h3 className="font-bold mb-4 pb-3 border-b border-border flex items-center gap-2">
                                💬 Party Chat
                                {isInGame && (
                                    <span className="badge badge-warning text-xs">🔴 In Game</span>
                                )}
                            </h3>

                            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                                {party.chat.length === 0 ? (
                                    <div className="text-center text-text-muted text-sm py-10">
                                        <span className="text-4xl block mb-2">💬</span>
                                        <p>Belum ada pesan. Mulai percakapan!</p>
                                    </div>
                                ) : party.chat.map(msg => {
                                    // System messages (from launch/end game)
                                    const isSystem = msg.message.startsWith('🚀') || msg.message.startsWith('🏁');
                                    if (isSystem) {
                                        return (
                                            <div key={msg.id} className="text-center">
                                                <span className="inline-block px-4 py-2 rounded-xl text-xs bg-primary/10 text-primary border border-primary/20">
                                                    {msg.message}
                                                </span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={msg.id} className={`flex gap-2 ${msg.user_id === user.id ? 'flex-row-reverse' : ''}`}>
                                            <PlayerAvatar avatar={msg.avatar} username={msg.username} size="sm" />
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.user_id === user.id ? 'bg-primary/20 text-text' : 'bg-surface-light'}`}>
                                                {msg.user_id !== user.id && <p className="text-xs font-medium text-primary mb-0.5">{msg.username}</p>}
                                                <p className="text-sm">{msg.message}</p>
                                                <p className="text-[10px] text-text-muted mt-1">{new Date(msg.created_at).toLocaleTimeString('id')}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {isMember ? (
                                <form onSubmit={sendMessage} className="flex gap-2">
                                    <input className="input flex-1" value={message} onChange={e => setMessage(e.target.value)} placeholder="Tulis pesan..." maxLength={500} />
                                    <button type="submit" disabled={sending || !message.trim()} className="btn-primary !px-6">
                                        {sending ? '⏳' : '📩'}
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-3 bg-surface-light rounded-xl text-sm text-text-muted">
                                    Gabung party untuk mulai chat
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            ) : <p className="text-text-muted">Party tidak ditemukan</p>}

            {/* Invite Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowInviteModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="card !p-6 w-full max-w-md max-h-[70vh] flex flex-col"
                            onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold mb-4">📨 Invite Player ke Party</h3>

                            <div className="flex gap-2 mb-4">
                                <input className="input flex-1" placeholder="Cari username..." value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && searchPlayers()} />
                                <button onClick={searchPlayers} disabled={searching} className="btn-primary !px-4">
                                    {searching ? '⏳' : '🔍'}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {searchResults.length > 0 ? searchResults.map(p => (
                                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-light hover:bg-surface transition-colors">
                                        <PlayerAvatar avatar={p.avatar} username={p.username} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{p.username}</p>
                                            <p className="text-xs text-text-muted">⭐ {p.arcadia_points.toLocaleString()} pts</p>
                                        </div>
                                        <button onClick={() => invitePlayer(p.id)} className="btn-primary text-xs !py-1.5 !px-3">
                                            ➕ Invite
                                        </button>
                                    </div>
                                )) : searchQuery ? (
                                    <p className="text-center text-text-muted text-sm py-6">Tidak ada player ditemukan</p>
                                ) : (
                                    <p className="text-center text-text-muted text-sm py-6">Ketik username untuk mencari player</p>
                                )}
                            </div>

                            <button onClick={() => setShowInviteModal(false)} className="mt-4 w-full py-2 text-sm text-text-muted hover:text-text transition-colors">
                                Tutup
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Launch Game Overlay */}
            <AnimatePresence>
                {showLaunchOverlay && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                            className="text-center max-w-lg">
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                                className="text-7xl mb-6">🚀</motion.div>
                            <h2 className="text-3xl font-bold text-white mb-3">Game Launched!</h2>
                            <p className="text-white/70 mb-6">Party sedang dalam game. Buka game kamu dan bergabung dengan teman-temanmu!</p>

                            {currentGameLink && (
                                <a href={currentGameLink.url} target="_blank" rel="noopener noreferrer"
                                    className={`inline-block px-8 py-4 rounded-2xl text-white font-bold text-lg bg-gradient-to-r ${currentGameLink.color} hover:opacity-90 transition-all shadow-2xl mb-4`}>
                                    🎮 {currentGameLink.label}
                                </a>
                            )}

                            <div className="flex gap-3 justify-center mt-4">
                                <button onClick={() => setShowLaunchOverlay(false)}
                                    className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
                                    ← Kembali ke Party
                                </button>
                                {isLeader && (
                                    <button onClick={endGame}
                                        className="px-6 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
                                        🏁 Akhiri Game
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
