'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { label: 'Party', href: '/party', icon: '🎮' },
    { label: 'Tournament', href: '/tournament', icon: '🏆' },
    { label: 'Rewards', href: '/rewards', icon: '🎁' },
    { label: 'Profile', href: '/profile', icon: '👤' },
];

const SW = 240;
const SC = 68;

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, toasts, removeToast, logout } = useApp();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    const sideW = collapsed ? SC : SW;

    useEffect(() => {
        const check = () => setIsDesktop(window.innerWidth >= 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const contentMargin = isDesktop ? sideW : 0;

    return (
        <div className="min-h-screen">
            {/* Mobile Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside
                className="hidden lg:flex flex-col fixed top-0 left-0 h-full bg-surface border-r border-border z-40 overflow-hidden"
                style={{ width: sideW, transition: 'width 0.25s ease' }}
            >
                <div className="flex items-center h-16 px-3 border-b border-border shrink-0">
                    <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img src="/logo.jpeg" alt="GAMEHUB ARCADIA" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        {!collapsed && (
                            <div>
                                <h1 className="text-base font-bold gradient-text whitespace-nowrap leading-tight">ARCADIA</h1>
                                <p className="text-[10px] text-text-muted whitespace-nowrap">GAMEHUB</p>
                            </div>
                        )}
                    </Link>
                    <button onClick={() => setCollapsed(c => !c)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 transition-all shrink-0"
                        title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"
                            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
                    {navItems.map(item => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link key={item.href} href={item.href}
                                className={`flex items-center gap-3 h-11 rounded-xl transition-all duration-200 group relative
                  ${collapsed ? 'justify-center px-0' : 'px-3'}
                  ${isActive
                                        ? 'bg-gradient-to-r from-primary/20 to-secondary/10 text-primary border border-primary/20'
                                        : 'text-text-muted hover:text-text hover:bg-surface-light'}`}>
                                <span className="text-lg shrink-0 w-6 text-center">{item.icon}</span>
                                {!collapsed && <span className="font-medium whitespace-nowrap text-sm">{item.label}</span>}
                                {isActive && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />}
                                {collapsed && (
                                    <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#1a1f35] border border-border text-xs font-medium text-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-[60]">
                                        {item.label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                    {user?.role === 'admin' && (
                        <Link href="/admin"
                            className={`flex items-center gap-3 h-11 rounded-xl transition-all duration-200 group relative
                ${collapsed ? 'justify-center px-0' : 'px-3'}
                ${pathname.startsWith('/admin')
                                    ? 'bg-gradient-to-r from-primary/20 to-secondary/10 text-primary border border-primary/20'
                                    : 'text-text-muted hover:text-text hover:bg-surface-light'}`}>
                            <span className="text-lg shrink-0 w-6 text-center">⚙️</span>
                            {!collapsed && <span className="font-medium text-sm">Admin</span>}
                            {collapsed && (
                                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#1a1f35] border border-border text-xs font-medium text-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-[60]">
                                    Admin
                                </div>
                            )}
                        </Link>
                    )}
                </nav>

                <div className="border-t border-border p-2 shrink-0">
                    {!collapsed ? (
                        <>
                            <div className="flex items-center gap-2.5 px-2 py-2">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold shrink-0">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user?.username}</p>
                                    <p className="text-[10px] text-text-muted">⭐ {user?.arcadia_points} pts</p>
                                </div>
                            </div>
                            <button onClick={logout} className="w-full text-left px-3 py-2 text-xs text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors">
                                🚪 Logout
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold cursor-default group relative">
                                {user?.username?.charAt(0).toUpperCase()}
                                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#1a1f35] border border-border text-xs font-medium text-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-[60]">
                                    {user?.username}
                                </div>
                            </div>
                            <button onClick={logout} className="text-text-muted hover:text-danger transition-colors group relative p-1" title="Logout">
                                <span className="text-sm">🚪</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile Sidebar Drawer */}
            <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-surface border-r border-border z-50 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between h-16 px-4 border-b border-border shrink-0">
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                        <img src="/logo.jpeg" alt="GAMEHUB ARCADIA" className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                            <h1 className="text-base font-bold gradient-text">ARCADIA</h1>
                            <p className="text-[10px] text-text-muted">GAMEHUB</p>
                        </div>
                    </Link>
                    <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light">✕</button>
                </div>
                <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? 'bg-gradient-to-r from-primary/20 to-secondary/10 text-primary border border-primary/20' : 'text-text-muted hover:text-text hover:bg-surface-light'}`}>
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />}
                            </Link>
                        );
                    })}
                </nav>
                <div className="border-t border-border p-4 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold">{user?.username?.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user?.username}</p>
                            <p className="text-xs text-text-muted">⭐ {user?.arcadia_points} pts</p>
                        </div>
                    </div>
                    <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors">🚪 Logout</button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="min-h-screen pb-20 lg:pb-4" style={{ marginLeft: contentMargin, transition: 'margin-left 0.25s ease' }}>
                <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-8 h-16 flex items-center">
                    <div className="flex items-center justify-between w-full">
                        <button onClick={() => setMobileOpen(true)} className="lg:hidden flex items-center gap-2.5">
                            <div className="flex flex-col gap-[5px]">
                                <span className="w-5 h-[2px] bg-text-muted rounded-full block" />
                                <span className="w-3.5 h-[2px] bg-text-muted rounded-full block" />
                                <span className="w-5 h-[2px] bg-text-muted rounded-full block" />
                            </div>
                            <span className="font-bold gradient-text text-sm">ARCADIA</span>
                        </button>
                        <div className="hidden lg:block">
                            <h2 className="text-lg font-bold">{navItems.find(n => pathname.startsWith(n.href))?.label || 'ARCADIA'}</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-sm">
                                <span>⭐</span>
                                <span className="font-semibold text-primary">{user?.arcadia_points || 0}</span>
                            </div>
                            <div className="lg:hidden w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 lg:p-6">
                    <AnimatePresence mode="wait">
                        <motion.div key={pathname}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-border">
                <div className="flex justify-around items-center py-2 px-2">
                    {navItems.map(item => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link key={item.href} href={item.href}
                                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300 relative ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                                <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                                <span className="text-[10px] font-medium">{item.label}</span>
                                {isActive && <motion.div layoutId="mobileNav" className="absolute -bottom-0 w-8 h-0.5 rounded-full bg-primary" />}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Toasts */}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div key={toast.id}
                            initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg cursor-pointer min-w-[280px] ${toast.type === 'success' ? 'bg-success/10 border-success/30 text-success' :
                                toast.type === 'error' ? 'bg-danger/10 border-danger/30 text-danger' :
                                    'bg-primary/10 border-primary/30 text-primary'}`}
                            onClick={() => removeToast(toast.id)}>
                            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
                            <span className="text-sm font-medium text-text">{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
