// ⚔️ ESCANOR — قاعدة بيانات التيليجرام (LevelDB)

import { Level } from 'level';
import fs        from 'fs';

if (!fs.existsSync('./data')) fs.mkdirSync('./data');

class TgDB {
  constructor() {
    this.db = new Level('./data/telegram.db', { valueEncoding: 'json' });
  }

  async get(key, fallback = null) {
    try { return await this.db.get(key); } catch { return fallback; }
  }
  async set(key, val) { await this.db.put(key, val); }
  async del(key)      { try { await this.db.del(key); } catch {} }

  // ─── إحصائيات القنوات ───
  async getChannelStats(channelId) {
    return this.get(`channel:${channelId}`, {
      channelId,
      msgCount:    0,
      memberCount: 0,
      joinedAt:    Date.now(),
      lastActive:  Date.now(),
    });
  }

  async incrementMsg(channelId) {
    const s = await this.getChannelStats(channelId);
    await this.set(`channel:${channelId}`, {
      ...s,
      msgCount:   (s.msgCount   || 0) + 1,
      lastActive: Date.now(),
    });
  }

  async updateMemberCount(channelId, count) {
    const s = await this.getChannelStats(channelId);
    await this.set(`channel:${channelId}`, { ...s, memberCount: count });
  }

  // ─── المستخدمون ───
  async isBanned(userId) {
    const u = await this.get(`user:${userId}`, { banned: false });
    return u.banned === true;
  }
  async ban(userId)   { await this.set(`user:${userId}`, { banned: true,  bannedAt: Date.now() }); }
  async unban(userId) { await this.set(`user:${userId}`, { banned: false }); }
}

export const db = new TgDB();
export default db;
