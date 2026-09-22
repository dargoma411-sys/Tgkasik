import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'no id' });
  }

  const rank = await kv.zrevrank('leaderboard', id);
  if (rank === null || rank > 2) {
    return res.status(400).json({ error: 'not in top-3' });
  }

  const player = await kv.hgetall(`player:${id}`);
  if (!player) {
    return res.status(404).json({ error: 'no player' });
  }

  if (Number(player.claimRank) === rank) {
    return res.status(400).json({ error: 'already claimed' });
  }

  const balance = Number(player.balance || 0);
  const pct = [0.25, 0.12, 0.06][rank];
  const reward = Math.floor(balance * pct);
  const newBalance = balance + reward;

  await kv.hset(`player:${id}`, {
    balance: newBalance,
    claimRank: rank,
    updatedAt: Date.now()
  });

  await kv.zadd('leaderboard', { score: newBalance, member: id });

  return res.json({ ok: true, reward, rank, newBalance });
}
