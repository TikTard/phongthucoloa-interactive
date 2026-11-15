// Tune the game here. Everything is plain data so it's easy to edit between streams.

export const W = 1080;
export const H = 1920;
export const TILE = 64;          // 16px art drawn at 4x
export const MAP_TOP = 190;      // y where the map starts
export const MAP_ROWS = 21;
export const MAP_X0 = -4;        // 17 columns * 64 = 1088, centred
export const CITADEL_Y = MAP_TOP + MAP_ROWS * TILE; // 1534
// The top HUD (wood board) now reaches down to HUD_BOTTOM: the instruction ticker sits in it, and the event feed just
// under it. The bottom ~600 px of a phone are covered by TikTok's comment list and input bar, so nothing a viewer must
// read lives there any more (feed, ticker and puzzle scroll used to). Bubbles stay above SAFE_BOTTOM and left of SAFE_RIGHT
// below SAFE_RIGHT_FROM (TikTok's like/gift/share buttons).
export const HUD_BOTTOM = 238;

// Hero talk (herotalk.js): now and then a hero portrait slides in under the map (over the wall signboards) and says a line,
// read aloud (tts) by the server's Edge neural voices (ttsServer, /tts), else by the browser's own Vietnamese voice. chatEvery = seconds between idle lines (tips in the rally,
// banter in a wave); boss / low citadel / level / gifts / new heroes get a line with their own cooldowns. gapMs = quiet
// time after any line before idle talk again. giftMin = gift value (diamonds) that earns a thank-you.
export const TALK = { enabled: true, tts: true, ttsServer: true, ttsGain: 1.6, ttsRate: 1.3, chatEvery: [100, 160], gapMs: 25000, holdMs: 2200, waveChance: 0.15, wallLow: 35, giftMin: 20 };
export const SAFE_BOTTOM = 1330;
export const SAFE_RIGHT = 950;
export const SAFE_RIGHT_FROM = 1000;

// Enemy path, in tile coordinates (col,row). Enemies walk these points in order.
export const PATH = [
  [1, -0.4], [1, 1], [15, 1], [15, 5], [1, 5], [1, 9], [15, 9], [15, 13], [1, 13], [1, 17], [8, 17], [8, 22.3],
];

