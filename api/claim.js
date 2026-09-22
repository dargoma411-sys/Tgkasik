import { kv } from '@vercel/kv';

const COOLDOWN_MS = 30 * 60 * 1000; // 30 минут

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'no id' });

  const rank = await kv.zrevrank('leaderboard', id);
  if (rank === null || rank > 2) {
    return res.status(400).json({ error: 'not in top-3' });
  }

  const player = await kv.hgetall(`player:${id}`);
  if (!player) return res.status(404).json({ error: 'no player' });

  const now = Date.now();
  const lastClaimAt = Number(player.lastClaimAt || 0);
  const remaining = COOLDOWN_MS - (now - lastClaimAt);

  if (remaining > 0) {
    return res.status(400).json({
      error: 'cooldown',
      remainingMs: remaining
    });
  }

  const balance = Number(player.balance || 0);
  const pct = [0.25, 0.12, 0.06][rank];
  const reward = Math.floor(balance * pct);
  const newBalance = balance + reward;

  await kv.hset(`player:${id}`, {
    balance: newBalance,
    lastClaimAt: now,
    updatedAt: now
  });

  await kv.zadd('leaderboard', { score: newBalance, member: id });

  return res.json({ ok: true, reward, rank, newBalance, nextClaimAt: now + COOLDOWN_MS });
}
