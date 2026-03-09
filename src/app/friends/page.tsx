'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';

interface FriendUser {
    id: string; username: string; avatar: string; role: string;
    arcadia_points: number; reputation_score?: number; friendship_id: string;
    friends_since?: string; requested_at?: string; friendship_status?: string;
}

export default function FriendsPage() {
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [tab, setTab] = useState<'friends' | 'pending' | 'search'>('friends');
    const [friends, setFriends] = useState<FriendUser[]>([]);
    const [incoming, setIncoming] = useState<FriendUser[]>([]);
    const [outgoing, setOutgoing] = useState<FriendUser[]>([]);
    const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

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
        if (searchQuery.length < 2) { addToast('Minimal 2 karakter', 'error'); return; }
        setSearching(true);
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
        { key: 'friends' as const, label: '👥 Teman', count: friends.length },
        { key: 'pending' as const, label: '📩 Permintaan', count: incoming.length },
        { key: 'search' as const, label: '🔍 Cari Player', count: 0 },
    ];

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">👥 Teman</h1>
                    <p className="text-text-muted text-sm">Kelola teman dan cari player baru</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${tab === t.key ? 'bg-primary text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
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
                                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20" />)}</div>
                            ) : friends.length > 0 ? (
                                <div className="grid md:grid-cols-2 gap-4">
                                    {friends.map((f, i) => (
                                        <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            className="card !p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl font-bold shrink-0">
                                                {f.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold truncate">{f.username}</p>
                                                    <span className="badge badge-primary text-xs">{f.role}</span>
                                                </div>
                                                <p className="text-xs text-text-muted">⭐ {f.arcadia_points} pts</p>
                                            </div>
                                            <button onClick={() => removeFriend(f.friendship_id)} className="text-xs text-danger hover:underline shrink-0">Hapus</button>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="card text-center !py-12">
                                    <span className="text-5xl block mb-4">👥</span>
                                    <p className="font-bold text-lg mb-1">Belum Ada Teman</p>
                                    <p className="text-text-muted text-sm mb-4">Cari player dan tambahkan sebagai teman!</p>
                                    <button onClick={() => setTab('search')} className="btn-primary">🔍 Cari Player</button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Pending Tab */}
                    {tab === 'pending' && (
                        <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                            {/* Incoming */}
                            <div>
                                <h3 className="font-bold mb-3">📥 Permintaan Masuk ({incoming.length})</h3>
                                {incoming.length > 0 ? (
                                    <div className="space-y-3">
                                        {incoming.map(r => (
                                            <div key={r.friendship_id} className="card !p-4 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg font-bold">
                                                    {r.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold">{r.username}</p>
                                                    <p className="text-xs text-text-muted">⭐ {r.arcadia_points} pts</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => respondRequest(r.friendship_id, 'accept')} className="btn-primary text-xs !py-1 !px-3">Terima</button>
                                                    <button onClick={() => respondRequest(r.friendship_id, 'reject')} className="btn-secondary text-xs !py-1 !px-3">Tolak</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-text-muted text-sm">Tidak ada permintaan masuk</p>}
                            </div>
                            {/* Outgoing */}
                            <div>
                                <h3 className="font-bold mb-3">📤 Permintaan Terkirim ({outgoing.length})</h3>
                                {outgoing.length > 0 ? (
                                    <div className="space-y-3">
                                        {outgoing.map(r => (
                                            <div key={r.friendship_id} className="card !p-4 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-lg font-bold">
                                                    {r.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold">{r.username}</p>
                                                    <p className="text-xs text-text-muted">Menunggu konfirmasi...</p>
                                                </div>
                                                <span className="badge badge-warning text-xs">Pending</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-text-muted text-sm">Tidak ada permintaan terkirim</p>}
                            </div>
                        </motion.div>
                    )}

                    {/* Search Tab */}
                    {tab === 'search' && (
                        <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <div className="flex gap-3">
                                <input className="input flex-1" placeholder="🔍 Cari username player..." value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') searchPlayers(); }} />
                                <button onClick={searchPlayers} disabled={searching} className="btn-primary shrink-0">
                                    {searching ? '⏳' : '🔍'} Cari
                                </button>
                            </div>

                            {searchResults.length > 0 ? (
                                <div className="space-y-3">
                                    {searchResults.map((p, i) => (
                                        <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                            className="card !p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl font-bold shrink-0">
                                                {p.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold">{p.username}</p>
                                                    <span className="badge badge-primary text-xs">{p.role}</span>
                                                </div>
                                                <p className="text-xs text-text-muted">⭐ {p.arcadia_points} pts</p>
                                            </div>
                                            <div className="shrink-0">
                                                {p.friendship_status === 'friend' ? (
                                                    <span className="badge badge-success">✓ Teman</span>
                                                ) : p.friendship_status === 'pending_sent' ? (
                                                    <span className="badge badge-warning">⏳ Pending</span>
                                                ) : p.friendship_status === 'pending_received' ? (
                                                    <span className="badge badge-secondary">📩 Konfirmasi</span>
                                                ) : (
                                                    <button onClick={() => sendRequest(p.id)} className="btn-primary text-xs !py-1.5 !px-3">➕ Tambah</button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : searchQuery && !searching ? (
                                <div className="card text-center !py-8">
                                    <p className="text-text-muted text-sm">Tidak ada player ditemukan untuk &ldquo;{searchQuery}&rdquo;</p>
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AppLayout>
    );
}
