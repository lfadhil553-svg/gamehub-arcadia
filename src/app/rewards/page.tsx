'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';

interface Wallet { balance: number; lifetime_earned: number; lifetime_spent: number }
interface Transaction { id: string; type: string; amount: number; description: string; created_at: string }
interface RewardItem { id: string; name: string; description: string; category: string; cost: number; stock: number; image: string }
interface RedeemItem { id: string; reward_name: string; category: string; claim_code: string; status: string; redeemed_at: string; expires_at: string }

export default function RewardsPage() {
    const { user, loading: authLoading, addToast, refreshUser } = useApp();
    const router = useRouter();
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [rewards, setRewards] = useState<RewardItem[]>([]);
    const [redeemHistory, setRedeemHistory] = useState<RedeemItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'rewards' | 'history' | 'redeem'>('rewards');
    const [redeemingId, setRedeemingId] = useState<string | null>(null);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    const fetchData = async () => {
        const res = await fetch('/api/rewards');
        const data = await res.json();
        if (data.success) {
            setWallet(data.data.wallet);
            setTransactions(data.data.transactions);
            setRewards(data.data.rewards);
            setRedeemHistory(data.data.redeemHistory);
        }
        setLoading(false);
    };

    useEffect(() => { if (user) fetchData(); }, [user]);

    const handleRedeem = async (rewardId: string) => {
        setRedeemingId(rewardId);
        const res = await fetch('/api/rewards', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reward_id: rewardId }),
        });
        const data = await res.json();
        setRedeemingId(null);
        if (data.success) {
            addToast(data.message, 'success');
            fetchData();
            refreshUser();
        } else addToast(data.error, 'error');
    };

    if (authLoading || !user) return null;

    const categoryIcons: Record<string, string> = { voucher: '🎫', merchandise: '👕', tournament_entry: '🏆', gaming_cafe: '☕' };
    const categoryLabels: Record<string, string> = { voucher: 'Voucher', merchandise: 'Merchandise', tournament_entry: 'Tournament', gaming_cafe: 'Gaming Cafe' };

    return (
        <AppLayout>
            {loading ? <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-32" />)}</div> : (
                <div className="space-y-6">
                    {/* Wallet Card */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="card bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent border-primary/20 glow-primary">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">💎 Arcadia Wallet</h2>
                            <span className="badge badge-primary">Active</span>
                        </div>
                        <p className="text-4xl font-extrabold gradient-text mb-2">{wallet?.balance?.toLocaleString() || 0}</p>
                        <p className="text-text-muted text-sm">Arcadia Points</p>
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                            <div><p className="text-sm font-bold text-success">+{wallet?.lifetime_earned?.toLocaleString() || 0}</p><p className="text-xs text-text-muted">Total Earned</p></div>
                            <div><p className="text-sm font-bold text-danger">-{wallet?.lifetime_spent?.toLocaleString() || 0}</p><p className="text-xs text-text-muted">Total Spent</p></div>
                        </div>
                    </motion.div>

                    {/* How to Earn */}
                    <div className="card">
                        <h3 className="font-bold mb-3">📈 Cara Dapat Points</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { action: 'Daily Login', pts: '+10', icon: '📅' },
                                { action: 'Buat/Join Party', pts: '+5', icon: '🎮' },
                                { action: 'Win Tournament', pts: '+100', icon: '🏆' },
                                { action: 'Referral', pts: '+50', icon: '👥' },
                            ].map((item, i) => (
                                <div key={i} className="p-3 rounded-xl bg-surface-light text-center">
                                    <span className="text-2xl block mb-1">{item.icon}</span>
                                    <p className="text-xs text-text-muted">{item.action}</p>
                                    <p className="font-bold text-success text-sm">{item.pts}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-border pb-2">
                        {[
                            { key: 'rewards' as const, label: '🎁 Rewards', count: rewards.length },
                            { key: 'history' as const, label: '📜 Transaksi', count: transactions.length },
                            { key: 'redeem' as const, label: '🎫 Klaim', count: redeemHistory.length },
                        ].map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`px-4 py-2 rounded-t-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}>
                                {t.label} ({t.count})
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {tab === 'rewards' && (
                            <motion.div key="rewards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {rewards.map(reward => (
                                    <div key={reward.id} className="card">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">{categoryIcons[reward.category] || '🎁'}</span>
                                            <span className="badge badge-secondary text-xs">{categoryLabels[reward.category] || reward.category}</span>
                                        </div>
                                        <h4 className="font-bold mb-1">{reward.name}</h4>
                                        <p className="text-text-muted text-xs mb-3">{reward.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-primary">⭐ {reward.cost.toLocaleString()}</span>
                                            <span className="text-xs text-text-muted">Stock: {reward.stock === -1 ? '∞' : reward.stock}</span>
                                        </div>
                                        <button onClick={() => handleRedeem(reward.id)} disabled={redeemingId === reward.id || (wallet?.balance || 0) < reward.cost}
                                            className="btn-primary w-full mt-3 text-sm">
                                            {redeemingId === reward.id ? '⏳ Proses...' : (wallet?.balance || 0) < reward.cost ? '🔒 Points Kurang' : '🎁 Tukar'}
                                        </button>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {tab === 'history' && (
                            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card !p-0 overflow-hidden">
                                {transactions.length > 0 ? transactions.map(tx => (
                                    <div key={tx.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-b-0 hover:bg-surface-light transition-colors">
                                        <span className={`text-lg ${tx.type === 'earn' ? '' : ''}`}>{tx.type === 'earn' ? '📈' : tx.type === 'spend' ? '📉' : '⏰'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{tx.description}</p>
                                            <p className="text-xs text-text-muted">{new Date(tx.created_at).toLocaleString('id')}</p>
                                        </div>
                                        <span className={`font-bold ${tx.type === 'earn' ? 'text-success' : 'text-danger'}`}>
                                            {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                                        </span>
                                    </div>
                                )) : <p className="p-6 text-text-muted text-sm text-center">Belum ada transaksi</p>}
                            </motion.div>
                        )}

                        {tab === 'redeem' && (
                            <motion.div key="redeem" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                {redeemHistory.length > 0 ? redeemHistory.map(item => (
                                    <div key={item.id} className="card !p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{item.reward_name}</p>
                                                <p className="text-xs text-text-muted">{new Date(item.redeemed_at).toLocaleString('id')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono font-bold text-primary">{item.claim_code}</p>
                                                <span className={`badge ${item.status === 'pending' ? 'badge-warning' : item.status === 'claimed' ? 'badge-success' : 'badge-danger'}`}>{item.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="card text-text-muted text-sm text-center !py-8">Belum ada klaim reward</p>}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </AppLayout>
    );
}
