import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'no id' });

  const key = `player:${id}`;
  const exists = await kv.exists(key);
  if (!exists) return res.status(404).json({ error: 'no player' });

  await kv.hset(key, {
    balance: 1000,
    inv: '[]',
    caseStats: '{}',
    lastClaimAt: 0,
    updatedAt: Date.now()
  });

  return res.json({ ok: true });
}
