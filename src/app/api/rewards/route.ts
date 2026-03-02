import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const db = getDb();
        const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(user.id);
        const transactions = db.prepare('SELECT * FROM wallet_transactions WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = ?) ORDER BY created_at DESC LIMIT 50').all(user.id);
        const rewards = db.prepare('SELECT * FROM reward_items WHERE is_active = 1 ORDER BY cost').all();
        const redeemHistory = db.prepare(`SELECT rh.*, ri.name as reward_name, ri.category FROM redeem_history rh
      JOIN reward_items ri ON rh.reward_id = ri.id WHERE rh.user_id = ? ORDER BY rh.redeemed_at DESC`).all(user.id);

        return NextResponse.json({ success: true, data: { wallet, transactions, rewards, redeemHistory } });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// Redeem reward
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

        const { reward_id } = await req.json();
        if (!reward_id) return NextResponse.json({ success: false, error: 'Reward ID wajib' }, { status: 400 });

        const db = getDb();
        const reward = db.prepare('SELECT * FROM reward_items WHERE id = ? AND is_active = 1').get(reward_id) as Record<string, unknown>;
        if (!reward) return NextResponse.json({ success: false, error: 'Reward tidak ditemukan' }, { status: 404 });

        if ((reward.stock as number) !== -1 && (reward.stock as number) <= 0) {
            return NextResponse.json({ success: false, error: 'Stok habis' }, { status: 400 });
        }

        const cost = reward.cost as number;
        const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(user.id) as Record<string, unknown>;
        if (!wallet || (wallet.balance as number) < cost) {
            return NextResponse.json({ success: false, error: 'Arcadia Points tidak cukup' }, { status: 400 });
        }

        const claimCode = 'ARC-' + uuidv4().slice(0, 8).toUpperCase();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const transaction = db.transaction(() => {
            db.prepare('UPDATE wallets SET balance = balance - ?, lifetime_spent = lifetime_spent + ? WHERE user_id = ?').run(cost, cost, user.id);
            db.prepare('UPDATE users SET arcadia_points = arcadia_points - ? WHERE id = ?').run(cost, user.id);
            db.prepare('INSERT INTO wallet_transactions (id, wallet_id, type, amount, description, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), wallet.id, 'spend', cost, `Redeem: ${reward.name}`, 'reward', reward_id);
            db.prepare('INSERT INTO redeem_history (id, user_id, reward_id, claim_code, status, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), user.id, reward_id, claimCode, 'pending', expiresAt);
            if ((reward.stock as number) !== -1) {
                db.prepare('UPDATE reward_items SET stock = stock - 1 WHERE id = ?').run(reward_id);
            }
        });
        transaction();

        return NextResponse.json({ success: true, data: { claimCode, expiresAt }, message: `Berhasil redeem! Kode klaim: ${claimCode}` });
    } catch {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
