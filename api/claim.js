import { kv } from '@vercel/kv';

const COOLDOWN_MS = 30 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { id, balance } = req.body || {};
  if (!id) return res.status(400).json({ error: 'no id' });

  const key = `player:${id}`;

  // Если клиент прислал актуальный баланс — обновим его в базе,
  // чтобы ранг считался по свежим данным.
  if (typeof balance === 'number' && balance >= 0 && isFinite(balance)) {
    await kv.hset(key, { balance: Math.floor(balance), updatedAt: Date.now() });
  }

  const keys = await kv.keys('player:*');
  const pipe = kv.pipeline();
  keys.forEach(k => pipe.hgetall(k));
  const rows = await pipe.exec();

  const players = rows
    .map(r => ({ id: r?.id, balance: Number(r?.balance || 0) }))
    .filter(p => p.id);

  players.sort((a, b) => b.balance - a.balance);
  const rank = players.findIndex(p => p.id === id);

  if (rank < 0 || rank > 2) {
    return res.status(400).json({ error: 'not in top-3', rank: rank + 1 });
  }

  const player = await kv.hgetall(key);
  if (!player) return res.status(404).json({ error: 'no player' });

  const now = Date.now();
  const lastClaimAt = Number(player.lastClaimAt || 0);
  const remaining = COOLDOWN_MS - (now - lastClaimAt);

  if (remaining > 0) {
    return res.status(400).json({ error: 'cooldown', remainingMs: remaining });
  }

  const currentBalance = Number(player.balance || 0);
  const pct = [0.25, 0.12, 0.06][rank];
  const reward = Math.floor(currentBalance * pct);
  const newBalance = currentBalance + reward;

  await kv.hset(key, {
    balance: newBalance,
    lastClaimAt: now,
    updatedAt: now
  });

  return res.json({ ok: true, reward, rank, newBalance, nextClaimAt: now + COOLDOWN_MS });
}
