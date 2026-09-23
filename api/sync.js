import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { id, balance, inv, caseStats } = req.body || {};
  if (!id) return res.status(400).json({ error: 'no id' });
  if (typeof balance !== 'number' || balance < 0 || !isFinite(balance)) {
    return res.status(400).json({ error: 'bad balance' });
  }

  const key = `player:${id}`;

  // Проверка бана
  const existing = await kv.hgetall(key);
  if (existing && Number(existing.banned) === 1) {
    return res.status(403).json({ error: 'banned' });
  }

  const safeInv = Array.isArray(inv) ? inv.slice(0, 500) : [];
  const safeStats = caseStats && typeof caseStats === 'object' ? caseStats : {};

  await kv.hset(key, {
    balance: Math.floor(balance),
    inv: JSON.stringify(safeInv),
    caseStats: JSON.stringify(safeStats),
    updatedAt: Date.now()
  });

  return res.json({ ok: true });
}
