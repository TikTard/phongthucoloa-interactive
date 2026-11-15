# Giữ Thành Cổ Loa — TikTok LIVE tower defense

Pixel-art tower defense where TikTok LIVE viewers are the army. Comments, likes, gifts, follows and shares all do something on screen.

## Run it

```bash
npm install
npm start
```

- **Game:** http://localhost:3000/. Add it in TikTok LIVE Studio or OBS as a **Browser Source, 1080 × 1920**.
- **Admin:** http://localhost:3000/admin (the old `/panel.html` redirects here). Live dashboard, TikTok connection, hotkeys, audio, viewer simulation, player list with kick/ban, session summary with JSON/CSV export, and "clear session" for a new stream.
  - **Live bar:** a sticky bar on every tab shows the map, wave, citadel, guards, boss, twist and event. It has the buttons used most on stream: Tạm dừng, Wave tiếp, Gọi boss, Nỏ Thần, Giờ Vàng. Shortcuts: **Shift+P / W / B / N / G** (Shift so a stray key does nothing). Number keys 1–6 switch tabs.
  - **Alerts:** a red banner (with a copy-link button) appears when the game page isn't open, and a gold one when TikTok isn't connected.
  - **Điều khiển tab:** split into cards: Kết nối TikTok, Âm thanh, Nhịp trận, Bản đồ (the current map is highlighted), Gọi boss, Diễn biến, Câu đố, Sự kiện and Thử tuyệt kỹ. The **Tìm lệnh…** box filters every button, and accents are optional ("mua", "man 7", "boss").

Before going live, test with the **"Bot tự chơi"** checkbox on the admin page (Giả lập tab), which needs no TikTok connection.

## What viewers do

| Viewer action | In game |
|---|---|
| Any comment / `vào` | Joins as a soldier with their name; marches out with the army at the next wave |
| `vào cung`, `vào khiên`… | Joins and picks the class in one message |
| `kiếm` `thương` `cung` `khiên` `phép` `y` `song` `võ` `thích` | Picks a class (see below) |
| `tôi` | Bubble with your class, level, rank, kills and HP (or what knocked you out) |
| `bắn` | Power shot (4s cooldown); also +15 stamina for your heroes |
| `cứu` | Brings a fallen soldier back right away |
| `nâng 3` | Upgrades the hero in slot 3 |
| Likes | Charge the **Nỏ Thần** (magic crossbow) volley and your heroes' stamina |
| Any gift | Your guard fires its class **ultimate**: a 3-second cinematic with zoom, spotlight and your name in a cut-in. Bigger gifts are stronger (20 xu "II", 100 xu "Tuyệt Kỹ") |
| Follow | Free Cung Thủ + revives |
| Share | Repairs the citadel |
| Puzzle answer | The first correct answer casts a skill (Mưa Tên, Sấm Sét, Đóng Băng, Hồi Thành, Nỏ Thần) |

Each viewer can own up to 2 heroes. Extra gifts upgrade them. A hero's look and power follow the owner's **rank** (Lính → Đội Trưởng → Hiệu Úy → Tướng Quân → Đại Tướng), and rank comes from XP that is saved in `data/players.json`.

## The army

At every wave start, every soldier, including those who fell last wave, marches out of the citadel gate and up the path against the enemy flow. Melee soldiers stop and hold enemies, ranged ones keep their distance, and healers follow behind. **Guards are fragile on purpose:** 2 hits from a normal monster kill one, 1 hit from a heavy one (golems, apes, toads, captains), and Khiên Vệ takes one extra hit. A guard who dies lies down and comes back at the next wave, or sooner with `cứu`, a follow or a gift. Flying enemies and bosses can't be held.

**Infirmary ("nằm dưỡng thương"):** a guard who dies is carried back into the citadel, with a white cross floating over it, and lies in a bed below the wall signs with a bandage icon. A guard kicked off the screen lands straight in a bed. At the next wave, or when revived, they get up and march out of the gate again.

**Siege catapults:** two catapults stand on the wall top and hurl fire pots at monsters, but only at those that have made it **past the halfway point of the path**, the half closest to the citadel. They reload slowly (8–11 s) and land up to ±130 px off target. Each hit blasts a 120 px area for solid damage, and monsters killed by a blast are flung spinning off the screen. Bosses take only 30% of the damage. The numbers are in `SIEGE` at the top of `public/js/siege.js`; `from: 0.5` is the halfway line.

**Demon catapults:** the enemy has two catapults too, tinted purple, at the top of the field. From wave 3 they lob purple fire pots, but only at guards that have pushed into **the rift's half of the path**. If nobody is there, they hold fire. Every guard caught in the 95 px blast is kicked off the screen to the infirmary. They reload slowly (11–15 s) and miss often (up to ±150 px). The numbers are in `ENEMY_SIEGE` in `public/js/siege.js`; `until: 0.5` is the halfway line.

