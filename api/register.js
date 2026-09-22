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
  console.log('[register] called', req.method);

  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { initData, fallbackName } = req.body || {};
  console.log('[register] initData length:', (initData || '').length);

  let user = null;

  const botToken = process.env.BOT_TOKEN;
  if (botToken && initData) user = verifyTelegram(initData, botToken);

  if (!user && initData) {
    try {
      const params = new URLSearchParams(initData);
      user = JSON.parse(params.get('user') || 'null');
    } catch (e) {
      console.log('[register] parse error:', e.message);
    }
  }

  if (!user) {
    console.log('[register] FAIL: no user');
    return res.status(400).json({ error: 'no user' });
  }

  const id = String(user.id);
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    fallbackName ||
    'Игрок';

  const photo = user.photo_url || '';

  console.log('[register] user id:', id, 'name:', name);

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
    console.log('[register] created new player', id);
  } else {
    await kv.hset(key, { name, photo, updatedAt: Date.now() });
    console.log('[register] updated existing player', id);
  }

  const player = await kv.hgetall(key);
  player.inv = JSON.parse(player.inv || '[]');

  return res.json({ player });
}
