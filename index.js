// ⚔️ ESCANOR Telegram Bot — النسخة الكاملة
// المالك: @SunKing_Empire | 201092178171
// مبني بـ Telegraf · نشر على قنوات وبوتات · إدارة كاملة

import { Telegraf, Markup } from 'telegraf';
import cron                  from 'node-cron';

import config          from './config.js';
import { db }          from './db.js';
import { logger }      from './logger.js';
import {
  containsBannedContent,
  generateChannelReport,
  resetDailyStats,
} from './handlers/monitor.js';
import {
  addChannel, removeChannel, getChannels,
  addBot,     removeBot,     getBots,
} from './handlers/channels.js';
import {
  sessions,
  startPublish,
  handleTargetChoice,
  handleTypeChoice,
  handleContent,
  confirmPublish,
  cancelPublish,
} from './handlers/publisher.js';

// ─── إنشاء البوت ───
const bot = new Telegraf(config.token);

// ─── كاش الكولداون ───
const cooldowns = new Map();
function onCooldown(userId, cmd, secs) {
  const key = `${userId}:${cmd}`;
  const now  = Date.now();
  const prev = cooldowns.get(key);
  if (prev && (now - prev) < secs * 1000) {
    return Math.ceil((secs * 1000 - (now - prev)) / 1000);
  }
  cooldowns.set(key, now);
  return 0;
}

// ─── شيك الصلاحيات ───
function isOwner(ctx) {
  const id   = ctx.from?.id;
  const user = ctx.from?.username;
  // لو الـ adminId اتسجل، شيك عليه — لو لأ شيك على اليوزر
  if (config.adminId) return id === config.adminId;
  return user === config.adminUser;
}

// ─── براند فوتر ───
const brand = (txt) =>
  `${txt}\n\n⊱⋅ ──────────── ⋅⊰\n_⚔️ ${config.brand.nameBot} — بحقوق إسكانور_`;

// ════════════════════════════════════════════
//          ميدلوير: حظر + تسجيل المالك
// ════════════════════════════════════════════
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // حظر
  if (await db.isBanned(userId)) return;

  // تسجيل تلقائي للمالك
  if (!config.adminId && ctx.from?.username === config.adminUser) {
    config.adminId = userId;
    await db.set('admin:id', userId);
    logger.success(`👑 سجّل المالك: @${config.adminUser} (${userId})`);
  }

  return next();
});

// ════════════════════════════════════════════
//                /start
// ════════════════════════════════════════════
bot.start(async (ctx) => {
  const name  = ctx.from?.first_name || 'صديق';
  const owner = isOwner(ctx);

  await ctx.replyWithMarkdown(
    brand(
      `👋 *أهلاً ${name}!*\n\n` +
      `أنا *${config.brand.nameBot}*\n` +
      `نظام إدارة قنوات تيليجرام احترافي ⚡\n\n` +
      (owner
        ? `👑 *أنت المالك — كل الأوامر متاحة ليك!*`
        : `📋 استخدم الأزرار دي 👇`)
    ),
    Markup.inlineKeyboard(
      owner
        ? [
            [Markup.button.callback('📤 نشر منشور',      'menu_publish')],
            [Markup.button.callback('📢 إدارة القنوات',   'menu_channels')],
            [Markup.button.callback('🤖 إدارة البوتات',   'menu_bots')],
            [Markup.button.callback('📊 تقارير',          'menu_reports')],
            [Markup.button.callback('📋 كل الأوامر',      'show_commands')],
          ]
        : [
            [Markup.button.callback('📋 الأوامر',  'show_commands')],
            [Markup.button.url('📢 القناة', config.brand.waChannel)],
          ]
    )
  );
});

