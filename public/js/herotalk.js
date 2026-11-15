// Hero talk: now and then a hero's portrait slides in above TikTok's comment area and says a line, visual-novel style.
// The portrait is the hero's own 48 px sprite, cropped to head and shoulders and blown up 7x (so it stays the same pixel
// art), with a flapping mouth, blinking eyes and a little "voice" blip per letter. Heroes on the field talk first (with
// their owner's name on the plate); with none on the field one of the eight answers as an advisor.
// It watches the game state by itself (wave, boss, citadel, level, puzzle, Giờ Vàng); game.js only calls onHero / onGift.
import { W, HEROES, LEVELS, CITADEL_MAX_HP, CITADEL_Y, TALK } from './config.js';
import { panel, ptext, htext, INK } from './ui.js';
import { pick, rand, truncate } from './util.js';

const S = 7;                 // portrait scale (screen px per sprite px)
const CW = 30, CH = 27;      // crop size in sprite px (head + shoulders)
const Y = CITADEL_Y + 126;   // box centre: below the map, over the wall signboards (the map ends at CITADEL_Y)
const TYPE_MS = 26;          // typewriter speed per character

// face landmarks in the 48 px idle frame (sprite px): eye columns, eye row, mouth row, a skin pixel for blinks
const FACE = { cx: 27, eyes: [[23, 3], [29, 2]], eyeY: 14, mouthX: 26, mouthY: 19, skin: [27, 18] };
const FACES = {
  cungthu: {}, hoasu: {}, vosu: {}, phaothu: {},
  nothu: { mouthY: 20 },
  bangnu: { eyeY: 15 },
  loisu: { eyeY: 15, mouthY: 18, skin: [22, 16] },
  luongy: { mouthY: 19 },
};
const VOICE = { cungthu: 620, nothu: 250, hoasu: 720, bangnu: 840, loisu: 190, vosu: 380, luongy: 520, phaothu: 320 };
const PITCH = { cungthu: 1.15, nothu: 0.7, hoasu: 1.3, bangnu: 1.4, loisu: 0.55, vosu: 0.9, luongy: 1.05, phaothu: 0.8 }; // TTS pitch
const BACK = { arrow: 0x2a3a1e, bolt: 0x2e2418, fire: 0x4a1a0e, ice: 0x16304a, chain: 0x2e1e4a, spin: 0x4a1612, heal: 0x163a2a, cannon: 0x3a2a12 };

