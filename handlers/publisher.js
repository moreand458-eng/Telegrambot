// ⚔️ ESCANOR — منشئ المنشورات (Publisher)
// نظام نشر متعدد الخطوات: اختار الوجهة → اختار النوع → ابعت المحتوى → تأكيد → نشر

import { Markup }       from 'telegraf';
import { getChannels, getBots, publishToTargets } from './channels.js';
import { logger }       from '../logger.js';
import config           from '../config.js';

// ─── حالة الجلسة للمالك (في الذاكرة) ───
// sessions: Map<userId, DraftSession>
export const sessions = new Map();

const STEP = {
  IDLE:     'idle',
  TARGET:   'target',    // اختار الوجهة
  TYPE:     'type',      // اختار نوع المنشور
  CONTENT:  'content',   // استنى المحتوى
  PREVIEW:  'preview',   // عرض وتأكيد
};

function getSession(userId) {
  if (!sessions.has(userId)) sessions.set(userId, { step: STEP.IDLE });
  return sessions.get(userId);
}

function clearSession(userId) {
  sessions.set(userId, { step: STEP.IDLE });
}

// ─── لوحة اختيار الوجهة ───
export async function startPublish(ctx) {
  const userId = ctx.from.id;
  const sess   = getSession(userId);
  sess.step    = STEP.TARGET;
  sess.targets = [];

  const channels = await getChannels();
  const bots     = await getBots();

  if (!channels.length && !bots.length) {
    await ctx.replyWithMarkdown(
      `❗ *مفيش قنوات أو بوتات مضافة بعد!*\n\n` +
      `أضف قناة الأول بـ /addchannel\nأو أضف بوت بـ /addbot`
    );
    return;
  }

  // ابني لوحة المفاتيح
  const buttons = [];

  if (channels.length) {
    buttons.push([Markup.button.callback('📢 كل القنوات', 'pub_target:all_channels')]);
    // أضف كل قناة على حدة
    for (const ch of channels) {
      buttons.push([Markup.button.callback(
        `📢 ${ch.title}`, `pub_target:ch:${ch.id}`
      )]);
    }
  }

  if (bots.length) {
    buttons.push([Markup.button.callback('🤖 كل البوتات', 'pub_target:all_bots')]);
    for (const b of bots) {
      buttons.push([Markup.button.callback(
        `🤖 ${b.title}`, `pub_target:bot:${b.id}`
      )]);
    }
  }

  buttons.push([Markup.button.callback('🌐 الكل (قنوات + بوتات)', 'pub_target:all')]);
  buttons.push([Markup.button.callback('❌ إلغاء', 'pub_cancel')]);

  sess.channels = channels;
  sess.bots     = bots;

  await ctx.replyWithMarkdown(
    `📤 *نظام النشر — ⚔️ إسكانور*\n\n` +
    `*الخطوة 1:* اختار هتنشر فين؟`,
    Markup.inlineKeyboard(buttons)
  );
}

// ─── بعد اختيار الوجهة: اختار نوع المنشور ───
export async function handleTargetChoice(ctx, choice) {
  const userId = ctx.from.id;
  const sess   = getSession(userId);

  const channels = sess.channels || [];
  const bots     = sess.bots     || [];

  if (choice === 'all_channels') {
    sess.selectedTargets = channels.map(c => c.id);
    sess.targetLabel     = 'كل القنوات';
  } else if (choice === 'all_bots') {
    sess.selectedTargets = bots.map(b => b.id);
    sess.targetLabel     = 'كل البوتات';
  } else if (choice === 'all') {
    sess.selectedTargets = [...channels.map(c => c.id), ...bots.map(b => b.id)];
    sess.targetLabel     = 'الكل';
  } else if (choice.startsWith('ch:')) {
    const id = choice.replace('ch:', '');
    const ch = channels.find(c => String(c.id) === id);
    sess.selectedTargets = [id];
    sess.targetLabel     = ch?.title || id;
  } else if (choice.startsWith('bot:')) {
    const id = choice.replace('bot:', '');
    const b  = bots.find(x => String(x.id) === id);
    sess.selectedTargets = [id];
    sess.targetLabel     = b?.title || id;
  }

  sess.step = STEP.TYPE;
  await ctx.answerCbQuery('✅ تمام!');
  await ctx.editMessageText(
    `📤 *نشر على:* ${sess.targetLabel}\n\n*الخطوة 2:* اختار نوع المنشور 👇`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✍️ نص',        'pub_type:text')],
        [Markup.button.callback('🖼️ صورة',       'pub_type:photo')],
        [Markup.button.callback('🎥 فيديو',      'pub_type:video')],
        [Markup.button.callback('📄 ملف',        'pub_type:document')],
        [Markup.button.callback('📊 استطلاع',    'pub_type:poll')],
        [Markup.button.callback('🔀 تحويل رسالة', 'pub_type:forward')],
        [Markup.button.callback('❌ إلغاء',      'pub_cancel')],
      ]),
    }
  );
}

// ─── بعد اختيار النوع: استنى المحتوى ───
export async function handleTypeChoice(ctx, type) {
  const userId = ctx.from.id;
  const sess   = getSession(userId);
  sess.type    = type;
  sess.step    = STEP.CONTENT;

  await ctx.answerCbQuery('✅');

  const instructions = {
    text:     '✍️ ابعتلي نص المنشور دلوقتي:',
    photo:    '🖼️ ابعتلي الصورة (ممكن تضيف كابشن):',
    video:    '🎥 ابعتلي الفيديو (ممكن تضيف كابشن):',
    document: '📄 ابعتلي الملف:',
    poll:     '📊 ابعتلي بيانات الاستطلاع بالشكل ده:\n`سؤال\nخيار 1\nخيار 2\nخيار 3`',
    forward:  '🔀 حول الرسالة اللي عايز تنشرها على البوت ده دلوقتي:',
  };

  await ctx.editMessageText(
    `📤 *الخطوة 3:* ${instructions[type]}\n\n_(ابعت /cancel لإلغاء)_`,
    { parse_mode: 'Markdown' }
  );
}

