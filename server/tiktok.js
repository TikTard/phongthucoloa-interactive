// Reads LIVE events from TikTok (read-only — this never posts chat messages)
// and turns them into the game's simple event format.
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

// tiktok-live-connector 2.x: user.id / user.displayId (older: userId / uniqueId)
const userOf = (u = {}) => ({
  id: String(u.userId || u.id || u.idStr || u.uniqueId || u.displayId || u.nickname || 'unknown'),
  name: (u.nickname || u.uniqueId || u.displayId || 'Ẩn danh').slice(0, 24),
  avatar: u.profilePicture?.url?.[0] || u.profilePicture?.urls?.[0] || u.avatarThumb?.urlList?.[0] || '',
});

export class TikTokSource {
  constructor(onEvent, onStatus) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
    this.conn = null;
    this.want = null;   // { username, signApiKey } while we should stay connected
    this.fails = 0;
    this.retry = null;
    this.status = { state: 'idle', username: '', message: '' };
  }

  setStatus(state, message = '') {
    this.status = { ...this.status, state, message };
    this.onStatus(this.status);
  }

  // TikTok drops the socket every so often: reconnect on its own (3 s, then up to 20 s apart) until "Ngắt"
  // is pressed or the LIVE ends
  retryLater() {
    clearTimeout(this.retry);
    if (!this.want) return;
    const wait = Math.min(20000, 3000 * 2 ** Math.min(3, this.fails++));
    this.retry = setTimeout(() => { if (this.want) this.connect(this.want.username, this.want.signApiKey, true); }, wait);
  }

  async connect(username, signApiKey, isRetry = false) {
    await this.disconnect(true);
    if (!isRetry) this.fails = 0;
    this.want = { username, signApiKey };
    username = String(username || '').trim().replace(/^@/, '');
    if (!username) return this.setStatus('error', 'Nhập tên TikTok (username) trước');
    this.status.username = username;
    this.setStatus('connecting');

    // Only the WebSocket signature is free on Euler Stream. Room info and the gift list are signed web requests that
    // need its paid Business plan ("This endpoint requires a Business plan"), so skip them: gift events already
    // carry the gift's name and diamond value.
    const conn = new TikTokLiveConnection(username, {
      enableExtendedGiftInfo: false,
      fetchRoomInfoOnConnect: false,
      ...(signApiKey ? { signApiKey } : {}),
    });
    this.conn = conn;

    conn.on(WebcastEvent.CHAT, d => this.onEvent({ type: 'chat', user: userOf(d.user), text: String(d.content ?? d.comment ?? '') })); // 2.x: content
    conn.on(WebcastEvent.LIKE, d => this.onEvent({ type: 'like', user: userOf(d.user), count: Number(d.count || d.likeCount || 1) }));
    conn.on(WebcastEvent.FOLLOW, d => this.onEvent({ type: 'follow', user: userOf(d.user) }));
    conn.on(WebcastEvent.SHARE, d => this.onEvent({ type: 'share', user: userOf(d.user) }));
    conn.on(WebcastEvent.MEMBER, d => this.onEvent({ type: 'member', user: userOf(d.user) }));
    conn.on(WebcastEvent.GIFT, d => {
      const giftType = d.giftDetails?.giftType ?? d.gift?.type ?? d.extendedGiftInfo?.type;
      if (giftType === 1 && !d.repeatEnd) return; // streak still running — wait for the final count
      const diamonds = Number(d.giftDetails?.diamondCount ?? d.gift?.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? 1) || 1;
      const count = Number(d.repeatCount || 1);
      const name = d.giftDetails?.giftName || d.gift?.name || d.extendedGiftInfo?.name || 'Quà';
      this.onEvent({ type: 'gift', user: userOf(d.user), gift: { name, diamonds, count, total: diamonds * count } });
    });
    conn.on(WebcastEvent.STREAM_END, () => { this.want = null; this.setStatus('ended', 'Buổi LIVE đã kết thúc'); });
    conn.on('disconnected', () => {
      if (this.conn !== conn) return;
      this.conn = null;
      this.setStatus('connecting', 'mất kết nối · đang nối lại…');
      this.retryLater();
    });
    conn.on('error', err => console.error('[tiktok]', err?.message || err));

    try {
      const state = await conn.connect();
      this.fails = 0;
      this.setStatus('connected', `roomId ${state?.roomId ?? ''}`);
    } catch (err) {
      if (this.conn === conn) this.conn = null;
      this.setStatus('error', `${err?.message || String(err)} · thử lại…`);
      this.retryLater();
    }
  }

  async disconnect(keepWanted = false) {
    if (!keepWanted) { this.want = null; clearTimeout(this.retry); }
    if (this.conn) {
      const c = this.conn;
      this.conn = null;
      try { await c.disconnect(); } catch { /* already closed */ }
    }
    if (!keepWanted) this.setStatus('idle');
  }
}
