// ⚔️ ESCANOR — مدير القنوات والبوتات
// حفظ وإدارة كل القنوات والبوتات اللي عايز تنشر فيها

import { db }     from '../db.js';
import { logger } from '../logger.js';

// ─── مفاتيح قاعدة البيانات ───
const CHANNELS_KEY = 'publish:channels';
const BOTS_KEY     = 'publish:bots';

// ════════ القنوات ════════

/** جيب كل القنوات المحفوظة */
export async function getChannels() {
  return (await db.get(CHANNELS_KEY, []));
}

/** أضف قناة */
export async function addChannel(chatId, title) {
  const list = await getChannels();
  if (list.find(c => c.id === chatId)) return { exists: true };
  list.push({ id: chatId, title, addedAt: Date.now() });
  await db.set(CHANNELS_KEY, list);
  logger.success(`📢 أضاف قناة: ${title} (${chatId})`);
  return { ok: true };
}

/** شيل قناة */
export async function removeChannel(chatId) {
  let list = await getChannels();
  const before = list.length;
  list = list.filter(c => String(c.id) !== String(chatId));
  await db.set(CHANNELS_KEY, list);
  return list.length < before;
}

// ════════ البوتات ════════

/** جيب كل البوتات المحفوظة */
export async function getBots() {
  return (await db.get(BOTS_KEY, []));
}

/** أضف بوت */
export async function addBot(chatId, title) {
  const list = await getBots();
  if (list.find(b => b.id === chatId)) return { exists: true };
  list.push({ id: chatId, title, addedAt: Date.now() });
  await db.set(BOTS_KEY, list);
  logger.success(`🤖 أضاف بوت: ${title} (${chatId})`);
  return { ok: true };
}

/** شيل بوت */
export async function removeBot(chatId) {
  let list = await getBots();
  const before = list.length;
  list = list.filter(b => String(b.id) !== String(chatId));
  await db.set(BOTS_KEY, list);
  return list.length < before;
}

// ════════ النشر ════════

/**
 * انشر رسالة على قنوات أو بوتات أو كلهم
 * @param {object} telegram  — bot.telegram
 * @param {string[]} targets — مصفوفة IDs
 * @param {Function} sendFn  — async (telegram, chatId) => void
 * @returns {{ ok: string[], fail: string[] }}
 */
export async function publishToTargets(telegram, targets, sendFn) {
  const ok = [], fail = [];
  for (const chatId of targets) {
    try {
      await sendFn(telegram, chatId);
      ok.push(chatId);
      await sleep(400); // تأخير بسيط عشان ما نتبانش spam
    } catch (err) {
      logger.error(`فشل النشر لـ ${chatId}: ${err.message}`);
      fail.push(chatId);
    }
  }
  return { ok, fail };
}

// ─── هيلبر ───
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
