// Generates src/app/apple-icon.png (180x180) — the Hourguard clock on a brand
// disc, for iOS home-screen bookmarks. Pure Node, no image deps.
// Run: node scripts/gen-apple-icon.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const SIZE = 180;
const cx = SIZE / 2;
const cy = SIZE / 2;
const RED = [239, 68, 68];
const RED2 = [224, 48, 96];
const WHITE = [250, 250, 250];

const lerp = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

const discR = SIZE * 0.46;
const ringOuter = SIZE * 0.30;
const ringInner = SIZE * 0.245;
const handW = SIZE * 0.022;
const hour = { x: cx + Math.cos(-Math.PI / 6) * SIZE * 0.14, y: cy + Math.sin(-Math.PI / 6) * SIZE * 0.14 };
const minute = { x: cx, y: cy - SIZE * 0.19 };

const raw = Buffer.alloc(SIZE * SIZE * 4);
const setPx = (x, y, rgb, a) => {
  const i = (y * SIZE + x) * 4;
  raw[i] = rgb[0]; raw[i + 1] = rgb[1]; raw[i + 2] = rgb[2]; raw[i + 3] = a;
};

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > discR + 1) { setPx(x, y, [0, 0, 0], 0); continue; }
    let rgb = lerp(RED, RED2, (x + y) / (2 * SIZE));
    let a = d > discR ? Math.round(255 * (discR + 1 - d)) : 255;
    if (d <= ringOuter && d >= ringInner) rgb = WHITE;
    if (distToSeg(x, y, cx, cy, hour.x, hour.y) <= handW || distToSeg(x, y, cx, cy, minute.x, minute.y) <= handW) rgb = WHITE;
    if (d <= SIZE * 0.03) rgb = WHITE;
    setPx(x, y, rgb, a);
  }
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6;
const filtered = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  filtered[y * (SIZE * 4 + 1)] = 0;
  raw.copy(filtered, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(filtered, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(__dirname, '..', 'src', 'app', 'apple-icon.png');
fs.writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes, ${SIZE}x${SIZE})`);
