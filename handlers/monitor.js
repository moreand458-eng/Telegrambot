// ⚔️ ESCANOR — مراقبة القنوات
// بيراقب كل القنوات اللي البوت فيها أدمن
// ويعمل تقارير دورية ويفلتر المحتوى

import { db }     from './db.js';
import { logger } from './logger.js';
import config     from './config.js';

/**
 * بيشيك لو الرسالة فيها كيوردز محظورة
 */
export function containsBannedContent(text = '') {
  const lower = text.toLowerCase();
  return config.bannedWords.some(w => lower.includes(w.toLowerCase()));
}

/**
 * بيعمل تقرير لقناة معينة
 */
export async function generateChannelReport(bot, channelId) {
  try {
    const stats = await db.getChannelStats(channelId);
    const chat  = await bot.telegram.getChat(channelId);

    const report = (
      `📊 *تقرير قناة — ${config.brand.name}*\n` +
      `⊱⋅ ──────────── ⋅⊰\n` +
      `📢 *القناة:* ${chat.title || channelId}\n` +
      `👥 *الأعضاء:* ${stats.memberCount || 'مش محدد'}\n` +
      `💬 *الرسائل اليوم:* ${stats.msgCount || 0}\n` +
      `⏰ *آخر نشاط:* ${new Date(stats.lastActive).toLocaleString('ar-EG')}\n` +
      `⊱⋅ ──────────── ⋅⊰\n` +
      `_⚔️ 𝑬𝑺𝑪𝑨𝑵𝑶𝑹 — نظام المراقبة_`
    );

    return report;
  } catch (err) {
    logger.error(`خطأ في تقرير ${channelId}:`, err.message);
    return null;
  }
}

/**
 * بيعيد ضبط عداد الرسائل اليومي
 */
export async function resetDailyStats(channelId) {
  const s = await db.getChannelStats(channelId);
  await db.set(`channel:${channelId}`, { ...s, msgCount: 0 });
}