// 10 levels ("màn") of 10 waves. Each level has its own path (tile coords) and a light colour theme; enemies get
// tougher each level (STAGE_HP / STAGE_SPEED per level). Paths never cross a hero slot (rows 3/7/11/15 x cols
// 3/6/9/12) and all end through the river gap at the gate (col 8). Shorter paths = less time = harder.
export const WAVES_PER_LEVEL = 10;
export const STAGE_HP = 0.10;      // +10% enemy HP per level (màn)   (was 0.25)
export const STAGE_SPEED = 0.025;  // +2.5% enemy speed per level (màn) (was 0.04)
// How many monsters a wave has: (base + perWave·waveInLevel + perLevel·(level-1)) × crowd factor, capped at max.
// It used to grow with the absolute wave number (6 + 2·wave, cap 90), so from level 5 on every wave was 90 monsters
// whether 10 or 200 people were playing. Now it ramps inside each level and follows the size of the army.
export const WAVE_COUNT = { base: 10, perWave: 2.5, perLevel: 1, max: 130 };
// Crowd scaling. Guard damage already shrinks with crowd size (7/√n per guard), so a big army is ~√n strong.
// count × clamp(√(guards/ref), minK, maxK); enemy HP × (1 + min(hpMax, (guards-ref/2)·hpPerGuard)); boss HP × (1 + min(bossMax, (guards-ref/2)·bossPerGuard)).
export const CROWD = { ref: 20, minK: 1, maxK: 3.0, hpPerGuard: 0.009, hpMax: 1.5, bossPerGuard: 0.02, bossMax: 3.5 };
// Citadel repair when a level is cleared (out of CITADEL_MAX_HP), so one bad boss doesn't end an hour-long stream.
export const LEVEL_CLEAR_HEAL = 35;
// A normal monster that reaches the gate takes at most this much off the citadel (a leaked Bạch Hầu Quỷ took 15%).
export const LEAK_DMG_MAX = 6;
export const LEVELS = [
  { name: 'Làng Cổ Loa', tint: 0xffffff, path: PATH },
  { name: 'Đồng Lúa Chín', tint: 0xfff6e0, path: [[15, -0.4], [15, 1], [1, 1], [1, 5], [15, 5], [15, 9], [1, 9], [1, 13], [15, 13], [15, 17], [8, 17], [8, 22.3]] },
  { name: 'Rừng Trúc', tint: 0xecfff2, path: [[1, -0.4], [1, 18], [4, 18], [4, 1], [7, 1], [7, 18], [10, 18], [10, 1], [13, 1], [13, 19], [8, 19], [8, 22.3]] },
  { name: 'Thung Lũng Sương', tint: 0xf0f6ff, path: [[8, -0.4], [8, 2], [2, 2], [2, 8], [14, 8], [14, 14], [2, 14], [2, 17], [8, 17], [8, 22.3]] },
  { name: 'Đầm Lầy', tint: 0xe2f6ea, path: [[14, -0.4], [14, 2], [10, 2], [10, 6], [5, 6], [5, 10], [1, 10], [1, 14], [5, 14], [5, 18], [8, 18], [8, 22.3]] },
  { name: 'Núi Đá', tint: 0xf4f0ea, path: [[1, -0.4], [1, 2], [13, 2], [13, 6], [4, 6], [4, 10], [13, 10], [13, 12], [1, 12], [1, 16], [8, 16], [8, 22.3]] },
  { name: 'Tuyết Sơn', tint: 0xf2f8ff, path: [[8, -0.4], [8, 1], [14, 1], [14, 9], [10, 9], [10, 5], [4, 5], [4, 13], [14, 13], [14, 17], [8, 17], [8, 22.3]] },
  { name: 'Hỏa Diệm Sơn', tint: 0xffe8dc, path: [[2, -0.4], [2, 9], [14, 9], [14, 17], [8, 17], [8, 22.3]] },
  { name: 'Ma Giới', tint: 0xeee4ff, path: [[14, -0.4], [14, 5], [2, 5], [2, 13], [10, 13], [10, 17], [8, 17], [8, 22.3]] },
  { name: 'Cổng Quỷ', tint: 0xffe0e0, path: [[5, -0.4], [5, 10], [11, 10], [11, 17], [8, 17], [8, 22.3]] },
];

// Hero slots: 4 gaps between the lanes, 4 slots in each (numbered 1-16 for "nâng N").
export const SLOT_ROWS = [3, 7, 11, 15];
export const SLOT_COLS = [3, 6, 9, 12];

// Rows (in the map) where viewer soldiers stand, next to the lanes.
export const SOLDIER_ROWS = [2, 4, 6, 8, 10, 12, 14, 16, 19];

// ---------------------------------------------------------------- ranks
export const RANKS = [
  { name: 'Lính', xp: 0, mult: 1.0 },
  { name: 'Đội Trưởng', xp: 100, mult: 1.12 },
  { name: 'Hiệu Úy', xp: 400, mult: 1.25 },
  { name: 'Tướng Quân', xp: 1200, mult: 1.37 },
  { name: 'Đại Tướng', xp: 3000, mult: 1.5 },
];
export const rankOf = xp => {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = i;
  return r; // 0..4
};

export const XP = {
  presence: 1,      // every 10s while active
  chat: 3,
  shoot: 2,
  kill: 4,
  bossLastHit: 100,
  giftPerDiamond: 5,
  puzzle: 30,
  puzzleLate: 8,
  revive: 10,
  follow: 20,
  share: 15,
  like: 1,
  treasure: 40,
};
export const RECRUIT_SECONDS = 180;   // "Tân binh" buff length
export const RECRUIT_XP_MULT = 3;
export const RECRUIT_DMG_MULT = 2;

