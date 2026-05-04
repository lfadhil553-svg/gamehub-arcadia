import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// ─────────────────────────────────────────────────────────
// Compatibility wrapper: makes sql.js behave like better-sqlite3
// so ALL existing API routes work without changes.
// ─────────────────────────────────────────────────────────

interface PreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

interface CompatDb {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): void;
  pragma(pragma: string): unknown;
  transaction<T>(fn: () => T): () => T;
  close(): void;
  _raw: SqlJsDatabase; // access to underlying sql.js db for export
}

// Debounced disk save — avoids writing on every single INSERT during seed,
// but ensures mutations from user actions are persisted promptly.
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _seedingMode = true; // true during initial seed, false after

function scheduleSave() {
  if (_seedingMode) return; // don't save during seeding (saved once at end)
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { saveToDisk(); _saveTimer = null; }, 200);
}

function wrapStmt(sqlDb: SqlJsDatabase, sql: string): PreparedStatement {
  return {
    run(...params: unknown[]) {
      try {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params as unknown[]);
        stmt.step();
        stmt.free();
      } catch (e) {
        if (sql.includes('OR IGNORE')) return { changes: 0, lastInsertRowid: 0 };
        throw e;
      }
      const r = sqlDb.exec('SELECT changes() as c');
      const changes = r.length > 0 ? (r[0].values[0][0] as number) : 0;
      // Auto-save after mutations
      if (changes > 0) scheduleSave();
      return { changes, lastInsertRowid: 0 };
    },
    get(...params: unknown[]): Record<string, unknown> | undefined {
      const stmt = sqlDb.prepare(sql);
      stmt.bind(params as unknown[]);
      if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row: Record<string, unknown> = {};
        cols.forEach((col, i) => { row[col] = vals[i]; });
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params: unknown[]): Record<string, unknown>[] {
      const stmt = sqlDb.prepare(sql);
      stmt.bind(params as unknown[]);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row: Record<string, unknown> = {};
        cols.forEach((col, i) => { row[col] = vals[i]; });
        rows.push(row);
      }
      stmt.free();
      return rows;
    },
  };
}

function createCompatDb(sqlDb: SqlJsDatabase): CompatDb {
  return {
    _raw: sqlDb,
    prepare(sql: string) { return wrapStmt(sqlDb, sql); },
    exec(sql: string) { sqlDb.run(sql); },
    pragma(p: string) {
      try { sqlDb.run(`PRAGMA ${p}`); } catch { /* ignore */ }
      return undefined;
    },
    transaction<T>(fn: () => T): () => T {
      return () => {
        sqlDb.run('BEGIN');
        try {
          const result = fn();
          sqlDb.run('COMMIT');
          scheduleSave();
          return result;
        } catch (e) {
          sqlDb.run('ROLLBACK');
          throw e;
        }
      };
    },
    close() { sqlDb.close(); },
  };
}

// ─────────────────────────────────────────────────────────
// Database lifecycle
// ─────────────────────────────────────────────────────────

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? (fs.existsSync('/data') ? '/data' : '/tmp')
  : process.cwd();
const DB_PATH = path.join(DATA_DIR, 'gamehub.db');

let db: CompatDb | null = null;
let initPromise: Promise<void> | null = null;

// Eagerly start WASM init at import time
initPromise = doInit();

async function doInit(): Promise<void> {
  if (db) return;
  try {
    // Load WASM binary directly to avoid path resolution issues in bundled environments
    let wasmBinary: ArrayBuffer | undefined;
    try {
      const wasmPaths = [
        path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
        path.join(process.cwd(), 'public', 'sql-wasm.wasm'),
        '/var/task/node_modules/sql.js/dist/sql-wasm.wasm', // Vercel serverless
      ];
      for (const wp of wasmPaths) {
        if (fs.existsSync(wp)) {
          wasmBinary = fs.readFileSync(wp).buffer as ArrayBuffer;
          break;
        }
      }
    } catch { /* will fall back to default loading */ }
    const SQL = await initSqlJs({ wasmBinary });
    let sqlDb: SqlJsDatabase;

    // Try loading from disk (for persistence within a warm Vercel instance)
    try {
      if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        if (buffer.length > 0) {
          sqlDb = new SQL.Database(buffer);
          // Quick sanity check
          sqlDb.exec('SELECT 1');
        } else {
          sqlDb = new SQL.Database();
        }
      } else {
        sqlDb = new SQL.Database();
      }
    } catch {
      // Corrupted file — start fresh
      sqlDb = new SQL.Database();
    }

    db = createCompatDb(sqlDb);
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);

    // Persist to disk and enable auto-save for user mutations
    saveToDisk();
    _seedingMode = false;
  } catch (e) {
    console.error('[ARCADIA DB] Init failed:', e);
    throw e;
  }
}

