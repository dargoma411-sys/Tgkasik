import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { id, balance, inv } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'no id' });
  }

  if (typeof balance !== 'number' || balance < 0 || !isFinite(balance)) {
    return res.status(400).json({ error: 'bad balance' });
  }

  const key = `player:${id}`;
  const safeInv = Array.isArray(inv) ? inv.slice(0, 500) : [];

  await kv.hset(key, {
    balance: Math.floor(balance),
    inv: JSON.stringify(safeInv),
    updatedAt: Date.now()
  });

  await kv.zadd('leaderboard', {
    score: Math.floor(balance),
    member: id
  });

  return res.json({ ok: true });
}
