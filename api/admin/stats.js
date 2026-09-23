import { kv } from '@vercel/kv';
import { isAdmin, forbidden } from './_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { adminId } = req.body || {};
  if (!isAdmin(adminId)) return forbidden(res);

  const keys = await kv.keys('player:*');
  const total = keys.length;

  if (total === 0) {
    return res.json({ total: 0, sumBalance: 0, banned: 0, top5: [] });
  }

  const pipe = kv.pipeline();
  keys.forEach(k => pipe.hgetall(k));
  const rows = await pipe.exec();

  let sumBalance = 0;
  let bannedCount = 0;
  const list = [];

  for (const r of rows) {
    if (!r || !r.id) continue;
    const bal = Number(r.balance || 0);
    sumBalance += bal;
    if (Number(r.banned) === 1) bannedCount++;
    list.push({ id: r.id, name: r.name || 'Игрок', balance: bal });
  }

  list.sort((a, b) => b.balance - a.balance);
  const top5 = list.slice(0, 5);

  return res.json({
    total,
    sumBalance,
    banned: bannedCount,
    top5
  });
}
