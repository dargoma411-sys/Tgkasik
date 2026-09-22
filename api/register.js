import { kv } from '@vercel/kv';
import crypto from 'crypto';

function verifyTelegram(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calcHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (calcHash !== hash) return null;
    return JSON.parse(params.get('user') || 'null');
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { initData, fallbackName } = req.body || {};
  let user = null;

  const botToken = process.env.BOT_TOKEN;
  if (botToken && initData) user = verifyTelegram(initData, botToken);

  if (!user && initData) {
    try {
      const params = new URLSearchParams(initData);
      user = JSON.parse(params.get('user') || 'null');
    } catch {}
  }

  if (!user) return res.status(400).json({ error: 'no user' });

  const id = String(user.id);
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    fallbackName ||
    'Игрок';

  const photo = user.photo_url || '';

  const key = `player:${id}`;
  const exists = await kv.exists(key);

  if (!exists) {
    await kv.hset(key, {
      id,
      name,
      photo,
      balance: 1000,
      inv: JSON.stringify([]),
      lastClaimAt: 0,
      updatedAt: Date.now()
    });
    await kv.zadd('leaderboard', { score: 1000, member: id });
  } else {
    await kv.hset(key, { name, photo, updatedAt: Date.now() });
  }

  const player = await kv.hgetall(key);
  player.inv = JSON.parse(player.inv || '[]');

  return res.json({ player });
}