**Telling the sides apart:** every guard in the field has a **blue** ring at its feet and a blue HP bar. Every monster has a **red** ring and a red HP bar.

**Bosses kick guards off the screen:** guards a boss walks into get launched spinning (about 3 a second, so a boss no longer wipes a whole column at once) in a high arc off the side of the screen, with a comic POW, a slide-whistle and a shout ("VÈO!", "Á Á Á!", "ỐI GIỜI ƠI!"…). Voi Quỷ does it too, and Khỉ Quỷ sometimes does. Launched guards come back at the next wave.

| Class | Word | HP | Role |
|---|---|---|---|
| Kiếm Sĩ | `kiếm` | 200 | Melee, holds 2 enemies |
| Thương Binh | `thương` | 170 | Long reach, hard hits, holds 1 |
| Cung Binh | `cung` | 130 | Ranged |
| Khiên Vệ | `khiên` | 380 | Tank, holds 4, takes 20% less damage |
| Pháp Sư | `phép` | 120 | Ranged, splash damage |
| Y Sư | `y` | 140 | Heals hurt guards nearby |
| Song Đao | `song` | 150 | Very fast twin-blade hits, holds 1 |
| Võ Tăng | `võ` | 240 | Staff sweeps hit 2 enemies, holds 3 |
| Thích Khách | `thích` | 110 | Fast assassin, 35% critical hits (x2.5), doesn't hold |

- **Default class:** new soldiers get a class that keeps the army balanced. Viewers can switch class at any time.
- **Levels 1–10:** levels come from damage dealt in the session, giving +12% damage and +10% HP per level.
- **Rank:** rank still comes from saved XP and adds a power multiplier and a better-looking outfit (3 tiers).
- **Toughness:** hits-to-kill (`hits`, `heavyHits`, `khienExtraHits`) and out-of-combat healing (`regen`, off by default) are in `GUARD` in `config.js`.

### Gift ultimates (every class)

Any gift makes the gifter's guard fire its class **ultimate** with a full **cut-in pop-up** showing the skill name, the viewer's name and the gift value. Bigger gifts hit harder: 1 xu ×1, 20 xu ×2.2 ("II"), 100 xu ×2.8 ("Tuyệt Kỹ", double-size effects), 1000 xu ×3.7.
- **When enemies are near,** the ultimate fires at once.
- **Otherwise,** the guard holds it (gold ring at its feet) until it's on the field with something to hit.
- **Fallen guards:** a gift brings the guard back at the gate.

Gifts no longer summon heroes or Thánh Gióng / Rùa Vàng / Rồng Vàng; heroes on the slots now come from follows. Boss skills don't use the cut-in; the skill name floats over the boss and a line goes to the feed. Only gift ultimates use the zoom, spotlight and cut-in.

Each ultimate is a **6–7 second cinematic**:
- **Focus (first 1.2 s):** the camera zooms onto the guard, a spotlight dims the field and time slows. The guard charges up (spiralling energy, ground cracks, crackling arcs, a light beam) while the cut-in slams in.
- **Combo:** the camera snaps back with a flash and shockwave, then 5–6 class beats. The camera punches in on big hits and the action freezes for an instant on each one. Examples:
  - **Kiếm Sĩ:** dash cut, two whirlwinds, a blade-star ring, a leaping slam, a rain of 30 swords.
  - **Thích Khách:** two rounds of blink-stabs that mark their targets.
- **Finale (~5.6 s):** one huge blow with a white flash and a long hit-stop, then **TỔNG SÁT THƯƠNG** (total damage) pops up over the guard.

Ultimates play one at a time, and gifts that arrive meanwhile wait their turn.

**Testing:** the admin page's Điều khiển tab has a **Thử tuyệt kỹ** card. Pick a gift size and a class; a test guard of that class marches out with some practice enemies and fires the ultimate straight away.

| Class | Ultimate |
|---|---|
| Kiếm Sĩ | Kiếm Phong Bạo: spinning blade storm around the guard |
| Thương Binh | Thương Long Đột: dash through a line of enemies |
| Cung Binh | Vạn Tiễn Xuyên Vân: arrow rain on an area |
| Khiên Vệ | Thiết Bích Trấn Thủ: stuns nearby enemies, shields nearby guards |
| Pháp Sư | Lôi Hỏa Thiên Giáng: lightning on the thickest pack |
| Y Sư | Hồi Xuân Diệu Thủ: full heal around the guard, cleanses, brings back 2–8 fallen guards |
| Song Đao | Song Long Loạn Vũ: a 12-cut blade frenzy, then a giant X slash |
| Võ Tăng | Kim Cang Phục Ma: three golden palm blasts, then a divine pillar that stuns everything around |
| Thích Khách | Ảnh Sát Vô Hình: vanishes, blinks onto 7 enemies with critical stabs, reappears in a void burst |

