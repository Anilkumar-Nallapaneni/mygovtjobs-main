#!/usr/bin/env python3
"""Generate PWA + Android TWA icons from frontend/public/app-icon.png (parliament emblem)."""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend" / "public"
TWA_RES = ROOT / "android-twa" / "app" / "src" / "main" / "res"
SRC = PUBLIC / "app-icon.png"
LOGO = PUBLIC / "logo.png"
BG = (3, 6, 13, 255)  # #03060d — matches PWA theme_color


def _strip_backdrop(arr: np.ndarray) -> None:
    """Remove export backdrops so icons composite cleanly on #03060d."""
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    # Solid black crops from logo.png
    dark = rgb.max(axis=2) < 24
    arr[dark, 3] = 0

    # Photoshop-style checkerboard transparency previews (baked into bad exports)
    r, g, b = rgb[:, :, 0].astype(int), rgb[:, :, 1].astype(int), rgb[:, :, 2].astype(int)
    grey = (np.abs(r - g) < 8) & (np.abs(g - b) < 8)
    checker = grey & (
        ((r >= 32) & (r <= 72))
        | ((r >= 96) & (r <= 136))
        | ((r >= 160) & (r <= 200))
    )
    arr[checker, 3] = 0

    # Flood-fill light backdrop from image edges only (keeps white flag stripe, pillars, etc.)
    backdrop = rgb.min(axis=2) > 190
    visited = np.zeros((h, w), dtype=bool)
    stack: list[tuple[int, int]] = []
    for x in range(w):
        stack.append((0, x))
        stack.append((h - 1, x))
    for y in range(h):
        stack.append((y, 0))
        stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or visited[y, x]:
            continue
        if not backdrop[y, x]:
            continue
        visited[y, x] = True
        alpha[y, x] = 0
        stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))


def emblem_from_logo(logo_path: Path = LOGO) -> Image.Image:
    """Crop the parliament emblem from the wordmark banner (correct tricolor flag)."""
    logo = Image.open(logo_path).convert("RGBA")
    w, _h = logo.size
    emblem = logo.crop((0, 0, int(w * 0.40), logo.size[1]))
    arr = np.array(emblem)
    _strip_backdrop(arr)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 8)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    return Image.fromarray(arr[y0:y1, x0:x1], "RGBA")


def write_app_icon_source() -> Path:
    """Rebuild app-icon.png from logo.png so splash/launcher match the site wordmark."""
    emblem = emblem_from_logo()
    side = max(emblem.size)
    canvas = Image.new("RGBA", (side, side), BG)
    x = (side - emblem.size[0]) // 2
    y = (side - emblem.size[1]) // 2
    canvas.paste(emblem, (x, y), emblem)
    canvas.save(SRC, "PNG", optimize=True)
    return SRC


def load_emblem(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    _strip_backdrop(arr)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 8)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    return Image.fromarray(arr[y0:y1, x0:x1], "RGBA")


def fit_icon(emblem: Image.Image, size: int, pad: float = 0.12) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    lw, lh = emblem.size
    inner = int(size * (1 - 2 * pad))
    scale = min(inner / lw, inner / lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    resized = emblem.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main() -> int:
    if LOGO.is_file():
        write_app_icon_source()
        print(f"rebuilt {SRC.name} from {LOGO.name}")
    elif not SRC.is_file():
        print(f"Missing source emblem: {SRC}", file=sys.stderr)
        return 1

    emblem = load_emblem(SRC)

    for name, size, pad in [
        ("favicon-32.png", 32, 0.08),
        ("apple-touch-icon.png", 180, 0.12),
        ("pwa-192.png", 192, 0.12),
        ("pwa-512.png", 512, 0.12),
        ("pwa-512-maskable.png", 512, 0.22),
    ]:
        fit_icon(emblem, size, pad=pad).save(PUBLIC / name, "PNG", optimize=True)
        print(f"wrote {name}")

    mipmap = {
        "mipmap-mdpi": (48, 82),
        "mipmap-hdpi": (72, 123),
        "mipmap-xhdpi": (96, 164),
        "mipmap-xxhdpi": (144, 246),
        "mipmap-xxxhdpi": (192, 328),
    }
    for folder, (launcher_sz, mask_sz) in mipmap.items():
        d = TWA_RES / folder
        fit_icon(emblem, launcher_sz, pad=0.10).save(d / "ic_launcher.png", "PNG", optimize=True)
        fit_icon(emblem, mask_sz, pad=0.18).save(d / "ic_maskable.png", "PNG", optimize=True)
        print(f"wrote {folder}")

    for folder, size in {
        "drawable-mdpi": 300,
        "drawable-hdpi": 450,
        "drawable-xhdpi": 600,
        "drawable-xxhdpi": 900,
        "drawable-xxxhdpi": 1200,
    }.items():
        fit_icon(emblem, size, pad=0.18).save(TWA_RES / folder / "splash.png", "PNG", optimize=True)

    for folder, size in {
        "drawable-mdpi": 24,
        "drawable-hdpi": 36,
        "drawable-xhdpi": 48,
        "drawable-xxhdpi": 72,
        "drawable-xxxhdpi": 96,
    }.items():
        fit_icon(emblem, size, pad=0.06).save(
            TWA_RES / folder / "ic_notification_icon.png", "PNG", optimize=True
        )

    print("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
