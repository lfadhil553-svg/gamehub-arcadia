'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { useLanguage } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import PlayerAvatar from '@/components/PlayerAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPoints } from '@/lib/utils';

interface PlayerGame {
    game_name: string; game_icon: string; rank_name: string; rank_icon: string;
    role_name: string; role_icon: string; is_favorite: number;
}

interface PlayerStats {
    parties_joined: number; tournaments_played: number; tournaments_won: number;
    win_rate: number; avg_rating: number; total_ratings: number;
}

interface FriendUser {
    id: string; username: string; avatar: string; role: string;
    arcadia_points: number; reputation_score?: number; friendship_id?: string;
    friends_since?: string; requested_at?: string; friendship_status?: string;
    created_at?: string; games?: PlayerGame[]; stats?: PlayerStats;
}

export default function FriendsPage() {
    const { user, loading: authLoading, addToast } = useApp();
    const { t } = useLanguage();
    const router = useRouter();
    const [tab, setTab] = useState<'friends' | 'pending' | 'search'>('friends');
    const [friends, setFriends] = useState<FriendUser[]>([]);
    const [incoming, setIncoming] = useState<FriendUser[]>([]);
    const [outgoing, setOutgoing] = useState<FriendUser[]>([]);
    const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    const fetchFriends = useCallback(async () => {
        setLoading(true);
        const [fRes, pRes] = await Promise.all([
            fetch('/api/friends?tab=friends'),
            fetch('/api/friends?tab=pending'),
        ]);
        const fData = await fRes.json();
        const pData = await pRes.json();
        if (fData.success) setFriends(fData.data);
        if (pData.success) { setIncoming(pData.data.incoming); setOutgoing(pData.data.outgoing); }
        setLoading(false);
    }, []);

    useEffect(() => { if (user) fetchFriends(); }, [user, fetchFriends]);

    const searchPlayers = async () => {
        if (searchQuery.length < 2) { addToast(t('friends.search_min'), 'error'); return; }
        setSearching(true);
        setExpandedPlayer(null);
        const res = await fetch(`/api/players?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) setSearchResults(data.data);
        setSearching(false);
    };

    const sendRequest = async (targetId: string) => {
        const res = await fetch('/api/friends', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_user_id: targetId }),
        });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'success'); searchPlayers(); fetchFriends(); }
        else addToast(data.error, 'error');
    };

    const respondRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
        const res = await fetch('/api/friends', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendship_id: friendshipId, action }),
        });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'success'); fetchFriends(); }
        else addToast(data.error, 'error');
    };

    const removeFriend = async (friendshipId: string) => {
        const res = await fetch(`/api/friends?id=${friendshipId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { addToast(data.message, 'success'); fetchFriends(); }
        else addToast(data.error, 'error');
    };

    if (authLoading || !user) return null;

    const tabs = [
        { key: 'friends' as const, label: t('friends.tab_friends'), count: friends.length },
        { key: 'pending' as const, label: t('friends.tab_pending'), count: incoming.length },
        { key: 'search' as const, label: t('friends.tab_search'), count: 0 },
    ];

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">{t('friends.title')}</h1>
                    <p className="text-text-muted text-sm">{t('friends.subtitle')}</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${tab === t.key ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
                            {t.label}
                            {t.count > 0 && <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* Friends Tab */}
                    {tab === 'friends' && (
                        <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {loading ? (
                                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20" />)}</div>
                            ) : friends.length > 0 ? (
                                <div className="grid md:grid-cols-2 gap-4">
                                    {friends.map((f, i) => (
                                        <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            className="card !p-4 flex items-center gap-4">
                                            <PlayerAvatar avatar={f.avatar} username={f.username} size="lg" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold truncate">{f.username}</p>
                                                    <span className={`badge text-xs ${f.role === 'superadmin' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black' : f.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>
                                                        {f.role === 'superadmin' ? '👑' : f.role}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-text-muted">⭐ {formatPoints(f.arcadia_points)} pts</p>
                                            </div>
                                            <button onClick={() => removeFriend(f.friendship_id!)} className="text-xs text-danger hover:underline shrink-0">{t('friends.remove')}</button>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="card text-center !py-12">
                                    <span className="text-5xl block mb-4">👥</span>
                                    <p className="font-bold text-lg mb-1">{t('friends.no_friends')}</p>
                                    <p className="text-text-muted text-sm mb-4">{t('friends.no_friends_desc')}</p>
                                    <button onClick={() => setTab('search')} className="btn-primary">{t('friends.find_player')}</button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Pending Tab */}
                    {tab === 'pending' && (
                        <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div>
                                <h3 className="font-bold mb-3">{t('friends.incoming')} ({incoming.length})</h3>
                                {incoming.length > 0 ? (
                                    <div className="space-y-3">
                                        {incoming.map(r => (
                                            <div key={r.friendship_id} className="card !p-4 flex items-center gap-4">
                                                <PlayerAvatar avatar={r.avatar} username={r.username} size="md" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold">{r.username}</p>
                                                    <p className="text-xs text-text-muted">⭐ {formatPoints(r.arcadia_points)} pts</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => respondRequest(r.friendship_id!, 'accept')} className="btn-primary text-xs !py-1 !px-3">{t('friends.accept')}</button>
                                                    <button onClick={() => respondRequest(r.friendship_id!, 'reject')} className="btn-secondary text-xs !py-1 !px-3">{t('friends.reject')}</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-text-muted text-sm">{t('friends.no_incoming')}</p>}
                            </div>
                            <div>
                                <h3 className="font-bold mb-3">{t('friends.outgoing')} ({outgoing.length})</h3>
                                {outgoing.length > 0 ? (
                                    <div className="space-y-3">
                                        {outgoing.map(r => (
                                            <div key={r.friendship_id} className="card !p-4 flex items-center gap-4">
                                                <PlayerAvatar avatar={r.avatar} username={r.username} size="md" />
                                                <div className="flex-1">
                                                    <p className="font-bold">{r.username}</p>
                                                    <p className="text-xs text-text-muted">{t('friends.waiting')}</p>
                                                </div>
                                                <span className="badge badge-warning text-xs">{t('friends.pending')}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-text-muted text-sm">{t('friends.no_outgoing')}</p>}
                            </div>
                        </motion.div>
                    )}

                    {/* Search Tab */}
                    {tab === 'search' && (
                        <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <div className="flex gap-3">
                                <input className="input flex-1" placeholder={t('friends.search_placeholder')} value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') searchPlayers(); }} />
                                <button onClick={searchPlayers} disabled={searching} className="btn-primary shrink-0">
                                    {searching ? '⏳' : '🔍'} {t('friends.search_btn')}
                                </button>
                            </div>

                            {searchResults.length > 0 ? (
                                <div className="space-y-3">
                                    {searchResults.map((p, i) => (
                                        <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            className="card !p-0 overflow-hidden">
                                            {/* Player Header - clickable to expand */}
                                            <button onClick={() => setExpandedPlayer(expandedPlayer === p.id ? null : p.id)}
                                                className="w-full flex items-center gap-4 p-4 hover:bg-surface-light/50 transition-colors text-left">
                                                <PlayerAvatar avatar={p.avatar} username={p.username} size="xl" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="font-bold text-lg">{p.username}</p>
                                                        <span className={`badge text-xs ${p.role === 'superadmin' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black' : p.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>
                                                            {p.role === 'superadmin' ? '👑 Super Admin' : p.role}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-text-muted">
                                                        <span>⭐ {formatPoints(p.arcadia_points)} pts</span>
                                                        {p.games && p.games.length > 0 && <span>🎮 {p.games.length} game</span>}
                                                        {p.stats && <span>🏆 {p.stats.win_rate}% win</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    {p.friendship_status === 'friend' ? (
                                                        <span className="badge badge-success">{t('friends.already_friend')}</span>
                                                    ) : p.friendship_status === 'pending_sent' ? (
                                                        <span className="badge badge-warning">⏳ Pending</span>
                                                    ) : p.friendship_status === 'pending_received' ? (
                                                        <span className="badge badge-secondary">{t('friends.confirm_request')}</span>
                                                    ) : (
                                                        <span onClick={(e) => { e.stopPropagation(); sendRequest(p.id); }}
                                                            className="btn-primary text-xs !py-1.5 !px-3 cursor-pointer">{t('friends.add')}</span>
                                                    )}
                                                    <svg className={`w-5 h-5 text-text-muted transition-transform ${expandedPlayer === p.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </button>

                                            {/* Expanded Profile */}
                                            <AnimatePresence>
                                                {expandedPlayer === p.id && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }} className="overflow-hidden">
                                                        <div className="border-t border-border p-4 space-y-4 bg-surface-light/30">
                                                            {/* Stats Grid */}
                                                            {p.stats && (
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                                    {[
                                                                        { label: 'Points', value: formatPoints(p.arcadia_points), icon: '⭐' },
                                                                        { label: 'Win Rate', value: `${p.stats.win_rate}%`, icon: '🏆' },
                                                                        { label: 'Party', value: p.stats.parties_joined, icon: '🎮' },
                                                                        { label: 'Rating', value: p.stats.avg_rating.toFixed(1), icon: '💎' },
                                                                    ].map((s, si) => (
                                                                        <div key={si} className="bg-surface rounded-xl p-3 text-center border border-border">
                                                                            <span className="text-lg block">{s.icon}</span>
                                                                            <p className="font-bold text-sm">{s.value}</p>
                                                                            <p className="text-[11px] text-text-muted">{s.label}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Games */}
                                                            {p.games && p.games.length > 0 ? (
                                                                <div>
                                                                    <h4 className="text-sm font-bold mb-2">{t('friends.fav_games')}</h4>
                                                                    <div className="space-y-2">
                                                                        {p.games.map((g, gi) => (
                                                                            <div key={gi} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface border border-border">
                                                                                <GameIcon icon={g.game_icon} name={g.game_name} size="md" />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="font-medium text-sm">{g.game_name} {g.is_favorite ? '❤️' : ''}</p>
                                                                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                                                                        {g.rank_name && <span>{g.rank_icon} {g.rank_name}</span>}
                                                                                        {g.role_name && <span>• {g.role_icon} {g.role_name}</span>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-text-muted text-sm text-center py-2">{t('friends.no_games')}</p>
                                                            )}

                                                            {/* Tournament Stats */}
                                                            {p.stats && (
                                                                <div className="flex items-center justify-between text-sm bg-surface rounded-xl p-3 border border-border">
                                                                    <div className="text-center flex-1">
                                                                        <p className="font-bold">{p.stats.tournaments_played}</p>
                                                                        <p className="text-[11px] text-text-muted">{t('friends.tournament_stat')}</p>
                                                                    </div>
                                                                    <div className="w-px h-8 bg-border" />
                                                                    <div className="text-center flex-1">
                                                                        <p className="font-bold text-success">{p.stats.tournaments_won}</p>
                                                                        <p className="text-[11px] text-text-muted">{t('friends.win_stat')}</p>
                                                                    </div>
                                                                    <div className="w-px h-8 bg-border" />
                                                                    <div className="text-center flex-1">
                                                                        <p className="font-bold">{p.stats.total_ratings}</p>
                                                                        <p className="text-[11px] text-text-muted">{t('friends.reviews_stat')}</p>
                                                                    </div>
                                                                    <div className="w-px h-8 bg-border" />
                                                                    <div className="text-center flex-1">
                                                                        <p className="font-bold text-primary">{p.created_at ? new Date(p.created_at).toLocaleDateString('id', { month: 'short', year: 'numeric' }) : '-'}</p>
                                                                        <p className="text-[11px] text-text-muted">Joined</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : searchQuery && !searching ? (
                                <div className="card text-center !py-8">
                                    <p className="text-text-muted text-sm">{t('friends.not_found')} &ldquo;{searchQuery}&rdquo;</p>
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AppLayout>
    );
}
