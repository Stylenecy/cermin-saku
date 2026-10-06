"""Recolour Kiel's amber watercolours (frontend/public/*.webp, MIT) into the Cermin Saku palette:
blue sky, green land, brown earth and paths. Luminance carries the brush texture; a soft horizon mask
splits sky from land.

    python scripts/recolor-art.py            # writes frontend/public/saku-*.webp next to the originals
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public")

def hex3(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0

def ramp(L, stops):
    """Gradient map: stops = [(pos, '#hex'), ...] over luminance 0..1."""
    pos = np.array([p for p, _ in stops], dtype=np.float32)
    cols = np.stack([hex3(c) for _, c in stops])
    out = np.empty(L.shape + (3,), dtype=np.float32)
    for ch in range(3):
        out[..., ch] = np.interp(L, pos, cols[:, ch])
    return out

def smooth(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)

DAY_SKY = [(0.0, "#2E4E72"), (0.45, "#5F86AE"), (0.72, "#A9C4DC"), (0.9, "#E4ECF1"), (1.0, "#F7F5EE")]
DAY_LAND = [(0.0, "#22241A"), (0.25, "#2F4A30"), (0.48, "#4F7446"), (0.66, "#8AA367"), (0.8, "#B59E6E"), (0.92, "#DCCBA6"), (1.0, "#F4EEDF")]
TOWN_LAND = [(0.0, "#241C14"), (0.3, "#4A3524"), (0.5, "#6E7B4C"), (0.68, "#9C8A62"), (0.84, "#D3C2A0"), (1.0, "#F5EFE2")]
NIGHT_SKY = [(0.0, "#0B1424"), (0.35, "#16263F"), (0.7, "#2C4466"), (1.0, "#6B86A8")]
NIGHT_LAND = [(0.0, "#0E120E"), (0.3, "#1C2A1E"), (0.6, "#3B4A34"), (1.0, "#7C8A66")]

JOBS = {
    # name: (horizon as fraction of height, sky ramp, land ramp, keep warm lights)
    "hero-horizon-figure": (0.66, DAY_SKY, DAY_LAND, False),
    "cta-dawn-path": (0.55, DAY_SKY, DAY_LAND, False),
    "faq-open-meadow": (0.68, DAY_SKY, DAY_LAND, False),
    "how-it-works-three-scenes": ((0.62, 0.86), DAY_SKY, DAY_LAND, False),  # trees on the left, sea on the right
    "features-tranquil-town": (0.44, DAY_SKY, TOWN_LAND, False),
    "shadow-night-warmth": (0.42, NIGHT_SKY, NIGHT_LAND, True),
}

def recolor(name, horizon, sky_ramp, land_ramp, keep_lights):
    src = os.path.join(ROOT, f"{name}.webp")
    img = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32) / 255.0
    h, w, _ = img.shape
    L = img @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    # stretch luminance a little so the ramps use their full range
    lo, hi = np.percentile(L, 1), np.percentile(L, 99.5)
    Ln = np.clip((L - lo) / max(hi - lo, 1e-3), 0, 1)
    y = (np.arange(h, dtype=np.float32) / h)[:, None] * np.ones((1, w), dtype=np.float32)
    if isinstance(horizon, tuple):  # a horizon that slopes from the left edge to the right edge
        horizon = np.linspace(horizon[0], horizon[1], w, dtype=np.float32)[None, :]
    sky_mask = 1.0 - smooth(horizon - 0.05, horizon + 0.03, y)
    sky = ramp(Ln, sky_ramp)
    land = ramp(Ln, land_ramp)
    out = sky * sky_mask[..., None] + land * (1 - sky_mask[..., None])
    # keep a trace of the original pigment so it still reads as one watercolour
    out = out * 0.88 + img * 0.12
    if keep_lights:
        # village lights stay warm: very bright, saturated pixels keep their colour
        sat = img.max(axis=2) - img.min(axis=2)
        lights = smooth(0.35, 0.6, L) * smooth(0.15, 0.35, sat)
        out = out * (1 - lights[..., None]) + img * lights[..., None]
    dst = os.path.join(ROOT, f"saku-{name}.webp")
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(dst, "WEBP", quality=86, method=6)
    print("wrote", os.path.basename(dst), f"{w}x{h}")

if __name__ == "__main__":
    for n, (hz, s, l, k) in JOBS.items():
        recolor(n, hz, s, l, k)