// ---------------------------------------------------------------- heroes (towers)
// dmg per hit, rate = attacks per second, range in px
export const HEROES = {
  cungthu: { name: 'Cung Thủ', dmg: 14, rate: 1.6, range: 270, kind: 'arrow' },
  nothu: { name: 'Nỏ Thủ', dmg: 30, rate: 0.8, range: 340, kind: 'bolt' },
  hoasu: { name: 'Hỏa Sư', dmg: 18, rate: 0.8, range: 250, kind: 'fire', splash: 95 },
  bangnu: { name: 'Băng Nữ', dmg: 9, rate: 1.0, range: 250, kind: 'ice', splash: 70, slow: 0.45 },
  loisu: { name: 'Lôi Sư', dmg: 17, rate: 0.9, range: 290, kind: 'chain', chains: 3 },
  vosu: { name: 'Võ Sư', dmg: 22, rate: 1.2, range: 150, kind: 'spin' },
  luongy: { name: 'Lương Y', dmg: 6, rate: 1.0, range: 230, kind: 'heal', aura: 210 },
  phaothu: { name: 'Pháo Thủ', dmg: 55, rate: 0.4, range: 330, kind: 'cannon', splash: 115 },
};
export const HERO_LEVEL_BONUS = 0.25;   // +25% damage per in-round level
export const MAX_HERO_LEVEL = 5;
export const MAX_HEROES_PER_VIEWER = 2;

// Gift value (total diamonds = coin value x count) -> what it does. First match from the top wins.
export const GIFT_TIERS = [
  { min: 1000, action: 'dragon', label: 'Rồng Vàng' },
  { min: 300, action: 'turtle', label: 'Rùa Vàng hộ thành' },
  { min: 100, action: 'giong', label: 'Thánh Gióng' },
  { min: 20, action: 'hero', heroes: ['loisu', 'luongy', 'phaothu'] },
  { min: 5, action: 'hero', heroes: ['hoasu', 'bangnu', 'vosu'] },
  { min: 1, action: 'hero', heroes: ['cungthu', 'nothu'] },
];