Numbers are in `ULTS` in `config.js`.

### Hero stamina skills

Only the heroes standing on the numbered slots (from gifts or follows) have stamina. Guards don't.
- **The bar:** the gold bar under a hero's nameplate fills as the hero attacks. The owner's likes (+4) and `bắn` (+15) top it up.
- **Skill:** when the bar is full, the hero uses its skill: effects only, no pop-up. Pop-ups are kept for gift ultimates and bosses.

| Hero | Skill |
|---|---|
| Cung Thủ | Tiễn Vũ Phong Thần: arrows at 8 enemies |
| Nỏ Thủ | Nỏ Thần Liên Châu: 4 heavy bolts |
| Hỏa Sư | Hỏa Long Phần Thiên: big fire blast |
| Băng Nữ | Băng Phong Vạn Lý: freezes everything in range |
| Lôi Sư | Thiên Lôi Giáng Thế: lightning on 4 enemies |
| Võ Sư | Long Quyền Phá Thạch: ground slam, stuns |
| Lương Y | Thần Y Diệu Thủ: repairs the citadel, heals guards |
| Pháo Thủ | Pháo Đài Oanh Tạc: 5 cannon blasts |

### Bosses (one every 5 waves, in this order)

| Boss | Skill |
|---|---|
| Tướng Quỷ | Chiến Hống: every enemy speeds up, front soldiers struck |
| Ngư Tinh | Hải Khiếu: a wave pushes soldiers back down the path |
| Xà Tinh | Độc Vụ: poison cloud drains soldiers |
| Hồ Tinh | Mị Hồ Thuật: charms soldiers and summons fox minions |
| Chằn Tinh | Chấn Địa: a ground stomp stuns and hurts soldiers around it |
| Đại Bàng Tinh | Cuồng Phong Trảo: snatches front soldiers and throws them back to the gate |
| Mộc Tinh | Thiên Căn Trói: roots soldiers in place and heals itself |
| Thuồng Luồng | Hồng Thủy: a flood pushes soldiers back, snakes pour out |
| Hắc Tướng Quỷ | Hắc Lôi: black lightning badly wounds several soldiers |

**Boss phases:**
- **At 60% HP** every boss rages ("NỔI GIẬN"): it gets faster, uses its skill more often and calls 6 minions.
- **At 25% HP** it goes all-out ("LIỀU MẠNG"): faster again, a skill every few seconds, and elite minions.

Each phase shows a red banner.

Ngư Tinh, Hồ Tinh and Mộc Tinh are the three demons Lạc Long Quân defeated in the legend. Chằn Tinh and Đại Bàng Tinh are from the Thạch Sanh tale. Bosses also trample soldiers they walk over. Every enemy type is faster than before; per-type speeds are in `config.js`.

### Where guards stand (tuning)

Guards don't all march to the top. Each one gets a **post** along the path:
- **Melee:** spread across the front line.
- **Ranged:** a bit further back.
- **Healers:** behind the ranged.

A guard walks to its post and holds it. It can chase a monster up to 160 px forward, then walks back. Nobody goes closer than 28% of the path to the monsters' rift, and new monsters can't be hurt for their first 1.5 s, so monsters always walk into the field instead of dying in the doorway.

The knobs are in `ARMY` in `public/js/config.js`. Positions are fractions of the path from the rift (0) to the gate (1).
- **Guards killing monsters too early:** raise `front` and `noGo` so the line sits closer to the gate, or lengthen `spawnShieldMs`.
- **Guards look too spread out:** shrink `meleeBand` and `rangedBand`.
- **Monsters reach the citadel too easily:** lower `front`, or raise `chase` so guards lunge further.
- **Guards too strong or too weak overall:** `hits` and `heavyHits` in `GUARD` set how many hits kill a guard. Class `dmg` and `rate` in `CLASSES` set how hard they hit.

## Levels (màn)

A round has **10 levels of 10 waves** (100 waves).
- **Clearing a level:** once the 10th wave is beaten and the field is clear, the level ends with fireworks and +30 XP for everyone in the field. The screen fades to a new map with a new path and colour theme, then there's a 10-second rally before the next wave.
- **What carries over:** guards, classes, levels, ranks and heroes on the slots.
- **Getting harder:** every level gives monsters +10% HP and +2.5% speed, waves ramp up inside each level (more monsters per wave), and later paths are shorter, so monsters reach the citadel sooner. See "Balance" below for the numbers.
- **Repairs:** clearing a level repairs the citadel by 35%.
- **The finish:** after level 10, the whole army gets +100 XP and an **ĐẠI THẮNG!** celebration, then a new round starts at level 1.

