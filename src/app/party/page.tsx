'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Game { id: string; name: string; icon: string; slug: string }
interface PartyItem {
    id: string; title: string; description: string; game_name: string; game_icon: string;
    current_players: number; max_players: number; status: string; region: string;
    creator_name: string; creator_avatar: string; created_at: string;
}

export default function PartyPage() {
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [parties, setParties] = useState<PartyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ game_id: '', region: '' });
    const [showCreate, setShowCreate] = useState(false);
    const [createData, setCreateData] = useState({ game_id: '', title: '', description: '', max_players: 5, region: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
        fetch('/api/games').then(r => r.json()).then(d => { if (d.success) setGames(d.data); });
    }, []);

    const fetchParties = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ status: 'open' });
        if (filter.game_id) params.set('game_id', filter.game_id);
        if (filter.region) params.set('region', filter.region);
        const res = await fetch(`/api/parties?${params}`);
        const data = await res.json();
        if (data.success) setParties(data.data);
        setLoading(false);
    }, [filter]);

    useEffect(() => { if (user) fetchParties(); }, [user, fetchParties]);

    const handleCreate = async () => {
        if (!createData.game_id || !createData.title) { addToast('Game dan judul wajib diisi', 'error'); return; }
        setCreating(true);
        const res = await fetch('/api/parties', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createData),
        });
        const result = await res.json();
        setCreating(false);
        if (result.success) { addToast(result.message, 'success'); setShowCreate(false); fetchParties(); setCreateData({ game_id: '', title: '', description: '', max_players: 5, region: '' }); }
        else addToast(result.error, 'error');
    };

    if (authLoading || !user) return null;

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">🎮 Party Finder</h1>
                        <p className="text-text-muted text-sm">Cari teman mabar lintas game</p>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
                        ➕ Buat Party
                    </button>
                </div>

                {/* Create Party Modal */}
                <AnimatePresence>
                    {showCreate && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="card border-primary/30">
                            <h3 className="font-bold mb-4">🎮 Buat Party Baru</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-text-muted block mb-1">Game *</label>
                                    <select className="select" value={createData.game_id} onChange={e => setCreateData(p => ({ ...p, game_id: e.target.value }))}>
                                        <option value="">Pilih Game</option>
                                        {games.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-text-muted block mb-1">Judul *</label>
                                    <input className="input" value={createData.title} onChange={e => setCreateData(p => ({ ...p, title: e.target.value }))} placeholder="Contoh: Push Rank Bareng!" />
                                </div>
                                <div>
                                    <label className="text-sm text-text-muted block mb-1">Region</label>
                                    <input className="input" value={createData.region} onChange={e => setCreateData(p => ({ ...p, region: e.target.value }))} placeholder="Jakarta, Bandung, dll" />
                                </div>
                                <div>
                                    <label className="text-sm text-text-muted block mb-1">Max Player</label>
                                    <select className="select" value={createData.max_players} onChange={e => setCreateData(p => ({ ...p, max_players: parseInt(e.target.value) }))}>
                                        {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} player</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-text-muted block mb-1">Deskripsi</label>
                                    <textarea className="input !h-20 resize-none" value={createData.description} onChange={e => setCreateData(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi party..." />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={handleCreate} disabled={creating} className="btn-primary">{creating ? '⏳' : '🚀'} {creating ? 'Membuat...' : 'Buat Party'}</button>
                                <button onClick={() => setShowCreate(false)} className="btn-secondary">Batal</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <select className="select !w-auto min-w-[160px]" value={filter.game_id} onChange={e => setFilter(p => ({ ...p, game_id: e.target.value }))}>
                        <option value="">Semua Game</option>
                        {games.map(g => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
                    </select>
                    <input className="input !w-auto min-w-[160px]" placeholder="🔍 Filter region..." value={filter.region} onChange={e => setFilter(p => ({ ...p, region: e.target.value }))} />
                </div>

                {/* Party List */}
                {loading ? (
                    <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}</div>
                ) : parties.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        {parties.map((party, i) => (
                            <motion.div key={party.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Link href={`/party/${party.id}`} className="card block hover:glow-primary">
                                    <div className="flex items-start gap-3">
                                        <GameIcon icon={party.game_icon} name={party.game_name} size="lg" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold truncate">{party.title}</h3>
                                                <span className={`badge ${party.status === 'open' ? 'badge-success' : 'badge-warning'}`}>{party.status}</span>
                                            </div>
                                            <p className="text-sm text-text-muted line-clamp-2 mb-2">{party.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-text-muted">
                                                <span>👤 {party.current_players}/{party.max_players}</span>
                                                <span>📍 {party.region || 'Global'}</span>
                                                <span>🎮 {party.game_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="card text-center !py-12">
                        <span className="text-5xl block mb-4">🎮</span>
                        <p className="font-bold text-lg mb-1">Belum Ada Party</p>
                        <p className="text-text-muted text-sm mb-4">Jadilah yang pertama membuat party!</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary">➕ Buat Party</button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
