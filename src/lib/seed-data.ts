// All sample users — diverse points, reputation, and activity levels
export const sampleUsers = [
  // Top-tier players (high points, high reputation)
  { username: 'ShadowKnight', points: 12500, rep: 4.9 },
  { username: 'NeonBlade', points: 11200, rep: 4.8 },
  { username: 'PhantomX', points: 9800, rep: 4.7 },
  { username: 'StarFire', points: 9100, rep: 4.6 },
  { username: 'CyberWolf', points: 8500, rep: 4.5 },
  // Mid-tier active players
  { username: 'ThunderGod', points: 7200, rep: 4.3 },
  { username: 'AceHunter', points: 6800, rep: 4.4 },
  { username: 'BlazeMaster', points: 6100, rep: 4.2 },
  { username: 'IronClad', points: 5500, rep: 4.0 },
  { username: 'PixelNinja', points: 5200, rep: 3.9 },
  // Regular active players
  { username: 'VortexKing', points: 4800, rep: 4.1 },
  { username: 'LunarEclipse', points: 4500, rep: 3.8 },
  { username: 'ZeroGravity', points: 4200, rep: 4.3 },
  { username: 'StormBreaker', points: 3900, rep: 3.7 },
  { username: 'FrostByte', points: 3600, rep: 4.0 },
  { username: 'DarkMatter', points: 3400, rep: 3.6 },
  { username: 'NovaFlash', points: 3100, rep: 4.2 },
  { username: 'TitanRush', points: 2900, rep: 3.5 },
  { username: 'GhostRider', points: 2700, rep: 3.8 },
  { username: 'SilverFang', points: 2500, rep: 3.4 },
  // Newer but active players
  { username: 'MysticAura', points: 2200, rep: 4.5 },
  { username: 'RapidFire', points: 2000, rep: 3.3 },
  { username: 'OmegaStrike', points: 1800, rep: 3.9 },
  { username: 'NightHawk', points: 1600, rep: 3.2 },
  { username: 'CrimsonTide', points: 1400, rep: 4.0 },
  { username: 'QuantumLeap', points: 1200, rep: 3.1 },
  { username: 'VenomBite', points: 1100, rep: 3.6 },
  { username: 'FlameWarden', points: 950, rep: 3.0 },
  { username: 'ArcticFox', points: 800, rep: 3.7 },
  { username: 'SteelWing', points: 650, rep: 2.8 },
  // Casual / new players
  { username: 'CosmicDust', points: 500, rep: 4.1 },
  { username: 'IronPulse', points: 350, rep: 2.5 },
  { username: 'NebulaStar', points: 250, rep: 3.0 },
  { username: 'EchoStorm', points: 180, rep: 2.2 },
  { username: 'SkyDrifter', points: 100, rep: 5.0 },
];