Every map has its own look and sound:
- **Terrain:** grass, path, edge fringe, trees, bushes, bamboo, flowers, rice and rocks are recoloured at runtime from the base sprites.
- **Scenery and weather:** each map has its own edge scenery and weather.
- **Sound:** each map has its own background sounds, and the music shifts key and tempo.

| # | Map | Path | Look | Weather and light | Sound |
|---|---|---|---|---|---|
| 1 | Làng Cổ Loa | long serpentine (the original) | spring green, cherry trees | cherry petals, butterflies, sun rays | birds |
| 2 | Đồng Lúa Chín | the mirror image | golden fields, rice | autumn leaves, butterflies, sun rays | crickets |
| 3 | Rừng Trúc | vertical serpentine, the longest | deep green, bamboo | green leaves, sun rays | bamboo knocks, chimes |
| 4 | Thung Lũng Sương | wide loops | pale blue-green, lavender | fog, sun rays | soft wind |
| 5 | Đầm Lầy | staircase | murky teal, mud | fireflies, fog | frogs |
| 6 | Núi Đá | double loop | khaki, grey stone, rocks | leaves, sun rays | wind |
| 7 | Tuyết Sơn | spiral | snow and ice | snowfall | blizzard |
| 8 | Hỏa Diệm Sơn | short | scorched orange, basalt | rising embers, heat glow | crackling fire, rumble |
| 9 | Ma Giới | short zig-zag | purple, violet trees, lanterns | spirit wisps, violet fog | eerie drones |
| 10 | Cổng Quỷ | shortest | crimson, charcoal | red embers, wisps | distant war drums |

The themes are in `public/js/themes.js`: hue, saturation and lightness rules per colour band, plus the decor list, weather and sound for each map.

Paths never cross a hero slot and all enter the citadel through the river gap. The paths, themes and difficulty steps are `LEVELS`, `STAGE_HP` and `STAGE_SPEED` in `config.js`. The admin page's **Màn tiếp** button skips to the next level, and the **Đổi bản đồ** buttons jump straight to any of the 10 maps. The army, heroes and guard levels are kept, the field is cleared, the wave count jumps to the start of that level, and an 8-second rally runs before the first wave.

## Developments, events and puzzles

**Wave twists ("diễn biến"):** from wave 3, about half the waves get a twist, announced with the wave banner:
- **Đợt Tốc Biến:** fast enemies.
- **Đợt Giáp Trụ:** about 60% of the wave are armored enemies.
- **Bầy Đàn:** twice as many, weaker enemies.
- **Trời Đen Kịt:** flying swarm.
- **Tinh Anh Xuất Trận:** big gold elites that drop coins.
- **Đại Quân:** 50% more enemies.
- **Đầu Lĩnh:** a huge captain leads the wave.

**Monsters:** besides the originals, Ma Trơi (flies), Rắn Độc (poisons guards), Nhện Tinh (webs guards in place), Cóc Tinh (armored) and Khỉ Quỷ (knocks guards back) join from wave 5 to 28, with stronger colour variants later.

**Random events, one every 32–46 seconds:**

| Event | What happens |
|---|---|
| Mưa lớn | enemies slow down, fire is weaker |
| Voi Quỷ | a charging elephant demon; spam `bắn` |
| Kho báu | first 10 to type `cướp` get XP |
| Mưa sao băng | meteors rain on enemies for 15 s |
| Gió lốc | a fire tornado sweeps the path, pushing enemies back |
| Lễ hội đèn lồng | lanterns float up, x2 XP, guards heal fast |
| Sương mù | fog: heroes' range drops by 30% |
| Quỷ đánh úp | a rift opens mid-path and enemies pour out of it |
| Rương báu chạy | a treasure chest runs down the path; break it for XP for everyone |
| Động đất | the ground shakes; enemies are stunned and hurt |

**Puzzles:** the first correct answer in chat casts a skill.
- **Puzzle types:**
  - math
  - word scramble
  - missing letters
  - number sequences
  - **tục ngữ** (finish the proverb)
  - **câu đố dân gian** (folk riddles)
  - **đố vui** (Vietnamese legend, history and geography trivia)
