import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  // Получаем ВСЕ ключи игроков
  const keys = await kv.keys('player:*');
  if (!keys.length) return res.json({ top: [] });

  const pipe = kv.pipeline();
  keys.forEach(k => pipe.hgetall(k));
  const rows = await pipe.exec();

  const now = Date.now();

  const players = rows
    .map(r => ({
      id: r?.id,
      name: r?.name || 'Игрок',
      photo: r?.photo || '',
      balance: Number(r?.balance || 0),
      updatedAt: Number(r?.updatedAt || 0)
    }))
    .filter(p => p.id);

  players.sort((a, b) => b.balance - a.balance);

  const top = players.slice(0, 20).map(p => ({
    id: p.id,
    name: p.name,
    photo: p.photo,
    balance: p.balance,
    online: now - p.updatedAt < 60000
  }));

  return res.json({ top });
}
