'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface GameData {
    id: string; name: string; icon: string;
    ranks: Array<{ id: string; name: string; icon: string; tier: number }>;
    roles: Array<{ id: string; name: string; icon: string }>;
}

export default function OnboardingPage() {
    const { user, addToast } = useApp();
    const router = useRouter();
    const [games, setGames] = useState<GameData[]>([]);
    const [selected, setSelected] = useState<Record<string, { rank_id: string; role_id: string; is_favorite: boolean }>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/games').then(r => r.json()).then(d => {
            if (d.success) setGames(d.data);
        });
    }, []);

    useEffect(() => {
        if (user && user.onboarding_done) router.push('/dashboard');
    }, [user, router]);

    const toggleGame = (gameId: string) => {
        setSelected(prev => {
            const next = { ...prev };
            if (next[gameId]) delete next[gameId];
            else next[gameId] = { rank_id: '', role_id: '', is_favorite: false };
            return next;
        });
    };

    const handleSubmit = async () => {
        if (Object.keys(selected).length === 0) {
            addToast('Pilih minimal 1 game favorit', 'error');
            return;
        }

        setLoading(true);
        const gamesList = Object.entries(selected).map(([game_id, data], i) => ({
            game_id, rank_id: data.rank_id || null, role_id: data.role_id || null, is_favorite: i === 0,
        }));

        const res = await fetch('/api/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ games: gamesList }),
        });
        const result = await res.json();
        setLoading(false);

        if (result.success) {
            addToast('Onboarding selesai! Selamat bermain! 🎮', 'success');
            router.push('/dashboard');
        } else {
            addToast(result.error || 'Gagal menyimpan', 'error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🎮</div>
                    <h1 className="text-3xl font-bold mb-2">Pilih Game <span className="gradient-text">Favorit</span></h1>
                    <p className="text-text-muted">Pilih minimal 1 game yang kamu mainkan</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    {games.map(game => {
                        const isSelected = !!selected[game.id];
                        return (
                            <motion.div key={game.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => toggleGame(game.id)}
                                className={`card cursor-pointer text-center !p-5 transition-all ${isSelected ? 'border-primary glow-primary' : ''
                                    }`}>
                                <div className="text-4xl mb-2">{game.icon}</div>
                                <p className="font-semibold text-sm">{game.name}</p>
                                {isSelected && <div className="mt-2 text-primary text-sm">✓ Dipilih</div>}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Rank & Role Selection for selected games */}
                {Object.keys(selected).length > 0 && (
                    <div className="space-y-4 mb-8">
                        {Object.keys(selected).map(gameId => {
                            const game = games.find(g => g.id === gameId);
                            if (!game) return null;
                            return (
                                <motion.div key={gameId} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="card">
                                    <h3 className="font-bold mb-3">{game.icon} {game.name}</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm text-text-muted block mb-1">Rank</label>
                                            <select className="select" value={selected[gameId].rank_id}
                                                onChange={e => setSelected(prev => ({ ...prev, [gameId]: { ...prev[gameId], rank_id: e.target.value } }))}>
                                                <option value="">Pilih Rank</option>
                                                {game.ranks.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm text-text-muted block mb-1">Role</label>
                                            <select className="select" value={selected[gameId].role_id}
                                                onChange={e => setSelected(prev => ({ ...prev, [gameId]: { ...prev[gameId], role_id: e.target.value } }))}>
                                                <option value="">Pilih Role</option>
                                                {game.roles.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                <button onClick={handleSubmit} disabled={loading || Object.keys(selected).length === 0}
                    className="btn-primary w-full !py-4 text-lg">
                    {loading ? '⏳ Menyimpan...' : `🚀 Lanjutkan (${Object.keys(selected).length} game dipilih)`}
                </button>
            </motion.div>
        </div>
    );
}
