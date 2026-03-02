'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />

        <nav className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="GAMEHUB ARCADIA" className="w-12 h-12 rounded-xl object-cover" />
            <div>
              <h1 className="text-xl font-bold gradient-text">GAMEHUB ARCADIA</h1>
              <p className="text-xs text-text-muted">Platform Ekosistem Gamer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm !py-2 !px-4">Login</Link>
            <Link href="/register" className="btn-primary text-sm !py-2 !px-4">Daftar Gratis</Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-16 py-20 lg:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Platform Gaming #1 Indonesia
            </div>
            <h2 className="text-4xl lg:text-7xl font-extrabold mb-6 leading-tight">
              Level Up Your<br />
              <span className="gradient-text">Gaming Experience</span>
            </h2>
            <p className="text-lg lg:text-xl text-text-muted max-w-2xl mx-auto mb-10">
              Cari teman mabar, ikuti tournament seru, kumpulkan Arcadia Points, dan dapatkan reward menarik. Semua dalam satu platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary text-lg !py-4 !px-8 w-full sm:w-auto">
                🚀 Mulai Sekarang — Gratis
              </Link>
              <Link href="/login" className="btn-secondary text-lg !py-4 !px-8 w-full sm:w-auto">
                Login
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 lg:px-16 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h3 className="text-3xl lg:text-4xl font-bold text-center mb-4">Fitur <span className="gradient-text">Unggulan</span></h3>
          <p className="text-text-muted text-center mb-12 max-w-xl mx-auto">Semua yang kamu butuhkan untuk pengalaman gaming yang lebih seru</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: '🎮', title: 'Party Finder', desc: 'Cari teman mabar se-rank, se-server, se-kampus. Anti solo queue!' },
            { icon: '🏆', title: 'Tournament', desc: 'Ikuti tournament online dengan bracket system otomatis. Single & double elimination.' },
            { icon: '⭐', title: 'Arcadia Points', desc: 'Kumpulkan points dari aktivitas gaming, tukarkan dengan reward menarik.' },
            { icon: '🎯', title: 'Multi-Game', desc: 'Support banyak game populer: Valorant, MLBB, PUBG, Genshin, dan lainnya.' },
            { icon: '💬', title: 'Live Chat', desc: 'Chat realtime dengan party member. Koordinasi strategi sebelum masuk game.' },
            { icon: '📊', title: 'Leaderboard', desc: 'Kompetisi seru di leaderboard weekly & monthly. Buktikan skill-mu!' },
          ].map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card group">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{feature.title}</h4>
              <p className="text-text-muted text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Games Section */}
      <section className="max-w-6xl mx-auto px-6 lg:px-16 py-20">
        <h3 className="text-3xl font-bold text-center mb-12">Game <span className="gradient-text">Populer</span></h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Valorant', icon: 'https://cdn2.steamgriddb.com/icon/04e35ab54388b691735c8b4231d387a1.png' },
            { name: 'Mobile Legends', icon: 'https://play-lh.googleusercontent.com/hXSJ_2koqdr_Uxdnd_P0HxDjR2tXEJ2rI1AEeHr8-I33a-75_v8l_i61tpAJ-CYxhLPQA-3YxYAVE_ro7uG0' },
            { name: 'PUBG Mobile', icon: 'https://play-lh.googleusercontent.com/zCSGnBtZk0Lmp1BAbyaZfLktDzHmC6oke67qzz3G1lBegAF2asyt5KzXOJ2PVdHDYkU=s512' },
            { name: 'Genshin Impact', icon: 'https://play-lh.googleusercontent.com/YQqyKaXX-63krqsfIzUEJWUWLINxcb5tbS6QVySdxbS7eZV7YB2dUjUvX27xA0TIGtfxQ5v-tQjwlT5tTB-O=s512' },
            { name: 'Free Fire', icon: 'https://play-lh.googleusercontent.com/VxqoBX9loIqsESn5OPhXDLLYw8YFAlLJX3TJUb7ovyIQdRRWwGuG3jD9konTZAeWzd8VlVTDt8fkJ8BAEU4ZHQ=s512' },
            { name: 'Apex Legends', icon: 'https://cdn2.steamgriddb.com/icon/5c76b1cc75d7fb39b6887a5cc0b836d5.png' },
          ].map((game, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="card text-center !p-6 cursor-pointer hover:glow-primary">
              <div className="flex justify-center mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={game.icon} alt={game.name} className="w-12 h-12 rounded-lg object-cover" loading="lazy" />
              </div>
              <p className="font-semibold text-sm">{game.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 lg:px-16 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="card !p-12 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <h3 className="text-3xl lg:text-4xl font-bold mb-4">Siap Level Up? 🎮</h3>
          <p className="text-text-muted mb-8 max-w-lg mx-auto">Bergabung dengan ribuan gamer lainnya di GAMEHUB ARCADIA. Daftar gratis dan dapatkan 100 Arcadia Points!</p>
          <Link href="/register" className="btn-primary text-lg !py-4 !px-10">Daftar Sekarang — Gratis!</Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-text-muted text-sm">
        <p>© 2024 GAMEHUB ARCADIA. All rights reserved.</p>
      </footer>
    </div>
  );
}