// Expanded party list — 30+ diverse parties with varied themes
export const partyTemplates = [
  // Valorant (5v5)
  { gameIdx: 0, title: 'Push Rank Bareng Yuk!', desc: 'Butuh teman push rank, minimal Gold. Santai tapi serius.', maxP: 5, region: 'Jakarta' },
  { gameIdx: 0, title: 'Valorant Competitive 5 Stack', desc: 'Cari squad ranked, mic wajib. Min Platinum.', maxP: 5, region: 'Surabaya' },
  { gameIdx: 0, title: 'Unrated Chill Night 🌙', desc: 'Main unrated santai sambil ngobrol. Semua rank welcome.', maxP: 5, region: 'Bandung' },
  { gameIdx: 0, title: 'Spike Rush Speed Run', desc: 'Farming XP lewat spike rush, siapa cepat dia dapat!', maxP: 5, region: 'Yogyakarta' },
  { gameIdx: 0, title: 'Road to Immortal 🔥', desc: 'Serius push Immortal, butuh Diamond+ saja.', maxP: 5, region: 'Medan' },
  // Mobile Legends (5v5)
  { gameIdx: 1, title: 'Chill Gaming Night', desc: 'Main santai malam ini, welcome semua rank.', maxP: 5, region: 'Bandung' },
  { gameIdx: 1, title: 'ML Ranked Squad', desc: 'Butuh tank/support untuk push Mythic.', maxP: 5, region: 'Medan' },
  { gameIdx: 1, title: 'Mythic Grind Today! 💜', desc: 'Dari Legend ke Mythic hari ini. Serius player only.', maxP: 5, region: 'Jakarta' },
  { gameIdx: 1, title: 'Brawl Mode Seru-seruan', desc: 'Main brawl random hero, yang penting ketawa.', maxP: 5, region: 'Makassar' },
  { gameIdx: 1, title: 'Custom 5v5 Scrim', desc: 'Latihan scrim antar tim, siap-siap tournament.', maxP: 5, region: 'Semarang' },
  // PUBG Mobile (4 squad)
  { gameIdx: 2, title: 'PUBG Squad Erangel', desc: 'Main squad Erangel classic. Serius push rank.', maxP: 4, region: 'Jakarta' },
  { gameIdx: 2, title: 'Chicken Dinner Tonight!', desc: 'Cari temen mabar santai, yang penting seru.', maxP: 4, region: 'Semarang' },
  { gameIdx: 2, title: 'Miramar Hot Drop 🔥', desc: 'Hot drop Pecado/Hacienda terus. Berani?', maxP: 4, region: 'Surabaya' },
  { gameIdx: 2, title: 'Ranked Conqueror Push', desc: 'Serius push Conqueror. Crown+ only.', maxP: 4, region: 'Bandung' },
  { gameIdx: 2, title: 'TDM Warmup Session', desc: 'Warmup TDM sebelum ranked. 30 menit.', maxP: 4, region: 'Yogyakarta' },
  // Genshin Impact (4 co-op)
  { gameIdx: 3, title: 'Domain Run AR 55+', desc: 'Butuh bantuan clear Crimson Witch domain.', maxP: 4, region: 'Jakarta' },
  { gameIdx: 3, title: 'Spiral Abyss Help', desc: 'Co-op farming artifact, semua AR welcome.', maxP: 4, region: 'Bandung' },
  { gameIdx: 3, title: 'Weekly Boss Carry 👑', desc: 'Carry weekly boss untuk newbie. AR 30+ join!', maxP: 4, region: 'Surabaya' },
  { gameIdx: 3, title: 'Artifact Farming Marathon', desc: '2 jam nonstop farming artifact. Kuat mental?', maxP: 4, region: 'Medan' },
  { gameIdx: 3, title: 'Exploration & Chest Hunt', desc: 'Cari chest bareng di Fontaine. Santai.', maxP: 4, region: 'Semarang' },
  // Free Fire (4 squad)
  { gameIdx: 4, title: 'Free Fire Ranked Squad', desc: 'Push Heroic bareng, butuh 3 orang lagi!', maxP: 4, region: 'Surabaya' },
  { gameIdx: 4, title: 'Clash Squad Pro', desc: 'Latihan clash squad buat tournament.', maxP: 4, region: 'Makassar' },
  { gameIdx: 4, title: 'BR Bermuda Classic', desc: 'Landing Pochinok, rotate safe. Strategi!', maxP: 4, region: 'Jakarta' },
  { gameIdx: 4, title: 'Custom Room 4v4', desc: 'Custom room latihan aim dan movement.', maxP: 4, region: 'Bandung' },
  { gameIdx: 4, title: 'Grandmaster Grind 🏆', desc: 'Target GM minggu ini. Diamond+ only.', maxP: 4, region: 'Medan' },
  // Apex Legends (3 squad)
  { gameIdx: 5, title: 'Apex Trio Ranked', desc: 'Cari squad ranked Apex. Min Diamond.', maxP: 3, region: 'Jakarta' },
  { gameIdx: 5, title: 'Arenas Practice', desc: 'Latihan arenas mode 3v3. Casual welcome.', maxP: 3, region: 'Yogyakarta' },
  { gameIdx: 5, title: 'Predator Push 🔴', desc: 'Full serius ranked. Master+ wajib.', maxP: 3, region: 'Surabaya' },
  { gameIdx: 5, title: 'Pubs Warmup Casual', desc: 'Main pubs santai buat warmup sebelum ranked.', maxP: 3, region: 'Bandung' },
  { gameIdx: 5, title: 'New Season Placement', desc: 'Placement match season baru, butuh trio.', maxP: 3, region: 'Semarang' },
];

// Friendships to create (index pairs into the allUserIds array built at runtime)
// Format: [requesterIdx, addresseeIdx, status]
export const friendshipPairs: [number, number, string][] = [
  [0, 1, 'accepted'], [0, 2, 'accepted'], [0, 5, 'accepted'],
  [1, 3, 'accepted'], [1, 4, 'accepted'], [2, 6, 'accepted'],
  [3, 7, 'accepted'], [4, 8, 'accepted'], [5, 9, 'accepted'],
  [6, 10, 'accepted'], [7, 11, 'accepted'], [8, 12, 'accepted'],
  [9, 13, 'accepted'], [10, 14, 'accepted'], [11, 15, 'accepted'],
  [0, 20, 'pending'], [1, 21, 'pending'], [5, 22, 'pending'],
  [3, 25, 'accepted'], [12, 16, 'accepted'], [13, 17, 'accepted'],
  [14, 18, 'accepted'], [15, 19, 'accepted'], [16, 20, 'accepted'],
  [17, 21, 'accepted'], [18, 22, 'accepted'], [19, 23, 'accepted'],
  [20, 24, 'accepted'], [21, 25, 'accepted'],
];