// ════════════════════════════════════════════
//              /help
// ════════════════════════════════════════════
bot.command(['help', 'مساعدة'], async (ctx) => {
  const owner = isOwner(ctx);
  await ctx.replyWithMarkdown(
    brand(
      `📋 *أوامر ${config.brand.nameBot}*\n\n` +
      `*للجميع:*\n` +
      `/start — الصفحة الرئيسية\n` +
      `/help — قايمة الأوامر\n` +
      `/ping — اختبار البوت\n` +
      `/info — معلومات البوت\n\n` +
      (owner
        ? `*👑 المالك فقط:*\n` +
          `/publish — نشر منشور\n` +
          `/addchannel — أضف قناة\n` +
          `/removechannel [id] — شيل قناة\n` +
          `/listchannels — شوف القنوات\n` +
          `/addbot — أضف بوت\n` +
          `/removebot [id] — شيل بوت\n` +
          `/listbots — شوف البوتات\n` +
          `/report [id] — تقرير قناة\n` +
          `/ban [id] — حظر مستخدم\n` +
          `/unban [id] — رفع حظر\n` +
          `/cancel — إلغاء العملية الحالية`
        : '')
    )
  );
});

// ════════════════════════════════════════════
//              /ping
// ════════════════════════════════════════════
bot.command('ping', async (ctx) => {
  const start = Date.now();
  const m     = await ctx.reply('⏳ بتحسب...');
  const ms    = Date.now() - start;
  await ctx.telegram.editMessageText(
    ctx.chat.id, m.message_id, undefined,
    brand(`🏓 *بينج: ${ms}ms*\n✅ البوت شغال تمام يا صديق!`),
    { parse_mode: 'Markdown' }
  );
});

// ════════════════════════════════════════════
//              /info
// ════════════════════════════════════════════
bot.command('info', async (ctx) => {
  const devs = config.brand.developers
    .map((d, i) => `${i + 1}. ⚔️ ${d.name} — wa.me/${d.wa}`)
    .join('\n');

  await ctx.replyWithMarkdown(
    brand(
      `🤖 *معلومات البوت*\n\n` +
      `🏷️ *الاسم:* ${config.brand.nameBot}\n` +
      `👑 *المالك:* @${config.adminUser}\n` +
      `🔒 *الأمان:* مفيش eval أو obfuscation\n` +
      `⏳ *كولداون:* ${config.cooldown.default}s / ${config.cooldown.heavy}s\n\n` +
      `👑 *المطورين:*\n${devs}`
    ),
    Markup.inlineKeyboard([
      [Markup.button.url('📢 القناة',  config.brand.waChannel)],
      [Markup.button.url('💻 GitHub',  config.brand.githubUrl)],
    ])
  );
});

// ════════════════════════════════════════════
//          إدارة القنوات
// ════════════════════════════════════════════

// /addchannel — يطلب من المالك يضيف البوت للقناة أول
bot.command('addchannel', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.reply('❌ المالك بس ⚔️'); return; }

  await ctx.replyWithMarkdown(
    `📢 *إضافة قناة*\n\n` +
    `عشان تضيف قناة:\n` +
    `1️⃣ أضف البوت كـ *أدمن* في القناة\n` +
    `2️⃣ بعت ID القناة أو username بعد الأمر:\n` +
    `\`/addchannel @username\`\n` +
    `أو\n` +
    `\`/addchannel -100xxxxxxxxxx\`\n\n` +
    `💡 *جيب ID القناة من:* @userinfobot`
  );
});

bot.hears(/^\/addchannel (.+)$/, async (ctx) => {
  if (!isOwner(ctx)) return;
  const chatId = ctx.match[1].trim();

  try {
    const chat = await ctx.telegram.getChat(chatId);
    const res  = await addChannel(chat.id, chat.title || chatId);

    if (res.exists) {
      await ctx.reply(`⚠️ القناة "${chat.title}" موجودة أصلاً!`);
    } else {
      await ctx.replyWithMarkdown(
        brand(`✅ *أضاف القناة بنجاح!*\n📢 الاسم: ${chat.title}\n🆔 ID: \`${chat.id}\``)
      );
    }
  } catch (err) {
    await ctx.reply(`❌ فشل. تأكد إن البوت أدمن في القناة وإن الـ ID صح.\nالخطأ: ${err.message}`);
  }
});

