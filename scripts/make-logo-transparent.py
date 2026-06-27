"""Remove black background, preserve glow, trim padding, export web logo PNG."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def remove_black_background(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size

    for y in range(h):
        for x in range(w):
            r, g, b, _a = pixels[x, y]
            peak = max(r, g, b)
            # Pure black → transparent; soft edge for glow/sparkles
            if peak <= 12:
                pixels[x, y] = (r, g, b, 0)
            elif peak <= 55:
                fade = (peak - 12) / 43.0
                pixels[x, y] = (r, g, b, int(255 * fade * fade))

    return rgba


def trim_transparent(img: Image.Image, pad_ratio: float = 0.02) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img

    left, top, right, bottom = bbox
    pad_x = max(4, int((right - left) * pad_ratio))
    pad_y = max(4, int((bottom - top) * pad_ratio))
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(img.width, right + pad_x)
    bottom = min(img.height, bottom + pad_y)
    return img.crop((left, top, right, bottom))


def main() -> int:
    src = Path(
        sys.argv[1]
        if len(sys.argv) > 1
        else r"C:\Users\ADMIN\.cursor\projects\c-Users-ADMIN-Downloads-mygovtjobs-main\assets\c__Users_ADMIN_AppData_Roaming_Cursor_User_workspaceStorage_4252614e4736e0ff25bd52089312207c_images_ChatGPT_Image_Jun_13__2026__05_04_47_AM-3c6c187f-21cd-4330-bfd6-56d5eeb9280f.png"
    )
    out = Path(
        sys.argv[2]
        if len(sys.argv) > 2
        else Path(__file__).resolve().parents[1] / "frontend" / "public" / "logo.png"
    )

    img = Image.open(src)
    transparent = remove_black_background(img)
    trimmed = trim_transparent(transparent)

    # Keep web-friendly width while preserving aspect ratio
    max_width = 520
    if trimmed.width > max_width:
        ratio = max_width / trimmed.width
        trimmed = trimmed.resize(
            (max_width, max(1, int(trimmed.height * ratio))),
            Image.Resampling.LANCZOS,
        )

    out.parent.mkdir(parents=True, exist_ok=True)
    trimmed.save(out, "PNG", optimize=True)
    print(f"saved {out} ({trimmed.width}x{trimmed.height})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
