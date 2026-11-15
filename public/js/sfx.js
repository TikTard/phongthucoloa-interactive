// Synthesized sound: retro SFX + generative Vietnamese pentatonic music (đàn tranh pluck, sáo trúc flute, trống drums).
// Everything is generated with WebAudio — no audio files to load or lose.

const LS_KEY = 'gtcl_audio';

export class Sfx {
  constructor() {
    this.ctx = null;
    this.last = {};
    this.vol = { sfx: 0.7, music: 0.35, mute: false };
    try { Object.assign(this.vol, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch { /* defaults */ }
    this.mood = 'calm';
    this.musicOn = false;
    this.key = 1;          // music transposition for the current map
    this.tempoMult = 1;
    this.ambience = null;
  }

  // ---------------------------------------------------------------- setup
  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.vol.mute ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.vol.sfx; this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.vol.music; this.musicBus.connect(this.master);
    // small hall reverb from a generated impulse
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2;
    const imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = imp.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.reverb.buffer = imp;
    const wet = ctx.createGain(); wet.gain.value = 0.3;
    this.reverb.connect(wet).connect(this.master);
    // shared white noise
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  resume() {
    if (!this.init()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setVolumes({ sfx, music, mute }) {
    if (sfx !== undefined) this.vol.sfx = sfx;
    if (music !== undefined) this.vol.music = music;
    if (mute !== undefined) this.vol.mute = mute;
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.vol)); } catch { /* storage unavailable */ }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.master.gain.setTargetAtTime(this.vol.mute ? 0 : 1, t, 0.05);
  }

  ready() { return this.ctx && this.ctx.state === 'running'; }

  // rate limit per sound so 300 soldiers don't become white noise
  gate(name, gapMs) {
    const now = performance.now();
    if (now - (this.last[name] || 0) < gapMs) return false;
    this.last[name] = now;
    return true;
  }

  // ---------------------------------------------------------------- building blocks
  tone({ type = 'sine', f0 = 440, f1, dur = 0.2, vol = 0.2, attack = 0.005, at = 0, rev = 0, bus, slide = 0, vib = 0 }) {
    const ctx = this.ctx, t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    if (slide) { o.frequency.setValueAtTime(f0 * slide, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.06); }
    else o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = f0 * vib;
      lfo.connect(lg).connect(o.frequency); lfo.start(t + 0.15); lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus || this.sfxBus);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(this.reverb); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.2, type = 'bandpass', f0 = 1200, f1, q = 1, at = 0, attack = 0.003, rev = 0, bus }) {
    const ctx = this.ctx, t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus || this.sfxBus);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(this.reverb); }
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  drum(at = 0, vol = 0.6, f = 110, bus) {
    this.tone({ type: 'sine', f0: f, f1: f * 0.45, dur: 0.38, vol, at, bus });
    this.noise({ dur: 0.12, vol: vol * 0.45, type: 'lowpass', f0: 900, f1: 120, at, bus });
  }

  gong(at = 0, vol = 0.22, base = 150) {
    for (const [m, v] of [[1, 1], [2.09, 0.6], [2.76, 0.45], [3.9, 0.3], [5.4, 0.18]]) {
      this.tone({ type: 'sine', f0: base * m, f1: base * m * 0.985, dur: 2.6, vol: vol * v, attack: 0.01, at, rev: 0.6 });
    }
    this.noise({ dur: 0.08, vol: vol * 0.6, f0: 2400, q: 0.8, at });
  }

  arp(notes, step = 0.07, opts = {}) {
    notes.forEach((f, i) => this.tone({ type: opts.type || 'square', f0: f, dur: opts.dur || 0.16, vol: opts.vol || 0.07, at: (opts.at || 0) + i * step, rev: opts.rev ?? 0.2 }));
  }

  // hero talk "voice": one tiny square blip per couple of letters, pitch per hero
  blip(f) {
    if (!this.ready() || this.vol.mute || !this.gate('blip', 40)) return;
    this.tone({ type: 'square', f0: f, f1: f * 0.88, dur: 0.045, vol: 0.028 });
  }

  // ---------------------------------------------------------------- the sound list
  play(name) {
    if (!this.ready() || this.vol.mute) return;
    const S = SOUNDS[name];
    if (!S || !this.gate(name, S.gap ?? 60)) return;
    S.fn(this);
  }

  // ---------------------------------------------------------------- music
  // D major pentatonic ("ngũ cung") — D E F# A B
  startMusic() {
    if (!this.init() || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.melodyIdx = 4;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() { clearInterval(this.timer); this.musicOn = false; }

  setMood(m) { this.mood = m; }

  // each map has its own music key/tempo and background sounds (birds, frogs, wind, fire...)
  setTheme({ semis = 0, tempo = 1, ambience = null } = {}) {
    this.key = Math.pow(2, semis / 12);
    this.tempoMult = tempo;
    this.ambience = ambience;
    clearInterval(this.ambTimer);
    this.ambTimer = setInterval(() => {
      if (!this.ambience || !this.ready() || this.vol.mute) return;
      const a = AMBIENCE[this.ambience];
      if (a && Math.random() < a.chance) a.fn(this);
    }, 700);
  }

  schedule() {
    if (!this.ready()) { this.nextTime = this.ctx.currentTime + 0.1; return; }
    const bpm = (this.mood === 'boss' ? 132 : this.mood === 'battle' ? 112 : 88) * this.tempoMult;
    const sixteenth = 60 / bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.musicStep(this.step, this.nextTime - this.ctx.currentTime);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  musicStep(step, at) {
    const bus = this.musicBus;
    const s = step % 16, bar = Math.floor(step / 16) % 8;
    const SCALE = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 370.0, 440.0, 493.88, 587.33].map(f => f * this.key);
    const roots = [146.83, 146.83, 196.0, 220.0, 146.83, 246.94, 196.0, 220.0].map(f => f * this.key);
    const mood = this.mood;
    // drums (trống): calm = sparse, battle = steady, boss = driving
    if (mood !== 'calm' || s === 0) {
      if (s === 0 || s === 8 || (mood === 'boss' && s % 4 === 0)) this.drum(at, mood === 'boss' ? 0.55 : 0.4, 95, bus);
      if (mood !== 'calm' && (s === 6 || s === 14)) this.drum(at, 0.22, 140, bus);
      if (mood === 'boss' && bar % 2 === 1 && s >= 12) this.drum(at, 0.18 + (s - 12) * 0.05, 160, bus);
    }
    // wood block (mõ) on the off-beats
    if (mood !== 'calm' && s % 4 === 2) this.noise({ dur: 0.05, vol: 0.12, type: 'bandpass', f0: 1800, q: 6, at, bus });
    // bass on beats
    if (s % 8 === 0) this.tone({ type: 'triangle', f0: roots[bar] / 2, dur: mood === 'calm' ? 1.2 : 0.5, vol: 0.18, at, bus });
    // đàn tranh pluck melody: random walk on the pentatonic scale with slides
    const density = mood === 'boss' ? 0.75 : mood === 'battle' ? 0.55 : 0.32;
    const onGrid = mood === 'calm' ? s % 4 === 0 : s % 2 === 0;
    if (onGrid && Math.random() < density) {
      this.melodyIdx = Math.max(0, Math.min(SCALE.length - 1, this.melodyIdx + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
      const f = SCALE[this.melodyIdx];
      const slide = Math.random() < 0.25 ? 0.89 : 0;
      this.tone({ type: 'triangle', f0: f, dur: 0.55, vol: 0.09, at, bus, slide, rev: 0.25 });
      this.tone({ type: 'sine', f0: f * 2, dur: 0.25, vol: 0.03, at, bus });
    }
    // bamboo flute (sáo) long notes when calm
    if (mood === 'calm' && s === 0 && bar % 2 === 0) {
      const f = SCALE[5 + Math.floor(Math.random() * 5)] * 2;
      this.tone({ type: 'sine', f0: f, dur: 2.2, vol: 0.05, attack: 0.25, at, bus, vib: 0.012, rev: 0.5, slide: 0.94 });
      this.noise({ dur: 0.6, vol: 0.012, type: 'bandpass', f0: f, q: 3, at, attack: 0.2, bus });
    }
  }
}

// name -> { gap (ms between plays), fn }
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, D5 = 587.33, A5 = 880, B5 = 987.77, E6 = 1318.5;
const SOUNDS = {
  arrow: { gap: 70, fn: s => { s.noise({ dur: 0.12, vol: 0.18, type: 'highpass', f0: 3200, f1: 1400 }); s.tone({ type: 'triangle', f0: 900, f1: 520, dur: 0.07, vol: 0.06 }); } },
  bolt: { gap: 90, fn: s => { s.tone({ type: 'square', f0: 420, f1: 120, dur: 0.08, vol: 0.08 }); s.noise({ dur: 0.06, vol: 0.12, f0: 2600 }); } },
  fire: { gap: 130, fn: s => { s.noise({ dur: 0.35, vol: 0.22, type: 'lowpass', f0: 900, f1: 200 }); s.tone({ type: 'sawtooth', f0: 190, f1: 80, dur: 0.22, vol: 0.05 }); } },
  ice: { gap: 140, fn: s => { s.tone({ f0: 1760, dur: 0.3, vol: 0.06, rev: 0.4 }); s.tone({ f0: 2350, dur: 0.22, vol: 0.04, at: 0.03, rev: 0.4 }); s.noise({ dur: 0.08, vol: 0.08, type: 'highpass', f0: 5000 }); } },
  thunder: { gap: 140, fn: s => { s.noise({ dur: 0.28, vol: 0.28, f0: 1400, q: 0.6 }); for (let i = 0; i < 4; i++) s.noise({ dur: 0.03, vol: 0.18, type: 'highpass', f0: 3000, at: 0.03 * i }); } },
  cannon: { gap: 160, fn: s => { s.tone({ f0: 150, f1: 38, dur: 0.45, vol: 0.5 }); s.noise({ dur: 0.45, vol: 0.4, type: 'lowpass', f0: 1400, f1: 90 }); } },
  slash: { gap: 120, fn: s => s.noise({ dur: 0.18, vol: 0.22, f0: 600, f1: 2600, q: 1.5 }) },
  heal: { gap: 400, fn: s => s.arp([A5, C6 * 1.122, E6], 0.07, { type: 'sine', vol: 0.05, rev: 0.5 }) },
  hit: { gap: 40, fn: s => { s.noise({ dur: 0.045, vol: 0.1, f0: 1900, q: 1.2 }); s.tone({ type: 'square', f0: 230, f1: 110, dur: 0.045, vol: 0.035 }); } },
  crit: { gap: 80, fn: s => { s.noise({ dur: 0.09, vol: 0.2, f0: 2800, q: 0.9 }); s.tone({ type: 'square', f0: 1200, f1: 600, dur: 0.1, vol: 0.06 }); } },
  kill: { gap: 55, fn: s => { s.tone({ type: 'square', f0: 540, f1: 90, dur: 0.15, vol: 0.07 }); s.noise({ dur: 0.08, vol: 0.08, f0: 900 }); } },
  explode: { gap: 110, fn: s => { s.tone({ f0: 95, f1: 32, dur: 0.5, vol: 0.45 }); s.noise({ dur: 0.6, vol: 0.4, type: 'lowpass', f0: 2200, f1: 80 }); } },
  orb: { gap: 75, fn: s => s.tone({ type: 'triangle', f0: 1250, f1: 900, dur: 0.035, vol: 0.025 }) },
  power: { gap: 60, fn: s => { s.tone({ type: 'square', f0: 700, f1: 1500, dur: 0.09, vol: 0.08 }); s.noise({ dur: 0.05, vol: 0.08, type: 'highpass', f0: 2500 }); } },
  coin: { gap: 60, fn: s => { s.tone({ type: 'square', f0: B5, dur: 0.06, vol: 0.06 }); s.tone({ type: 'square', f0: E6, dur: 0.22, vol: 0.06, at: 0.06 }); } },
  giftBig: { gap: 300, fn: s => { s.arp([C5, E5, G5, C6, E6], 0.06, { vol: 0.07 }); s.tone({ f0: 2093, dur: 0.6, vol: 0.04, at: 0.3, rev: 0.6 }); } },
  join: { gap: 90, fn: s => s.tone({ type: 'triangle', f0: 523, f1: 784, dur: 0.1, vol: 0.06 }) },
  like: { gap: 140, fn: s => s.tone({ f0: 880, f1: 1320, dur: 0.06, vol: 0.035 }) },
  heroSpawn: { gap: 200, fn: s => { s.tone({ type: 'sawtooth', f0: 200, f1: 800, dur: 0.35, vol: 0.05 }); s.arp([D5, A5, D5 * 2], 0.09, { type: 'triangle', vol: 0.08, at: 0.2, rev: 0.4 }); } },
  levelUp: { gap: 200, fn: s => s.arp([C5, E5, G5, C6], 0.06, { vol: 0.07 }) },
  rankUp: { gap: 250, fn: s => { s.arp([G5 / 2, C5, E5, G5], 0.09, { type: 'triangle', vol: 0.09, dur: 0.25 }); s.tone({ type: 'triangle', f0: C6, dur: 0.6, vol: 0.08, at: 0.36, rev: 0.4 }); } },
  revive: { gap: 150, fn: s => s.arp([E5, A5, E6], 0.05, { type: 'sine', vol: 0.06, rev: 0.4 }) },
  hurt: { gap: 120, fn: s => s.tone({ type: 'square', f0: 300, f1: 120, dur: 0.18, vol: 0.06 }) },
  wave: { gap: 800, fn: s => { s.drum(0, 0.7); s.drum(0.22, 0.7); s.drum(0.44, 0.9, 80); } },
  boss: { gap: 1000, fn: s => {
    s.drum(0, 0.9, 70); s.drum(0.3, 0.9, 70);
    s.tone({ type: 'sawtooth', f0: 130, f1: 55, dur: 1.3, vol: 0.18, at: 0.1 });
    s.noise({ dur: 1.2, vol: 0.2, type: 'lowpass', f0: 600, f1: 120, at: 0.1, attack: 0.2 });
    s.gong(0.6, 0.25, 110);
  } },
  bossDeath: { gap: 1000, fn: s => {
    SOUNDS.explode.fn(s);
    s.tone({ type: 'square', f0: 600, f1: 60, dur: 0.9, vol: 0.08, at: 0.1 });
    s.arp([C5, E5, G5, C6, G5, C6, E6], 0.11, { type: 'triangle', vol: 0.09, dur: 0.3 });
  } },
  gong: { gap: 600, fn: s => s.gong(0, 0.25, 160) },
  // a guard kicked off the screen: thwack + rising slide whistle
  launch: { gap: 90, fn: s => {
    s.noise({ dur: 0.08, vol: 0.25, type: 'bandpass', f0: 1800, q: 2 });
    s.tone({ type: 'square', f0: 140, f1: 70, dur: 0.12, vol: 0.12 });
    s.tone({ type: 'sine', f0: 600, f1: 2400, dur: 0.55, vol: 0.07, at: 0.05, vib: 9 });
  } },
  // boss urgent phase: a two-tone war horn and the roar of flames
  alarm: { gap: 1400, fn: s => {
    for (let i = 0; i < 3; i++) {
      s.tone({ type: 'sawtooth', f0: 220, dur: 0.22, vol: 0.09, at: i * 0.48, vib: 6 });
      s.tone({ type: 'sawtooth', f0: 165, dur: 0.22, vol: 0.09, at: i * 0.48 + 0.24, vib: 6 });
    }
    s.drum(0, 0.6, 60);
  } },
  flames: { gap: 700, fn: s => {
    s.noise({ dur: 0.9, vol: 0.16, type: 'lowpass', f0: 900, f1: 300, attack: 0.08 });
    s.noise({ dur: 0.5, vol: 0.06, type: 'bandpass', f0: 2400, f1: 1200, at: 0.05 });
  } },
  solve: { gap: 300, fn: s => { s.arp([E5, G5, B5, E6], 0.06, { type: 'square', vol: 0.07 }); SOUNDS.coin.fn(s); } },
  arrowRain: { gap: 500, fn: s => { for (let i = 0; i < 10; i++) s.noise({ dur: 0.15, vol: 0.12, type: 'highpass', f0: 3000, f1: 1200, at: i * 0.04 }); } },
  freeze: { gap: 500, fn: s => { s.noise({ dur: 0.8, vol: 0.18, type: 'highpass', f0: 6000, f1: 2000 }); s.arp([E6, B5, A5, E5], 0.07, { type: 'sine', vol: 0.06, rev: 0.6 }); } },
  volley: { gap: 500, fn: s => { s.tone({ f0: 80, f1: 40, dur: 0.5, vol: 0.5 }); s.noise({ dur: 0.7, vol: 0.3, type: 'highpass', f0: 1200, f1: 5000 }); s.tone({ type: 'triangle', f0: C6, dur: 0.8, vol: 0.06, at: 0.2, rev: 0.5 }); } },
  summon: { gap: 800, fn: s => { s.gong(0, 0.2, 120); s.tone({ type: 'sawtooth', f0: 110, f1: 440, dur: 0.8, vol: 0.08 }); for (let i = 0; i < 8; i++) s.drum(0.3 + i * 0.09, 0.3, 140); } },
  shield: { gap: 800, fn: s => { s.tone({ f0: 110, dur: 1.6, vol: 0.15, attack: 0.2 }); s.arp([A5, E6, A5 * 2], 0.12, { type: 'sine', vol: 0.06, rev: 0.6 }); } },
  wallHit: { gap: 140, fn: s => { s.tone({ f0: 70, f1: 40, dur: 0.35, vol: 0.5 }); s.noise({ dur: 0.4, vol: 0.25, type: 'lowpass', f0: 1200, f1: 200 }); } },
  combo: { gap: 600, fn: s => s.arp([C5, D5, E5, G5, A5, C6], 0.04, { vol: 0.06 }) },
  gameOver: { gap: 2000, fn: s => { s.gong(0, 0.3, 100); s.arp([G5, E5 * 0.944, D5, C5 / 1.06], 0.28, { type: 'triangle', vol: 0.09, dur: 0.5 }); } },
  treasure: { gap: 150, fn: s => { SOUNDS.coin.fn(s); s.tone({ type: 'square', f0: G5 * 2, dur: 0.12, vol: 0.04, at: 0.12 }); } },
};
export const SOUND_NAMES = Object.keys(SOUNDS);

// quiet background sounds per map (played now and then on the music bus)
const AMBIENCE = {
  birds: { chance: 0.35, fn: s => { const b = 2200 + Math.random() * 1400; s.arp([b, b * 1.12, b * 0.94, b * 1.2], 0.055, { type: 'sine', vol: 0.018, bus: s.musicBus }); } },
  crickets: { chance: 0.5, fn: s => { for (let i = 0; i < 6; i++) s.noise({ dur: 0.025, vol: 0.02, type: 'bandpass', f0: 4600, q: 10, at: i * 0.05, bus: s.musicBus }); } },
  bamboo: { chance: 0.3, fn: s => { s.noise({ dur: 0.05, vol: 0.05, type: 'bandpass', f0: 820, q: 8, bus: s.musicBus }); s.noise({ dur: 0.05, vol: 0.04, type: 'bandpass', f0: 700, q: 8, at: 0.16, bus: s.musicBus }); if (Math.random() < 0.4) s.tone({ f0: 1568, dur: 1.2, vol: 0.012, rev: 0.6, bus: s.musicBus }); } },
  wind: { chance: 0.22, fn: s => s.noise({ dur: 2.6, vol: 0.05, type: 'lowpass', f0: 380, f1: 820, attack: 1.1, bus: s.musicBus }) },
  frogs: { chance: 0.35, fn: s => { const f = 110 + Math.random() * 40; for (let i = 0; i < 3; i++) s.tone({ type: 'square', f0: f, f1: f * 0.75, dur: 0.1, vol: 0.025, at: i * 0.16, bus: s.musicBus }); } },
  blizzard: { chance: 0.3, fn: s => { s.noise({ dur: 3, vol: 0.06, type: 'bandpass', f0: 900, f1: 1500, q: 0.8, attack: 1.2, bus: s.musicBus }); s.noise({ dur: 2, vol: 0.02, type: 'highpass', f0: 5000, attack: 0.8, bus: s.musicBus }); } },
  fire: { chance: 0.45, fn: s => { for (let i = 0; i < 6; i++) s.noise({ dur: 0.02, vol: 0.035, type: 'highpass', f0: 2500, at: Math.random() * 0.6, bus: s.musicBus }); if (Math.random() < 0.3) s.tone({ f0: 52, dur: 1.6, vol: 0.05, attack: 0.5, bus: s.musicBus }); } },
  eerie: { chance: 0.18, fn: s => { s.tone({ f0: 220, f1: 207, dur: 3, vol: 0.022, attack: 1, vib: 0.01, bus: s.musicBus }); s.tone({ f0: 233, f1: 220, dur: 3, vol: 0.016, attack: 1.2, bus: s.musicBus }); } },
  drums: { chance: 0.25, fn: s => { s.drum(0, 0.18, 70, s.musicBus); s.drum(0.42, 0.14, 66, s.musicBus); } },
};
