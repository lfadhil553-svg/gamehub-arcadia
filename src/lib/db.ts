import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Database path: Railway /data (persistent), Vercel /tmp (ephemeral), or local cwd
const DATA_DIR = process.env.NODE_ENV === 'production'
  ? (fs.existsSync('/data') ? '/data' : '/tmp')
  : process.cwd();
const DB_PATH = path.join(DATA_DIR, 'gamehub.db');
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT '/avatars/default.png',
      role TEXT DEFAULT 'user' CHECK(role IN ('user','organizer','admin','superadmin')),
      is_verified INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      reputation_score REAL DEFAULT 5.0,
      arcadia_points INTEGER DEFAULT 0,
      referral_code TEXT UNIQUE,
      onboarding_done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Games
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT '🎮',
      banner TEXT DEFAULT '',
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Ranks
    CREATE TABLE IF NOT EXISTS ranks (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      tier INTEGER NOT NULL,
      icon TEXT DEFAULT '',
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    -- Game Modes
    CREATE TABLE IF NOT EXISTS game_modes (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    -- Game Roles
    CREATE TABLE IF NOT EXISTS game_roles (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      FOREIGN KEY (game_id) REFERENCES games(id)
    );

    -- User Games
    CREATE TABLE IF NOT EXISTS user_games (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      rank_id TEXT,
      role_id TEXT,
      is_favorite INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (game_id) REFERENCES games(id),
      UNIQUE(user_id, game_id)
    );

    -- Parties
    CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      min_rank_tier INTEGER DEFAULT 0,
      game_mode_id TEXT,
      max_players INTEGER DEFAULT 5,
      current_players INTEGER DEFAULT 1,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','full','closed')),
      region TEXT DEFAULT '',
      scheduled_at TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    -- Party Members
    CREATE TABLE IF NOT EXISTS party_members (
      id TEXT PRIMARY KEY,
      party_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (party_id) REFERENCES parties(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(party_id, user_id)
    );

    -- Party Chat
    CREATE TABLE IF NOT EXISTS party_chat (
      id TEXT PRIMARY KEY,
      party_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (party_id) REFERENCES parties(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- User Ratings
    CREATE TABLE IF NOT EXISTS user_ratings (
      id TEXT PRIMARY KEY,
      rater_id TEXT NOT NULL,
      rated_id TEXT NOT NULL,
      party_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (rater_id) REFERENCES users(id),
      FOREIGN KEY (rated_id) REFERENCES users(id)
    );

    -- Tournaments
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      organizer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      mode TEXT DEFAULT 'solo' CHECK(mode IN ('solo','team')),
      format TEXT DEFAULT 'single_elimination' CHECK(format IN ('single_elimination','double_elimination')),
      max_participants INTEGER DEFAULT 16,
      current_participants INTEGER DEFAULT 0,
      team_size INTEGER DEFAULT 1,
      prize_pool TEXT DEFAULT '',
      entry_fee INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','registration','ongoing','completed','cancelled')),
      registration_start TEXT,
      registration_end TEXT,
      start_date TEXT,
      end_date TEXT,
      rules TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    );

    -- Tournament Participants
    CREATE TABLE IF NOT EXISTS tournament_participants (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      team_id TEXT,
      seed INTEGER,
      status TEXT DEFAULT 'registered' CHECK(status IN ('registered','checked_in','eliminated','winner')),
      registered_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(tournament_id, user_id)
    );

    -- Teams
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      captain_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (captain_id) REFERENCES users(id)
    );

    -- Matches
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      match_number INTEGER NOT NULL,
      player1_id TEXT,
      player2_id TEXT,
      winner_id TEXT,
      score1 INTEGER,
      score2 INTEGER,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','ongoing','completed')),
      scheduled_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    -- Wallets
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      balance INTEGER DEFAULT 0,
      lifetime_earned INTEGER DEFAULT 0,
      lifetime_spent INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Wallet Transactions
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('earn','spend','expire')),
      amount INTEGER NOT NULL,
      description TEXT DEFAULT '',
      reference_type TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    );

    -- Reward Items
    CREATE TABLE IF NOT EXISTS reward_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'voucher' CHECK(category IN ('voucher','merchandise','tournament_entry','gaming_cafe')),
      cost INTEGER NOT NULL,
      stock INTEGER DEFAULT -1,
      image TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Redeem History
    CREATE TABLE IF NOT EXISTS redeem_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reward_id TEXT NOT NULL,
      claim_code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','claimed','expired')),
      redeemed_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reward_id) REFERENCES reward_items(id)
    );

    -- Referral Logs
    CREATE TABLE IF NOT EXISTS referral_logs (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL,
      points_awarded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id)
    );

    -- Sessions (refresh tokens)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Daily Login Tracking
    CREATE TABLE IF NOT EXISTS daily_logins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      login_date TEXT NOT NULL,
      points_awarded INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, login_date)
    );

    -- Friendships
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      addressee_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (addressee_id) REFERENCES users(id),
      UNIQUE(requester_id, addressee_id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_parties_game ON parties(game_id);
    CREATE INDEX IF NOT EXISTS idx_parties_status ON parties(status);
    CREATE INDEX IF NOT EXISTS idx_parties_creator ON parties(creator_id);
    CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game_id);
    CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
    CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_user_games_user ON user_games(user_id);
    CREATE INDEX IF NOT EXISTS idx_party_members_party ON party_members(party_id);
    CREATE INDEX IF NOT EXISTS idx_party_chat_party ON party_chat(party_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
  `);

  // Migrations: add columns that may be missing on older databases
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const columnNames = userColumns.map(c => c.name);
  if (!columnNames.includes('avatar')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT '/avatars/default.png'");
  }
  if (!columnNames.includes('updated_at')) {
    db.exec("ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))");
  }

  // Seed data if empty
  const gameCount = db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number };
  if (gameCount.count === 0) {
    seedDatabase(db);
  }
}

function seedDatabase(db: Database.Database) {
  // Deterministic ID generator for seed data — ensures every serverless instance
  // creates the same database with identical IDs (critical for Vercel)
  let seedCounter = 0;
  function seedId(prefix = 'seed'): string {
    seedCounter++;
    const hex = seedCounter.toString(16).padStart(8, '0');
    return `${prefix}-0000-0000-0000-${hex.padStart(12, '0')}`;
  }

  const games = [
    { id: seedId('game'), name: 'Valorant', slug: 'valorant', icon: 'https://cdn2.steamgriddb.com/icon/04e35ab54388b691735c8b4231d387a1.png', description: 'Tactical 5v5 character-based shooter' },
    { id: seedId('game'), name: 'Mobile Legends', slug: 'mobile-legends', icon: 'https://play-lh.googleusercontent.com/hXSJ_2koqdr_Uxdnd_P0HxDjR2tXEJ2rI1AEeHr8-I33a-75_v8l_i61tpAJ-CYxhLPQA-3YxYAVE_ro7uG0', description: '5v5 MOBA on mobile' },
    { id: seedId('game'), name: 'PUBG Mobile', slug: 'pubg-mobile', icon: 'https://play-lh.googleusercontent.com/zCSGnBtZk0Lmp1BAbyaZfLktDzHmC6oke67qzz3G1lBegAF2asyt5KzXOJ2PVdHDYkU=s512', description: 'Battle royale shooter' },
    { id: seedId('game'), name: 'Genshin Impact', slug: 'genshin-impact', icon: 'https://play-lh.googleusercontent.com/YQqyKaXX-63krqsfIzUEJWUWLINxcb5tbS6QVySdxbS7eZV7YB2dUjUvX27xA0TIGtfxQ5v-tQjwlT5tTB-O=s512', description: 'Open world action RPG' },
    { id: seedId('game'), name: 'Free Fire', slug: 'free-fire', icon: 'https://play-lh.googleusercontent.com/VxqoBX9loIqsESn5OPhXDLLYw8YFAlLJX3TJUb7ovyIQdRRWwGuG3jD9konTZAeWzd8VlVTDt8fkJ8BAEU4ZHQ=s512', description: 'Fast-paced battle royale' },
    { id: seedId('game'), name: 'Apex Legends', slug: 'apex-legends', icon: 'https://cdn2.steamgriddb.com/icon/5c76b1cc75d7fb39b6887a5cc0b836d5.png', description: 'Hero-based battle royale' },
  ];

  const insertGame = db.prepare('INSERT INTO games (id, name, slug, icon, description) VALUES (?, ?, ?, ?, ?)');
  const insertRank = db.prepare('INSERT INTO ranks (id, game_id, name, tier, icon) VALUES (?, ?, ?, ?, ?)');
  const insertMode = db.prepare('INSERT INTO game_modes (id, game_id, name) VALUES (?, ?, ?)');
  const insertRole = db.prepare('INSERT INTO game_roles (id, game_id, name, icon) VALUES (?, ?, ?, ?)');

  const rankSets: Record<string, Array<{ name: string; icon: string }>> = {
    'valorant': [
      { name: 'Iron', icon: '🟤' }, { name: 'Bronze', icon: '🥉' }, { name: 'Silver', icon: '🥈' },
      { name: 'Gold', icon: '🥇' }, { name: 'Platinum', icon: '💎' }, { name: 'Diamond', icon: '💠' },
      { name: 'Ascendant', icon: '🌟' }, { name: 'Immortal', icon: '👑' }, { name: 'Radiant', icon: '⭐' }
    ],
    'mobile-legends': [
      { name: 'Warrior', icon: '⚔️' }, { name: 'Elite', icon: '🛡️' }, { name: 'Master', icon: '🏅' },
      { name: 'Grandmaster', icon: '🎖️' }, { name: 'Epic', icon: '💜' }, { name: 'Legend', icon: '🏆' },
      { name: 'Mythic', icon: '👑' }, { name: 'Mythical Glory', icon: '⭐' }
    ],
    'pubg-mobile': [
      { name: 'Bronze', icon: '🥉' }, { name: 'Silver', icon: '🥈' }, { name: 'Gold', icon: '🥇' },
      { name: 'Platinum', icon: '💎' }, { name: 'Diamond', icon: '💠' }, { name: 'Crown', icon: '👑' },
      { name: 'Ace', icon: '🌟' }, { name: 'Conqueror', icon: '⭐' }
    ],
    'genshin-impact': [
      { name: 'AR 1-15', icon: '🌱' }, { name: 'AR 16-25', icon: '🌿' }, { name: 'AR 26-35', icon: '🌳' },
      { name: 'AR 36-45', icon: '🏔️' }, { name: 'AR 46-55', icon: '⛰️' }, { name: 'AR 56+', icon: '🏯' }
    ],
    'free-fire': [
      { name: 'Bronze', icon: '🥉' }, { name: 'Silver', icon: '🥈' }, { name: 'Gold', icon: '🥇' },
      { name: 'Platinum', icon: '💎' }, { name: 'Diamond', icon: '💠' }, { name: 'Heroic', icon: '👑' },
      { name: 'Grandmaster', icon: '⭐' }
    ],
    'apex-legends': [
      { name: 'Bronze', icon: '🥉' }, { name: 'Silver', icon: '🥈' }, { name: 'Gold', icon: '🥇' },
      { name: 'Platinum', icon: '💎' }, { name: 'Diamond', icon: '💠' }, { name: 'Master', icon: '👑' },
      { name: 'Predator', icon: '⭐' }
    ],
  };

  const modeSets: Record<string, string[]> = {
    'valorant': ['Competitive', 'Unrated', 'Spike Rush', 'Deathmatch'],
    'mobile-legends': ['Ranked', 'Classic', 'Brawl', 'Custom'],
    'pubg-mobile': ['Classic', 'Ranked', 'Arena', 'Payload'],
    'genshin-impact': ['Co-op Domain', 'Spiral Abyss', 'Open World'],
    'free-fire': ['Battle Royale', 'Clash Squad', 'Ranked'],
    'apex-legends': ['Battle Royale', 'Ranked', 'Arenas', 'Control'],
  };

  const roleSets: Record<string, Array<{ name: string; icon: string }>> = {
    'valorant': [
      { name: 'Duelist', icon: '⚔️' }, { name: 'Controller', icon: '🌫️' },
      { name: 'Initiator', icon: '🎯' }, { name: 'Sentinel', icon: '🛡️' }
    ],
    'mobile-legends': [
      { name: 'Tank', icon: '🛡️' }, { name: 'Fighter', icon: '⚔️' },
      { name: 'Assassin', icon: '🗡️' }, { name: 'Marksman', icon: '🏹' },
      { name: 'Mage', icon: '🔮' }, { name: 'Support', icon: '💚' }
    ],
    'pubg-mobile': [
      { name: 'Sniper', icon: '🎯' }, { name: 'Rusher', icon: '⚡' },
      { name: 'Support', icon: '💚' }, { name: 'IGL', icon: '🧠' }
    ],
    'genshin-impact': [
      { name: 'DPS', icon: '⚔️' }, { name: 'Sub-DPS', icon: '🗡️' },
      { name: 'Support', icon: '💚' }, { name: 'Healer', icon: '❤️' }
    ],
    'free-fire': [
      { name: 'Rusher', icon: '⚡' }, { name: 'Sniper', icon: '🎯' },
      { name: 'Support', icon: '💚' }, { name: 'IGL', icon: '🧠' }
    ],
    'apex-legends': [
      { name: 'Assault', icon: '⚔️' }, { name: 'Recon', icon: '🔍' },
      { name: 'Support', icon: '💚' }, { name: 'Defense', icon: '🛡️' }
    ],
  };

  const transaction = db.transaction(() => {
    for (const game of games) {
      insertGame.run(game.id, game.name, game.slug, game.icon, game.description);

      const ranks = rankSets[game.slug] || [];
      ranks.forEach((rank, i) => {
        insertRank.run(seedId('rank'), game.id, rank.name, i + 1, rank.icon);
      });

      const modes = modeSets[game.slug] || [];
      modes.forEach(mode => {
        insertMode.run(seedId('mode'), game.id, mode);
      });

      const roles = roleSets[game.slug] || [];
      roles.forEach(role => {
        insertRole.run(seedId('role'), game.id, role.name, role.icon);
      });
    }

    // Create superadmin (Arch Dev) - can promote/demote admins
    const superAdminId = seedId('user');
    const superAdminHash = bcrypt.hashSync('dev!@#$-_00', 10);
    db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, avatar, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(superAdminId, 'Arch Dev', 'progamer@arcadia.gg', superAdminHash, 'superadmin', 1, 1, 999999999, '/avatars/avatar_15.png', 'SUPER-ARCHDEV0');
    db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)')
      .run(seedId('wall'), superAdminId, 999999999, 999999999);

    // Create admin user
    const adminId = seedId('user');
    const adminHash = bcrypt.hashSync('staf-123!@#', 10);
    db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, avatar, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(adminId, 'Arca Staf', 'admin@arcadia.gg', adminHash, 'admin', 1, 1, 1000000, '/avatars/avatar_3.png', 'ADMIN-ARCASTF');
    db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)')
      .run(seedId('wall'), adminId, 1000000, 1000000);

    // Create demo user
    const demoId = seedId('user');
    const demoHash = bcrypt.hashSync('demo123', 10);
    db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, avatar, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(demoId, 'GamerPro', 'demo@arcadia.gg', demoHash, 'user', 1, 1, 2500, '/avatars/avatar_1.png', 'DEMO-GAMERPRO');
    db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)')
      .run(seedId('wall'), demoId, 2500, 5000);

    // Create sample leaderboard users
    const sampleUsers = [
      { username: 'ShadowKnight', points: 8500 },
      { username: 'NeonBlade', points: 7200 },
      { username: 'PhantomX', points: 6800 },
      { username: 'StarFire', points: 5900 },
      { username: 'CyberWolf', points: 5100 },
      { username: 'ThunderGod', points: 4500 },
      { username: 'AceHunter', points: 3800 },
      { username: 'BlazeMaster', points: 3200 },
      { username: 'IronClad', points: 2800 },
      { username: 'PixelNinja', points: 2100 },
    ];
    const sampleHash = bcrypt.hashSync('gamer123', 10);
    for (let i = 0; i < sampleUsers.length; i++) {
      const su = sampleUsers[i];
      const suId = seedId('user');
      const suAvatar = `/avatars/avatar_${(i % 14) + 1}.png`;
      db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, avatar, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(suId, su.username, `${su.username.toLowerCase()}@arcadia.gg`, sampleHash, 'user', 1, 1, su.points, suAvatar, su.username.toUpperCase().slice(0, 4) + '-REF00' + i);
      db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)')
        .run(seedId('wall'), suId, su.points, su.points * 2);
    }

    // Assign demo user some games
    const allGames = db.prepare('SELECT id FROM games').all() as Array<{ id: string }>;
    const allRanks = db.prepare('SELECT id, game_id FROM ranks WHERE tier >= 3 AND tier <= 5').all() as Array<{ id: string; game_id: string }>;

    for (let i = 0; i < Math.min(3, allGames.length); i++) {
      const gid = allGames[i].id;
      const rid = allRanks.find(r => r.game_id === gid)?.id || null;
      db.prepare('INSERT INTO user_games (id, user_id, game_id, rank_id, is_favorite) VALUES (?, ?, ?, ?, ?)')
        .run(seedId('ugam'), demoId, gid, rid, i === 0 ? 1 : 0);
    }

    // Create sample reward items
    const rewards = [
      { name: 'Diamond Top-Up 100', desc: 'Voucher top up 100 diamonds untuk game favoritmu', cat: 'voucher', cost: 500, stock: 50 },
      { name: 'Gaming Cafe 2 Hours', desc: 'Voucher bermain 2 jam di partner gaming cafe', cat: 'gaming_cafe', cost: 300, stock: 100 },
      { name: 'Arcadia T-Shirt', desc: 'Kaos eksklusif ARCADIA limited edition', cat: 'merchandise', cost: 2000, stock: 20 },
      { name: 'Tournament VIP Pass', desc: 'Akses premium untuk 1 tournament pilihan', cat: 'tournament_entry', cost: 1000, stock: 30 },
      { name: 'Steam Wallet $5', desc: 'Steam wallet code senilai $5 USD', cat: 'voucher', cost: 1500, stock: 25 },
      { name: 'Gaming Mousepad XL', desc: 'Mousepad gaming XL dengan desain ARCADIA', cat: 'merchandise', cost: 1200, stock: 15 },
    ];

    for (const r of rewards) {
      db.prepare('INSERT INTO reward_items (id, name, description, category, cost, stock) VALUES (?, ?, ?, ?, ?, ?)')
        .run(seedId('rwrd'), r.name, r.desc, r.cat, r.cost, r.stock);
    }

    // Create parties for EVERY game with appropriate team sizes and random members
    const allUserIds = [demoId, superAdminId, adminId];
    // Add sample user IDs (they were created with seedId('user') in order)
    const sampleUserIds: string[] = [];
    const allUsersFromDb = db.prepare('SELECT id FROM users WHERE id NOT IN (?, ?, ?)').all(demoId, superAdminId, adminId) as Array<{ id: string }>;
    allUsersFromDb.forEach(u => sampleUserIds.push(u.id));

    const gameParties: Array<{ gameIdx: number; title: string; desc: string; maxP: number; region: string; creatorIdx: number }> = [
      // Valorant (5v5)
      { gameIdx: 0, title: 'Push Rank Bareng Yuk!', desc: 'Butuh teman push rank, minimal Gold. Santai tapi serius.', maxP: 5, region: 'Jakarta', creatorIdx: 0 },
      { gameIdx: 0, title: 'Valorant Competitive 5 Stack', desc: 'Cari squad ranked, mic wajib. Min Platinum.', maxP: 5, region: 'Surabaya', creatorIdx: 1 },
      // Mobile Legends (5v5)
      { gameIdx: 1, title: 'Chill Gaming Night', desc: 'Main santai malam ini, welcome semua rank.', maxP: 5, region: 'Bandung', creatorIdx: 2 },
      { gameIdx: 1, title: 'ML Ranked Squad', desc: 'Butuh tank/support untuk push Mythic.', maxP: 5, region: 'Medan', creatorIdx: 3 },
      // PUBG Mobile (4 squad)
      { gameIdx: 2, title: 'PUBG Squad Erangel', desc: 'Main squad Erangel classic. Serius push rank.', maxP: 4, region: 'Jakarta', creatorIdx: 4 },
      { gameIdx: 2, title: 'Chicken Dinner Tonight!', desc: 'Cari temen mabar santai, yang penting seru.', maxP: 4, region: 'Semarang', creatorIdx: 5 },
      // Genshin Impact (4 co-op)
      { gameIdx: 3, title: 'Domain Run AR 55+', desc: 'Butuh bantuan clear Crimson Witch domain.', maxP: 4, region: 'Jakarta', creatorIdx: 6 },
      { gameIdx: 3, title: 'Spiral Abyss Help', desc: 'Co-op farming artifact, semua AR welcome.', maxP: 4, region: 'Bandung', creatorIdx: 7 },
      // Free Fire (4 squad)
      { gameIdx: 4, title: 'Free Fire Ranked Squad', desc: 'Push Heroic bareng, butuh 3 orang lagi!', maxP: 4, region: 'Surabaya', creatorIdx: 8 },
      { gameIdx: 4, title: 'Clash Squad Pro', desc: 'Latihan clash squad buat tournament.', maxP: 4, region: 'Makassar', creatorIdx: 9 },
      // Apex Legends (3 squad)
      { gameIdx: 5, title: 'Apex Trio Ranked', desc: 'Cari squad ranked Apex. Min Diamond.', maxP: 3, region: 'Jakarta', creatorIdx: 0 },
      { gameIdx: 5, title: 'Arenas Practice', desc: 'Latihan arenas mode 3v3. Casual welcome.', maxP: 3, region: 'Yogyakarta', creatorIdx: 1 },
    ];

    // Pool of available members (exclude the creator for each party)
    const memberPool = [...sampleUserIds, demoId, adminId];

    gameParties.forEach((p, idx) => {
      const partyId = seedId('prty');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const gid = allGames[p.gameIdx].id;
      const creatorId = memberPool[p.creatorIdx % memberPool.length];

      // Determine how many members to fill (some full, some partially filled)
      const membersToFill = idx % 3 === 0 ? p.maxP : Math.max(2, Math.floor(p.maxP * 0.6) + 1);
      const currentPlayers = Math.min(membersToFill, p.maxP);
      const status = currentPlayers >= p.maxP ? 'full' : 'open';

      db.prepare('INSERT INTO parties (id, game_id, creator_id, title, description, max_players, current_players, status, region, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(partyId, gid, creatorId, p.title, p.desc, p.maxP, currentPlayers, status, p.region, expiresAt);

      // Add creator as leader
      db.prepare('INSERT INTO party_members (id, party_id, user_id, role) VALUES (?, ?, ?, ?)')
        .run(seedId('pmem'), partyId, creatorId, 'leader');

      // Fill with random members (avoid duplicating the creator)
      const availableMembers = memberPool.filter(id => id !== creatorId);
      for (let m = 1; m < currentPlayers && m <= availableMembers.length; m++) {
        const memberId = availableMembers[(idx * 3 + m) % availableMembers.length];
        db.prepare('INSERT OR IGNORE INTO party_members (id, party_id, user_id, role) VALUES (?, ?, ?, ?)')
          .run(seedId('pmem'), partyId, memberId, 'member');
      }
    });

    // Create sample tournaments
    const sampleTournaments = [
      { name: 'Arcadia Championship Season 1', desc: 'Tournament resmi ARCADIA season pertama!', mode: 'team', format: 'single_elimination', maxP: 16, teamSize: 5, prize: '500.000 Arcadia Points', fee: 100, status: 'registration' },
      { name: 'Weekend Warriors Cup', desc: 'Tournament santai setiap weekend.', mode: 'solo', format: 'single_elimination', maxP: 32, teamSize: 1, prize: '100.000 Arcadia Points', fee: 0, status: 'registration' },
      { name: 'Pro League Qualifier', desc: 'Kualifikasi menuju Pro League nasional.', mode: 'team', format: 'double_elimination', maxP: 8, teamSize: 5, prize: '1.000.000 Arcadia Points + Voucher', fee: 500, status: 'ongoing' },
    ];

    sampleTournaments.forEach((t, idx) => {
      const gid = allGames[idx % allGames.length].id;
      const regStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const regEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const startDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('INSERT INTO tournaments (id, game_id, organizer_id, name, description, mode, format, max_participants, team_size, prize_pool, entry_fee, status, registration_start, registration_end, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(seedId('tour'), gid, adminId, t.name, t.desc, t.mode, t.format, t.maxP, t.teamSize, t.prize, t.fee, t.status, regStart, regEnd, startDate);
    });
  });

  transaction();
}
