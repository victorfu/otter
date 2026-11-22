"""Export web favicons and native Windows icon frames from the shared Otter logo."""

import io
from pathlib import Path
import struct

from PIL import Image


root = Path(__file__).resolve().parents[1]
app = root
# tauri-codegen 2.5 reads only entry zero for the running window and tray.
# Explorer also reads this file and chooses an entry for the requested DPI.
sizes = (64, 16, 20, 24, 28, 30, 32, 36, 40, 48, 60, 72, 80, 96, 128, 256)
directory = bytearray(struct.pack("<HHH", 0, 1, len(sizes)))
pixels = bytearray()
with Image.open(app / "design/logo.png") as art:
    for favicon in (app / "website/public").glob("favicon-*x*.png"):
        dimensions = tuple(map(int, favicon.stem.removeprefix("favicon-").split("x")))
        art.resize(dimensions, Image.Resampling.LANCZOS).save(favicon)
    for size in sizes:
        frame = art.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        frame.save(encoded, format="PNG")
        png = encoded.getvalue()
        offset = 6 + 16 * len(sizes) + len(pixels)
        directory.extend(struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(png), offset))
        pixels.extend(png)

for output in (
    app / "desktop/src-tauri/icons/icon.ico",
    app / "website/public/favicon.ico",
):
    output.write_bytes(directory + pixels)
