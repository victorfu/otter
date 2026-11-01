#!/usr/bin/env node
// Generate every icon size from the 1024x1024 sources with `tauri icon`.
//
//   npm run icons                 # regenerate sizes from icons/source/{release,dev}.png
//   npm run icons -- --placeholder  # first redraw the placeholder source PNGs
//
// To use real artwork, replace crates-tauri/app/icons/source/*.png (1024x1024,
// transparent background) and run `npm run icons`.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { TAURI_DIR, c, run } from "./lib/util.mjs";

const ICONS = path.join(TAURI_DIR, "icons");
const SOURCE = path.join(ICONS, "source");
const FLAVORS = ["release", "dev"];

if (
  process.argv.includes("--placeholder") ||
  FLAVORS.some((f) => !existsSync(path.join(SOURCE, `${f}.png`)))
) {
  mkdirSync(SOURCE, { recursive: true });
  for (const flavor of FLAVORS) {
    writeFileSync(path.join(SOURCE, `${flavor}.png`), drawPlaceholder(flavor));
    console.log(c.green(`Drew placeholder icons/source/${flavor}.png`));
  }
}

for (const flavor of FLAVORS) {
  const out = path.join(ICONS, flavor);
  rmSync(out, { recursive: true, force: true });
  run("tauri", ["icon", path.join(SOURCE, `${flavor}.png`), "--output", out]);
  // Desktop-only project: drop mobile assets.
  for (const mobile of ["android", "ios"])
    rmSync(path.join(out, mobile), { recursive: true, force: true });
  console.log(c.green(`Generated icons/${flavor}/`));
}

// --- Placeholder drawing (no dependencies) -----------------------------------

function drawPlaceholder(flavor) {
  const size = 1024;
  const ss = 4; // supersampling per axis
  const [from, to] =
    flavor === "dev"
      ? [
          [245, 158, 11],
          [234, 88, 12],
        ] // amber → orange
      : [
          [79, 70, 229],
          [124, 58, 237],
        ]; // indigo → violet
  const margin = 100;
  const radius = 185;
  const cx = size / 2;
  const cy = size / 2;

  const inRoundRect = (x, y) => {
    const half = size / 2 - margin;
    const qx = Math.abs(x - cx) - (half - radius);
    const qy = Math.abs(y - cy) - (half - radius);
    const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
    return outside + Math.min(Math.max(qx, qy), 0) - radius <= 0;
  };
  const glyph = (x, y) => {
    const d = Math.hypot(x - cx, y - cy + 10);
    const ring = d <= 240 && d >= 168;
    const moon = Math.hypot(x - (cx + 170), y - (cy - 180)) <= 78;
    return ring || moon;
  };
  const hazard = (x, y) =>
    flavor === "dev" && y > size - margin - 150 && Math.floor((x + y) / 48) % 2 === 0;

  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        covered = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const fx = x + (sx + 0.5) / ss;
          const fy = y + (sy + 0.5) / ss;
          if (!inRoundRect(fx, fy)) continue;
          let col;
          if (glyph(fx, fy)) col = [255, 255, 255];
          else if (hazard(fx, fy)) col = [30, 27, 24];
          else {
            const t = Math.min(1, Math.max(0, (fx + fy - 2 * margin) / (2 * (size - 2 * margin))));
            col = from.map((v, i) => v + (to[i] - v) * t);
          }
          r += col[0];
          g += col[1];
          b += col[2];
          covered++;
        }
      }
      if (!covered) continue;
      // Straight (non-premultiplied) alpha: average colour of covered samples.
      const o = (y * size + x) * 4;
      px[o] = Math.round(r / covered);
      px[o + 1] = Math.round(g / covered);
      px[o + 2] = Math.round(b / covered);
      px[o + 3] = Math.round((covered / (ss * ss)) * 255);
    }
  }
  return encodePng(size, size, px);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