- **Answers:** typed with or without accents; riddles accept common alternatives (heo/lợn, Sài Gòn/Hồ Chí Minh…).
- **Rewards:** Mưa Tên, Sấm Sét, Đóng Băng, Hồi Thành, Nỏ Thần, Mưa Thiên Thạch, Khí Thế Ngút Trời (guards x1.6 damage for 12 s) or Hồi Sinh Toàn Quân.
- **Content:** the questions are in `public/js/puzzledata.js`, easy to extend.

The admin page's Điều khiển tab can trigger every event and puzzle type by hand.

## Screen layout (phones and TikTok's overlays)

On a phone, TikTok draws its comment list over the bottom-left of the stream, its input bar along the bottom and its like / gift / share buttons on the lower right edge. Nothing a viewer has to read lives there any more:
- **Instruction ticker:** a red strip at the bottom of the top HUD ("Gõ "vào" để nhập ngũ · …", or "Gõ "bắn" ngay!" during a boss). It used to be at the very bottom of the screen.
- **Event feed:** one line just under the HUD on a dark strip; it fades out after 6 s.
- **Puzzle scroll:** at the top of the field, under the HUD (it was over the river, behind the comments).
- **Chat bubbles:** never lower than y 1330 and kept left of the button column below y 1000.
- **Name tags** show the guard's level: `Lan Anh Lv4`. A knocked-out guard shows what hit it (`ngã · Quỷ Lính`) when its viewer was active recently, and a fallen viewer who types `bắn` gets one short reply (`nằm viện · Quỷ Lính · chờ wave sau hoặc "cứu"`) at most every 12 s.
- Announcement ribbons hide the between-rounds scroll while they're up, so the two no longer overlap.

The knobs are `HUD_BOTTOM`, `SAFE_BOTTOM`, `SAFE_RIGHT` and `SAFE_RIGHT_FROM` in `config.js`. The top HUD itself still sits where TikTok shows the host card and viewer count; keep the most important numbers near the middle of it.

## Hero talk (`public/js/herotalk.js`)

Now and then a hero's portrait slides in **under the map**, over the wall signboards (which hide while it talks), and says one line, like a visual novel: a wood-framed portrait, a red name plate with **the viewer who owns the hero** (`LAN ANH · Hỏa Sư`; an advisor with no owner shows the hero's name) and a parchment box where the text types out letter by letter.

- **Portrait:** the hero's own 48 px sprite (with the owner's rank colours), cropped to head and shoulders and scaled 7×, so it is the same pixel art. While talking the mouth flaps, the eyes blink every few seconds, the portrait bobs, and the line is **read aloud**. Alarmed lines shake the portrait; happy ones make it hop.
- **Who talks:** heroes on the field talk first, and some lines go to the hero that suits them (Lương Y warns about the citadel, Lôi Sư introduces puzzles). With no heroes on the field one of the eight speaks as an advisor.
- **When:**

| Moment | Example |
|---|---|
| A viewer gets a hero (follow) | `Đa tạ Lan Anh! Cung Thủ xin ra trận!` |
| A gift worth 20+ diamonds | `Cảm ơn Lan Anh nhiều nha! Quà này đủ quét cả đợt quái!` |
| Boss arrives / boss killed | `Tướng Quỷ tới! Cả làng gõ "bắn" nào!` / `Hạ được Tướng Quỷ rồi!` |
| Citadel at 35% or below | `Còn 30% thành thôi! Thả tim nạp Nỏ Thần mau!` |
| Level cleared / new map | `Qua màn rồi! Thợ đã vá thành…` / `Đến Rừng Trúc rồi! Đường quái đổi hướng…` |
| Puzzle, Giờ Vàng, new wave (sometimes), game over | short reminders |
| Every 100–160 s when nothing else has been said for 25 s | a command tip in the rally; in a wave, the hero's own banter or a shout-out to the top killer |

- **Order:** one line at a time. Urgent lines (boss, citadel) cut a calmer line short; banter waits while something important is about to be said; the start countdown is never covered.
- **How often:** rarely. Thank-yous for heroes and gifts at most every 30 / 45 s, wave lines 15% of waves (every 2 min at most), puzzle lines 30%, top-killer shout-outs every 5 min at most.
- **Voice (text to speech):** Microsoft Edge's Vietnamese neural voices (NamMinh, HoaiMy), fetched by the game server (`server/tts.js`, route `/tts`, npm package `msedge-tts`, no API key) and played through the game's sound bus, so the admin volume and mute apply. Each hero has its own voice, pitch and a fast speaking rate. The box stays up until the voice finishes.
  - **Fixed sentences:** the voice leaves out viewer names, boss and map names and numbers (`Đa tạ! Cung Thủ xin ra trận!` while the box shows `Đa tạ Lan Anh!…`). That keeps the spoken lines to a fixed set of 312 sentences (8 heroes).
  - **Pre-generate them once:** `npm run tts` saves every sentence to `data/tts-cache` (cached ones are skipped; run it again after editing `LINES`, or if it reports failures). After that the voice plays instantly and needs no network. The service is slow and drops about a third of new requests, so uncached lines are fetched live only as a fallback (the box waits up to 5–8 s, then shows with blips, and the voice joins in if it arrives). The game page also fills missing sentences in the background, one every 5 s.
  - **Fallbacks:** no server voice → the browser's own Vietnamese voice if it has one → short blips. Viewer names and other text never go to the service; only the fixed sentences do.
  - Speed and pitch per hero: `HERO_VOICE` in `server/tts.js` (changing them means running `npm run tts` again).