// ---------------------------------------------------------------- enemies (fantasy demon army)
// speed in px/s (x ENEMY_SPEED in game.js). fly: not blocked by melee soldiers. fallback: sprite used until the art exists.
export const ENEMIES = {
  imp: { sprite: 'enemy_imp', name: 'Quỷ Lính', hp: 40, speed: 92, dmg: 3, scale: 2 },
  wolf: { sprite: 'enemy_wolf', name: 'Sói Quỷ', hp: 30, speed: 165, dmg: 2, scale: 2 },
  bat: { sprite: 'enemy_bat', name: 'Dơi Quỷ', hp: 28, speed: 135, dmg: 2, scale: 2, fly: true },
  shield: { sprite: 'enemy_shield', name: 'Quỷ Khiên', hp: 110, speed: 70, dmg: 5, scale: 2, armor: 0.35 },
  golem: { sprite: 'enemy_golem', name: 'Thạch Quỷ', hp: 220, speed: 56, dmg: 8, scale: 2 },
  imp_ice: { sprite: 'enemy_imp_ice', name: 'Quỷ Băng', hp: 70, speed: 100, dmg: 3, scale: 2 },
  imp_poison: { sprite: 'enemy_imp_poison', name: 'Quỷ Độc', hp: 60, speed: 120, dmg: 3, scale: 2 },
  wolf_shadow: { sprite: 'enemy_wolf_shadow', name: 'Sói Bóng', hp: 55, speed: 185, dmg: 3, scale: 2 },
  bat_fire: { sprite: 'enemy_bat_fire', name: 'Dơi Lửa', hp: 45, speed: 150, dmg: 3, scale: 2, fly: true },
  shield_red: { sprite: 'enemy_shield_red', name: 'Quỷ Khiên Đỏ', hp: 170, speed: 74, dmg: 6, scale: 2, armor: 0.45 },
  golem_moss: { sprite: 'enemy_golem_moss', name: 'Thạch Quỷ Rêu', hp: 320, speed: 58, dmg: 10, scale: 2 },
  fox: { sprite: 'enemy_fox', fallback: 'enemy_wolf', name: 'Hồ Ly Con', hp: 35, speed: 210, dmg: 2, scale: 2 },
  wisp: { sprite: 'enemy_wisp', fallback: 'enemy_bat_fire', name: 'Ma Trơi', hp: 40, speed: 140, dmg: 3, scale: 2, fly: true },
  wisp_blue: { sprite: 'enemy_wisp_blue', fallback: 'enemy_bat', name: 'Ma Trơi Lam', hp: 75, speed: 150, dmg: 4, scale: 2, fly: true },
  snake: { sprite: 'enemy_snake', fallback: 'enemy_fox', name: 'Rắn Độc', hp: 50, speed: 190, dmg: 3, scale: 2, onHit: 'poison' },
  snake_red: { sprite: 'enemy_snake_red', fallback: 'enemy_fox', name: 'Rắn Lửa', hp: 90, speed: 200, dmg: 4, scale: 2, onHit: 'poison' },
  spider: { sprite: 'enemy_spider', fallback: 'enemy_wolf_shadow', name: 'Nhện Tinh', hp: 120, speed: 110, dmg: 4, scale: 2, onHit: 'web' },
  spider_venom: { sprite: 'enemy_spider_venom', fallback: 'enemy_wolf_shadow', name: 'Nhện Độc', hp: 180, speed: 115, dmg: 5, scale: 2, onHit: 'web' },
  toad: { sprite: 'enemy_toad', fallback: 'enemy_golem_moss', name: 'Cóc Tinh', hp: 380, speed: 64, dmg: 9, scale: 2, armor: 0.15 },
  toad_gold: { sprite: 'enemy_toad_gold', fallback: 'enemy_golem', name: 'Cóc Vàng', hp: 520, speed: 66, dmg: 10, scale: 2, armor: 0.2 },
  ape: { sprite: 'enemy_ape', fallback: 'enemy_golem', name: 'Khỉ Quỷ', hp: 520, speed: 70, dmg: 13, scale: 2, onHit: 'launch' },
  ape_white: { sprite: 'enemy_ape_white', fallback: 'enemy_golem', name: 'Bạch Hầu Quỷ', hp: 700, speed: 74, dmg: 15, scale: 2, onHit: 'launch' },
  // event enemy: a treasure chest on legs - kill it before it escapes
  chestrun: { sprite: 'chest', name: 'Rương Báu', hp: 400, speed: 150, dmg: 0, scale: 3, treasure: true },
  // event enemy: "Voi Quỷ" charge
  charger: { sprite: 'enemy_golem_moss', name: 'Voi Quỷ', hp: 900, speed: 120, dmg: 15, scale: 3, tramples: true },
};
// Bosses come in this order, one every BOSS_EVERY waves. Every `every` seconds the boss uses its skill.
// Ngư Tinh, Hồ Tinh and Mộc Tinh are the three demons Lạc Long Quân defeated; Chằn Tinh and Đại Bàng are from the
// Thạch Sanh tale. Every boss has 3 phases: at 60% HP it rages (faster, skills more often, minions), at 25% it goes
// all-out (even faster, a skill every few seconds, elite guards).
export const BOSSES = [
  { sprite: 'boss_general', name: 'Tướng Quỷ', hp: 1400, speed: 42, dmg: 30, scale: 3, every: 7,
    skill: { id: 'warcry', name: 'Chiến Hống', desc: 'quái tăng tốc, đánh ngã chiến sĩ' } },
  { sprite: 'boss_ngutinh', fallback: 'boss_serpent', name: 'Ngư Tinh', hp: 1900, speed: 46, dmg: 32, scale: 3, every: 8,
    skill: { id: 'tide', name: 'Hải Khiếu', desc: 'sóng biển cuốn lùi chiến sĩ' } },
  { sprite: 'boss_serpent', name: 'Xà Tinh', hp: 2100, speed: 48, dmg: 32, scale: 3, every: 7,
    skill: { id: 'poison', name: 'Độc Vụ', desc: 'mây độc rút máu chiến sĩ' } },
  { sprite: 'boss_chantinh', fallback: 'boss_general', name: 'Chằn Tinh', hp: 2200, speed: 40, dmg: 36, scale: 3, every: 7,
    skill: { id: 'quake', name: 'Chấn Địa', desc: 'dậm đất choáng chiến sĩ' } },
  { sprite: 'boss_hotinh', fallback: 'boss_general', name: 'Hồ Tinh', hp: 2300, speed: 52, dmg: 34, scale: 3, every: 7,
    skill: { id: 'charm', name: 'Mị Hồ Thuật', desc: 'mê hoặc chiến sĩ, gọi hồ ly con' } },
  { sprite: 'boss_daibang', fallback: 'boss_hotinh', name: 'Đại Bàng Tinh', hp: 2500, speed: 60, dmg: 34, scale: 3, every: 7, fly: true,
    skill: { id: 'swoop', name: 'Cuồng Phong Trảo', desc: 'quắp chiến sĩ ném về cổng' } },
  { sprite: 'boss_moctinh', fallback: 'boss_general_dark', name: 'Mộc Tinh', hp: 2800, speed: 38, dmg: 38, scale: 3, every: 8,
    skill: { id: 'roots', name: 'Thiên Căn Trói', desc: 'rễ cây trói chân, tự hồi máu' } },
  { sprite: 'boss_thuongluong', fallback: 'boss_serpent', name: 'Thuồng Luồng', hp: 2900, speed: 50, dmg: 38, scale: 3, every: 7,
    skill: { id: 'flood', name: 'Hồng Thủy', desc: 'nước lũ cuốn chiến sĩ, gọi rắn' } },
  { sprite: 'boss_general_dark', name: 'Hắc Tướng Quỷ', hp: 3000, speed: 44, dmg: 40, scale: 3, every: 6,
    skill: { id: 'darkbolt', name: 'Hắc Lôi', desc: 'sét đen đánh trọng thương chiến sĩ' } },
];
// which enemy types appear from which wave
export const ENEMY_UNLOCKS = [
  [1, 'imp'], [2, 'wolf'], [3, 'bat'], [4, 'shield'], [6, 'golem'], [7, 'fox'],
  [5, 'wisp'], [8, 'imp_ice'], [9, 'wolf_shadow'], [10, 'snake'], [11, 'bat_fire'], [12, 'imp_poison'], [13, 'spider'],
  [14, 'shield_red'], [15, 'toad'], [16, 'golem_moss'], [18, 'ape'], [20, 'wisp_blue'], [22, 'snake_red'], [24, 'spider_venom'],
  [26, 'toad_gold'], [28, 'ape_white'],
];

