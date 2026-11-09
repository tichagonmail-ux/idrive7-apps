#!/usr/bin/env python3
"""Rebuild Goku artwork/layout data from the atlas, retaining the packed fonts.

Requires Node.js and sharp at build time (normal Store builds use hud.pack).
"""
import json
import struct
import subprocess
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'apps/dragon_super'
blob = (APP / 'hud.pack').read_bytes()
assert blob[:8] == b'MGUPACK1'
n = struct.unpack('<I', blob[8:12])[0]
index = json.loads(zlib.decompress(blob[12:12+n], -15))
folder = APP / 'hud'
split = {}
for name, (offset, size) in index['files'].items():
    content = zlib.decompress(blob[12+n+offset:12+n+offset+size], -15)
    if '#' in name:
        split.setdefault(name.split('#')[0], {}).update(json.loads(content))
    else:
        target = folder / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
for name, content in split.items():
    target = folder / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(content, separators=(',', ':')))
subprocess.run(['node', str(ROOT / 'kit/tools/bake_goku_assets.js')], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / 'kit/tools/make_goku_layouts.py')], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / 'kit/tools/pack_data.py'), str(folder), str(APP / 'hud.pack')], cwd=ROOT, check=True)