// ─── استقبال المحتوى من المالك ───
export async function handleContent(ctx) {
  const userId = ctx.from.id;
  const sess   = getSession(userId);

  if (sess.step !== STEP.CONTENT) return false;

  const msg = ctx.message;
  sess.step = STEP.PREVIEW;

  // احفظ بيانات الرسالة
  if (sess.type === 'text' && msg.text) {
    sess.content = { type: 'text', text: msg.text };
  } else if (sess.type === 'photo' && msg.photo) {
    sess.content = {
      type:    'photo',
      fileId:  msg.photo[msg.photo.length - 1].file_id,
      caption: msg.caption || '',
    };
  } else if (sess.type === 'video' && msg.video) {
    sess.content = {
      type:    'video',
      fileId:  msg.video.file_id,
      caption: msg.caption || '',
    };
  } else if (sess.type === 'document' && msg.document) {
    sess.content = {
      type:    'document',
      fileId:  msg.document.file_id,
      caption: msg.caption || '',
    };
  } else if (sess.type === 'poll' && msg.text) {
    const lines = msg.text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) {
      await ctx.reply('❗ محتاج سؤال + خيارين على الأقل!\nمثال:\nما رأيك؟\nموافق\nمش موافق');
      return true;
    }
    sess.content = {
      type:    'poll',
      question: lines[0],
      options:  lines.slice(1),
    };
  } else if (sess.type === 'forward' && msg.forward_from_chat) {
    sess.content = {
      type:      'forward',
      fromChatId: msg.forward_from_chat.id,
      messageId:  msg.forward_from_message_id || msg.message_id,
    };
  } else {
    await ctx.reply('❗ نوع المحتوى ده مش متوافق مع الاختيار. حاول تاني أو /cancel');
    return true;
  }

  // ─── بناء البريفيو ───
  const preview =
    `✅ *المنشور جاهز للمراجعة*\n\n` +
    `📌 *الوجهة:* ${sess.targetLabel} (${sess.selectedTargets.length} هدف)\n` +
    `📝 *النوع:* ${sess.type}\n` +
    (sess.content.text     ? `💬 *النص:* ${sess.content.text.slice(0, 100)}...\n` : '') +
    (sess.content.caption  ? `📎 *الكابشن:* ${sess.content.caption.slice(0, 80)}\n` : '') +
    (sess.content.question ? `❓ *السؤال:* ${sess.content.question}\n` : '') +
    `\n⚠️ هتنشر على ${sess.selectedTargets.length} مكان. متأكد؟`;

  await ctx.replyWithMarkdown(preview, Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ انشر دلوقتي!', 'pub_confirm'),
      Markup.button.callback('❌ إلغاء',         'pub_cancel'),
    ],
  ]));

  return true;
}

// ─── تأكيد النشر وتنفيذه ───
export async function confirmPublish(ctx) {
  const userId = ctx.from.id;
  const sess   = getSession(userId);
  const tg     = ctx.telegram;

  await ctx.answerCbQuery('🚀 بينشر...');
  await ctx.editMessageText('⏳ *بينشر دلوقتي... استنى*', { parse_mode: 'Markdown' });

  const { ok, fail } = await publishToTargets(
    tg,
    sess.selectedTargets,
    async (telegram, chatId) => {
      const c = sess.content;
      if (c.type === 'text') {
        await telegram.sendMessage(chatId, c.text, { parse_mode: 'Markdown' });
      } else if (c.type === 'photo') {
        await telegram.sendPhoto(chatId, c.fileId, { caption: c.caption, parse_mode: 'Markdown' });
      } else if (c.type === 'video') {
        await telegram.sendVideo(chatId, c.fileId, { caption: c.caption, parse_mode: 'Markdown' });
      } else if (c.type === 'document') {
        await telegram.sendDocument(chatId, c.fileId, { caption: c.caption, parse_mode: 'Markdown' });
      } else if (c.type === 'poll') {
        await telegram.sendPoll(chatId, c.question, c.options);
      } else if (c.type === 'forward') {
        await telegram.forwardMessage(chatId, c.fromChatId, c.messageId);
      }
    }
  );

  clearSession(userId);
  logger.success(`نشر: ${ok.length} نجح, ${fail.length} فشل`);

  await ctx.reply(
    `📊 *نتيجة النشر — ⚔️ إسكانور*\n\n` +
    `✅ *نجح:* ${ok.length} مكان\n` +
    `❌ *فشل:* ${fail.length} مكان\n` +
    (fail.length ? `\nالأماكن اللي فشلت:\n${fail.join('\n')}` : ''),
    { parse_mode: 'Markdown' }
  );
}

// ─── إلغاء ───
export async function cancelPublish(ctx) {
  const userId = ctx.from.id;
  clearSession(userId);
  await ctx.answerCbQuery('تم الإلغاء');
  await ctx.editMessageText('❌ *اتلغى النشر*\n\nلو عايز تبدأ من أول ابعت /publish', { parse_mode: 'Markdown' });
}
