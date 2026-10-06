#!/usr/bin/env python3
"""Rebuild a pinned, exact-codepoint stroke source. No simplified/traditional folding.
Usage: python3 scripts/refresh-hanja-strokes.py [--check]
Downloads official Unicode archives only; runtime uses committed JSON/TypeScript.
"""
import hashlib, io, json, re, sys, urllib.request, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/engine/naming/hanja-data.ts'
SOURCE = ROOT / 'src/engine/naming/stroke-source.json'
URL13 = 'https://www.unicode.org/Public/13.0.0/ucd/Unihan.zip'
URL17 = 'https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip'
RADICALS = 'https://www.unicode.org/Public/17.0.0/ucd/CJKRadicals.txt'

def fetch(url):
    return urllib.request.urlopen(url, timeout=60).read()

def properties(raw, fields):
    out = {}
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        for name in z.namelist():
            for line in z.read(name).decode().splitlines():
                if not line.startswith('U+'): continue
                cp, field, value = line.split('\t', 2)
                if field in fields: out.setdefault(chr(int(cp[2:], 16)), {})[field] = value
    return out

raw13, raw17, radicalraw = fetch(URL13), fetch(URL17), fetch(RADICALS)
old = properties(raw13, {'kRSKangXi'})
modern = properties(raw17, {'kTotalStrokes', 'kHangul'})
radicals = {}
for line in radicalraw.decode().splitlines():
    if not line or line.startswith('#'): continue
    number, _, cp = [v.strip() for v in line.split('#')[0].split(';')]
    if number.isdigit(): radicals[int(number)] = chr(int(cp, 16))
source = {'version': 'unihan-kangxi13-modern17-v1', 'sources': [
    {'url': url, 'sha256': hashlib.sha256(raw).hexdigest()}
    for url, raw in [(URL13, raw13), (URL17, raw17), (RADICALS, radicalraw)]
], 'modernPolicy': 'kTotalStrokes first value (G source); not a Korean glyph standard', 'entries': {}}
text = DATA.read_text()
changed = {'kangxi': 0, 'modern': 0}
pattern = r"(\{ char: '([^']+)', reading: '[^']+', kangxi: )(\d+)(, modern: )(\d+)"
def replace(m):
    ch = m[2]
    rs = old[ch]['kRSKangXi']
    if ' ' in rs: raise ValueError('Ambiguous Kangxi count: ' + ch)
    radical, residual = map(int, rs.split('.'))
    radical_count = int(modern[radicals[radical]]['kTotalStrokes'].split()[0])
    kx = radical_count + residual
    alternatives = list(map(int, modern[ch]['kTotalStrokes'].split()))
    ms = alternatives[0]
    assert kx > 0 and ms > 0
    readings = re.findall(r'([가-힣]):', modern[ch].get('kHangul', ''))
    source['entries'][ch] = {'kangxiRS': rs, 'radicalStrokes': radical_count, 'kangxi': kx,
                              'modern': ms, 'modernAlternatives': alternatives, 'readings': readings}
    changed['kangxi'] += int(m[3]) != kx
    changed['modern'] += int(m[5]) != ms
    return f'{m[1]}{kx}{m[4]}{ms}'
newtext = re.sub(pattern, replace, text)
assert len(source['entries']) == 2137
rendered = json.dumps(source, ensure_ascii=False, indent=2) + '\n'
if '--check' in sys.argv:
    assert newtext == text, 'Stroke table drift'
    assert SOURCE.read_text() == rendered, 'Source provenance drift'
else:
    DATA.write_text(newtext)
    SOURCE.write_text(rendered)
print(json.dumps({'entries': len(source['entries']), 'changed': changed}))
