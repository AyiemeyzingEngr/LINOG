#!/usr/bin/env python3
"""Prepare the explainer's image assets (logos + real LInOG velocity products).

    python3 tools/prepare_assets.py RAW_DIR

RAW_DIR holds the source files as downloaded from the project Drive (07_dashboard/LOGOS and the
v1.2 / v2.0 delivery folders); see assets/README.md for the exact file list. Outputs (committed):
  assets/logos/*.png        trimmed, Lanczos-resized RGBA logos
  assets/data/*.png         8-bit quantised vertical velocity (cm/yr), 0 = no data
  assets/data/manifest.json georeferencing, quantisation and frame footprints
Requires numpy + Pillow only (GeoTIFF tags are read with Pillow).
"""
import json, os, sys, glob
import numpy as np
from PIL import Image

RAW = sys.argv[1] if len(sys.argv) > 1 else '.'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_L = os.path.join(HERE, '..', 'assets', 'logos')
OUT_D = os.path.join(HERE, '..', 'assets', 'data')
os.makedirs(OUT_L, exist_ok=True); os.makedirs(OUT_D, exist_ok=True)


def raw(*names):
    for n in names:
        p = os.path.join(RAW, n)
        if os.path.exists(p):
            return p
    raise SystemExit('missing raw file: ' + ' | '.join(names))


def trim(im, bg=None, thr=12):
    """Crop to content: alpha > 0, or (for opaque images) pixels that differ from the background colour."""
    a = np.array(im.convert('RGBA')).astype(int)
    if bg is None and a[..., 3].min() < 250:
        m = a[..., 3] > 8
    else:
        bg = np.array(bg if bg is not None else a[0, 0, :3])
        m = np.abs(a[..., :3] - bg).sum(-1) > thr
    ys, xs = np.where(m)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def fit(im, h=None, w=None):
    if h:
        w2 = round(im.width * h / im.height); return im.resize((w2, h), Image.LANCZOS)
    h2 = round(im.height * w / im.width); return im.resize((w, h2), Image.LANCZOS)


def circle(im, pad=0.0):
    """Anti-aliased circular mask (for seals delivered on a white square)."""
    im = im.convert('RGBA'); s = min(im.size); im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
    ss = 4; big = Image.new('L', (s * ss, s * ss), 0)
    yy, xx = np.mgrid[0:s * ss, 0:s * ss]; r = s * ss / 2
    big = Image.fromarray(((np.hypot(xx - r + 0.5, yy - r + 0.5) <= r * (1 - pad)) * 255).astype(np.uint8))
    m = big.resize((s, s), Image.LANCZOS)
    a = np.array(im); a[..., 3] = np.minimum(a[..., 3], np.array(m)); return Image.fromarray(a)


def white_from_dark(im, bg_l, fg_l):
    """White artwork on a dark opaque background → white RGBA with alpha from luminance."""
    a = np.array(im.convert('RGB')).astype(float)
    L = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    al = np.clip((L - bg_l) / (fg_l - bg_l), 0, 1)
    out = np.zeros(a.shape[:2] + (4,), np.uint8); out[..., :3] = 255; out[..., 3] = (al * 255).round()
    return Image.fromarray(out)


def save(im, name):
    p = os.path.join(OUT_L, name); im.save(p, optimize=True); print(f'{name:28s} {im.size[0]}x{im.size[1]}  {os.path.getsize(p) / 1024:.0f} KB')


# ---------------------------------------------------------------- logos (heights ≈ 2× their largest on-screen size)
save(fit(circle(trim(Image.open(raw('UP_Seal.png', 'UP Seal.png')), bg=(255, 255, 255), thr=30)), h=320), 'up_seal.png')
save(fit(trim(Image.open(raw('3.webp', 'NIGS_Logo_revamped.png', 'NIGS Logo_revamped.png'))), h=320), 'nigs.png')
save(fit(circle(trim(Image.open(raw('upcrsc_logo.jpg')), bg=(255, 255, 255), thr=40)), h=320), 'up_csrc.png')
save(fit(trim(Image.open(raw('upisc_logo.png'))), h=240), 'up_isc.png')
save(fit(trim(Image.open(raw('pcieerd_logo.webp', '4.webp'))), h=320), 'dost_pcieerd.png')
save(fit(trim(Image.open(raw('pivs_logo.png'))), h=320), 'dost_phivolcs.png')
save(fit(trim(Image.open(raw('5.webp', 'philsa_logo.png'))), h=200), 'philsa.png')
save(fit(trim(Image.open(raw('2.webp', 'Jaxa-logo.svg_.png'))), h=200), 'jaxa.png')
egg = Image.open(raw('EGG.png'))                     # 2909×1221, white artwork on navy (0,33,71)
mark = white_from_dark(egg.crop((150, 60, 875, 1160)), 29, 237)
save(fit(trim(mark), h=560), 'egg_mark_white.png')
lock = white_from_dark(egg.crop((150, 60, 2760, 1160)), 29, 237)
save(fit(trim(lock), h=260), 'egg_lockup_white.png')

# ---------------------------------------------------------------- real velocity products
VMIN, VMAX = -8.0, 8.0  # cm/yr range of the 8-bit quantisation; q = 1..255, 0 = no data


