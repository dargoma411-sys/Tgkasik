import { kv } from '@vercel/kv';

export const ADMIN_ID = '8485687789';

export function isAdmin(id) {
  return String(id) === ADMIN_ID;
}

export function forbidden(res) {
  return res.status(403).json({ error: 'forbidden' });
}

export async function getPlayer(id) {
  const key = `player:${id}`;
  const exists = await kv.exists(key);
  if (!exists) return null;
  const p = await kv.hgetall(key);
  p.inv = safeJson(p.inv, []);
  p.caseStats = safeJson(p.caseStats, {});
  return p;
}

export function safeJson(str, fallback) {
  try {
    if (!str || typeof str !== 'string') return fallback;
    const t = str.trim();
    if (!t) return fallback;
    return JSON.parse(t);
  } catch { return fallback; }
}
