'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage, languageNames, Language } from '@/lib/i18n';
import { formatPoints } from '@/lib/utils';

const AVATAR_OPTIONS = Array.from({ length: 15 }, (_, i) => `/avatars/avatar_${i + 1}.png`);

interface ProfileData {
    user: { id: string; username: string; email: string; avatar: string; role: string; arcadia_points: number; reputation_score: number; referral_code: string; created_at: string; rename_count: number };
    games: Array<{ game_name: string; game_icon: string; rank_name: string; rank_icon: string; role_name: string; role_icon: string; is_favorite: number }>;
    stats: { parties_joined: number; tournaments_played: number; tournaments_won: number; win_rate: number; avg_rating: number; total_ratings: number };
}

export default function ProfilePage() {
    const { user, loading: authLoading, logout, refreshUser } = useApp();
    const router = useRouter();
    const { language, setLanguage, t } = useLanguage();
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [renameLoading, setRenameLoading] = useState(false);
    const [renameError, setRenameError] = useState('');

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);
    useEffect(() => {
        if (user) {
            fetch('/api/profile').then(r => r.json()).then(d => {
                if (d.success) setData(d.data);
                setLoading(false);
            });
        }
    }, [user]);

    const selectAvatar = async (avatarPath: string) => {
        setSavingAvatar(true);
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: avatarPath }),
        });
        const result = await res.json();
        if (result.success) {
            setData(prev => prev ? { ...prev, user: { ...prev.user, avatar: avatarPath } } : null);
            if (refreshUser) refreshUser();
            setShowAvatarPicker(false);
        }
        setSavingAvatar(false);
    };

    const handleRename = async () => {
        if (!newUsername.trim()) return;
        setRenameLoading(true);
        setRenameError('');
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername.trim() }),
            });
            const result = await res.json();
            if (result.success) {
                setData(prev => prev ? { ...prev, user: { ...prev.user, username: newUsername.trim(), rename_count: prev.user.rename_count + 1, arcadia_points: prev.user.arcadia_points - (result.data.cost || 0) } } : null);
                if (refreshUser) refreshUser();
                setShowRenameModal(false);
                setNewUsername('');
            } else {
                setRenameError(result.error || 'Gagal mengubah username');
            }
        } catch {
            setRenameError('Terjadi kesalahan jaringan');
        }
        setRenameLoading(false);
    };

    if (authLoading || !user) return null;

    const currentAvatar = data?.user?.avatar;

    return (
        <AppLayout>
            {loading ? <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}</div> : data ? (
                <div className="space-y-6 max-w-3xl mx-auto">
                    {/* Profile Header */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="card text-center !p-8">
                        {/* Avatar - clickable to change */}
                        <div className="relative inline-block mb-4">
                            <button onClick={() => setShowAvatarPicker(true)}
                                className="group relative w-24 h-24 rounded-2xl overflow-hidden mx-auto block">
                                {currentAvatar && currentAvatar.startsWith('/avatars/') ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-5xl font-bold glow-primary">
                                        {data.user.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">📷 Ganti</span>
                                </div>
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold">{data.user.username}</h1>
                            <button onClick={() => { setNewUsername(data.user.username); setRenameError(''); setShowRenameModal(true); }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 transition-colors" title="Ganti Gamertag">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                        </div>
                        <p className="text-text-muted text-sm mb-2">{data.user.email}</p>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className={`badge ${data.user.role === 'superadmin' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black' : 'badge-primary'}`}>
                                {data.user.role === 'superadmin' ? '👑 Super Admin' : data.user.role}
                            </span>
                            <span className="text-sm text-text-muted">{t('profile.joined')} {new Date(data.user.created_at).toLocaleDateString('id')}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-light border border-border text-sm">
                            <span>{t('profile.referral')}</span>
                            <span className="font-mono font-bold text-primary">{data.user.referral_code}</span>
                        </div>
                    </motion.div>

                    {/* Rename Modal */}
                    <AnimatePresence>
                        {showRenameModal && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                                onClick={() => setShowRenameModal(false)}>
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-surface rounded-2xl border border-border p-6 w-full max-w-md"
                                    onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold">✏️ Ganti Gamertag</h3>
                                        <button onClick={() => setShowRenameModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light">✕</button>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm text-text-muted mb-2">Username Baru</label>
                                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} maxLength={20} placeholder="Masukkan username baru..."
                                            className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
                                        <p className="text-xs text-text-muted mt-1">3-20 karakter. Huruf, angka, spasi, dan underscore.</p>
                                    </div>
                                    <div className={`p-3 rounded-xl mb-4 text-sm ${data.user.rename_count === 0 ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                                        {data.user.rename_count === 0 ? (
                                            <span>🎉 Rename pertama <strong>GRATIS!</strong></span>
                                        ) : (
                                            <span>💰 Biaya rename: <strong>1.000 Arcadia Points</strong> (Saldo: {formatPoints(data.user.arcadia_points)})</span>
                                        )}
                                    </div>
                                    {renameError && <p className="text-red-400 text-sm mb-3">{renameError}</p>}
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowRenameModal(false)} className="btn-secondary flex-1">Batal</button>
                                        <button onClick={handleRename} disabled={renameLoading || !newUsername.trim() || newUsername.trim() === data.user.username}
                                            className="btn-primary flex-1 disabled:opacity-50">
                                            {renameLoading ? 'Menyimpan...' : data.user.rename_count === 0 ? 'Ganti Gratis' : 'Ganti (1.000 Poin)'}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Avatar Picker Modal */}
                    <AnimatePresence>
                        {showAvatarPicker && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                                onClick={() => setShowAvatarPicker(false)}>
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-surface rounded-2xl border border-border p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
                                    onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold">🖼️ Pilih Avatar</h3>
                                        <button onClick={() => setShowAvatarPicker(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light">✕</button>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                        {AVATAR_OPTIONS.map((av) => (
                                            <button key={av} onClick={() => !savingAvatar && selectAvatar(av)}
                                                disabled={savingAvatar}
                                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${currentAvatar === av ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={av} alt="Avatar option" className="w-full h-full object-cover" />
                                                {currentAvatar === av && (
                                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                        <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">✓</span>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {savingAvatar && <p className="text-center text-text-muted text-sm mt-3">Menyimpan...</p>}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: t('profile.points'), value: formatPoints(data.user.arcadia_points), icon: '⭐' },
                            { label: t('profile.reputation'), value: data.stats.avg_rating.toFixed(1), icon: '💎' },
                            { label: t('profile.party_joined'), value: data.stats.parties_joined, icon: '🎮' },
                            { label: t('profile.win_rate'), value: `${data.stats.win_rate}%`, icon: '🏆' },
                        ].map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className="card !p-4 text-center">
                                <span className="text-2xl block mb-1">{s.icon}</span>
                                <p className="text-xl font-bold">{s.value}</p>
                                <p className="text-xs text-text-muted">{s.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Games */}
                    <div className="card">
                        <h3 className="font-bold mb-4">{t('profile.my_games')}</h3>
                        {data.games.length > 0 ? (
                            <div className="space-y-3">
                                {data.games.map((game, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-light">
                                        <GameIcon icon={game.game_icon} name={game.game_name} size="lg" />
                                        <div className="flex-1">
                                            <p className="font-medium">{game.game_name} {game.is_favorite ? '❤️' : ''}</p>
                                            <div className="flex items-center gap-3 text-xs text-text-muted">
                                                {game.rank_name && <span>{game.rank_icon} {game.rank_name}</span>}
                                                {game.role_name && <span>{game.role_icon} {game.role_name}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-text-muted text-sm">{t('profile.no_games')} <button onClick={() => router.push('/onboarding')} className="text-primary hover:underline">{t('profile.add_game')}</button></p>}
                    </div>

                    {/* Stats Detail */}
                    <div className="card">
                        <h3 className="font-bold mb-4">{t('profile.stats')}</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-text-muted">{t('profile.tournaments_played')}</span><span>{data.stats.tournaments_played}</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">{t('profile.tournaments_won')}</span><span className="text-success">{data.stats.tournaments_won}</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">{t('profile.win_rate')}</span><span>{data.stats.win_rate}%</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">{t('profile.total_ratings')}</span><span>{data.stats.total_ratings} reviews</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">{t('profile.avg_rating')}</span><span>⭐ {data.stats.avg_rating}</span></div>
                        </div>
                    </div>

                    {/* Language Switcher */}
                    <div className="card">
                        <h3 className="font-bold mb-4">{t('profile.settings')}</h3>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">{t('profile.language')}</span>
                            <div className="relative">
                                <button onClick={() => setShowLangPicker(!showLangPicker)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-light border border-border text-sm hover:border-primary transition-colors">
                                    {languageNames[language]}
                                    <svg className={`w-4 h-4 transition-transform ${showLangPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                {showLangPicker && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                                        {(Object.keys(languageNames) as Language[]).map(lang => (
                                            <button key={lang} onClick={() => { setLanguage(lang); setShowLangPicker(false); }}
                                                className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-light transition-colors flex items-center justify-between ${language === lang ? 'text-primary bg-primary/5' : 'text-text'}`}>
                                                {languageNames[lang]}
                                                {language === lang && <span>✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={() => router.push('/onboarding')} className="btn-secondary flex-1">{t('profile.edit_game')}</button>
                        <button onClick={() => { logout(); router.push('/'); }} className="btn-danger flex-1">{t('profile.logout')}</button>
                    </div>
                </div>
            ) : <p className="text-text-muted">{t('common.error')}</p>}
        </AppLayout>
    );
}
