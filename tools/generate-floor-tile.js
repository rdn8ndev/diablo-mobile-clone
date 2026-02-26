#!/usr/bin/env node
// Deterministic procedural 64x64 stone floor tile PNG generator
// Dependencies: Node.js built-in modules only
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

// Simple LCG for deterministic "randomness"
let seed = 12345;
function lcg() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return ((seed >>> 0) / 0x100000000) * 255 | 0;
}

const W = 64, H = 64;
const pixels = Buffer.alloc(W * H * 4); // RGBA

// Base dark stone color
const baseR = 32, baseG = 32, baseB = 36;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    // Subtle noise ±10
    let n = lcg() % 21 - 10;
    // Top-left highlight bias
    const hl = Math.max(0, 80 - (x + y) * 2);
    const r = Math.max(0, Math.min(255, baseR + n + hl * 0.2));
    const g = Math.max(0, Math.min(255, baseG + n + hl * 0.2));
    const b = Math.max(0, Math.min(255, baseB + n + hl * 0.3));
    const a = 255;
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
  }
}

// Add a few random thin cracks (dark lines)
seed = 98765; // different seed for cracks
for (let c = 0; c < 5; c++) {
  const startX = lcg() % (W-2);
  const startY = lcg() % (H-2);
  const length = 5 + (lcg() % 10);
  const dir = lcg() % 2 === 0 ? 0 : 1; // 0 = horizontal, 1 = vertical
  for (let i = 0; i < length; i++) {
    let x = startX + (dir ? 0 : i);
    let y = startY + (dir ? i : 0);
    if (x >= W || y >= H) break;
    const idx = (y * W + x) * 4;
    // darken to near black
    pixels[idx] = 10;
    pixels[idx+1] = 10;
    pixels[idx+2] = 10;
  }
}

// Simple CRC32 for PNG chunks (IEEE 802.3 polynomial)
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

// Build PNG chunks
function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const chunk = Buffer.concat([length, type, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])), 0);
  return Buffer.concat([chunk, crc]);
}

const header = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(W, 0);
ihdrData.writeUInt32BE(H, 4);
ihdrData[8] = 8; // bit depth
ihdrData[9] = 6; // color type RGBA
ihdrData[10] = 0; // compression
ihdrData[11] = 0; // filter
ihdrData[12] = 0; // interlace
const ihdr = makeChunk(Buffer.from('IHDR'), ihdrData);

// Prepare raw image data with filter byte (0) at start of each scanline
const raw = Buffer.alloc(H * (1 + W * 4));
let pos = 0;
for (let y = 0; y < H; y++) {
  raw[pos++] = 0; // filter type None
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    raw[pos++] = pixels[i];
    raw[pos++] = pixels[i+1];
    raw[pos++] = pixels[i+2];
    raw[pos++] = pixels[i+3];
  }
}
const compressed = zlib.deflateSync(raw, { level: zlib.constants.Z_BEST_SPEED });
const idat = makeChunk(Buffer.from('IDAT'), compressed);
const iend = makeChunk(Buffer.from('IEND'), Buffer.alloc(0));

const png = Buffer.concat([header, ihdr, idat, iend]);
fs.writeFileSync('assets/tiles/floor_stone_0.png', png);
console.log('Generated assets/tiles/floor_stone_0.png');
