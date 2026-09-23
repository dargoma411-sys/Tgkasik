import { kv } from '@vercel/kv';
import crypto from 'crypto';

function safeJsonParse(str, fallback = null) {
  try {
    if (!str || typeof str !== 'string') return fallback;
    const trimmed = str.trim();
    if (!trimmed) return fallback;
    return JSON.parse(trimmed);
  } catch (e) {
    console.log('[register] JSON.parse error:', e.message, 'raw:', JSON.stringify(str).slice(0, 100));
    return fallback;
  }
}

function verifyTelegram(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    const rawUser = params.get('user');
    if (!rawUser) return null;
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calcHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (calcHash !== hash) {
      console.log('[register] hash mismatch');
      return null;
    }
    return safeJsonParse(rawUser);
  } catch (e) {
    console.log('[register] verifyTelegram error:', e.message);
    return null;
  }
}

function safeParseUser(initData) {
  try {
    if (!initData) return null;
    const params = new URLSearchParams(initData);
    const raw = params.get('user');
    if (!raw) return null;
    return safeJsonParse(raw);
  } catch { return null; }
}

export default async function handler(req, res) {
  console.log('[register] called', req.method);

  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { initData, fallbackName } = req.body || {};
  console.log('[register] initData length:', (initData || '').length);

  let user = null;

  const botToken = process.env.BOT_TOKEN;
  if (botToken && initData) {
    console.log('[register] BOT_TOKEN present, verifying');
    user = verifyTelegram(initData, botToken);
  }

  if (!user && initData) {
    console.log('[register] falling back to unverified parse');
    user = safeParseUser(initData);
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

  // Проверка бана
  const existing = await kv.hgetall(key);
  if (existing && Number(existing.banned) === 1) {
    console.log('[register] banned user', id);
    return res.status(403).json({ error: 'banned' });
  }

  const exists = await kv.exists(key);

  if (!exists) {
    await kv.hset(key, {
      id,
      name,
      photo,
      balance: 1000,
      inv: '[]',
      caseStats: '{}',
      lastClaimAt: 0,
      banned: 0,
      updatedAt: Date.now()
    });
    console.log('[register] created new player', id);
  } else {
    await kv.hset(key, { name, photo, updatedAt: Date.now() });
    console.log('[register] updated existing player', id);
  }

  const player = await kv.hgetall(key);
  player.inv = safeJsonParse(player.inv, []);
  player.caseStats = safeJsonParse(player.caseStats, {});

  return res.json({ player });
}
