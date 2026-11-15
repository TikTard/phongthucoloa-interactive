"""Hand-placed pixel art (codeart2d PixelSpec, code-drawn, no image model) -> game sprite strips.

    python art/build-pixel.py              render every art/pixelspec/**/*.pixelspec.json
    python art/build-pixel.py sol_kiem     only specs whose name starts with these prefixes

Each spec is rendered with the codeart2d skill's render_pixelspec.py (palette-exact, QA-checked), then every
variant becomes one horizontal PNG strip in public/assets/sprites/ plus a manifest.json entry
{w, h, frames, anims: {clip: [first, last, fps, loop]}} - the same format the Aseprite build writes, so a
PixelSpec sprite simply replaces the Aseprite sprite with the same key. Run it after `npm run art`
(that script cleans the sprite folder); `npm run art` already calls it last.

Sprite key: the spec "name" for variant "_" (or "base"), otherwise "<name>_<variant>"
(sol_kiem + variants 1,2,3 -> sol_kiem_1..3; enemy_imp + _, ice -> enemy_imp, enemy_imp_ice).
Clip order in the strip follows the spec's "clips" order; clip names become anim names.
"""
import json, os, shutil, subprocess, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPECS = ROOT / 'art' / 'pixelspec'
STAGE = ROOT / 'art' / '.pixel-out'
SPRITES = ROOT / 'public' / 'assets' / 'sprites'
SKILL = Path(os.environ.get('CODEART2D_DIR', Path.home() / '.claude' / 'skills' / 'codeart2d'))
RENDER = SKILL / 'scripts' / 'render_pixelspec.py'


def key_for(name, variant):
    return name if variant in ('_', 'base') else f'{name}_{variant}'


def pack(out_dir, spec_name):
    built = {}
    for vdir in sorted(p for p in out_dir.iterdir() if p.is_dir()):
        clips_file = vdir / 'clips.json'
        if not clips_file.exists():
            continue
        cj = json.loads(clips_file.read_text(encoding='utf8'))
        files = [vdir / f['file'] for f in cj['frames']]
        images, anims = [], {}
        for clip, c in cj['clips'].items():
            idx = c['frames']
            durs = c.get('duration_ms', 100)
            durs = durs if isinstance(durs, list) else [durs] * len(idx)
            first = len(images)
            for i in idx:
                images.append(Image.open(files[i if isinstance(i, int) else [f['name'] for f in cj['frames']].index(i)]).convert('RGBA'))
            fps = max(1, round(1000 * len(durs) / sum(durs)))
            anims[clip] = [first, len(images) - 1, fps, bool(c.get('loop', False))]
        w, h = images[0].size
        strip = Image.new('RGBA', (w * len(images), h), (0, 0, 0, 0))
        for i, im in enumerate(images):
            strip.paste(im, (i * w, 0))
        key = key_for(spec_name, vdir.name)
        strip.save(SPRITES / f'{key}.png')
        built[key] = {'w': w, 'h': h, 'frames': len(images), 'anims': anims, 'source': 'pixelspec'}
    return built


def main():
    prefixes = sys.argv[1:]
    if not RENDER.exists():
        sys.exit(f'codeart2d skill not found at {SKILL} (set CODEART2D_DIR)')
    specs = sorted(SPECS.rglob('*.pixelspec.json'))
    manifest_path = SPRITES / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf8'))
    STAGE.mkdir(parents=True, exist_ok=True)
    done, failed = 0, []
    for spec in specs:
        name = json.loads(spec.read_text(encoding='utf8'))['name']
        if prefixes and not any(name.startswith(p) for p in prefixes):
            continue
        out = STAGE / name
        if out.exists():
            shutil.rmtree(out)
        r = subprocess.run([sys.executable, str(RENDER), '--spec', str(spec), '--output-dir', str(out),
                            '--preview-scale', '4', '--clips-manifest', '--strict-qc'],
                           capture_output=True, text=True, encoding='utf8', env={**os.environ, 'PYTHONUTF8': '1'})
        if r.returncode != 0:
            failed.append(name)
            print(f'FAIL {name}: {(r.stderr or r.stdout).strip()[-600:]}')
            continue
        built = pack(out, name)
        manifest.update(built)
        done += 1
        print(f'ok   {name}: ' + ', '.join(f"{k} {v['w']}x{v['h']}x{v['frames']}" for k, v in built.items()))
    manifest_path.write_text(json.dumps(manifest, indent=1), encoding='utf8')
    print(f'Built {done} pixelspec sprites' + (f', {len(failed)} failed: {", ".join(failed)}' if failed else ''))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