// "Diễn biến": each wave from wave 3 may get a twist, announced with the wave banner.
export const WAVE_TWISTS = [
  { id: 'swift', name: 'ĐỢT TỐC BIẾN', desc: 'quái nhanh gấp rưỡi', weight: 3 },
  { id: 'armored', name: 'ĐỢT GIÁP TRỤ', desc: 'toàn quái khiên giáp dày', weight: 2 },
  { id: 'swarm', name: 'BẦY ĐÀN', desc: 'gấp đôi số quái, máu yếu', weight: 3 },
  { id: 'flyers', name: 'TRỜI ĐEN KỊT', desc: 'quái bay tràn ngập', weight: 2 },
  { id: 'elite', name: 'TINH ANH XUẤT TRẬN', desc: 'quái tinh anh máu dày, rơi vàng', weight: 3 },
  { id: 'horde', name: 'ĐẠI QUÂN', desc: 'quân địch đông gấp rưỡi', weight: 2 },
  { id: 'captain', name: 'ĐẦU LĨNH', desc: 'một đầu lĩnh dẫn quân', weight: 2 },
];
export const TWIST_CHANCE = 0.55;
export const BOSS_EVERY = 5;

// ---------------------------------------------------------------- soldier classes (viewers)
// Viewers type the class word to pick it. hp per life, dmg per hit, rate = hits/s, reach = melee reach along the
// path or ranged range (px), block = enemies one soldier can hold, speed = march speed px/s.
export const CLASSES = {
  kiem: { name: 'Kiếm Sĩ', words: ['kiem', 'kiem si', 'sword'], hp: 200, dmg: 8, rate: 1.2, reach: 40, block: 2, speed: 78, melee: true },
  thuong: { name: 'Thương Binh', words: ['thuong', 'thuong binh', 'giao', 'spear'], hp: 170, dmg: 12, rate: 0.8, reach: 58, block: 1, speed: 82, melee: true },
  cung: { name: 'Cung Binh', words: ['cung', 'cung binh', 'bow'], hp: 130, dmg: 8, rate: 1.0, reach: 240, block: 0, speed: 72 },
  khien: { name: 'Khiên Vệ', words: ['khien', 'khien ve', 'shield', 'tank'], hp: 380, dmg: 5, rate: 0.9, reach: 36, block: 4, speed: 60, melee: true },
  phap: { name: 'Pháp Sư', words: ['phep', 'phap', 'phap su', 'mage'], hp: 120, dmg: 11, rate: 0.65, reach: 210, splash: 60, block: 0, speed: 66 },
  y: { name: 'Y Sư', words: ['y', 'y su', 'chua', 'heal', 'healer'], hp: 140, dmg: 3, rate: 1.0, reach: 180, heal: 16, block: 0, speed: 66 },
  song: { name: 'Song Đao', words: ['song', 'song dao', 'dao', 'dual'], hp: 150, dmg: 6, rate: 1.9, reach: 40, block: 1, speed: 88, melee: true },
  vo: { name: 'Võ Tăng', words: ['vo', 'vo tang', 'tang', 'monk'], hp: 240, dmg: 7, rate: 0.9, reach: 52, block: 3, speed: 70, melee: true, cleave: 2 },
  thich: { name: 'Thích Khách', words: ['thich', 'thich khach', 'sat thu', 'assassin'], hp: 110, dmg: 13, rate: 0.85, reach: 38, block: 0, speed: 96, melee: true, crit: 0.35 },
};
// Class ultimates: fired by the guard of a viewer who sends a gift, with a cut-in pop-up. Bigger gifts = stronger:
// power = 1 + 0.9·log10(xu) (1 xu ×1, 20 xu ×2.2, 100 xu ×2.8, 1000 xu ×3.7). 20+ xu = "II", 100+ xu = "Tuyệt Kỹ".
export const ULTS = {
  kiem: { name: 'Kiếm Phong Bạo', radius: 110, mult: 14 },
  thuong: { name: 'Thương Long Đột', dash: 220, mult: 18 },
  cung: { name: 'Vạn Tiễn Xuyên Vân', radius: 150, mult: 12 },
  khien: { name: 'Thiết Bích Trấn Thủ', radius: 130, stun: 3, mult: 6 },
  phap: { name: 'Lôi Hỏa Thiên Giáng', radius: 130, mult: 20 },
  y: { name: 'Hồi Xuân Diệu Thủ', radius: 260, healPct: 1 },
  song: { name: 'Song Long Loạn Vũ', radius: 140, mult: 16 },
  vo: { name: 'Kim Cang Phục Ma', radius: 160, stun: 2.5, mult: 12 },
  thich: { name: 'Ảnh Sát Vô Hình', targets: 7, mult: 22 },
};
export const ultPower = xu => 1 + 0.9 * Math.log10(Math.max(1, xu));
// Gift ultimates must turn a fight around: every hit does mult × the guard's normal damage plus a share of the target's
// max HP (mobPct × hit weight × gift power), so normal monsters in the area melt. Against a boss each hit takes
// bossPct × weight of its max HP, up to bossCap(power) per ultimate in total (1 xu ≈ 14%, 20 xu ≈ 30%, 100 xu ≈ 39%).
export const ULT_DMG = { mult: 4, mobPct: 0.6, bossPct: 0.12, bossCap: p => Math.min(0.55, 0.14 * p) };
// Hero stamina skills: damage × mult, and each skill also takes bossPct of every boss's max HP in its range.
export const HERO_SKILL = { mult: 3, bossPct: 0.03 };
export const ultTier = xu => (xu >= 100 ? ' · Tuyệt Kỹ' : xu >= 20 ? ' II' : '');

