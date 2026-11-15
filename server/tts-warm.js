// Pre-generate every hero voice line into data/tts-cache, so nothing waits on the speech service during a stream.
//   npm run tts        (safe to run again: cached lines are skipped; run it after editing LINES in herotalk.js)
import { allVoiceLines } from '../public/js/herotalk.js';
import { speak } from './tts.js';

const lines = allVoiceLines();
let ok = 0, fail = 0;
const t0 = Date.now();
for (const [i, [hero, text]] of lines.entries()) {
  try { await speak(hero, text); ok++; } catch { fail++; console.log(`  fail ${hero}: ${text}`); }
  if ((i + 1) % 20 === 0) console.log(`${i + 1}/${lines.length}`);
}
console.log(`done: ${ok} ok, ${fail} failed, ${Math.round((Date.now() - t0) / 1000)} s${fail ? ' (run again to retry the failed ones)' : ''}`);
process.exit(0);
