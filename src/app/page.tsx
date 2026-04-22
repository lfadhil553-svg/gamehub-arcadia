'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    { icon: '🎮', title: 'Party Finder', desc: 'Cari teman mabar se-rank, se-server, se-kampus. Anti solo queue!' },
    { icon: '🏆', title: 'Tournament', desc: 'Ikuti tournament online dengan bracket system otomatis. Single & double elimination.' },
    { icon: '⭐', title: 'Arcadia Points', desc: 'Kumpulkan points dari aktivitas gaming, tukarkan dengan reward menarik.' },
    { icon: '🎯', title: 'Multi-Game', desc: 'Support banyak game populer: Valorant, MLBB, PUBG, Genshin, dan lainnya.' },
    { icon: '💬', title: 'Live Chat', desc: 'Chat realtime dengan party member. Koordinasi strategi sebelum masuk game.' },
    { icon: '📊', title: 'Leaderboard', desc: 'Kompetisi seru di leaderboard weekly & monthly. Buktikan skill-mu!' },
  ];

  const games = [
    { name: 'Valorant', icon: 'https://cdn2.steamgriddb.com/icon/04e35ab54388b691735c8b4231d387a1.png' },
    { name: 'Mobile Legends', icon: 'https://play-lh.googleusercontent.com/hXSJ_2koqdr_Uxdnd_P0HxDjR2tXEJ2rI1AEeHr8-I33a-75_v8l_i61tpAJ-CYxhLPQA-3YxYAVE_ro7uG0' },
    { name: 'PUBG Mobile', icon: 'https://play-lh.googleusercontent.com/zCSGnBtZk0Lmp1BAbyaZfLktDzHmC6oke67qzz3G1lBegAF2asyt5KzXOJ2PVdHDYkU=s512' },
    { name: 'Genshin Impact', icon: 'https://play-lh.googleusercontent.com/YQqyKaXX-63krqsfIzUEJWUWLINxcb5tbS6QVySdxbS7eZV7YB2dUjUvX27xA0TIGtfxQ5v-tQjwlT5tTB-O=s512' },
    { name: 'Free Fire', icon: 'https://play-lh.googleusercontent.com/VxqoBX9loIqsESn5OPhXDLLYw8YFAlLJX3TJUb7ovyIQdRRWwGuG3jD9konTZAeWzd8VlVTDt8fkJ8BAEU4ZHQ=s512' },
    { name: 'Apex Legends', icon: 'https://cdn2.steamgriddb.com/icon/5c76b1cc75d7fb39b6887a5cc0b836d5.png' },
  ];

  const stats = [
    { value: '10K+', label: 'Gamer Aktif' },
    { value: '50+', label: 'Tournament' },
    { value: '6', label: 'Game Populer' },
    { value: '∞', label: 'Keseruan' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <nav className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(10,12,20,0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="ARCADIA" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <h1 className="text-lg font-bold gradient-text leading-tight">ARCADIA</h1>
              <p className="text-[10px] text-text-muted leading-tight">Gaming Social Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-text-muted hover:text-text transition-colors px-4 py-2">Login</Link>
            <Link href="/register" className="btn-primary text-sm !py-2 !px-5">Daftar Gratis</Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <header className="relative overflow-hidden">
        {/* Ambient light effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[150px]" />
          <div className="absolute top-32 left-1/4 w-[300px] h-[300px] bg-secondary/6 rounded-full blur-[120px]" />
          <div className="absolute top-48 right-1/4 w-[250px] h-[250px] bg-accent/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-24 lg:pt-28 lg:pb-32 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Platform Komunitas Gamer
            </div>

            {/* Headline */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight">
              Level Up Your<br />
              <span className="gradient-text">Gaming Experience</span>
            </h2>

            {/* Subheadline */}
            <p className="text-base lg:text-lg text-text-muted max-w-lg mx-auto mb-10 leading-relaxed">
              Cari teman mabar, ikuti tournament seru, kumpulkan Arcadia Points,
              dan dapatkan reward menarik. Semua dalam satu platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="btn-primary text-base !py-3.5 !px-8 w-full sm:w-auto">
                🚀 Mulai Sekarang — Gratis
              </Link>
              <Link href="/login" className="btn-secondary text-base !py-3.5 !px-8 w-full sm:w-auto">
                Login
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ═══════════════ STATS BAR ═══════════════ */}
      <section className="border-y border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <p className="text-2xl lg:text-3xl font-extrabold gradient-text">{s.value}</p>
                <p className="text-xs text-text-muted mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-20 w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h3 className="text-2xl lg:text-3xl font-bold mb-3">
            Fitur <span className="gradient-text">Unggulan</span>
          </h3>
          <p className="text-text-muted text-sm max-w-md mx-auto">
            Semua yang kamu butuhkan untuk pengalaman gaming yang lebih seru
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group rounded-2xl p-5 border border-white/5 hover:border-primary/20 transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: 'rgba(99,102,241,0.1)' }}>
                {f.icon}
              </div>
              <h4 className="font-bold mb-1.5 group-hover:text-primary transition-colors">{f.title}</h4>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════ GAMES ═══════════════ */}
      <section className="max-w-4xl mx-auto px-6 py-16 w-full">
        <h3 className="text-2xl lg:text-3xl font-bold text-center mb-10">
          Game <span className="gradient-text">Populer</span>
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {games.map((game, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group text-center rounded-2xl p-4 border border-white/5 hover:border-primary/20 cursor-pointer transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex justify-center mb-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={game.icon} alt={game.name} className="w-11 h-11 rounded-xl object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
              </div>
              <p className="font-medium text-xs">{game.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="max-w-3xl mx-auto px-6 py-16 w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center rounded-2xl p-10 lg:p-14 border border-primary/15"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))' }}>
          <h3 className="text-2xl lg:text-3xl font-bold mb-3">Siap Level Up? 🎮</h3>
          <p className="text-text-muted text-sm mb-8 max-w-md mx-auto leading-relaxed">
            Bergabung dengan ribuan gamer lainnya di ARCADIA. Daftar gratis dan dapatkan 100 Arcadia Points!
          </p>
          <Link href="/register" className="btn-primary text-base !py-3.5 !px-10">Daftar Sekarang — Gratis!</Link>
        </motion.div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-white/5 py-8 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-text-muted text-xs">© 2024 ARCADIA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
