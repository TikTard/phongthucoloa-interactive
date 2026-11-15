"""Add "hurt" and "ko" clips to the guard PixelSpecs (art/pixelspec/guards/*.pixelspec.json).

    python art/add-hurt-ko.py        (then: npm run pixel)

The frames are built from each guard's own idle0 frame and poses, so they stay hand-placed, palette-exact pixel art:
  hurt0/hurt1  the upper body recoils one pixel back, the head snaps back with the gritted-teeth face (head_fierce)
  ko0/ko1      the knees buckle (contact legs) and the upper body slumps down two, then four pixels
The game plays "hurt" when a guard takes a hit and "ko" before the body tips over (army.js). Safe to run again: specs
that already have a "hurt" clip are left alone.
"""
import copy, json
from pathlib import Path

GUARDS = Path(__file__).resolve().parent / 'pixelspec' / 'guards'


def fit(spec, layer, o):
    # keep a 1 px margin for the outline: clamp the offset so the pose stays inside the canvas
    W, H = spec['canvas']
    rows = spec['poses'].get(o.get('rows') or layer.get('rows'))
    if not isinstance(rows, list) or not rows:
        return
    h, w = len(rows), max(len(r) for r in rows)
    ox, oy = layer.get('origin', [0, 0])
    o['dx'] = max(1 - ox, min(W - 1 - w - ox, o.get('dx', 0)))
    o['dy'] = max(1 - oy, min(H - 1 - h - oy, o.get('dy', 0)))


def shifted(spec, base, layer_names, dx, dy, head_dx, head_dy, head_pose, legs_pose):
    layers = copy.deepcopy(base)
    by_name = {layer['name']: layer for layer in spec['layers']}
    for name in layer_names:
        o = layers.setdefault(name, {})
        if o.get('hidden'):
            continue
        if name == 'legs':
            if legs_pose:
                o['rows'] = legs_pose
            continue
        ddx, ddy = (head_dx, head_dy) if name in ('head', 'hat', 'helm', 'bun', 'band') else (dx, dy)
        o['dx'] = o.get('dx', 0) + ddx
        o['dy'] = o.get('dy', 0) + ddy
        if name == 'head' and head_pose:
            o['rows'] = head_pose
        fit(spec, by_name[name], o)
    return layers


def main():
    for f in sorted(GUARDS.glob('*.pixelspec.json')):
        spec = json.loads(f.read_text(encoding='utf8'))
        if 'hurt' in spec['clips']:
            print(f'skip {f.name}')
            continue
        names = [layer['name'] for layer in spec['layers']]
        idle0 = next(fr for fr in spec['frames'] if fr['name'] == 'idle0')['layers']
        fierce = 'head_fierce' if 'head_fierce' in spec['poses'] else None
        knees = next((p for p in ('legs_contact_a', 'legs_crouch') if p in spec['poses']), None)
        frames = [
            ('hurt0', shifted(spec, idle0, names, -1, 0, -2, 1, fierce, None)),
            ('hurt1', shifted(spec, idle0, names, -1, 0, -1, 0, fierce, None)),
            ('ko0', shifted(spec, idle0, names, -1, 2, -2, 3, fierce, knees)),
            ('ko1', shifted(spec, idle0, names, -1, 4, -2, 5, fierce, knees)),
        ]
        for name, layers in frames:
            spec['frames'].append({'name': name, 'layers': layers})
        spec['clips']['hurt'] = {'frames': ['hurt0', 'hurt1', 'hurt1'], 'duration_ms': 70, 'loop': False}
        spec['clips']['ko'] = {'frames': ['ko0', 'ko1'], 'duration_ms': 140, 'loop': False}
        f.write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding='utf8')
        print(f'ok   {f.name}')


if __name__ == '__main__':
    main()