function saveToDisk() {
  if (!db) return;
  try {
    const data = db._raw.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch { /* read-only fs, ignore */ }
}

/**
 * Main entry point — called by all API routes.
 * Returns the database synchronously if already initialized,
 * otherwise awaits the init promise.
 */
export function getDb(): CompatDb {
  if (db) return db;
  // If not yet initialized, we need to wait. But this function is sync.
  // In practice, the WASM loads in ~50ms and the first API call happens after at least 100ms,
  // so db should be ready. If not, throw a helpful error.
  throw new Error('Database is still initializing. Please retry.');
}

/**
 * Async version of getDb — guaranteed to return after init is complete.
 * Use this in API handlers for maximum reliability.
 */
export async function getDbAsync(): Promise<CompatDb> {
  if (db) return db;
  if (initPromise) await initPromise;
  if (db) return db;
  // If init failed, retry once
  initPromise = doInit();
  await initPromise;
  if (!db) throw new Error('Database initialization failed');
  return db;
}

// ─────────────────────────────────────────────────────────
// Schema & seed
// ─────────────────────────────────────────────────────────

function initializeDatabase(db: CompatDb) {
  db.exec(`
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
    CREATE TABLE IF NOT EXISTS ranks (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      tier INTEGER NOT NULL,
      icon TEXT DEFAULT '',
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
    CREATE TABLE IF NOT EXISTS game_modes (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
    CREATE TABLE IF NOT EXISTS game_roles (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      FOREIGN KEY (game_id) REFERENCES games(id)
    );
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
    CREATE TABLE IF NOT EXISTS party_chat (
      id TEXT PRIMARY KEY,
      party_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (party_id) REFERENCES parties(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
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
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      captain_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (captain_id) REFERENCES users(id)
    );
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
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      balance INTEGER DEFAULT 0,
      lifetime_earned INTEGER DEFAULT 0,
      lifetime_spent INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
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
    CREATE TABLE IF NOT EXISTS referral_logs (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL,
      points_awarded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (referred_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS daily_logins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      login_date TEXT NOT NULL,
      points_awarded INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, login_date)
    );
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

  const gameCount = db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number };
  if (gameCount.count === 0) {
    seedDatabase(db);
  }
}

// ─────────────────────────────────────────────────────────
// Seed data (deterministic IDs)
// ─────────────────────────────────────────────────────────

function seedDatabase(db: CompatDb) {
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

  const rankSets: Record<string, Array<{ name: string; icon: string }>> = {
    'valorant': [{ name: 'Iron', icon: '🟤' }, { name: 'Bronze', icon: '🥉' }, { name: 'Silver', icon: '🥈' }, { name: 'Gold', icon: '🥇' }, { name: 'Platinum', icon: '💎' }, { name: 'Diamond', icon: '💠' }, { name: 'Ascendant', icon: '🌟' }, { name: 'Immortal', icon: '👑' }, { name: 'Radiant', icon: '⭐' }],
    'mobile-legends': [{ name: 'Warrior', icon: '⚔️' }, { name: 'Elite', icon: '🛡️' }, { name: 'Master', icon: '🏅' }, { name: 'Grandmaster', icon: '🎖️' }, { name: 'Epic', icon: '💜' }, { name: 'Legend', icon: '🏆' }, { name: 'Mythic', icon: '👑' }, { name: 'Mythical Glory', icon: '⭐' }],
    'pubg-mobile': [{ name: 'Bronze', icon: '🥉' }, { name: 'Silver', icon: '🥈' }, { name: 'Gold', icon: '🥇' }, { name: 'Platinum', icon: '💎' }, { name: 'Diamond', icon: '💠' }, { name: 'Crown', icon: '👑' }, { name: 'Ace', icon: '🌟' }, { name: 'Conqueror', icon: '⭐' }],
    'genshin-impact': [{ name: 'AR 1-15', icon: '🌱' }, { name: 'AR 16-25', icon: '🌿' }, { name: 'AR 26-35', icon: '🌳' }, { name: 'AR 36-45', icon: '🏔️' }, { name: 'AR 46-55', icon: '⛰️' }, { name: 'AR 56+', icon: '🏯' }],
    'free-fire': [{ name: 'Bronze', icon: '🥉' }, { name: 'Silver', icon: '🥈' }, { name: 'Gold', icon: '🥇' }, { name: 'Platinum', icon: '💎' }, { name: 'Diamond', icon: '💠' }, { name: 'Heroic', icon: '👑' }, { name: 'Grandmaster', icon: '⭐' }],
    'apex-legends': [{ name: 'Bronze', icon: '🥉' }, { name: 'Silver', icon: '🥈' }, { name: 'Gold', icon: '🥇' }, { name: 'Platinum', icon: '💎' }, { name: 'Diamond', icon: '💠' }, { name: 'Master', icon: '👑' }, { name: 'Predator', icon: '⭐' }],
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
    'valorant': [{ name: 'Duelist', icon: '⚔️' }, { name: 'Controller', icon: '🌫️' }, { name: 'Initiator', icon: '🎯' }, { name: 'Sentinel', icon: '🛡️' }],
    'mobile-legends': [{ name: 'Tank', icon: '🛡️' }, { name: 'Fighter', icon: '⚔️' }, { name: 'Assassin', icon: '🗡️' }, { name: 'Marksman', icon: '🏹' }, { name: 'Mage', icon: '🔮' }, { name: 'Support', icon: '💚' }],
    'pubg-mobile': [{ name: 'Sniper', icon: '🎯' }, { name: 'Rusher', icon: '⚡' }, { name: 'Support', icon: '💚' }, { name: 'IGL', icon: '🧠' }],
    'genshin-impact': [{ name: 'DPS', icon: '⚔️' }, { name: 'Sub-DPS', icon: '🗡️' }, { name: 'Support', icon: '💚' }, { name: 'Healer', icon: '❤️' }],
    'free-fire': [{ name: 'Rusher', icon: '⚡' }, { name: 'Sniper', icon: '🎯' }, { name: 'Support', icon: '💚' }, { name: 'IGL', icon: '🧠' }],
    'apex-legends': [{ name: 'Assault', icon: '⚔️' }, { name: 'Recon', icon: '🔍' }, { name: 'Support', icon: '💚' }, { name: 'Defense', icon: '🛡️' }],
  };

  for (const game of games) {
    db.prepare('INSERT INTO games (id, name, slug, icon, description) VALUES (?, ?, ?, ?, ?)').run(game.id, game.name, game.slug, game.icon, game.description);
    (rankSets[game.slug] || []).forEach((rank, i) => { db.prepare('INSERT INTO ranks (id, game_id, name, tier, icon) VALUES (?, ?, ?, ?, ?)').run(seedId('rank'), game.id, rank.name, i + 1, rank.icon); });
    (modeSets[game.slug] || []).forEach(mode => { db.prepare('INSERT INTO game_modes (id, game_id, name) VALUES (?, ?, ?)').run(seedId('mode'), game.id, mode); });
    (roleSets[game.slug] || []).forEach(role => { db.prepare('INSERT INTO game_roles (id, game_id, name, icon) VALUES (?, ?, ?, ?)').run(seedId('role'), game.id, role.name, role.icon); });
  }

  // Users
  const superAdminId = seedId('user');
  db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, avatar, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(superAdminId, 'Arch Dev', 'progamer@arcadia.gg', bcrypt.hashSync('dev!@#$-_00', 10), 'superadmin', 1, 1, 999999999, '/avatars/avatar_15.png', 'SUPER-ARCHDEV0');
  db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)').run(seedId('wall'), superAdminId, 999999999, 999999999);

  const adminId = seedId('user');
  db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, avatar, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(adminId, 'Arca Staf', 'admin@arcadia.gg', bcrypt.hashSync('staf-123!@#', 10), 'admin', 1, 1, 1000000, '/avatars/avatar_3.png', 'ADMIN-ARCASTF');
  db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)').run(seedId('wall'), adminId, 1000000, 1000000);

  const demoId = seedId('user');
  db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, avatar, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(demoId, 'GamerPro', 'demo@arcadia.gg', bcrypt.hashSync('demo123', 10), 'user', 1, 1, 2500, '/avatars/avatar_1.png', 'DEMO-GAMERPRO');
  db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned) VALUES (?, ?, ?, ?)').run(seedId('wall'), demoId, 2500, 5000);

  // ── Expanded user base from seed-data ──
  const { sampleUsers, partyTemplates, friendshipPairs } = require('./seed-data');
  const sampleHash = bcrypt.hashSync('gamer123', 10);
  const createdUserIds: string[] = [];

  for (let i = 0; i < sampleUsers.length; i++) {
    const su = sampleUsers[i];
    const suId = seedId('user');
    createdUserIds.push(suId);
    const avatar = `/avatars/avatar_${(i % 14) + 1}.png`;
    const spent = Math.floor(su.points * 0.3);
    db.prepare('INSERT INTO users (id, username, email, password_hash, role, is_verified, onboarding_done, arcadia_points, reputation_score, avatar, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(suId, su.username, `${su.username.toLowerCase()}@arcadia.gg`, sampleHash, 'user', 1, 1, su.points, su.rep, avatar, su.username.toUpperCase().slice(0, 4) + '-REF0' + i);
    db.prepare('INSERT INTO wallets (id, user_id, balance, lifetime_earned, lifetime_spent) VALUES (?, ?, ?, ?, ?)')
      .run(seedId('wall'), suId, su.points, su.points + spent, spent);
  }

  // ── Assign games to ALL users (each user plays 2-4 random games) ──
  const allGames = db.prepare('SELECT id FROM games').all() as Array<{ id: string }>;
  const allRanks = db.prepare('SELECT id, game_id, tier FROM ranks').all() as Array<{ id: string; game_id: string; tier: number }>;
  const allRoles = db.prepare('SELECT id, game_id FROM game_roles').all() as Array<{ id: string; game_id: string }>;
  const everyUser = [demoId, ...createdUserIds];

  for (let ui = 0; ui < everyUser.length; ui++) {
    const uid = everyUser[ui];
    const numGames = 2 + (ui % 3); // 2, 3, or 4 games
    for (let gi = 0; gi < numGames && gi < allGames.length; gi++) {
      const gameOffset = (ui + gi) % allGames.length;
      const gid = allGames[gameOffset].id;
      const gameRanks = allRanks.filter(r => r.game_id === gid);
      const gameRoles = allRoles.filter(r => r.game_id === gid);
      const rankTier = Math.min(gameRanks.length, 2 + ((ui + gi) % (gameRanks.length - 1)));
      const rid = gameRanks.find(r => r.tier === rankTier)?.id || gameRanks[0]?.id || null;
      const roleId = gameRoles.length > 0 ? gameRoles[(ui + gi) % gameRoles.length].id : null;
      try {
        db.prepare('INSERT INTO user_games (id, user_id, game_id, rank_id, role_id, is_favorite) VALUES (?, ?, ?, ?, ?, ?)')
          .run(seedId('ugam'), uid, gid, rid, roleId, gi === 0 ? 1 : 0);
      } catch { /* skip duplicate */ }
    }
  }

  // ── Rewards ──
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

  // ── 30+ Parties ──
  const memberPool = [...createdUserIds, demoId, adminId];
  for (let idx = 0; idx < partyTemplates.length; idx++) {
    const p = partyTemplates[idx];
    const partyId = seedId('prty');
    const hoursAhead = 12 + (idx * 7) % 72;
    const expiresAt = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();
    const gid = allGames[p.gameIdx].id;
    const creatorId = memberPool[idx % memberPool.length];
    const fillRatio = [1.0, 0.6, 0.8, 0.4, 0.5][idx % 5];
    const currentPlayers = Math.max(1, Math.min(p.maxP, Math.round(p.maxP * fillRatio)));
    const status = currentPlayers >= p.maxP ? 'full' : 'open';

    db.prepare('INSERT INTO parties (id, game_id, creator_id, title, description, max_players, current_players, status, region, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(partyId, gid, creatorId, p.title, p.desc, p.maxP, currentPlayers, status, p.region, expiresAt);
    db.prepare('INSERT INTO party_members (id, party_id, user_id, role) VALUES (?, ?, ?, ?)')
      .run(seedId('pmem'), partyId, creatorId, 'leader');

    const available = memberPool.filter(id => id !== creatorId);
    for (let m = 1; m < currentPlayers && m <= available.length; m++) {
      const mid = available[(idx * 5 + m * 3) % available.length];
      try {
        db.prepare('INSERT INTO party_members (id, party_id, user_id, role) VALUES (?, ?, ?, ?)')
          .run(seedId('pmem'), partyId, mid, 'member');
      } catch { /* dup */ }
    }
  }

  // ── Friendships ──
  const friendPool = [demoId, ...createdUserIds];
  for (const [ai, bi, st] of friendshipPairs) {
    if (ai < friendPool.length && bi < friendPool.length) {
      try {
        db.prepare('INSERT INTO friendships (id, requester_id, addressee_id, status) VALUES (?, ?, ?, ?)')
          .run(seedId('frnd'), friendPool[ai], friendPool[bi], st);
      } catch { /* skip dup */ }
    }
  }

  // ── Daily login history (make users look active) ──
  for (let ui = 0; ui < Math.min(20, everyUser.length); ui++) {
    const uid = everyUser[ui];
    const daysActive = 3 + (ui % 5); // 3-7 days of logins
    for (let d = 0; d < daysActive; d++) {
      const date = new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
      try {
        db.prepare('INSERT INTO daily_logins (id, user_id, login_date, points_awarded) VALUES (?, ?, ?, ?)')
          .run(seedId('dlog'), uid, date, 10);
      } catch { /* dup */ }
    }
  }

  // ── Tournaments ──
  [
    { name: 'Arcadia Championship Season 1', desc: 'Tournament resmi ARCADIA season pertama! Hadiah besar menanti.', mode: 'team', format: 'single_elimination', maxP: 16, teamSize: 5, prize: '500.000 Arcadia Points', fee: 100, status: 'registration' },
    { name: 'Weekend Warriors Cup', desc: 'Tournament santai setiap weekend. Gratis entry!', mode: 'solo', format: 'single_elimination', maxP: 32, teamSize: 1, prize: '100.000 Arcadia Points', fee: 0, status: 'registration' },
    { name: 'Pro League Qualifier', desc: 'Kualifikasi menuju Pro League nasional.', mode: 'team', format: 'double_elimination', maxP: 8, teamSize: 5, prize: '1.000.000 Arcadia Points + Voucher', fee: 500, status: 'ongoing' },
    { name: 'Rookie Rumble', desc: 'Khusus pemain baru! Tunjukkan bakatmu.', mode: 'solo', format: 'single_elimination', maxP: 64, teamSize: 1, prize: '50.000 Arcadia Points', fee: 0, status: 'registration' },
    { name: 'Midnight Showdown', desc: 'Tournament malam hari untuk para night owl.', mode: 'team', format: 'single_elimination', maxP: 16, teamSize: 3, prize: '250.000 Arcadia Points', fee: 50, status: 'registration' },
  ].forEach((t, idx) => {
    const gid = allGames[idx % allGames.length].id;
    const regStart = new Date(Date.now() - 3 * 86400000).toISOString();
    const regEnd = new Date(Date.now() + 7 * 86400000).toISOString();
    const startDate = new Date(Date.now() + 14 * 86400000).toISOString();
    db.prepare('INSERT INTO tournaments (id, game_id, organizer_id, name, description, mode, format, max_participants, team_size, prize_pool, entry_fee, status, registration_start, registration_end, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(seedId('tour'), gid, adminId, t.name, t.desc, t.mode, t.format, t.maxP, t.teamSize, t.prize, t.fee, t.status, regStart, regEnd, startDate);
  });
}

export { uuidv4 };
