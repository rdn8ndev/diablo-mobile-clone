#!/usr/bin/env node
// Generate 64x64 dark wall stone tile with blocky pattern, edge shading, noise
const fs = require('fs');
const zlib = require('zlib');

// LCG for deterministic noise
let seed = 98765;
function lcg() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return ((seed >>> 0) / 0x100000000) * 255 | 0;
}

const W = 64, H = 64;
const pixels = Buffer.alloc(W * H * 4);

// Base dark stone color (darker than floor)
const baseR = 24, baseG = 24, baseB = 28;
// Edge shading amount
const edgeShade = 45;

// Draw blocky stones pattern: each tile ~8x8 blocks with irregular edges
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    // Determine block
    const blockX = Math.floor(x / 8);
    const blockY = Math.floor(y / 8);
    // Pseudo-random offset to give block variation based on block coordinates
    const blockSeed = (blockX * 49297 + blockY * 9301 + 12345) >>> 0;
    // Edge darkness: if pixel near block edge, darken
    const withinX = x % 8;
    const withinY = y % 8;
    const edgeDist = Math.min(withinX, 7 - withinX, withinY, 7 - withinY);
    const edgeFactor = edgeDist < 2 ? (2 - edgeDist) * -edgeShade : 0;
    // Noise
    const noise = lcg() % 17 - 8; // ±8
    // Base variation per block
    const blockNoise = (blockSeed % 21) - 10;
    const r = Math.max(0, Math.min(255, baseR + noise + blockNoise + edgeFactor));
    const g = Math.max(0, Math.min(255, baseG + noise + blockNoise + edgeFactor));
    const b = Math.max(0, Math.min(255, baseB + noise + blockNoise + edgeFactor));
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = 255;
  }
}

// Add subtle noise overlay (additional light/dark speckles)
seed = 55555;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (lcg() % 10 < 3) { // 30% of pixels
      const speck = lcg() % 20 - 10;
      pixels[i] = Math.max(0, Math.min(255, pixels[i] + speck));
      pixels[i+1] = Math.max(0, Math.min(255, pixels[i+1] + speck));
      pixels[i+2] = Math.max(0, Math.min(255, pixels[i+2] + speck));
    }
  }
}

// CRC32
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

// PNG
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
ihdrData[8] = 8; ihdrData[9] = 6; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
const ihdr = makeChunk(Buffer.from('IHDR'), ihdrData);
const raw = Buffer.alloc(H * (1 + W * 4));
let pos = 0;
for (let y = 0; y < H; y++) {
  raw[pos++] = 0;
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
fs.writeFileSync('assets/tiles/wall_stone_0.png', png);
console.log('Generated assets/tiles/wall_stone_0.png');