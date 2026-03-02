'use client';
import { useState } from 'react';
import { useApp } from '@/lib/context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const { register } = useApp();
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await register(username, email, password, confirmPassword);
        setLoading(false);

        if (result.success) {
            // Save credentials for auto-fill on login page
            localStorage.setItem('arcadia_remember', JSON.stringify({ email, password }));
            router.push('/onboarding');
        } else {
            setError(result.error || 'Registrasi gagal');
        }
    };

    const passwordStrength = () => {
        let s = 0;
        if (password.length >= 8) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^a-zA-Z0-9]/.test(password)) s++;
        return s;
    };

    const strength = passwordStrength();
    const strengthLabels = ['', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
    const strengthColors = ['', 'bg-danger', 'bg-warning', 'bg-primary', 'bg-success'];

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold glow-primary">A</div>
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">Buat Akun <span className="gradient-text">ARCADIA</span></h1>
                    <p className="text-text-muted">Daftar gratis dan dapatkan 100 Arcadia Points!</p>
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
                            <label className="block text-sm font-medium text-text-muted mb-2">Username</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="GamerTag" className="input" required minLength={3} maxLength={20} />
                            <p className="text-xs text-text-muted mt-1">3-20 karakter, huruf, angka, underscore</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="input" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 karakter" className="input !pr-12" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1">
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-border'}`} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-text-muted">Kekuatan: {strengthLabels[strength]}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">Konfirmasi Password</label>
                            <div className="relative">
                                <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password" className="input !pr-12" required />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-1">
                                    {showConfirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-danger mt-1">Password tidak cocok</p>
                            )}
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                            {loading ? <span className="animate-spin">⏳</span> : '🎮'} {loading ? 'Loading...' : 'Daftar Sekarang'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-text-muted text-sm">
                            Sudah punya akun?{' '}
                            <Link href="/login" className="text-primary hover:underline font-medium">Login</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
