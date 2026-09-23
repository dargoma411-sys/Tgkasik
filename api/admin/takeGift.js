import { kv } from '@vercel/kv';
import { isAdmin, forbidden, getPlayer } from './_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { adminId, targetId, uid } = req.body || {};
  if (!isAdmin(adminId)) return forbidden(res);
  if (!targetId || !uid) return res.status(400).json({ error: 'bad request' });

  const player = await getPlayer(targetId);
  if (!player) return res.status(404).json({ error: 'no player' });

  const inv = Array.isArray(player.inv) ? player.inv : [];
  const idx = inv.findIndex(g => g.uid === uid);
  if (idx < 0) return res.status(404).json({ error: 'gift not found' });

  const removed = inv.splice(idx, 1)[0];

  await kv.hset(`player:${targetId}`, {
    inv: JSON.stringify(inv),
    updatedAt: Date.now()
  });

  return res.json({ ok: true, removed });
}
