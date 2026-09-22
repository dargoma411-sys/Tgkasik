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
      console.log('[register] hash mismatch