- **Tuning:** `TALK` in `config.js` (`enabled`, `tts`, `ttsServer`, `ttsGain`, `ttsRate`, `chatEvery`, `gapMs`, `holdMs`, `waveChance`, `wallLow`, `giftMin`). The lines are in `LINES` at the top of `herotalk.js`; face positions for the mouth and eyes are in `FACES`.
- **Admin:** the **Anh hùng nói** button (Điều khiển → Nhịp trận) makes a hero say something that fits the moment right away.

## On-screen boards

- **Wall signs (during battle):** the left sign rotates through the commands and gift prices. The right sign alternates between **Top Chiến Sĩ** (today's XP) and **Top Ủng Hộ** (today's gifts in xu).
- **Between rounds:** a big scroll over the field shows four pages: how to play, gift → hero list, top 5 fighters and top 5 supporters.
- Gift totals are saved per viewer in `data/players.json` (`gifts`, `dayGifts`). Simulated viewers count only for the current session.
- Name tags never overlap. When space runs out, priority goes to viewers who just joined, then those who just chatted or gifted, then the strongest.

## Tuning

Balance, gift tiers, word list, bad-word filter and ticker texts are all in `public/js/config.js`.

## Balance (November 2026 pass)

The game was play-tested with a fast-forward harness (game logic only, no rendering, about 8× real time) on levels 1, 5, 7 and 10 with 20 and 150 simulated viewers, likes, `bắn` and `cứu` spam and follow heroes, but no gifts and no puzzle answers.

**What was wrong:**
- **Wave size:** it grew with the absolute wave number (6 + 2·wave, capped at 90), so from level 5 every wave was 90 monsters whether 10 or 200 people were playing.
- **Newest type:** 35% of each wave was the newest unlocked monster, so level 10 was a parade of Bạch Hầu Quỷ (700 HP, one-shots guards).
- **Đợt Giáp Trụ:** the twist turned the whole wave into heavies with +0.2 armour.
- **Big crowds:** `bắn` damage, combo thresholds and hero upgrades from likes didn't scale with crowd size. With 150 viewers monsters died 4–14% of the way down the path and the citadel was never touched.
- **Heroes:** they didn't scale with the wave, so they fell far behind monster HP after level 3.
- **Bosses:** one walking through a column of guards launched all of them at once.
- **Citadel:** it never got repaired between levels.

**Results (citadel HP lost; 100 = one game over):**

| Case | Before | After |
|---|---|---|
| Level 1, 20 guards | 30 (boss), monsters die at 15–50% of the path | 37 (boss), monsters die at 30–55% |
| Level 1, 150 guards | 0, monsters die at 4–14% of the path | 0, monsters die at 22–32% |
| Level 5, 150 guards (lv 8) | 52 (boss) | 40 (boss) |
| Level 7, 20 guards (lv 9) | not measured | 57 for the whole level |
| Level 10, 20 guards (lv 6–10) | 11–53 game overs in one level | 116 for the whole level, 1 game over (lv 10) |
| Level 10, 150 guards (lv 9–10) | game over at the boss | 0–7, boss killed in ~45 s |

All tests ran at a steady 60 fps in the browser with 170 guards, a horde wave, a boss and a 1000-xu ultimate on screen.

**The knobs (all in `config.js`):**

| Constant | Now | Was | What it does |
|---|---|---|---|
| `STAGE_HP` / `STAGE_SPEED` | 0.10 / 0.025 | 0.25 / 0.04 | extra monster HP / speed per level |
| `WAVE_COUNT` | base 6, +1.5 per wave in the level, +0.5 per level, max 80 | 6 + 2·wave, max 90 | monsters per wave, before the crowd factor |
| `CROWD` | count × clamp(√(guards/20), 0.7, 3); HP +0.9% per guard over 10 (max +150%); boss HP +2% per guard over 10 (max +350%) | HP +0.4% per guard | how waves follow the size of the army |
| `LEVEL_CLEAR_HEAL` | 35 | none | citadel repair when a level is cleared |
| `LEAK_DMG_MAX` | 6 | none | most a normal monster takes off the citadel (bosses unchanged) |
| `SHOOT` | 25 × min(1, 6/√guards) | 25 | `bắn` damage |
| `NO_THAN_PER_VIEWER` | 5 | 2 | likes needed per guard for the Nỏ Thần volley |
| `UPGRADE_PER_LIKE` | 0.002 ÷ max(1, guards/20) | 0.002 | hero level progress per like |
| `COMBO_STEPS` | thresholds × max(1, √(guards/20)) | fixed 25 / 60 / 120 | `TẤT CẢ BẮN!` combos |

