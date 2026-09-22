import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id, balance, inv } = req.body || {};
  if (!id) return res.status(400).json({ error: 'no id' });
  if (typeof balance !== 'number' || balance < 0) return res.status(400).json({ error: 'bad balance' });

  const key = `player:${id}`;
  await kv.hset(key, {
    balance: Math.floor(balance),
    inv: JSON.stringify(Array.isArray(inv) ? inv.slice(0, 500) : []),
    updatedAt: Date.now()
  });
  await kv.zadd('leaderboard', { score: Math.floor(balance), member: id });

  return res.json({ ok: true });
}
