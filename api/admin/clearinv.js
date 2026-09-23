import { kv } from '@vercel/kv';
import { isAdmin, forbidden, getPlayer } from './_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { adminId, targetId } = req.body || {};
  if (!isAdmin(adminId)) return forbidden(res);
  if (!targetId) return res.status(400).json({ error: 'no targetId' });

  const player = await getPlayer(targetId);
  if (!player) return res.status(404).json({ error: 'no player' });

  await kv.hset(`player:${targetId}`, {
    inv: '[]',
    updatedAt: Date.now()
  });

  return res.json({ ok: true });
}