**In the code:**
- **Wave mix (`startWave`):** a weighted mix where the 6 newest types are the core of each wave and heavies (300+ HP) are rare.
- **Đợt Giáp Trụ:** turns about 60% of a wave into armoured units, with +0.15 armour (max 0.55).
- **Heroes:** hero damage now scales with the wave like guard damage.
- **Bosses:** a boss kicks away at most about 3 guards a second.
- **Ultimates:** were measured and left as they are. Their damage stays local to the guard, so they don't clear whole waves.

## Art

### Animated scenery (`public/js/scenery.js`)

Small props painted in code with the PixelSpec master palette and the same 1 px dark outline as the characters (no image model), animated per map:

| Where | What |
|---|---|
| Every map | red silk flags waving on the citadel wall, purple demon banners either side of the rift, trees / bamboo / rice swaying in the wind |
| Maps 1–6 (river) | a turning water wheel with splashes, fish that leap out of the river |
| Maps 1, 2, 4 | village huts with chimney smoke |
| Maps 2, 6 | a windmill with turning sails |
| Map 5 (Đầm Lầy) | lily pads bobbing and a frog hopping between them |
| Map 7 (Tuyết Sơn) | snow piles, a frozen river |
| Map 8 (Hỏa Diệm Sơn) | glowing lava cracks in the ground, a lava river with bubbles |
| Maps 9–10 | skull totems with flickering ghost flames; map 10's river runs blood red |
| Bright maps (1–4, 6) | flocks of birds crossing the sky |

The recoloured rivers are made at runtime from the water strip (lightness mapped to a colour ramp in `RIVERS`). Props stay on grass cells away from the path and off the hero rows.

### Unit animation

- **Guards:** two new PixelSpec clips per class, built from each guard's own poses by `art/add-hurt-ko.py`:
  - **`hurt`:** the upper body recoils and the head snaps back with the gritted-teeth face. It plays on hits that take 15%+ of HP.
  - **`ko`:** the knees buckle and the body slumps. It plays, with a little hop back, before the body tips over and is carried to the infirmary.
- **Monsters:** a monster that dies flashes white, pops up, splats flat and fades.
- **Waiting guards:** in the rally, guards waiting at home cheer and hop now and then.
- **Fixes:** after a map change the river was drawn under the new field tiles; it now sits on top. The snowfall overlay's baked snowdrift strip no longer shows as a band across the field.

### Characters: hand-placed pixel art (PixelSpec)

The guards, heroes, monsters and bosses are drawn pixel by pixel as **PixelSpec** text files in `art/pixelspec/`. They are code-drawn with the codeart2d skill (no image model), use one shared palette, and pass QA (exact palette, no gaps in the outline).

| Folder | Sprites |
|---|---|
| `guards/` | 6 classes (`sol_kiem` … `sol_y`), 32×32, idle / walk / attack / cast; variants `1`–`3` are the rank tiers |
| `heroes/` | 8 heroes (`hero_cungthu` … `hero_phaothu`), 48×48, idle / attack; variants `1`–`5` are the owner's rank |
| `monsters/` | imp, wolf, bat, shield oni, golem, fox (with colour variants) and the 6 bosses at 64 px (shown at 3×), walk / cast |

`art/build-pixel.py` renders them with the skill's `render_pixelspec.py` (installed in `~/.claude/skills/codeart2d`, or set `CODEART2D_DIR`) and packs each variant into the game's strip format. Each one replaces the Aseprite sprite with the same key. To change a character, edit its JSON (its palette, rows and frames) and run `npm run art` (or `npm run pixel` for just these).

### Everything else: Aseprite scripts

The tiles, decor, effects, UI and the older sprites are generated by Aseprite scripts in `art/`:

