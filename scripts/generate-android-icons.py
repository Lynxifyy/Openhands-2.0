"""Generate the Android launcher icons from the PWA source art.

Run from the repo root:  python3 scripts/generate-android-icons.py

Sources the 512px maskable PWA icon and writes the adaptive-icon foreground
(inset so the safe zone is respected) plus legacy square/round mipmaps for
every density. Kept as a script rather than a one-off so a future icon change
is a single command, not a manual resize pass.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "build" / "android-chrome-512x512.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

# Legacy launcher icon sizes (px) per density.
LEGACY = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Adaptive-icon foreground is a 108dp canvas whose inner 72dp is the safe
# zone; scale the artwork to ~72% and center it.
FOREGROUND = {density: int(size * 108 / 48) for density, size in LEGACY.items()}


def write(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG")
    print(f"wrote {path.relative_to(ROOT)} ({image.width}x{image.height})")


def main() -> int:
    if not SOURCE.exists():
        print(f"missing source icon: {SOURCE}", file=sys.stderr)
        return 1

    source = Image.open(SOURCE).convert("RGBA")

    for density, size in LEGACY.items():
        square = source.resize((size, size), Image.LANCZOS)
        write(square, RES / density / "ic_launcher.png")
        write(square, RES / density / "ic_launcher_round.png")

        canvas_size = FOREGROUND[density]
        inset = round(canvas_size * 0.14)
        art = source.resize(
            (canvas_size - 2 * inset, canvas_size - 2 * inset), Image.LANCZOS
        )
        foreground = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        foreground.paste(art, (inset, inset), art)
        write(foreground, RES / density / "ic_launcher_foreground.png")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
