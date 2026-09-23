import { kv } from '@vercel/kv';
import { isAdmin, forbidden, getPlayer } from './_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { adminId, targetId, mode, amount } = req.body || {};
  if (!isAdmin(adminId)) return forbidden(res);
  if (!targetId) return res.status(400).json({ error: 'no targetId' });
  if (typeof amount !== 'number' || !isFinite(amount)) {
    return res.status(400).json({ error: 'bad amount' });
  }

  const player = await getPlayer(targetId);
  if (!player) return res.status(404).json({ error: 'no player' });

  const cur = Number(player.balance || 0);
  let next;
  if (mode === 'add') next = cur + Math.floor(amount);
  else if (mode === 'sub') next = cur - Math.floor(amount);
  else if (mode === 'set') next = Math.floor(amount);
  else return res.status(400).json({ error: 'bad mode' });

  if (next < 0) next = 0;

  await kv.hset(`player:${targetId}`, {
    balance: next,
    updatedAt: Date.now()
  });

  return res.json({ ok: true, balance: next });
}