// /removechannel
bot.hears(/^\/removechannel (.+)$/, async (ctx) => {
  if (!isOwner(ctx)) return;
  const chatId = ctx.match[1].trim();
  const done   = await removeChannel(chatId);
  await ctx.reply(done ? `✅ اتشالت القناة ${chatId}` : `❗ مش لاقيها. تأكد من الـ ID`);
});

// /listchannels
bot.command('listchannels', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.reply('❌ المالك بس ⚔️'); return; }
  const channels = await getChannels();
  if (!channels.length) { await ctx.reply('📋 مفيش قنوات مضافة بعد'); return; }

  const list = channels
    .map((c, i) => `${i + 1}. 📢 *${c.title}*\n   ID: \`${c.id}\``)
    .join('\n\n');

  await ctx.replyWithMarkdown(brand(`📢 *القنوات المضافة (${channels.length}):*\n\n${list}`));
});

// ════════════════════════════════════════════
//           إدارة البوتات
// ════════════════════════════════════════════

bot.command('addbot', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.reply('❌ المالك بس ⚔️'); return; }

  await ctx.replyWithMarkdown(
    `🤖 *إضافة بوت*\n\n` +
    `ابعت الـ chat ID للبوت أو المجموعة بعد الأمر:\n` +
    `\`/addbot @botusername\`\n` +
    `أو\n` +
    `\`/addbot -100xxxxxxxxxx\`\n\n` +
    `💡 *ملاحظة:* لو عايز تبعت رسايل لبوت، البوت اللاني لازم يكون admin أو يقبل رسايل`
  );
});

bot.hears(/^\/addbot (.+)$/, async (ctx) => {
  if (!isOwner(ctx)) return;
  const chatId = ctx.match[1].trim();

  try {
    const chat = await ctx.telegram.getChat(chatId);
    const res  = await addBot(chat.id, chat.title || chat.username || chatId);

    if (res.exists) {
      await ctx.reply(`⚠️ البوت/المجموعة دي موجودة أصلاً!`);
    } else {
      await ctx.replyWithMarkdown(
        brand(`✅ *أضاف بنجاح!*\n🤖 الاسم: ${chat.title || chat.username}\n🆔 ID: \`${chat.id}\``)
      );
    }
  } catch (err) {
    await ctx.reply(`❌ فشل. الخطأ: ${err.message}`);
  }
});

bot.hears(/^\/removebot (.+)$/, async (ctx) => {
  if (!isOwner(ctx)) return;
  const chatId = ctx.match[1].trim();
  const done   = await removeBot(chatId);
  await ctx.reply(done ? `✅ اتشال ${chatId}` : `❗ مش لاقيه`);
});

bot.command('listbots', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.reply('❌ المالك بس ⚔️'); return; }
  const bots = await getBots();
  if (!bots.length) { await ctx.reply('📋 مفيش بوتات/مجموعات مضافة بعد'); return; }

  const list = bots
    .map((b, i) => `${i + 1}. 🤖 *${b.title}*\n   ID: \`${b.id}\``)
    .join('\n\n');

  await ctx.replyWithMarkdown(brand(`🤖 *البوتات المضافة (${bots.length}):*\n\n${list}`));
});

// ════════════════════════════════════════════
//           /publish — النشر الرئيسي
// ════════════════════════════════════════════
bot.command('publish', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.reply('❌ المالك بس ⚔️'); return; }
  await startPublish(ctx);
});