// Guards are fragile: an enemy hit takes 1/hits of a guard's max HP, so 2 hits from a normal monster kill and 1 hit
// from a heavy one (dmg >= heavyDmg) does. Khiên Vệ takes one extra hit. Bosses (and Voi Quỷ, sometimes Khỉ Quỷ)
// kick guards off the screen. regen > 0 would heal guards out of combat (off by default).
// hitMult / hitPerWave still scale boss-skill damage.
export const GUARD = { hits: 2, heavyHits: 1, heavyDmg: 8, khienExtraHits: 1, hitMult: 1.6, hitPerWave: 0.045, regenDelay: 3, regen: 0 };
// Where guards stand. Positions are fractions of the path measured from the monsters' rift (0) to the gate (1).
// Each guard gets a post: melee spread over [front, front + meleeBand], ranged further back, healers behind them.
// They walk to their post and hold it, may chase a monster up to `chase` px forward, then walk back.
// Nobody goes closer to the rift than `noGo`, and new monsters can't be hurt for `spawnShieldMs`, so monsters always
// get to walk into the field instead of dying in the doorway. Lower `front` = guards meet monsters earlier.
export const ARMY = { front: 0.36, meleeBand: 0.30, rangedFrom: 0.12, rangedBand: 0.30, healFrom: 0.2, healBand: 0.3, chase: 160, noGo: 0.28, spawnShieldMs: 1500 };
export const CLASS_MIX = { kiem: 20, thuong: 11, cung: 16, khien: 8, phap: 12, y: 9, song: 9, vo: 8, thich: 7 }; // default pick keeps the army balanced
export const SOLDIER_LEVELS = 10;             // in-session levels from damage dealt
export const LEVEL_DMG = 0.12;                // +12% damage per level
export const LEVEL_HP = 0.10;                 // +10% hp per level
export const levelNeed = l => Math.round(60 * Math.pow(l, 1.55)); // damage to go from level l to l+1
// Stamina belongs to the heroes on the slots only. They fill it by attacking (HERO_ULTS.perHit); the owner's
// likes top it up. Full = the hero's ultimate with a cut-in pop-up.
export const STAMINA = { max: 100, perLikeEvent: 4 };

