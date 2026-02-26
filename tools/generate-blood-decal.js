#!/usr/bin/env node
const fs = require('fs');
const zlib = require('zlib');
let seed = 99887766;
function lcg() { seed = (seed * 1664525 + 1013904223) >>> 0; return ((seed >>> 0) / 0x100000000) * 255 | 0; }
const W = 64, H = 64;
const pixels = Buffer.alloc(W * H * 4);
for (let i = 0; i < W*H*4; i += 4) { pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 0; }
for (let b = 0; b < 5; b++) {
  const cx = 8 + (lcg() % 48);
  const cy = 8 + (lcg() % 48);
  const radius = 2 + (lcg() % 4);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx*dx + dy*dy > radius*radius) continue;
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < W && y >= 0 && y < H) {
        const idx = (y * W + x) * 4;
        pixels[idx] = Math.min(255, pixels[idx] + 180);
        pixels[idx+1] = Math.min(255, pixels[idx+1] + 20);
        pixels[idx+2] = Math.min(255, pixels[idx+2] + 20);
        pixels[idx+3] = Math.min(255, pixels[idx+3] + 200);
      }
    }
  }
}
function crc32(buf) { let crc = -1; for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff]; return (crc ^ -1) >>> 0; }
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c >>> 0; }
function makeChunk(type, data) {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length, 0);
  const chunk = Buffer.concat([length, type, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data])), 0);
  return Buffer.concat([chunk, crc]);
}
const header = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
const ihdr = makeChunk(Buffer.from('IHDR'), Buffer.alloc(13).map((_,i)=>i===0?W:i===4?H:i===8?8:i===9?6:i===10?0:i===11?0:i===12?0:i));
const raw = Buffer.alloc(H * (1 + W * 4));
let pos = 0;
for (let y = 0; y < H; y++) { raw[pos++] = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; raw[pos++] = pixels[i]; raw[pos++] = pixels[i+1]; raw[pos++] = pixels[i+2]; raw[pos++] = pixels[i+3]; } }
const compressed = zlib.deflateSync(raw, { level: zlib.constants.Z_BEST_SPEED });
const idat = makeChunk(Buffer.from('IDAT'), compressed);
const iend = makeChunk(Buffer.from('IEND'), Buffer.alloc(0));
fs.writeFileSync('assets/decals/blood_0.png', Buffer.concat([header, ihdr, idat, iend]));
console.log('Generated assets/decals/blood_0.png');