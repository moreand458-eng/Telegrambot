// ⚔️ ESCANOR — إعدادات بوت التيليجرام
// المالك: @SunKing_Empire

import 'dotenv/config';

export const config = {
  // ─── بيانات البوت ───
  token:     process.env.BOT_TOKEN || '8648391910:AAGPLMmYy3dlsJV0A9VLRvfhOSFXAF_iWIQ',
  // adminId هيتسجل تلقائياً أول ما تبعت /start
  adminId:   Number(process.env.ADMIN_ID) || 0,
  adminUser: 'SunKing_Empire',
  adminWa:   '201092178171',

  brand: {
    name:      '⚔️ 𝑬𝑺𝑪𝑨𝑵𝑶𝑹',
    nameBot:   '⚔️ 𝑬𝑺𝑪𝑨𝑵𝑶𝑹 𝑩𝑶𝑻',
    waChannel: 'https://whatsapp.com/channel/0029VbBbvWcJ3jv1T55BmR0f',
    botUrl:    'https://is.gd/JEu6nK',
    githubUrl: 'https://github.com/moreand458-eng/Admin-bot',
    developers: [
      { name: '𝑬𝑺𝑪𝑨𝑵𝑶𝑹 | @SunKing_Empire', wa: '201092178171' },
    ],
  },

  cooldown: {
    default: 5,
    heavy:   120,
  },

  bannedWords: ['spam', 'إعلان', 'بروموشن', 'اشترك في قناتي'],
};

export default config;
