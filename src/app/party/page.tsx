'use client';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import BackButton from '@/components/BackButton';
import GameIcon from '@/components/GameIcon';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Game { id: string; name: string; icon: string; slug: string }
interface PartyItem {
    id: string; title: string; description: string; game_name: string; game_icon: string;
    current_players: number; max_players: number; status: string; region: string;
    creator_name: string; creator_avatar: string; created_at: string; my_role?: string;
}

export default function PartyPage() {
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const { t } = useLanguage();
    const [games, setGames] = useState<Game[]>([]);
    const [parties, setParties] = useState<PartyItem[]>([]);
    const [myParties, setMyParties] = useState<PartyItem[]>([]);
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
        if (data.success) {
            setMyParties(data.my_parties || []);
            // Filter out parties user already joined
            const myIds = new Set((data.my_parties || []).map((p: PartyItem) => p.id));
            setParties((data.data || []).filter((p: PartyItem) => !myIds.has(p.id)));
        }
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
            <BackButton fallback="/dashboard" />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">{t('party.title')}</h1>
                        <p className="text-text-muted text-sm">{t('party.subtitle')}</p>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
                        {t('party.create')}
                    </button>
                </div>

                {/* Create Party Modal */}
                <AnimatePresence>
                    {showCreate && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="card border-primary/30">
                            <h3 className="font-bold mb-4">{t('party.create_title')}</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-text-muted block mb-1">{t('party.game')} *</label>
                                    <select className="select" value={createData.game_id} onChange={e => setCreateData(p => ({ ...p, game_id: e.target.value }))}>
                                        <option value="">{t('party.select_game')}</option>
                                        {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-text-muted block mb-1">{t('party.name')} *</label>
                                    <input className="input" value={createData.title} onChange={e => setCreateData(p => ({ ...p, title: e.target.value }))} placeholder={t('party.name_placeholder')} />
                                </div>
                                <div>
                                    <label className="text-sm text-text-muted block mb-1">{t('party.region')}</label>
                                    <input className="input" value={createData.region} onChange={e => setCreateData(p => ({ ...p, region: e.target.value }))} placeholder="Jakarta, Bandung, dll" />
                                </div>
                                <div>
                                    <label className="text-sm text-text-muted block mb-1">{t('party.max_players')}</label>
                                    <select className="select" value={createData.max_players} onChange={e => setCreateData(p => ({ ...p, max_players: parseInt(e.target.value) }))}>
                                        {[2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 50, 100].map(n => <option key={n} value={n}>{n} player</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-text-muted block mb-1">{t('party.description')}</label>
                                    <textarea className="input !h-20 resize-none" value={createData.description} onChange={e => setCreateData(p => ({ ...p, description: e.target.value }))} placeholder={t('party.desc_placeholder')} />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={handleCreate} disabled={creating} className="btn-primary">{creating ? '⏳ Membuat...' : t('party.submit')}</button>
                                <button onClick={() => setShowCreate(false)} className="btn-secondary">{t('party.cancel')}</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <select className="select !w-auto min-w-[160px]" value={filter.game_id} onChange={e => setFilter(p => ({ ...p, game_id: e.target.value }))}>
                        <option value="">{t('party.filter_all')}</option>
                        {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <input className="input !w-auto min-w-[160px]" placeholder="🔍 Filter region..." value={filter.region} onChange={e => setFilter(p => ({ ...p, region: e.target.value }))} />
                </div>

                {/* My Parties */}
                {!loading && myParties.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">🎯 Party Saya <span className="badge badge-primary text-xs">{myParties.length}</span></h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {myParties.map((party, i) => (
                                <motion.div key={party.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                    <Link href={`/party/${party.id}`} className="card block hover:glow-primary border-primary/20 bg-primary/5">
                                        <div className="flex items-start gap-3">
                                            <GameIcon icon={party.game_icon} name={party.game_name} size="lg" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold truncate">{party.title}</h3>
                                                    <span className={`badge text-xs ${party.my_role === 'leader' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                        {party.my_role === 'leader' ? '👑 Leader' : '👤 Member'}
                                                    </span>
                                                    <span className={`badge text-xs ${party.status === 'open' ? 'badge-success' : party.status === 'full' ? 'badge-warning' : 'badge-danger'}`}>{party.status}</span>
                                                </div>
                                                <p className="text-sm text-text-muted line-clamp-1 mb-2">{party.description}</p>
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
                    </div>
                )}

                {/* Available Parties */}
                {!loading && <h2 className="text-lg font-bold flex items-center gap-2">🌐 Party Tersedia {parties.length > 0 && <span className="badge badge-success text-xs">{parties.length}</span>}</h2>}
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
                        <p className="font-bold text-lg mb-1">{t('party.empty')}</p>
                        <p className="text-text-muted text-sm mb-4">{t('party.create_first')}</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary">{t('party.create')}</button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