// {name} viewer · {hero} hero name · {boss} · {map} · {n} number · {w} wave
// A line can be [shown text, spoken text]: the voice leaves out viewer names, bosses, maps and numbers, so every spoken
// line is a fixed sentence that `npm run tts` pre-generates (the service is too slow and flaky for new text live).
const LINES = {
  levelIntro: [['Đến {map} rồi! Đường quái đổi hướng, giữ chặt các ô nhé!', 'Màn mới rồi! Đường quái đổi hướng, giữ chặt các ô nhé!'], ['Màn {n}: {map}. Quái mạnh hơn, nhưng Cổ Loa chưa từng thất thủ!', 'Màn mới, quái mạnh hơn, nhưng Cổ Loa chưa từng thất thủ!'], ['{map} đây. Ai chưa ra trận thì gõ "vào" ngay!', 'Màn mới đây. Ai chưa ra trận thì gõ vào ngay!']],
  tip: [
    'Gõ "vào cung" là thành cung thủ luôn, khỏi gõ hai lần!',
    'Thả tim đi bà con! Đủ tim là Nỏ Thần bắn cả bầy quái!',
    'Ai ngã thì gõ "cứu", anh em sẽ kéo dậy!',
    'Gõ "tôi" để xem cấp và số quái mình đã hạ.',
    'Theo dõi kênh là có một Cung Thủ canh thành miễn phí đó!',
    'Boss tới thì thả tim thật nhiều, Nỏ Thần sẽ lo!',
    'Đổi lớp thì gõ tên lớp: kiếm, thương, cung, khiên, phép, y…',
  ],
  wave: [['Đợt {w} tới rồi! Giữ vững hàng ngũ!', 'Đợt mới tới rồi! Giữ vững hàng ngũ!'], 'Quái kéo ra từ khe nứt kìa, chuẩn bị!', ['Đợt {w}! Ai chưa vào thì gõ "vào" ngay!', 'Quái tới! Ai chưa vào thì gõ vào ngay!']],
  boss: [['{boss} tới! Cả làng thả tim nạp Nỏ Thần nào!', 'Boss tới! Cả làng thả tim nạp Nỏ Thần nào!'], ['Cẩn thận, {boss} hất văng cả hàng lính đấy!', 'Cẩn thận, boss hất văng cả hàng lính đấy!'], ['Là {boss}! Thả tim liên tục, đừng dừng tay!', 'Boss kìa! Thả tim liên tục, đừng dừng tay!']],
  bossDown: [['Hạ được {boss} rồi! Cổ Loa muôn năm!', 'Hạ được boss rồi! Cổ Loa muôn năm!'], ['Đẹp lắm cả làng! {boss} gục rồi!', 'Đẹp lắm cả làng! Boss gục rồi!'], ['{boss} chạy về khe nứt rồi. Ha!', 'Boss chạy về khe nứt rồi. Ha!']],
  wallLow: ['Thành sắp vỡ! Gõ "cứu" ngay!', 'Tường thành nứt hết rồi, mọi người cố lên!', ['Còn {n}% thành thôi! Thả tim nạp Nỏ Thần mau!', 'Thành sắp hết máu rồi! Thả tim nạp Nỏ Thần mau!']],
  levelClear: ['Qua màn rồi! Thợ đã vá thành, nghỉ tay chút nhé.', 'Thắng lớn! Cả làng được thêm XP đó!'],
  hero: [['Đa tạ {name}! {hero} xin ra trận!', 'Đa tạ! {hero} xin ra trận!'], ['{name} gọi ta tới? {hero} có mặt!', 'Có người gọi ta? {hero} có mặt!'], ['Có {name} chống lưng, quái nào qua nổi ô này!', 'Có người chống lưng, quái nào qua nổi ô này!']],
  gift: [['Cảm ơn {name} nhiều nha! Quà này đủ quét cả đợt quái!', 'Cảm ơn nhiều nha! Quà này đủ quét cả đợt quái!'], ['{name} hào phóng quá! Cả làng cảm ơn!', 'Hào phóng quá! Cả làng cảm ơn!'], ['Ôi, {name}! Tuyệt kỹ này ta phải xem cho kỹ!', 'Ôi! Tuyệt kỹ này ta phải xem cho kỹ!']],
  top: [['{name} đã hạ {n} quái rồi! Ai đuổi kịp không?', 'Có người hạ cả đống quái rồi! Ai đuổi kịp không?'], ['Đang dẫn đầu: {name} với {n} quái. Giỏi lắm!', 'Xem bảng kìa, người dẫn đầu giỏi lắm!']],
  puzzle: ['Câu đố đây! Ai trả lời đúng trước là tung chiêu!', 'Động não chút nào! Đáp đúng là quái ăn đòn.'],
  golden: ['Giờ Vàng! XP nhân đôi, ra trận mau!'],
  over: ['Thành vỡ rồi… Ván sau ta nhất định giữ được!', 'Lui về dưỡng sức. Ván mới, cả làng lại ra trận nhé!'],
  // per-hero banter while the wave is on
  chat: {
    cungthu: ['Mũi tên của ta chưa trượt phát nào… à, trừ phát vừa rồi.', 'Gió hôm nay thuận, bắn xa thêm được một đoạn!'],
    nothu: ['Hồi trẻ ta bắn rụng cả đại bàng. Giờ thì quái thôi.', 'Nỏ nặng, nhưng một phát là quái đi luôn.'],
    hoasu: ['Lửa lên rồi! Đứa nào lại gần là cháy đuôi!', 'Quái bên Hỏa Diệm Sơn còn sợ ta nữa là!'],
    bangnu: ['Bình tĩnh. Quái chậm lại thì ai cũng bắn trúng.', 'Băng của ta làm chúng đi như rùa bò.'],
    loisu: ['Ta già rồi, nhưng sấm sét thì không già.', 'Kiên nhẫn. Sét đánh ba con một lượt mới đã.'],
    vosu: ['Lại gần đây! Hôm nay ta chưa đấm đủ!', 'Cung tên gì chứ, nắm đấm mới là chân lý!'],
    luongy: ['Ai bị thương cứ đứng gần ta, ta băng bó cho.', 'Uống nước đi bà con, giữ thành cả đêm mệt lắm.'],
    phaothu: ['Bùm! Ha ha, nghe sướng tai chưa?', 'Đứng xa ra! Pháo của ta không có mắt đâu… đùa thôi!'],
  },
};
const MOOD = { boss: 'alarm', wallLow: 'alarm', bossDown: 'happy', levelClear: 'happy', hero: 'happy', gift: 'happy', golden: 'happy', top: 'happy', over: 'sad' };
// who likes to say what (when that hero is on the field)
const PREFER = { wallLow: ['luongy'], boss: ['nothu', 'vosu', 'phaothu'], puzzle: ['loisu'], tip: ['luongy', 'cungthu'] };