// /cancel — إلغاء أي عملية جارية
bot.command('cancel', async (ctx) => {
  const sess = sessions.get(ctx.from.id);
  if (sess && sess.step !== 'idle') {
    sessions.set(ctx.from.id, { step: 'idle' });
    await ctx.reply('❌ اتلغت العملية.');
  } else {
    await ctx.reply('مفيش حاجة جارية دلوقتي.');
  }
});

// ════════════════════════════════════════════
//          أوامر الأدمن الأخرى
// ════════════════════════════════════════════

bot.command('ban', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.reply('❌ المالك بس ⚔️'); return; }
  const userId = ctx.message.reply_to_message?.from?.id
    || parseInt(ctx.message.text.split(' ')[1]);
  if (!userId || isNaN(userId)) { await ctx.reply('❗ /ban [user_id]'); return; }
  await db.ban(userId);
  logger.warn(`🚫 حظر: ${userId}`);
  await ctx.replyWithMarkdown(brand(`🚫 *اتحظر:* \`${userId}\``));
});

bot.command('unban', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.reply('❌ المالك بس ⚔️'); return; }
  const userId = parseInt(ctx.message.text.split(' ')[1]);
  if (!userId || isNaN(userId)) { await ctx.reply('❗ /unban [user_id]'); return; }
  await db.unban(userId);
  await ctx.replyWithMarkdown(brand(`✅ *اترفع الحظر عن:* \`${userId}\``));
});

bot.command('report', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.reply('❌ المالك بس ⚔️'); return; }
  const channelId = ctx.message.text.split(' ')[1];
  if (!channelId) { await ctx.reply('❗ /report [channel_id]'); return; }
  const report = await generateChannelReport(bot, channelId);
  if (report) await ctx.replyWithMarkdown(report);
  else        await ctx.reply('❌ فشل جلب التقرير');
});

// ════════════════════════════════════════════
//    مراقبة القنوات (channel_post)
// ════════════════════════════════════════════
bot.on('channel_post', async (ctx) => {
  const channelId = ctx.channelPost?.chat?.id;
  if (!channelId) return;
  const text = ctx.channelPost?.text || ctx.channelPost?.caption || '';
  await db.incrementMsg(channelId);

  if (containsBannedContent(text)) {
    try {
      await ctx.deleteMessage();
      logger.warn(`🚫 محذوف في ${channelId}`);
      if (config.adminId) {
        await bot.telegram.sendMessage(config.adminId,
          brand(`⚠️ *محتوى محظور اتحذف!*\n📢 \`${channelId}\`\n\n"${text.slice(0,200)}"`),
          { parse_mode: 'Markdown' }
        );
      }
    } catch {}
  }
});

// ════════════════════════════════════════════
//    استقبال المحتوى للنشر (content step)
// ════════════════════════════════════════════
bot.on('message', async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId || !isOwner(ctx)) return next();
  const handled = await handleContent(ctx);
  if (!handled) return next();
});

// ════════════════════════════════════════════
//          كولباك الأزرار
// ════════════════════════════════════════════

// قوايم ستارت
bot.action('show_commands', async (ctx) => {
  await ctx.answerCbQuery('📋');
  const owner = isOwner(ctx);
  await ctx.replyWithMarkdown(
    brand(
      `📋 *الأوامر:*\n/ping /info /help /start\n\n` +
      (owner ? `*👑 المالك:*\n/publish /addchannel /listchannels\n/addbot /listbots /report /ban /unban` : '')
    )
  );
});

bot.action('menu_publish', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  await startPublish(ctx);
});

bot.action('menu_channels', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  await ctx.answerCbQuery('📢');
  const channels = await getChannels();
  const list     = channels.length
    ? channels.map((c, i) => `${i + 1}. 📢 ${c.title} — \`${c.id}\``).join('\n')
    : 'مفيش قنوات بعد';
  await ctx.replyWithMarkdown(
    brand(`📢 *القنوات (${channels.length}):*\n\n${list}\n\nأضف بـ: /addchannel @username`),
    Markup.inlineKeyboard([
      [Markup.button.callback('➕ أضف قناة', 'guide_addchannel')],
    ])
  );
});

