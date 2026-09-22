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
  if (req.method !== 'POST') return res.status(405).end();
  const { initData, fallbackName } = req.body || {};
  let user = null;

  const botToken = process.env.BOT_TOKEN;
  if (botToken && initData) user = verifyTelegram(initData, botToken);

  // Если проверка не настроена — доверяем клиенту (для теста)
  if (!user) {
    if (!initData) return res.status(400).json({ error: 'no initData' });
    try {
      const params = new URLSearchParams(initData);
      user = JSON.parse(params.get('user') || 'null');
    } catch {}
  }

  const id = user?.id ? String(user.id) : 'guest_' + Math.random().toString(36).slice(2, 10);
  const name = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Игрок'
    : (fallbackName || 'Гость');

  const key = `player:${id}`;
  const exists = await kv.exists(key);

  if (!exists) {
    await kv.hset(key, {
      id, name,
      balance: 1000,
      inv: JSON.stringify([]),
      claimRank: -1,
      updatedAt: Date.now()
    });
  } else {
    await kv.hset(key, { name, updatedAt: Date.now() });
  }

  const player = await kv.hgetall(key);
  player.inv = JSON.parse(player.inv || '[]');
  return res.json({ player });
}
