'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import GameIcon from '@/components/GameIcon';
import { motion } from 'framer-motion';

interface PartyDetail {
    id: string; title: string; description: string; game_name: string; game_icon: string;
    current_players: number; max_players: number; status: string; region: string;
    creator_name: string; creator_id: string; created_at: string;
    members: Array<{ user_id: string; username: string; avatar: string; role: string; reputation_score: number }>;
    chat: Array<{ id: string; user_id: string; username: string; avatar: string; message: string; created_at: string }>;
}

export default function PartyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, loading: authLoading, addToast } = useApp();
    const router = useRouter();
    const [party, setParty] = useState<PartyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
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

    // Poll for new messages
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(fetchParty, 5000);
        return () => clearInterval(interval);
    }, [user, id]);

    const isMember = party?.members.some(m => m.user_id === user?.id);

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
                                <div className="flex justify-between"><span className="text-text-muted">Status</span><span className={`badge ${party.status === 'open' ? 'badge-success' : 'badge-warning'}`}>{party.status}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Player</span><span>{party.current_players}/{party.max_players}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Region</span><span>{party.region || 'Global'}</span></div>
                                <div className="flex justify-between"><span className="text-text-muted">Host</span><span>{party.creator_name}</span></div>
                            </div>

                            <div className="mt-4">
                                {!isMember && party.status === 'open' && (
                                    <button onClick={joinParty} className="btn-primary w-full">🚀 Gabung Party</button>
                                )}
                                {isMember && party.creator_id !== user.id && (
                                    <button onClick={leaveParty} className="btn-danger w-full">🚪 Keluar Party</button>
                                )}
                            </div>
                        </motion.div>

                        {/* Members */}
                        <div className="card">
                            <h3 className="font-bold mb-3">👥 Anggota ({party.members.length})</h3>
                            <div className="space-y-2">
                                {party.members.map(member => (
                                    <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold">
                                            {member.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{member.username}</p>
                                            <p className="text-xs text-text-muted">{member.role === 'leader' ? '👑 Leader' : 'Member'}</p>
                                        </div>
                                        <span className="text-xs text-text-muted">⭐ {member.reputation_score?.toFixed(1)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chat */}
                    <div className="lg:col-span-2">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col h-[600px]">
                            <h3 className="font-bold mb-4 pb-3 border-b border-border">💬 Party Chat</h3>

                            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                                {party.chat.length === 0 ? (
                                    <div className="text-center text-text-muted text-sm py-10">
                                        <span className="text-4xl block mb-2">💬</span>
                                        <p>Belum ada pesan. Mulai percakapan!</p>
                                    </div>
                                ) : party.chat.map(msg => (
                                    <div key={msg.id} className={`flex gap-2 ${msg.user_id === user.id ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold shrink-0">
                                            {msg.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.user_id === user.id ? 'bg-primary/20 text-text' : 'bg-surface-light'}`}>
                                            {msg.user_id !== user.id && <p className="text-xs font-medium text-primary mb-0.5">{msg.username}</p>}
                                            <p className="text-sm">{msg.message}</p>
                                            <p className="text-[10px] text-text-muted mt-1">{new Date(msg.created_at).toLocaleTimeString('id')}</p>
                                        </div>
                                    </div>
                                ))}
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
        </AppLayout>
    );
}