| File | What it draws |
|---|---|
| `raster.lua` | Mini rasterizer: shaded ellipses, capsules and polygons, cel-shading lit from the top-left, anime-style line art |
| `characters.lua` | 8 anime-chibi heroes × 5 rank tiers (48×48, 4 idle + 3 attack frames), 6 soldier looks, Thánh Gióng on the iron horse |
| `monsters.lua` | Demon army and colour variants, Oni general and Xà Tinh bosses, golden dragon, golden turtle |
| `classes.lua` | 6 soldier classes × 3 rank tiers (32×32: idle, walk, attack, cast), the Ngư Tinh, Hồ Tinh and Mộc Tinh bosses, fox minions |
| `world.lua` | Seamless 32px tiles, trees, bamboo, lanterns, the pagoda gate, explosion, slash, magic circle and hit effects |
| `ui.lua` | Pixel UI: parchment, lacquer, jade and wood 9-slice frames, bubble tails, red silk ribbon, scroll rods, icons, treasure chest |

UI text uses two fonts that support Vietnamese: **VT323** (pixel) for body text and **Bungee** for headlines. Both are served locally from `node_modules/@fontsource`, so no internet is needed while streaming.

To rebuild:

```bash
npm run art
```

This writes editable `.aseprite` files (with animation tags) to `art/src/`, and PNG strips plus `manifest.json` to `public/assets/sprites/`. Open http://localhost:3000/preview.html to see every sprite animated and zoomed.

If you hand-edit a sprite in Aseprite, export it to the same PNG name with frames laid out horizontally. Running `npm run art` again will overwrite your edits.

Effects such as particles, glow, light beams, slow-motion, the vignette and weather live in `public/js/effects.js`.

### pixelfx effects

48 animated effects come from [pixelfx](https://github.com/patch-gg/pixelfx) (MIT, by Patch), baked into sprite sheets in `public/assets/pfx/`:

| Game moment | Effect |
|---|---|
| Hero hit / crit / Lôi Sư zap | hit spark, crit star, zap |
| Hỏa Sư / Băng Nữ projectiles | animated fireball, ice lance, plus explosion and snowflake burst on impact |
| Võ Sư | spin-slash ring |
| Enemy death / boss entrance and death | poof, void blast |
| Wave start | spawn portal |
| Sấm Sét / Đóng Băng / Hồi Thành skills | lightning strike, frost nova on every lane, healing ring |
| Hero summon / level-up / rank-up | gold magic circle, light pillar |
| Gifts, treasure, fireworks | gold collect burst, firework shells |
| Wall hit | ground slam |
| Always on | braziers at the gate, the spawn rift, butterflies, river ripples, drifting cherry petals, sun rays |
| Guards | dust as they leave the gate, parry clash when they start holding an enemy, thud on heavy hits, stun stars, shield bubble |
| Kills and bosses | coins pop out of big or lucky kills, boss footsteps shake the ground |
| Class ultimates and boss skills | thrust, shield block, star-fall arrow rain, wave, geyser, root snare, thorns, poison cloud, charm |
| UI | 3-2-1-GO countdown before battle, COMBO x2 / x3 / x5 bursts |

To change or add effects, edit the list in `art/build-pfx.mjs` (effect id, palette, options) and run:

```bash
npm run pfx
```

It expects the pixelfx checkout next to this project (`../pixelfx`), or set `PIXELFX_DIR`. The game falls back to its own effects when a sheet is missing.

## Sound

All sound is synthesized live with WebAudio in `public/js/sfx.js`, so there are no audio files.

- **37 sound effects:** weapons, hits, crits, kills, coins and gifts, joins, level-ups, war drums, gong, boss roar, freeze, Nỏ Thần volley, summons and more. Each is rate-limited so a crowd of 300 doesn't turn into noise.
- **Generative music:** đàn tranh-style plucked melody, sáo trúc bamboo flute, bass, mõ wood block and trống drums, all in the Vietnamese pentatonic (ngũ cung) scale. It switches mood automatically between calm (rally), battle and boss.
- **Controls:** volume and mute are on the admin page (Điều khiển tab). Audio plays in the game page, so OBS / LIVE Studio captures it from the Browser Source.
- **Testing in a normal browser:** click the game page once to allow audio.

## TikTok connection notes

- This uses the unofficial `tiktok-live-connector` library (`server/tiktok.js`). It only **reads** events and never posts chat.
- It needs a free Euler Stream API key (eulerstream.com), pasted into the admin page. Without one, Euler Stream refuses anonymous connections from some networks.
- Room info and the gift list are turned off, because Euler Stream only signs those on its paid Business plan ("This endpoint requires a Business plan"). Gift events already carry the gift's name and xu.
- TikFinity can't feed the game: its local port 21213 is a Stream Deck control channel (on/off toggles), not an event relay.
- TikTok can change things and break it at any time.
- Simulated viewers (ids starting with `sim:`) are never saved, so tests won't pollute real progress.
