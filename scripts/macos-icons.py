"""Export the macOS app icon from the shared Otter logo.

The master is a black mark on a transparent background. In the Dock and the app switcher
it sits on whatever is behind it, and recent macOS boxes icons that don't fill Apple's
rounded-square shape onto a tinted tile of its own — dark in dark mode. macOS therefore gets
the mark on a white squircle laid out on Apple's 1024 px grid (an 824 px body, 100 px in),
so the icon looks the same everywhere. tauri.macos.conf.json points macOS at these.
"""

import math
from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / "desktop/src-tauri/icons/macos"
canvas = 1024
body = 824  # Apple's macOS icon grid
scale = 4  # draw the outline supersampled, then downsample for smooth edges
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS  # Pillow < 9.1 has no Resampling

with Image.open(root / "design/logo.png") as art:
    art = art.convert("RGBA")

# Keep only the dark strokes: the master has a faint white halo.
gray = art.convert("L")
mark = Image.eval(gray, lambda v: 255 if v < 128 else 0)
mark = Image.composite(mark, Image.new("L", art.size, 0), art.getchannel("A"))
mark = mark.crop(mark.getbbox())


def squircle(size: int, box: int) -> Image.Image:
    """A superellipse close to Apple's continuous-corner shape, as an alpha mask."""
    big, half, n = size * scale, box * scale / 2, 5.0
    centre = big / 2
    points = []
    for i in range(720):
        t = i / 720 * 2 * math.pi
        c, s = math.cos(t), math.sin(t)
        x = centre + half * math.copysign(abs(c) ** (2 / n), c)
        y = centre + half * math.copysign(abs(s) ** (2 / n), s)
        points.append((x, y))
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.resize((size, size), LANCZOS)


def place(mask: Image.Image, size: int, width: float) -> Image.Image:
    """Scale the mark to `width` of the canvas and centre it, as an alpha mask."""
    target = round(size * width)
    scaled = mask.resize((target, round(mask.height * target / mask.width)), LANCZOS)
    result = Image.new("L", (size, size), 0)
    result.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    return result


icon = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
icon.paste(Image.new("RGBA", (canvas, canvas), (255, 255, 255, 255)), (0, 0), squircle(canvas, body))
icon.paste(Image.new("RGBA", (canvas, canvas), (17, 17, 17, 255)), (0, 0), place(mark, canvas, 0.52))

out.mkdir(exist_ok=True)
for size in (32, 128, 256, 512):
    icon.resize((size, size), LANCZOS).save(out / f"{size}x{size}.png")

with tempfile.TemporaryDirectory() as tmp:
    iconset = Path(tmp) / "icon.iconset"
    iconset.mkdir()
    for points in (16, 32, 128, 256, 512):
        icon.resize((points, points), LANCZOS).save(iconset / f"icon_{points}x{points}.png")
        icon.resize((points * 2, points * 2), LANCZOS).save(iconset / f"icon_{points}x{points}@2x.png")
    if shutil.which("iconutil"):
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(out / "icon.icns")], check=True)
    else:
        print("iconutil not found (it ships with macOS); icon.icns was not updated")