// Hero (gift tower) ultimates, cast when their stamina fills. perHit = stamina per attack.
export const HERO_ULTS = {
  cungthu: { name: 'Tiễn Vũ Phong Thần', perHit: 8 },
  nothu: { name: 'Nỏ Thần Liên Châu', perHit: 12 },
  hoasu: { name: 'Hỏa Long Phần Thiên', perHit: 12 },
  bangnu: { name: 'Băng Phong Vạn Lý', perHit: 10 },
  loisu: { name: 'Thiên Lôi Giáng Thế', perHit: 10 },
  vosu: { name: 'Long Quyền Phá Thạch', perHit: 8 },
  luongy: { name: 'Thần Y Diệu Thủ', perHit: 9 },
  phaothu: { name: 'Pháo Đài Oanh Tạc', perHit: 18 },
};
export const CITADEL_MAX_HP = 100;

// ---------------------------------------------------------------- crowd / likes / combos
export const NO_THAN_BASE = 150;       // likes needed for the magic crossbow
export const NO_THAN_PER_VIEWER = 5;   // was 2: with 150 viewers the volley fired every ~15 s and cleared every wave at the rift
export const COMBO_WINDOW = 10;        // seconds
export const COMBO_STEPS = [{ n: 120, mult: 5 }, { n: 60, mult: 3 }, { n: 25, mult: 2 }];
export const UPGRADE_PER_CMD = 0.1;    // "nâng N" progress
export const UPGRADE_PER_LIKE = 0.002; // per like, to every hero, ÷ max(1, guards/20): big crowds' likes maxed every hero in ~1 min

