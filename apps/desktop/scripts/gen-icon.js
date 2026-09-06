// Generates resources/icon.png — a brand-red disc with a white clock mark, the
// Hourguard logo. Pure Node (no image deps): rasterizes RGBA then encodes PNG.
// Run: node scripts/gen-icon.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const cx = SIZE / 2;
const cy = SIZE / 2;

// Brand palette
const RED = [239, 68, 68];
const RED2 = [224, 48, 96];
const WHITE = [250, 250, 250];

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Distance from point to a line segment (for the clock hands).
function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return Math.hypot(px - nx, py - ny);
}

const discR = SIZE * 0.46;
const ringOuter = SIZE * 0.30;
const ringInner = SIZE * 0.245;
const handW = SIZE * 0.022;

// Clock hands: hour hand to ~2 o'clock, minute hand up.
const hour = { x: cx + Math.cos(-Math.PI / 6) * SIZE * 0.14, y: cy + Math.sin(-Math.PI / 6) * SIZE * 0.14 };
const minute = { x: cx, y: cy - SIZE * 0.19 };

const raw = Buffer.alloc(SIZE * SIZE * 4);

function setPx(x, y, rgb, a) {
  const i = (y * SIZE + x) * 4;
  raw[i] = rgb[0];
  raw[i + 1] = rgb[1];
  raw[i + 2] = rgb[2];
  raw[i + 3] = a;
}

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const d = Math.hypot(x - cx, y - cy);

    // Outside the disc → transparent (with 1px antialias edge).
    if (d > discR + 1) {
      setPx(x, y, [0, 0, 0], 0);
      continue;
    }

    // Disc fill: diagonal red gradient.
    const t = (x + y) / (2 * SIZE);
    let rgb = lerp(RED, RED2, t);
    let a = 255;
    if (d > discR) a = Math.round(255 * (discR + 1 - d)); // edge AA

    // White ring (clock face outline).
    if (d <= ringOuter && d >= ringInner) {
      rgb = WHITE;
    }

    // White clock hands.
    const dh = distToSeg(x, y, cx, cy, hour.x, hour.y);
    const dm = distToSeg(x, y, cx, cy, minute.x, minute.y);
    if (dh <= handW || dm <= handW) {
      rgb = WHITE;
    }

    // Center hub.
    if (d <= SIZE * 0.03) rgb = WHITE;

    setPx(x, y, rgb, a);
  }
}

// --- Minimal PNG encoder ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

// Add a filter byte (0) at the start of each scanline.
const filtered = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  filtered[y * (SIZE * 4 + 1)] = 0;
  raw.copy(filtered, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const idat = zlib.deflateSync(filtered, { level: 9 });

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, '..', 'resources');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.png'), png);
console.log(`Wrote resources/icon.png (${png.length} bytes, ${SIZE}x${SIZE})`);
