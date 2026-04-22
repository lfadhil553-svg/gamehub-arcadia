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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="sticky top-0 z-50 border-b border-white/5"
        style={{ background: 'rgba(11,15,26,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: '920px', margin: '0 auto', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="ARCADIA" className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <h1 className="text-lg font-bold gradient-text leading-tight">ARCADIA</h1>
              <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: 1.2 }}>Gaming Social Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-muted)', padding: '8px 16px', transition: 'color 0.2s' }}
              className="hover:!text-text">Login</Link>
            <Link href="/register" className="btn-primary" style={{ fontSize: '14px', padding: '8px 20px' }}>Daftar Gratis</Link>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <header className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'rgba(59,130,246,0.06)', borderRadius: '50%', filter: 'blur(120px)' }} />
          <div style={{ position: 'absolute', top: '30%', left: '20%', width: '250px', height: '250px', background: 'rgba(139,92,246,0.05)', borderRadius: '50%', filter: 'blur(100px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: '200px', height: '200px', background: 'rgba(6,182,212,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
        </div>

        <div className="relative z-10" style={{ maxWidth: '680px', margin: '0 auto', padding: '5rem 1.5rem 4rem', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 500,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--color-primary)',
              marginBottom: '2rem'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse-glow 2s ease-in-out infinite' }} />
              Platform Komunitas Gamer
            </div>

            {/* Headline */}
            <h2 style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              Level Up Your<br />
              <span className="gradient-text">Gaming Experience</span>
            </h2>

            {/* Subheadline */}
            <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', color: 'var(--color-text-muted)', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
              Cari teman mabar, ikuti tournament seru, kumpulkan Arcadia Points,
              dan dapatkan reward menarik. Semua dalam satu platform.
            </p>

            {/* CTA */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
              <Link href="/register" className="btn-primary" style={{ fontSize: '15px', padding: '14px 32px' }}>
                🚀 Mulai Sekarang — Gratis
              </Link>
              <Link href="/login" className="btn-secondary" style={{ fontSize: '15px', padding: '14px 32px' }}>
                Login
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ═══════════ STATS ═══════════ */}
      <section className="border-y border-white/5" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <p className="gradient-text" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800 }}>{s.value}</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section style={{ maxWidth: '920px', margin: '0 auto', padding: '5rem 1.5rem', width: '100%' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, marginBottom: '0.75rem' }}>
            Fitur <span className="gradient-text">Unggulan</span>
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto' }}>
            Semua yang kamu butuhkan untuk pengalaman gaming yang lebih seru
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              style={{
                padding: '1.5rem', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)',
                transition: 'all 0.3s ease',
                textAlign: 'center',
              }}
              className="hover:border-primary/20">
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', background: 'rgba(59,130,246,0.1)',
                margin: '0 auto 1rem',
              }}>
                {f.icon}
              </div>
              <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '15px' }}>{f.title}</h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ GAMES ═══════════ */}
      <section style={{ maxWidth: '920px', margin: '0 auto', padding: '3rem 1.5rem 5rem', width: '100%' }}>
        <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, textAlign: 'center', marginBottom: '2.5rem' }}>
          Game <span className="gradient-text">Populer</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          {games.map((game, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              style={{
                textAlign: 'center', padding: '1.25rem 0.75rem', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.3s ease',
              }}
              className="hover:border-primary/20">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.625rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={game.icon} alt={game.name}
                  style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', transition: 'transform 0.3s' }}
                  loading="lazy" />
              </div>
              <p style={{ fontWeight: 600, fontSize: '12px' }}>{game.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '0 1.5rem 5rem', width: '100%' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{
            textAlign: 'center', borderRadius: '20px', padding: '3rem 2rem',
            border: '1px solid rgba(59,130,246,0.15)',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.04))',
          }}>
          <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, marginBottom: '0.75rem' }}>Siap Level Up? 🎮</h3>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Bergabung dengan ribuan gamer lainnya di ARCADIA. Daftar gratis dan dapatkan 100 Arcadia Points!
          </p>
          <Link href="/register" className="btn-primary" style={{ fontSize: '15px', padding: '14px 40px' }}>Daftar Sekarang — Gratis!</Link>
        </motion.div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-white/5" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>© 2024 ARCADIA. All rights reserved.</p>
      </footer>
    </div>
  );
}
