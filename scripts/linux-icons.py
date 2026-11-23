"""Export the Linux app and tray icons from the shared Otter logo.

The master is a black mark on a transparent background, which disappears on a dark
GNOME dock and on Ubuntu's top bar (dark in both themes). Linux therefore gets:

- app icons: the mark on a light rounded plate, legible on light and dark docks;
- a tray icon: the mark in white, for the always-dark top bar. macOS uses it too, as a
  template image (only the alpha counts there).

macOS and Windows keep the plain mark for the app icon; tauri.linux.conf.json points Linux
at these.
"""

from pathlib import Path

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
icons = root / "desktop/src-tauri/icons"
work = 1024  # draw at master size, then downsample each output
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS  # Pillow < 9.1 has no Resampling

with Image.open(root / "design/logo.png") as art:
    art = art.convert("RGBA")

# Keep only the dark strokes: the master has a faint white halo that would show on a plate.
gray = art.convert("L")
alpha = art.getchannel("A")
mark = Image.eval(gray, lambda v: 255 if v < 128 else 0)
mark = Image.composite(mark, Image.new("L", art.size, 0), alpha)
mark = mark.crop(mark.getbbox())


def place(mask: Image.Image, canvas: int, width: float) -> Image.Image:
    """Scale the mark to `width` of the canvas and centre it, as an alpha mask."""
    target = round(canvas * width)
    scaled = mask.resize((target, round(mask.height * target / mask.width)), LANCZOS)
    out = Image.new("L", (canvas, canvas), 0)
    out.paste(scaled, ((canvas - scaled.width) // 2, (canvas - scaled.height) // 2))
    return out


# App icon: a near-white rounded square with a thin border, the mark in near-black.
inset = round(work * 0.06)
plate = Image.new("RGBA", (work, work), (0, 0, 0, 0))
ImageDraw.Draw(plate).rounded_rectangle(
    (inset, inset, work - inset - 1, work - inset - 1),
    radius=round(work * 0.2),
    fill=(246, 246, 244, 255),
    outline=(0, 0, 0, 40),
    width=round(work * 0.008),
)
ink = Image.new("RGBA", (work, work), (17, 17, 17, 255))
plate.paste(ink, (0, 0), place(mark, work, 0.62))

out = icons / "linux"
out.mkdir(exist_ok=True)
for size in (32, 64, 128, 256, 512):
    plate.resize((size, size), LANCZOS).save(out / f"{size}x{size}.png")

# Tray icon: the bare mark in white, nearly filling the square the indicator gives it.
tray = Image.new("RGBA", (work, work), (255, 255, 255, 0))
tray.putalpha(place(mark, work, 0.94))
white = Image.new("RGBA", (work, work), (255, 255, 255, 255))
white.putalpha(tray.getchannel("A"))
white.resize((64, 64), LANCZOS).save(icons / "tray.png")
