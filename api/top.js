import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const ids = await kv.zrange('leaderboard', 0, 19, { rev: true });
  if (!ids.length) return res.json({ top: [] });

  const pipe = kv.pipeline();
  ids.forEach(id => pipe.hgetall(`player:${id}`));
  const rows = await pipe.exec();

  const now = Date.now();
  const top = rows.map(r => ({
    id: r?.id,
    name: r?.name || 'Игрок',
    balance: Number(r?.balance || 0),
    online: r?.updatedAt ? (now - Number(r.updatedAt) < 60000) : false
  })).filter(p => p.id);

  return res.json({ top });
}