// ---------------------------------------------------------------- chat bubbles
export const BUBBLES = { max: 8, maxQueue: 20, maxAgeMs: 5000, chatMs: 2600, giftMs: 4200, maxChars: 40 };

// Replaced with *** before anything is shown on stream. Add more as needed.
export const BAD_WORDS = [
  'đm', 'dm', 'dmm', 'đmm', 'đcm', 'dcm', 'vcl', 'vkl', 'vl', 'clm', 'cl', 'cc', 'đéo', 'đếch', 'địt', 'dit', 'lồn', 'cặc',
  'buồi', 'đĩ', 'fuck', 'shit', 'bitch', 'ngu', 'óc chó', 'oc cho', 'chó má', 'súc vật',
];

// ---------------------------------------------------------------- events & puzzles
export const EVENT_EVERY = [32, 46];   // seconds between random events
export const EVENTS = ['rain', 'charge', 'treasure', 'meteor', 'tornado', 'festival', 'fog', 'ambush', 'chestrun', 'quake'];
export const PUZZLE_EVERY = [60, 85];
export const PUZZLE_SECONDS = 20;
export const WORDS = [
  ['THÀNH', 'Bức tường bảo vệ'], ['CỔ LOA', 'Tên thành cổ'], ['NỎ THẦN', 'Vũ khí thần'], ['GIÓNG', 'Cậu bé cưỡi ngựa sắt'],
  ['BÁNH CHƯNG', 'Món ăn ngày Tết'], ['RÙA VÀNG', 'Thần giúp vua'], ['LÚA', 'Cây cho hạt gạo'], ['TRE', 'Cây làng quê'],
  ['ĐÈN LỒNG', 'Sáng đêm Trung Thu'], ['TRỐNG ĐỒNG', 'Nhạc cụ cổ'], ['ÁO DÀI', 'Trang phục truyền thống'], ['PHỞ', 'Món nước nổi tiếng'],
  ['SEN', 'Hoa trong đầm'], ['NÓN LÁ', 'Đội đầu che nắng'], ['CHÙA', 'Nơi thờ Phật'], ['SÔNG', 'Dòng nước lớn'],
  ['TRÂU', 'Bạn của nhà nông'], ['MÙA XUÂN', 'Mùa đầu năm'], ['LÌ XÌ', 'Phong bao ngày Tết'], ['CƠM', 'Bữa ăn hằng ngày'],
  ['NGỰA SẮT', 'Thánh Gióng cưỡi'], ['CUNG TÊN', 'Vũ khí bắn xa'], ['HOA MAI', 'Hoa Tết miền Nam'], ['HOA ĐÀO', 'Hoa Tết miền Bắc'],
  ['BÁNH MÌ', 'Món ăn đường phố'], ['CÀ PHÊ', 'Đồ uống buổi sáng'], ['MẶT TRĂNG', 'Sáng đêm rằm'], ['RỒNG', 'Linh vật bay'],
];
export const SKILLS = [
  { id: 'arrows', name: 'Mưa Tên' },
  { id: 'thunder', name: 'Sấm Sét' },
  { id: 'freeze', name: 'Đóng Băng' },
  { id: 'heal', name: 'Hồi Thành' },
  { id: 'crossbow', name: 'Nỏ Thần' },
  { id: 'meteor', name: 'Mưa Thiên Thạch' },
  { id: 'rage', name: 'Khí Thế Ngút Trời' },
  { id: 'revive', name: 'Hồi Sinh Toàn Quân' },
];

export const TICKER = [
  'Gõ "vào" để nhập ngũ  ·  Thả tim = Nỏ Thần  ·  Quà = Tuyệt kỹ',
  'Gõ "cứu" để hồi sinh đồng đội  ·  "tôi" để xem cấp',
  'Gõ "nâng 3" để nâng cấp anh hùng ở ô số 3',
  'Follow nhận Cung Thủ miễn phí  ·  Share để sửa thành',
  'Giải đố đầu tiên = tung chiêu hỗ trợ cả làng!',
];
