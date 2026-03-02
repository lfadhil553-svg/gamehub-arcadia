import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'gamehub.db');
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
      role TEXT DEFAULT 'user' CHECK(role IN ('user','organizer','admin')),
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
  `);

    // Seed data if empty
    const gameCount = db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number };
    if (gameCount.count === 0) {
        seedDatabase(db);
    }
}

function seedDatabase(db: Database.Database) {
    const games = [
        { id: uuidv4(), name: 'Valorant', slug: 'valorant', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Valorant_logo_-_pink_color_version.svg', description: 'Tactical 5v5 character-based shooter' },
        { id: uuidv4(), name: 'Mobile Legends', slug: 'mobile-legends', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Logo_of_Mobile_Legends_Bang_Bang.webp', description: '5v5 MOBA on mobile' },
        { id: uuidv4(), name: 'PUBG Mobile', slug: 'pubg-mobile', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/PUBG_Mobile_logo.png', description: 'Battle royale shooter' },
        { id: uuidv4(), name: 'Genshin Impact', slug: 'genshin-impact', icon: 'https://upload.wikimedia.org/wikipedia/en/5/5d/Genshin_Impact_logo.svg', description: 'Open world action RPG' },
        { id: uuidv4(), name: 'Free Fire', slug: 'free-fire', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Free_Fire_logo.webp', description: 'Fast-paced battle royale' },
        { id: uuidv4(), name: 'Apex Legends', slug: 'apex-legends', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Apex_legends_cover.jpg', description: 'Hero-based battle royale' },
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
                insertRank.run(uuidv4(), game.id, rank.name, i + 1, rank.icon);
            });

            const modes = modeSets[game.slug] || [];
            modes.forEach(mode => {
                insertMode.run(uuidv4(), game.id, mode);
            });

            const roles = roleSets[game.slug] || [];
            roles.forEach(role => {
                insertRole.run(uuidv4(), game.id, role.name, role.icon);
            });
        }

        // Create admin user
        const adminId = uuidv4();
        const adminHash = bcrypt.hashSync('admin123', 10);
        db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(adminId, 'admin', 'admin@arcadia.gg', adminHash, 'admin', 1, 1, 'ADMIN-' + adminId.slice(0, 8));

        db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)')
            .run(uuidv4(), adminId, 10000, 10000);

        // Create demo user
        const demoId = uuidv4();
        const demoHash = bcrypt.hashSync('demo123', 10);
        db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(demoId, 'ProGamer', 'demo@arcadia.gg', demoHash, 'user', 1, 1, 2500, 'DEMO-' + demoId.slice(0, 8));

        db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)')
            .run(uuidv4(), demoId, 2500, 5000);

        // Assign demo user some games
        const allGames = db.prepare('SELECT id FROM games').all() as Array<{ id: string }>;
        const allRanks = db.prepare('SELECT id, game_id FROM ranks WHERE tier >= 3 AND tier <= 5').all() as Array<{ id: string; game_id: string }>;

        for (let i = 0; i < Math.min(3, allGames.length); i++) {
            const gid = allGames[i].id;
            const rid = allRanks.find(r => r.game_id === gid)?.id || null;
            db.prepare('INSERT INTO user_games (id, user_id, game_id, rank_id, is_favorite) VALUES (?, ?, ?, ?, ?)')
                .run(uuidv4(), demoId, gid, rid, i === 0 ? 1 : 0);
        }

        // Create sample reward items
        const rewards = [
            { name: 'Diamond Top-Up 100', desc: 'Voucher top up 100 diamonds untuk game favoritmu', cat: 'voucher', cost: 500, stock: 50 },
            { name: 'Gaming Cafe 2 Hours', desc: 'Voucher bermain 2 jam di partner gaming cafe', cat: 'gaming_cafe', cost: 300, stock: 100 },
            { name: 'Arcadia T-Shirt', desc: 'Kaos eksklusif GAMEHUB ARCADIA limited edition', cat: 'merchandise', cost: 2000, stock: 20 },
            { name: 'Tournament VIP Pass', desc: 'Akses premium untuk 1 tournament pilihan', cat: 'tournament_entry', cost: 1000, stock: 30 },
            { name: 'Steam Wallet $5', desc: 'Steam wallet code senilai $5 USD', cat: 'voucher', cost: 1500, stock: 25 },
            { name: 'Gaming Mousepad XL', desc: 'Mousepad gaming XL dengan desain ARCADIA', cat: 'merchandise', cost: 1200, stock: 15 },
        ];

        for (const r of rewards) {
            db.prepare('INSERT INTO reward_items (id, name, description, category, cost, stock) VALUES (?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), r.name, r.desc, r.cat, r.cost, r.stock);
        }

        // Create sample parties
        const partyGames = allGames.slice(0, 3);
        const sampleParties = [
            { title: 'Push Rank Bareng Yuk!', desc: 'Butuh teman push rank, minimal Gold. Santai tapi serius.', maxP: 5, region: 'Jakarta' },
            { title: 'Chill Gaming Night', desc: 'Main santai malam ini, welcome semua rank.', maxP: 4, region: 'Bandung' },
            { title: 'Scrim Team Kompetitif', desc: 'Persiapan tournament, butuh player serius.', maxP: 5, region: 'Surabaya' },
        ];

        sampleParties.forEach((p, idx) => {
            const partyId = uuidv4();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            const gid = partyGames[idx % partyGames.length].id;
            db.prepare('INSERT INTO parties (id, game_id, creator_id, title, description, max_players, current_players, status, region, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(partyId, gid, demoId, p.title, p.desc, p.maxP, 1, 'open', p.region, expiresAt);
            db.prepare('INSERT INTO party_members (id, party_id, user_id, role) VALUES (?, ?, ?, ?)')
                .run(uuidv4(), partyId, demoId, 'leader');
        });

        // Create sample tournaments
        const sampleTournaments = [
            { name: 'Arcadia Championship Season 1', desc: 'Tournament resmi GAMEHUB ARCADIA season pertama!', mode: 'team', format: 'single_elimination', maxP: 16, teamSize: 5, prize: '500.000 Arcadia Points', fee: 100, status: 'registration' },
            { name: 'Weekend Warriors Cup', desc: 'Tournament santai setiap weekend.', mode: 'solo', format: 'single_elimination', maxP: 32, teamSize: 1, prize: '100.000 Arcadia Points', fee: 0, status: 'registration' },
            { name: 'Pro League Qualifier', desc: 'Kualifikasi menuju Pro League nasional.', mode: 'team', format: 'double_elimination', maxP: 8, teamSize: 5, prize: '1.000.000 Arcadia Points + Voucher', fee: 500, status: 'ongoing' },
        ];

        sampleTournaments.forEach((t, idx) => {
            const gid = partyGames[idx % partyGames.length].id;
            const regStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
            const regEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            const startDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
            db.prepare('INSERT INTO tournaments (id, game_id, organizer_id, name, description, mode, format, max_participants, team_size, prize_pool, entry_fee, status, registration_start, registration_end, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), gid, adminId, t.name, t.desc, t.mode, t.format, t.maxP, t.teamSize, t.prize, t.fee, t.status, regStart, regEnd, startDate);
        });
    });

    transaction();
}
