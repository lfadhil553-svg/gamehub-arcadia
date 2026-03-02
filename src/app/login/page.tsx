'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const { login } = useApp();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Load saved credentials on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('arcadia_remember');
            if (saved) {
                const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
                setEmail(savedEmail || '');
                setPassword(savedPassword || '');
                setRememberMe(true);
            }
        } catch { /* ignore */ }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);
        setLoading(false);

        if (result.success) {
            // Save or clear credentials based on remember me
            if (rememberMe) {
                localStorage.setItem('arcadia_remember', JSON.stringify({ email, password }));
            } else {
                localStorage.removeItem('arcadia_remember');
            }
            router.push('/dashboard');
        } else {
            setError(result.error || 'Login gagal');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[150px]" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <img src="/logo.jpeg" alt="GAMEHUB ARCADIA" className="w-12 h-12 rounded-xl object-cover" />
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">Selamat Datang <span className="gradient-text">Kembali</span></h1>
                    <p className="text-text-muted">Login ke akun ARCADIA-mu</p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
                                ❌ {error}
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="input" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input !pr-12" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1">
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <label className="flex items-center gap-2.5 cursor-pointer group">
                            <div className="relative">
                                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                                    className="sr-only peer" />
                                <div className="w-5 h-5 rounded-md border-2 border-border bg-surface peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                                    {rememberMe && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <span className="text-sm text-text-muted group-hover:text-text transition-colors">Ingat saya</span>
                        </label>

                        <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                            {loading ? <span className="animate-spin">⏳</span> : '🚀'} {loading ? 'Loading...' : 'Login'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-text-muted text-sm">
                            Belum punya akun?{' '}
                            <Link href="/register" className="text-primary hover:underline font-medium">Daftar Gratis</Link>
                        </p>
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-text-muted">
                        <p className="font-medium text-text mb-1">🎮 Demo Account:</p>
                        <p>Email: <span className="text-primary">demo@arcadia.gg</span></p>
                        <p>Password: <span className="text-primary">demo123</span></p>
                        <p className="mt-1">Admin: <span className="text-primary">admin@arcadia.gg</span> / <span className="text-primary">admin123</span></p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
