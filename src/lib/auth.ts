import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'arcadia-secret-key-change-in-production-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'arcadia-refresh-secret-key-change-in-production-2024';
const ACCESS_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_EXPIRY = '90d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export function hashPassword(password: string): string {
    return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
}

export function generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): { userId: string; role: string } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
    } catch {
        return null;
    }
}

export async function getCurrentUser(): Promise<User | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('access_token')?.value;
        if (!token) return null;

        const payload = verifyAccessToken(token);
        if (!payload) return null;

        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_banned = 0').get(payload.userId) as User | undefined;
        return user || null;
    } catch {
        return null;
    }
}

export function getUserById(userId: string): User | null {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | null;
}

export async function loginUser(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string } | { error: string }> {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

    if (!user) {
        return { error: 'Email atau password salah' };
    }

    if (user.is_banned) {
        return { error: 'Akun Anda telah diblokir' };
    }

    // Check if account is locked
    if (user.locked_until) {
        const lockUntil = new Date(user.locked_until);
        if (lockUntil > new Date()) {
            const minutesLeft = Math.ceil((lockUntil.getTime() - Date.now()) / 60000);
            return { error: `Akun terkunci. Coba lagi dalam ${minutesLeft} menit.` };
        } else {
            db.prepare('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
        }
    }

    if (!verifyPassword(password, user.password_hash)) {
        const attempts = (user.login_attempts || 0) + 1;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000).toISOString();
            db.prepare('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockUntil, user.id);
            return { error: `Terlalu banyak percobaan. Akun terkunci selama ${LOCK_DURATION_MINUTES} menit.` };
        }
        db.prepare('UPDATE users SET login_attempts = ? WHERE id = ?').run(attempts, user.id);
        return { error: 'Email atau password salah' };
    }

    // Reset login attempts - use single quotes for SQLite string literal 'now'
    db.prepare("UPDATE users SET login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?").run(user.id);

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), user.id, refreshToken, expiresAt);

    // Award daily login points
    const today = new Date().toISOString().split('T')[0];
    const existingLogin = db.prepare('SELECT id FROM daily_logins WHERE user_id = ? AND login_date = ?').get(user.id, today);
    if (!existingLogin) {
        const pointsAwarded = 10;
        db.prepare('INSERT INTO daily_logins (id, user_id, login_date, points_awarded) VALUES (?, ?, ?, ?)').run(uuidv4(), user.id, today, pointsAwarded);
        db.prepare('UPDATE users SET arcadia_points = arcadia_points + ? WHERE id = ?').run(pointsAwarded, user.id);
        const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(user.id) as { id: string } | undefined;
        if (wallet) {
            db.prepare('UPDATE wallets SET balance = balance + ?, lifetime_earned = lifetime_earned + ? WHERE user_id = ?').run(pointsAwarded, pointsAwarded, user.id);
            db.prepare('INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, reference_type) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), wallet.id, 'earn', pointsAwarded, 'Daily login bonus', 'daily_login');
        }
    }

    return { user, accessToken, refreshToken };
}

export async function registerUser(username: string, email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string } | { error: string }> {
    const db = getDb();

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) return { error: 'Email sudah terdaftar' };

    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUsername) return { error: 'Username sudah digunakan' };

    if (username.length < 3) return { error: 'Username minimal 3 karakter' };
    if (username.length > 20) return { error: 'Username maksimal 20 karakter' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { error: 'Username hanya boleh berisi huruf, angka, dan underscore' };
    if (password.length < 8) return { error: 'Password minimal 8 karakter' };
    if (!/[A-Z]/.test(password)) return { error: 'Password harus mengandung huruf kapital' };
    if (!/[0-9]/.test(password)) return { error: 'Password harus mengandung angka' };

    const userId = uuidv4();
    const passwordHash = hashPassword(password);
    const referralCode = 'ARC-' + userId.slice(0, 8).toUpperCase();

    db.prepare('INSERT INTO users (id, username, email, password_hash, referral_code, is_verified) VALUES (?, ?, ?, ?, ?, 1)')
        .run(userId, username, email, passwordHash, referralCode);

    db.prepare('INSERT INTO wallets (id, user_id, balance) VALUES (?, ?, 100)')
        .run(uuidv4(), userId);

    const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(userId) as { id: string };
    db.prepare('INSERT INTO wallet_transactions (id, wallet_id, type, amount, description) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), wallet.id, 'earn', 100, 'Welcome bonus - Selamat datang di ARCADIA!');
    db.prepare('UPDATE users SET arcadia_points = 100 WHERE id = ?').run(userId);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
    const accessToken = generateAccessToken(userId, user.role);
    const refreshToken = generateRefreshToken(userId);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)').run(uuidv4(), userId, refreshToken, expiresAt);

    return { user, accessToken, refreshToken };
}

// Rate limiting (in-memory)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number = 30, windowSeconds: number = 60): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
        return true;
    }

    if (entry.count >= maxRequests) {
        return false;
    }

    entry.count++;
    return true;
}

export function sanitize(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}