// what the voice reads: no quote marks, "…" as a pause
export const spokenText = t => t.replace(/["“”]/g, '').replace(/…/g, ', ').replace(/\s+/g, ' ').trim();

// every sentence the voice can say, per hero: [[hero, text]] (server/tts-warm.js pre-generates these)
export function allVoiceLines() {
  const out = [];
  for (const type of Object.keys(HEROES)) {
    const pools = Object.entries(LINES).flatMap(([k, v]) => (k === 'chat' ? v[type] || [] : v));
    for (const t of pools) {
      const spoken = (Array.isArray(t) ? t[1] : t).replace('{hero}', HEROES[type].name);
      if (!/\{/.test(spoken)) out.push([type, spokenText(spoken)]);
    }
  }
  return out;
}

export class HeroTalk {
  constructor(scene) {
    this.s = scene;
    this.queue = [];
    this.cur = null;
    this.closedAt = 0;
    this.pending = null;         // a line waiting for its voice
    this.serverDownUntil = 0;    // /tts failed: skip it for a minute
    this.nextChat = scene.time.now + rand(...TALK.chatEvery) * 1000;
    this.cd = {};                  // per-trigger cooldowns
    this.seen = { wave: 0, level: 1, boss: null, bossKills: 0, wallLow: false, puzzle: null, golden: 0, state: scene.state };
    this.build();
    // background warm-up: every fixed line (no viewer name in it) for every hero, one request every few seconds, so
    // the server's disk cache has them and they play the moment they're needed (after the first run: instant)
    this.warm = allVoiceLines();
    this.warmAt = scene.time.now + 4000;
  }

  get active() { return !!this.cur; }

  build() {
    const s = this.s;
    // portrait frame (wood) + coloured backdrop + the face, the mouth/blink overlay drawn on top in sprite px
    const fw = CW * S + 18, fh = CH * S + 18;
    this.frameW = fw;
    this.back = s.add.rectangle(0, 0, CW * S, CH * S, 0x2a2018);
    this.rays = s.add.graphics();
    this.face = s.add.image(0, 0, '__WHITE').setVisible(false);
    this.over = s.add.graphics();
    this.faceBox = s.add.container(0, 0, [this.face, this.over]);
    this.portrait = s.add.container(40 + fw / 2, 0, [panel(s, 'wood', 0, 0, fw, fh), this.back, this.rays, this.faceBox]);
    // speech scroll + name plate
    const px = 40 + fw - 6, pw = Math.min(950, W - 40) - px;
    this.paper = panel(s, 'paper', px + pw / 2, 14, pw, 186);
    this.text = ptext(s, px + 30, -44, '', 40, INK, { shadow: false, wrap: pw - 56, lineSpacing: -6 }).setOrigin(0, 0);
    this.plateName = htext(s, 0, 0, '', 28, '#ffe58a', { stroke: '#3a0606', shadowColor: '#1a0404' }).setOrigin(0, 0.5);
    this.plateSub = ptext(s, 0, 2, '', 28, '#f3d6a8', { shadowColor: '#2a0606' }).setOrigin(0, 0.5);
    this.plateBack = s.add.container(0, 0);
    this.plate = s.add.container(px + 16, -86, [this.plateBack, this.plateName, this.plateSub]);
    this.more = s.add.rectangle(px + pw - 30, 82, 12, 12, 0x8a1a12).setVisible(false);
    this.box = s.add.container(0, Y, [this.paper, this.text, this.more, this.portrait, this.plate]).setDepth(57).setVisible(false);
  }

  // ---------------------------------------------------------------- triggers called from game.js
  onHero(h) {
    if (!h.owner || !this.ready('hero', 30)) return; // a burst of follows doesn't chain thank-yous
    this.say('hero', { prio: 3, hero: h, vars: { name: truncate(h.owner.name, 16) } });
  }

  onGift(v, total) {
    if (total < TALK.giftMin || !this.ready('gift', 45)) return;
    this.say('gift', { prio: 3, vars: { name: truncate(v.name, 16) } });
  }

  // admin button: a random hero says something fitting right now
  poke() {
    const s = this.s;
    if (s.state === 'rally') this.say('tip', { prio: 5 });
    else if (s.enemies.some(e => e.boss)) this.say('boss', { prio: 5, vars: { boss: s.enemies.find(e => e.boss).name } });
    else this.say('chat', { prio: 5 });
  }

  // ---------------------------------------------------------------- polling the game
  ready(key, sec) {
    const now = this.s.time.now;
    if ((this.cd[key] || 0) > now) return false;
    this.cd[key] = now + sec * 1000;
    return true;
  }

  watch(now) {
    const s = this.s, seen = this.seen;
    if (!TALK.enabled) return;
    // level change -> intro line in the rally
    if (s.level !== seen.level) {
      seen.level = s.level;
      const L = LEVELS[s.level - 1];
      if (L && s.level > 1) this.say('levelIntro', { prio: 4, delay: 1800, vars: { map: L.name, n: s.level } });
    }
    // state changes
    if (s.state !== seen.state) {
      if (s.state === 'over') this.say('over', { prio: 4, delay: 1200 });
      seen.state = s.state;
    }
    // new wave
    if (s.wave !== seen.wave) {
      seen.wave = s.wave;
      if (s.state === 'play' && s.wave > 0 && Math.random() < TALK.waveChance && this.ready('wave', 120)) this.say('wave', { prio: 1, vars: { w: s.wave } });
    }
    // boss in / boss down
    const boss = s.enemies.find(e => e.boss && e.alive);
    if (boss && seen.boss !== boss) {
      seen.boss = boss;
      this.say('boss', { prio: 4, delay: 2200, vars: { boss: boss.name } });
    }
    if (!boss && seen.boss) {
      const name = seen.boss.name;
      if (s.stats.bossKills > seen.bossKills) this.say('bossDown', { prio: 4, delay: 1400, vars: { boss: name } });
      seen.boss = null;
    }
    seen.bossKills = s.stats.bossKills;
    // citadel low (once per dip)
    const pct = Math.round(s.citadel / CITADEL_MAX_HP * 100);
    if (pct <= TALK.wallLow && !seen.wallLow && s.state === 'play') {
      seen.wallLow = true;
      if (this.ready('wallLow', 60)) this.say('wallLow', { prio: 4, vars: { n: pct } });
    } else if (pct > TALK.wallLow + 15) seen.wallLow = false;
    // puzzle / golden hour
    if (s.puzzle && seen.puzzle !== s.puzzle) { seen.puzzle = s.puzzle; if (Math.random() < 0.3 && this.ready('puzzle', 240)) this.say('puzzle', { prio: 2 }); }
    if (!s.puzzle) seen.puzzle = null;
    if (s.goldenUntil > now && !seen.golden) this.say('golden', { prio: 3 });
    seen.golden = s.goldenUntil > now ? 1 : 0;
    // ambient: tips in the rally, banter or a shout-out to the top killer during the wave
    if (now > this.nextChat && !this.cur && !this.queue.length) {
      this.nextChat = now + rand(...TALK.chatEvery) * 1000;
      if (s.state === 'rally' && s.rallyUntil - now > 6000) this.say('tip', { prio: 1 });
      else if (s.state === 'play') {
        const top = [...s.viewers.values()].filter(v => (v.kills || 0) >= 10).sort((a, b) => b.kills - a.kills)[0];
        if (top && Math.random() < 0.35 && this.ready('top', 300)) this.say('top', { prio: 1, vars: { name: truncate(top.name, 16), n: top.kills } });
        else this.say('chat', { prio: 1 });
      }
    }
  }

  // ---------------------------------------------------------------- queue
  say(kind, o = {}) {
    if (!TALK.enabled && (o.prio || 0) < 5) return;
    const now = this.s.time.now;
    this.queue.push({ kind, prio: o.prio || 1, hero: o.hero, vars: o.vars || {}, at: now + (o.delay || 0), born: now });
    this.queue.sort((a, b) => b.prio - a.prio || a.at - b.at);
    if (this.queue.length > 4) this.queue.length = 4;
    // something urgent while banter is up: cut the banter short
    // something more important (boss, citadel, level clear…) while a calmer line is up: cut it short
    const c = this.cur, p = o.prio || 1;
    if (c && c.phase !== 'out' && ((p >= 4 && c.prio < 4) || (p >= 3 && c.prio <= 1))) {
      c.rush = true;
      if (c.phase === 'in') { c.shown = c.text.length - 1; c.nextChar = now; } // finish the sentence at once
      if (c.phase === 'hold') c.holdUntil = Math.min(c.holdUntil, now + 500);
    }
  }

  speaker(item) {
    const s = this.s;
    if (item.hero && item.hero.sprite?.active) return { type: item.hero.type, key: s.heroKey(item.hero), owner: item.hero.owner };
    const field = s.heroes.filter(h => h.sprite?.active);
    const pref = field.filter(h => (PREFER[item.kind] || []).includes(h.type));
    const h = pick(pref.length ? pref : field.length ? field : [null]);
    if (h) return { type: h.type, key: s.heroKey(h), owner: h.owner };
    const type = pick(PREFER[item.kind] || Object.keys(HEROES));
    return { type, key: `hero_${type}_1`, owner: null };
  }

  line(item, type) {
    const pool = item.kind === 'chat' ? LINES.chat[type] : LINES[item.kind];
    const t = pick(pool || LINES.tip);
    const [shown, spoken] = Array.isArray(t) ? t : [t, t];
    const vars = { hero: HEROES[type].name, ...item.vars };
    const fill = str => str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    return { text: fill(shown), voice: spokenText(fill(spoken)) };
  }

  update(now) {
    this.watch(now);
    if (this.warm.length && now > this.warmAt && !this.pending && TALK.tts && TALK.ttsServer && now > this.serverDownUntil) {
      this.warmAt = now + 5000;
      const [type, text] = this.warm.shift();
      fetch(`/tts?h=${type}&t=${encodeURIComponent(text)}`).then(r => r.arrayBuffer()).catch(() => {});
    }
    const c = this.cur;
    if (c) { this.animate(c, now); return; }
    if (this.pending) { if (this.pending.ready || now > this.pending.giveUp) this.open(this.pending, now); return; }
    if (!this.queue.length) return;
    // gap after the last line: short for urgent ones, longer for banter
    const p = this.queue[0].prio;
    if (now < this.closedAt + (p >= 4 ? 600 : p >= 3 ? 8000 : TALK.gapMs)) return;
    const s = this.s;
    // stay out of the way of the start countdown and the game-over screen's first seconds
    if (s.state === 'rally' && s.rallyUntil - now < 3500 && s.rallyUntil > now) return;
    this.queue = this.queue.filter(q => now - q.born < 9000 + (q.at - q.born) || q.prio >= 4);
    const i = this.queue.findIndex(q => q.at <= now);
    if (i < 0) return;
    if (this.queue[i].prio <= 2 && this.queue.some(q => q.prio >= 3)) return; // something important is about to speak
    const item = this.queue.splice(i, 1)[0];
    this.prepare(item, now);
  }

  // pick who speaks and what, then fetch the voice; the box opens when the audio is ready (or the wait runs out)
  prepare(item, now) {
    const sp = this.speaker(item);
    if (!this.s.textures.exists(sp.key)) return;
    const { text, voice } = this.line(item, sp.type);
    const p = this.pending = { item, sp, text, voice, buf: null, ready: false, giveUp: now + (item.prio >= 4 ? 5000 : 8000) };
    if (!TALK.tts || !TALK.ttsServer || now < this.serverDownUntil || !this.s.sfx.ready()) { p.ready = true; return; }
    const ctx = this.s.sfx.ctx;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8000);
    fetch(`/tts?h=${encodeURIComponent(sp.type)}&t=${encodeURIComponent(voice)}`, { signal: ac.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => ctx.decodeAudioData(ab))
      .then(buf => { p.buf = buf; if (this.cur?.prep === p) this.lateVoice(this.cur, buf); })
      .catch(() => { this.serverDownUntil = this.s.time.now + 60000; })
      .finally(() => { clearTimeout(timer); p.ready = true; });
  }

  // start a fetched voice on the line that's up (also when it arrives after the box opened)
  lateVoice(c, buf) {
    if (c.phase === 'out' || c.voiced) return;
    const ms = this.playVoice(buf);
    if (!ms) return;
    const now = this.s.time.now;
    c.voiced = 'server';
    c.voiceEnd = now + ms;
    c.typeMs = Phaser.Math.Clamp(ms * 0.8 / Math.max(1, c.text.length - c.shown), 18, 70); // the text keeps pace with the voice
    if (c.phase === 'hold') c.holdUntil = Math.max(c.holdUntil, now + ms + 600);
  }

  // play a fetched voice line through the game's sound bus (so the admin volume / mute apply)
  playVoice(buf) {
    const sfx = this.s.sfx;
    if (!buf || !sfx.ready() || sfx.vol.mute) return 0;
    try {
      const src = sfx.ctx.createBufferSource();
      const g = sfx.ctx.createGain();
      g.gain.value = TALK.ttsGain;
      src.buffer = buf;
      src.connect(g).connect(sfx.sfxBus);
      src.start();
      this.voiceSrc = src;
      return buf.duration * 1000;
    } catch { return 0; }
  }

  // ---------------------------------------------------------------- voice (text to speech)
  // Uses the browser's own Vietnamese voice (speechSynthesis). Edge has online neural ones (HoaiMy, NamMinh);
  // with no Vietnamese voice installed it returns false and the line plays the little blips instead.
  voice() {
    const sy = window.speechSynthesis;
    if (!sy) return null;
    if (this._voice !== undefined && this._voiceN === sy.getVoices().length) return this._voice;
    const vs = sy.getVoices().filter(v => /^vi/i.test(v.lang));
    this._voiceN = sy.getVoices().length;
    this._voice = vs.find(v => /natural|online|neural/i.test(v.name)) || vs[0] || null;
    return this._voice;
  }

  speak(text, type) {
    const sy = window.speechSynthesis, sfx = this.s.sfx;
    if (!TALK.tts || !sy || sfx.vol.mute) return false;
    const v = this.voice();
    if (!v) return false;
    try {
      sy.cancel();
      const u = new SpeechSynthesisUtterance(spokenText(text));
      u.voice = v; u.lang = v.lang;
      u.pitch = PITCH[type] ?? 1;
      u.rate = TALK.ttsRate;
      u.volume = Math.min(1, (sfx.vol.sfx ?? 0.7) * 1.3);
      sy.speak(u);
      return true;
    } catch { return false; }
  }

  // ---------------------------------------------------------------- show / animate
  open(p, now) {
    const s = this.s, { item, sp } = p;
    this.pending = null;
    const face = { ...FACE, ...(FACES[sp.type] || {}) };
    const tex = s.textures.get(sp.key);
    if (!tex.has('talkface')) tex.add('talkface', 0, face.cx - CW / 2, 1, CW, CH);
    this.face.setTexture(sp.key, 'talkface').setScale(S).setVisible(true).setPosition(0, 0);
    this.back.setFillStyle(BACK[HEROES[sp.type].kind] || 0x2a2018);
    // skin colour for blinks, sampled from the sprite itself
    const sk = s.textures.getPixel(face.skin[0], face.skin[1], sp.key, 0);
    const skin = sk ? (sk.red << 16) | (sk.green << 8) | sk.blue : 0xf0b890;
    const text = p.text;
    // name plate: the viewer who owns the hero (the hero is a small tag); an advisor shows the hero's name
    this.plateName.setText(truncate(sp.owner ? sp.owner.name : HEROES[sp.type].name, 16).toUpperCase()).setPosition(18, -2);
    this.plateSub.setText(sp.owner ? `· ${HEROES[sp.type].name}` : '').setPosition(this.plateName.width + 30, 0);
    const pw = this.plateName.width + (sp.owner ? this.plateSub.width + 24 : 0) + 38;
    this.plateBack.removeAll(true);
    this.plateBack.add(panel(s, 'lacquer', pw / 2, 0, pw, 52));
    this.text.setText('');
    this.more.setVisible(false);
    this.cur = {
      ...item, ...sp, face, skin, text, shown: 0, phase: 'in', t0: now, nextChar: now + 260, holdUntil: Infinity,
      blinkAt: now + rand(1200, 2600), blinkUntil: 0, mouth: 0, mood: MOOD[item.kind] || '',
    };
    // slide in from the left in two hard steps, the portrait pops
    this.box.setVisible(true).setAlpha(1).setX(-W);
    s.tweens.killTweensOf([this.box, this.portrait, this.faceBox]);
    s.tweens.add({ targets: this.box, x: 0, duration: 200, ease: 'Stepped', easeParams: [3] });
    this.portrait.setScale(0.6);
    s.tweens.add({ targets: this.portrait, scale: 1, duration: 260, ease: 'Back.Out', delay: 120 });
    this.faceBox.setPosition(0, 0);
    if (this.cur.mood === 'alarm') s.tweens.add({ targets: this.faceBox, x: { from: -S, to: S }, duration: 70, yoyo: true, repeat: 5, ease: 'Stepped', easeParams: [1], delay: 300 });
    if (this.cur.mood === 'happy') s.tweens.add({ targets: this.faceBox, y: -S * 2, duration: 120, yoyo: true, repeat: 1, ease: 'Stepped', easeParams: [2], delay: 300 });
    s.sfx.play('heal');
    // voice: the fetched neural voice, else the browser's own Vietnamese voice, else blips
    this.cur.prep = p;
    if (p.buf) this.lateVoice(this.cur, p.buf);
    else if (p.ready) this.cur.voiced = this.speak(text, sp.type) ? 'browser' : false;
    // (still loading: the box shows with blips, and the voice joins in if it arrives while the line is up)
    this.signs(false);
  }

  animate(c, now) {
    const s = this.s;
    // typewriter + voice blips + mouth
    if (c.phase === 'in' && now >= c.nextChar) {
      const ch = c.text[c.shown];
      c.shown++;
      this.text.setText(c.text.slice(0, c.shown));
      const pause = /[,.!?…:]/.test(ch) ? 140 : 0;
      c.nextChar = now + (c.typeMs || TYPE_MS) + pause;
      if (/[\p{L}\d]/u.test(ch)) {
        c.mouth = c.mouth === 2 ? 1 : c.shown % 3 === 0 ? 0 : 2;
        if (!c.voiced && c.shown % 2 === 0) s.sfx.blip?.(VOICE[c.type] * (0.92 + Math.random() * 0.16));
      } else c.mouth = 0;
      if (c.shown >= c.text.length) {
        c.phase = 'hold'; c.mouth = 0;
        c.holdUntil = c.rush ? now + 500 : now + TALK.holdMs + c.text.length * 30;
        this.more.setVisible(true);
      }
    }
    if (c.phase === 'hold') {
      this.more.setY(82 + (Math.floor(now / 300) % 2) * 4);
      // with a voice, wait for it to finish (up to 12 s)
      const talking = !c.rush && now - c.t0 < 14000 && (c.voiced === 'server' ? now < c.voiceEnd : c.voiced === 'browser' && window.speechSynthesis?.speaking);
      if (talking) c.mouth = Math.floor(now / 110) % 3 === 0 ? 0 : Math.floor(now / 110) % 3;
      else if (c.voiced) c.mouth = 0;
      if (now > c.holdUntil && !talking) this.close(now);
    }
    // gentle breathing bob on the portrait (whole sprite px steps)
    this.face.setY(Math.floor(now / 520) % 2 ? S : 0);
    // blink
    if (now > c.blinkAt) { c.blinkUntil = now + 110; c.blinkAt = now + rand(1800, 3800); }
    this.drawFace(c, now);
    // soft halo behind the head, pulsing in two hard steps (stays inside the frame)
    const big = Math.floor(now / 600) % 2;
    this.rays.clear();
    this.rays.fillStyle(0xffffff, 0.06).fillCircle(0, -12, 84 + big * 6);
    this.rays.fillStyle(0xffffff, 0.05).fillCircle(0, -12, 58 + big * 4);
  }

  // mouth and eyelids, drawn in sprite px over the face image (the image's top-left is the crop origin)
  drawFace(c, now) {
    const g = this.over, f = c.face;
    g.clear();
    const ox = this.face.x - CW * S / 2, oy = this.face.y - CH * S / 2;
    const x0 = f.cx - CW / 2, y0 = 1;
    const px = (x, y, w, h, col) => { g.fillStyle(col, 1); g.fillRect(ox + (x - x0) * S, oy + (y - y0) * S, w * S, h * S); };
    if (c.mouth === 1) px(f.mouthX + 1, f.mouthY, 2, 1, 0x26141a);
    if (c.mouth === 2) { px(f.mouthX, f.mouthY, 3, 2, 0x26141a); px(f.mouthX + 1, f.mouthY + 1, 1, 1, 0xa8443a); }
    if (now < c.blinkUntil) {
      for (const [ex, ew] of f.eyes) { px(ex, f.eyeY, ew, 3, c.skin); px(ex, f.eyeY + 2, ew, 1, 0x26141a); }
    }
  }

  close(now) {
    const s = this.s, c = this.cur;
    if (!c || c.phase === 'out') return;
    c.phase = 'out';
    if (c.voiced === 'browser') window.speechSynthesis?.cancel();
    if (c.voiced === 'server' && c.rush) try { this.voiceSrc?.stop(); } catch { /* already ended */ }
    s.tweens.add({
      targets: this.box, x: -W, duration: 180, ease: 'Stepped', easeParams: [3],
      onComplete: () => { this.box.setVisible(false); this.cur = null; this.over.clear(); this.signs(true); },
    });
    this.closedAt = now;
    if (c.prio <= 1) this.nextChat = Math.max(this.nextChat, now + rand(...TALK.chatEvery) * 1000);
  }

  // the wall signboards sit under the box: hide them while a hero talks
  signs(on) {
    const b = this.s.boards;
    for (const k of ['guideBoard', 'rankBoard']) b?.[k]?.box.setVisible(on);
  }

  // level reset / clear field: drop anything queued
  clear() {
    this.queue = [];
    if (this.cur) this.close(this.s.time.now);
  }
}