bot.action('menu_bots', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  await ctx.answerCbQuery('🤖');
  const bots = await getBots();
  const list = bots.length
    ? bots.map((b, i) => `${i + 1}. 🤖 ${b.title} — \`${b.id}\``).join('\n')
    : 'مفيش بوتات بعد';
  await ctx.replyWithMarkdown(
    brand(`🤖 *البوتات (${bots.length}):*\n\n${list}\n\nأضف بـ: /addbot @username`)
  );
});

bot.action('menu_reports', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  await ctx.answerCbQuery('📊');
  const channels = await getChannels();
  if (!channels.length) { await ctx.reply('مفيش قنوات. أضف الأول بـ /addchannel'); return; }

  const buttons = channels.map(ch => [
    Markup.button.callback(`📢 ${ch.title}`, `report:${ch.id}`),
  ]);
  await ctx.reply('📊 اختار القناة اللي عايز تقريرها:', Markup.inlineKeyboard(buttons));
});

bot.action('guide_addchannel', async (ctx) => {
  await ctx.answerCbQuery('');
  await ctx.replyWithMarkdown(
    `📢 *إضافة قناة:*\n1️⃣ أضف البوت أدمن في القناة\n2️⃣ ابعت:\n\`/addchannel @channel_username\``
  );
});

// تقارير القنوات inline
bot.action(/^report:(.+)$/, async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  const channelId = ctx.match[1];
  await ctx.answerCbQuery('⏳');
  const report = await generateChannelReport(bot, channelId);
  if (report) await ctx.replyWithMarkdown(report);
  else        await ctx.reply('❌ فشل التقرير');
});

// ─── كولباك Publisher ───
bot.action(/^pub_target:(.+)$/, async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  await handleTargetChoice(ctx, ctx.match[1]);
});

bot.action(/^pub_type:(.+)$/, async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  await handleTypeChoice(ctx, ctx.match[1]);
});

bot.action('pub_confirm', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  await confirmPublish(ctx);
});

bot.action('pub_cancel', async (ctx) => {
  if (!isOwner(ctx)) { await ctx.answerCbQuery('❌'); return; }
  await cancelPublish(ctx);
});

// ════════════════════════════════════════════
//     كرون: تقرير يومي الساعة 8 صباحاً مصر
// ════════════════════════════════════════════
cron.schedule('0 8 * * *', async () => {
  if (!config.adminId) return;
  const channels  = await getChannels();
  const bots      = await getBots();
  await bot.telegram.sendMessage(
    config.adminId,
    brand(
      `📊 *التقرير اليومي — ${new Date().toLocaleDateString('ar-EG')}*\n\n` +
      `📢 القنوات المضافة: ${channels.length}\n` +
      `🤖 البوتات المضافة: ${bots.length}\n` +
      `✅ البوت شغال تمام\n\n` +
      `_استخدم /publish للنشر أو /report لتقرير قناة_`
    ),
    { parse_mode: 'Markdown' }
  ).catch(() => {});
}, { timezone: 'Africa/Cairo' });

// ════════════════════════════════════════════
//              تشغيل البوت
// ════════════════════════════════════════════
logger.info('⚔️  ESCANOR TELEGRAM BOT — بيشتغل...');

bot.launch({
  allowedUpdates: ['message', 'callback_query', 'channel_post'],
}).then(() => {
  logger.success(`✅ اشتغل! @${bot.botInfo?.username}`);
  logger.info(`👑 المالك: @${config.adminUser}`);
  logger.info(`🔑 ابعت /start للبوت عشان يسجل ID بتاعك تلقائياً`);
}).catch(err => {
  logger.error('فشل:', err.message);
  process.exit(1);
});

process.once('SIGINT',  () => { bot.stop('SIGINT');  });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); });
