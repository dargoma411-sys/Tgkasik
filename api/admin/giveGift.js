import { kv } from '@vercel/kv';
import { isAdmin, forbidden, getPlayer } from './_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { adminId, targetId, gift } = req.body || {};
  if (!isAdmin(adminId)) return forbidden(res);
  if (!targetId || !gift) return res.status(400).json({ error: 'bad request' });

  const player = await getPlayer(targetId);
  if (!player) return res.status(404).json({ error: 'no player' });

  const newGift = {
    uid: gift.uid || ('g_admin_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)),
    typeId: String(gift.typeId || 'admin_gift'),
    emoji: String(gift.emoji || '❓'),
    name: String(gift.name || 'Подарок'),
    rarity: String(gift.rarity || 'common'),
    value: Math.max(1, Math.floor(Number(gift.value) || 1)),
    ts: Date.now()
  };

  const inv = Array.isArray(player.inv) ? player.inv : [];
  inv.unshift(newGift);
  const limited = inv.slice(0, 500);

  await kv.hset(`player:${targetId}`, {
    inv: JSON.stringify(limited),
    updatedAt: Date.now()
  });

  return res.json({ ok: true, gift: newGift });
}
