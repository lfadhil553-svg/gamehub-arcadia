'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
    id: string;
    username: string;
    email: string;
    avatar: string;
    role: string;
    arcadia_points: number;
    reputation_score: number;
    onboarding_done: number;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface AppContextType {
    user: User | null;
    loading: boolean;
    toasts: Toast[];
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (username: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.success) setUser(data.data);
                else setUser(null);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refreshUser(); }, [refreshUser]);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.data.user);
                addToast('Login berhasil! Selamat datang kembali 🎮', 'success');
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch {
            return { success: false, error: 'Terjadi kesalahan jaringan' };
        }
    };

    const register = async (username: string, email: string, password: string, confirmPassword: string) => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, confirmPassword }),
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.data.user);
                addToast('Registrasi berhasil! Selamat datang di ARCADIA! 🎉', 'success');
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch {
            return { success: false, error: 'Terjadi kesalahan jaringan' };
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch { /* ignore */ }
        setUser(null);
        addToast('Logout berhasil. Sampai jumpa! 👋', 'info');
    };

    return (
        <AppContext.Provider value={{ user, loading, toasts, login, register, logout, refreshUser, addToast, removeToast }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}