def q8(v_cm):
    q = np.round((np.clip(v_cm, VMIN, VMAX) - VMIN) / (VMAX - VMIN) * 254) + 1
    q[~np.isfinite(v_cm)] = 0
    return q.astype(np.uint8)


def read_tif(p):
    im = Image.open(p); tp = im.tag_v2[33922]; sc = im.tag_v2[33550]
    a = np.array(im, dtype=np.float64) * 100.0  # m/yr → cm/yr
    a[(a == 0) | ~np.isfinite(a)] = np.nan
    return a, dict(lon0=float(tp[3]), lat0=float(tp[4]), d=float(sc[0]))


def corners(a, g):
    """Four corners of the valid-data footprint (extreme points along the diagonals), lon/lat."""
    ys, xs = np.where(np.isfinite(a))
    pts = []
    for k in (xs + ys, xs - ys, -(xs + ys), ys - xs):
        i = int(np.argmin(k)); pts.append([round(g['lon0'] + (xs[i] + 0.5) * g['d'], 4), round(g['lat0'] - (ys[i] + 0.5) * g['d'], 4)])
    return pts  # NW, NE?, …: order = min(x+y) top-left, min(x−y) bottom-left, max(x+y) bottom-right, max(x−y) top-right


tifs = sorted(glob.glob(os.path.join(RAW, '*_Velocity_Vertical_ramp.tif')))
if not tifs:
    raise SystemExit('no *_Velocity_Vertical_ramp.tif in RAW_DIR')
frames, grids = [], {}
for p in tifs:
    name = os.path.basename(p)[:9]
    a, g = read_tif(p); grids[name] = (a, g)
    pix = (g['d'] * 111.32 * np.cos(np.radians(g['lat0'] - g['d'] * a.shape[0] / 2))) * (g['d'] * 110.57)
    frames.append(dict(id=name, path=int(name[1:4]), frame=int(name[5:9]), dir='descending' if name.startswith('P084') else 'ascending',
                       corners=corners(a, g), validKm2=round(float(np.isfinite(a).sum() * pix))))

# focus frame at full resolution (Cabanatuan, P448 F0290)
a, g = grids['P448F0290']
Image.fromarray(q8(a), 'L').save(os.path.join(OUT_D, 'p448f0290_vertical.png'), optimize=True)
focus = dict(file='p448f0290_vertical.png', lon0=g['lon0'], lat0=g['lat0'], d=g['d'], w=a.shape[1], h=a.shape[0])

# mosaics on a 1/400° grid (3×3 block mean of the 1/1200° products; overlaps averaged)
D, LON0, LAT0, LON1, LAT1 = 1 / 400, 120.0, 17.2, 122.1, 14.45
GW, GH = int(round((LON1 - LON0) / D)), int(round((LAT0 - LAT1) / D))


def mosaic(names):
    s = np.zeros((GH, GW)); n = np.zeros((GH, GW))
    for nm in names:
        a, g = grids[nm]
        f = int(round(D / g['d']))
        h, w = (a.shape[0] // f) * f, (a.shape[1] // f) * f
        blk = a[:h, :w].reshape(h // f, f, w // f, f)
        with np.errstate(all='ignore'):
            cnt = np.isfinite(blk).sum((1, 3)); mean = np.nansum(blk, (1, 3)) / np.maximum(cnt, 1)
        mean[cnt < (f * f) / 2] = np.nan
        c0 = int(round((g['lon0'] - LON0) / D)); r0 = int(round((LAT0 - g['lat0']) / D))
        hh, ww = mean.shape
        sub = (slice(max(0, r0), min(GH, r0 + hh)), slice(max(0, c0), min(GW, c0 + ww)))
        m = mean[sub[0].start - r0:sub[0].stop - r0, sub[1].start - c0:sub[1].stop - c0]
        ok = np.isfinite(m)
        s[sub][ok] += m[ok]; n[sub][ok] += 1
    with np.errstate(all='ignore'):
        out = s / n
    out[n == 0] = np.nan
    return out


asc = [f['id'] for f in frames if f['dir'] == 'ascending']; des = [f['id'] for f in frames if f['dir'] == 'descending']
Image.fromarray(q8(mosaic(asc)), 'L').save(os.path.join(OUT_D, 'mosaic_ascending.png'), optimize=True)
Image.fromarray(q8(mosaic(des)), 'L').save(os.path.join(OUT_D, 'mosaic_descending.png'), optimize=True)
man = dict(
    note='Vertical velocity (cm/yr, ramp removed) from the LInOG delivered products: ascending v1.2 (24 Sep 2026), descending P084 (10 Oct 2026). '
         'Decode: v = (q - 1) / 254 * (vmax - vmin) + vmin; q = 0 means no data (masked).',
    vmin=VMIN, vmax=VMAX, focus=focus,
    mosaic=dict(ascending='mosaic_ascending.png', descending='mosaic_descending.png', lon0=LON0, lat0=LAT0, d=D, w=GW, h=GH),
    frames=frames)
json.dump(man, open(os.path.join(OUT_D, 'manifest.json'), 'w'), indent=1)
for f in sorted(os.listdir(OUT_D)):
    print(f'{f:28s} {os.path.getsize(os.path.join(OUT_D, f)) / 1024:.0f} KB')
