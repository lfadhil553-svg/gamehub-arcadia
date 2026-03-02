'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';

interface Game { id: string; name: string; icon: string }

export default function CreateTournamentPage() {
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        game_id: '', name: '', description: '', mode: 'solo', format: 'single_elimination',
        max_participants: 16, team_size: 1, prize_pool: '', entry_fee: 0, rules: '',
        registration_end: '', start_date: '',
    });

    useEffect(() => {
        if (!authLoading && (!user || (user.role !== 'organizer' && user.role !== 'admin'))) router.push('/tournament');
    }, [user, authLoading, router]);

    useEffect(() => { fetch('/api/games').then(r => r.json()).then(d => { if (d.success) setGames(d.data); }); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.game_id || !form.name) { addToast('Game dan nama wajib diisi', 'error'); return; }
        setLoading(true);
        const res = await fetch('/api/tournaments', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) { addToast(data.message, 'success'); router.push(`/tournament/${data.data.id}`); }
        else addToast(data.error, 'error');
    };

    if (authLoading || !user) return null;

    return (
        <AppLayout>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">🏆 Buat Tournament Baru</h1>
                <form onSubmit={handleSubmit} className="card space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-text-muted block mb-1">Game *</label>
                            <select className="select" value={form.game_id} onChange={e => setForm(p => ({ ...p, game_id: e.target.value }))} required>
                                <option value="">Pilih Game</option>
                                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-text-muted block mb-1">Nama Tournament *</label>
                            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Tournament Name" required />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-text-muted block mb-1">Deskripsi</label>
                        <textarea className="input !h-24 resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi tournament..." />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm text-text-muted block mb-1">Mode</label>
                            <select className="select" value={form.mode} onChange={e => setForm(p => ({ ...p, mode: e.target.value }))}>
                                <option value="solo">Solo</option>
                                <option value="team">Team</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-text-muted block mb-1">Format</label>
                            <select className="select" value={form.format} onChange={e => setForm(p => ({ ...p, format: e.target.value }))}>
                                <option value="single_elimination">Single Elimination</option>
                                <option value="double_elimination">Double Elimination</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-text-muted block mb-1">Max Peserta</label>
                            <select className="select" value={form.max_participants} onChange={e => setForm(p => ({ ...p, max_participants: parseInt(e.target.value) }))}>
                                {[4, 8, 16, 32, 64].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-text-muted block mb-1">Team Size</label>
                            <input type="number" className="input" value={form.team_size} min={1} max={10} onChange={e => setForm(p => ({ ...p, team_size: parseInt(e.target.value) }))} />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-text-muted block mb-1">Hadiah</label>
                            <input className="input" value={form.prize_pool} onChange={e => setForm(p => ({ ...p, prize_pool: e.target.value }))} placeholder="100.000 Arcadia Points" />
                        </div>
                        <div>
                            <label className="text-sm text-text-muted block mb-1">Entry Fee (Points)</label>
                            <input type="number" className="input" value={form.entry_fee} min={0} onChange={e => setForm(p => ({ ...p, entry_fee: parseInt(e.target.value) || 0 }))} />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-text-muted block mb-1">Rules</label>
                        <textarea className="input !h-24 resize-none" value={form.rules} onChange={e => setForm(p => ({ ...p, rules: e.target.value }))} placeholder="Aturan tournament..." />
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                        {loading ? '⏳ Membuat...' : '🏆 Buat Tournament'}
                    </button>
                </form>
            </motion.div>
        </AppLayout>
    );
}
