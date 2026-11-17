const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, isForegroundOnly = false) {
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const bgR = 0x6D, bgG = 0x28, bgB = 0xD9; // Purple #6D28D9

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Normalized coordinates from -1 to 1
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;

      // Draw stylized "S" mark in center
      // S shape approximated using cubic curves / segments
      let isS = false;
      const r = Math.hypot(nx, ny);

      // Top arc of S
      const topArc = (Math.hypot(nx, ny + 0.35) < 0.38 && Math.hypot(nx, ny + 0.35) > 0.22 && (nx > -0.3 || ny < -0.35));
      // Bottom arc of S
      const botArc = (Math.hypot(nx, ny - 0.35) < 0.38 && Math.hypot(nx, ny - 0.35) > 0.22 && (nx < 0.3 || ny > 0.35));
      // Middle diagonal
      const midDiag = (Math.abs(ny + 1.2 * nx) < 0.14 && Math.abs(nx) < 0.25 && Math.abs(ny) < 0.2);

      isS = topArc || botArc || midDiag;

      if (isS) {
        // White "S"
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
        rawData[pixelOffset + 3] = 255;
      } else if (isForegroundOnly) {
        // Transparent background
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      } else {
        // Purple background
        rawData[pixelOffset] = bgR;
        rawData[pixelOffset + 1] = bgG;
        rawData[pixelOffset + 2] = bgB;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const assetsDir = path.join(__dirname, '..', 'assets', 'images');

// 1. icon.png (1024x1024)
fs.writeFileSync(path.join(assetsDir, 'icon.png'), createPng(1024, 1024, false));

// 2. splash-icon.png (512x512)
fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), createPng(512, 512, true));

// 3. android foreground (432x432)
fs.writeFileSync(path.join(assetsDir, 'android-icon-foreground.png'), createPng(432, 432, true));

// 4. android background (432x432)
fs.writeFileSync(path.join(assetsDir, 'android-icon-background.png'), createPng(432, 432, false));

// 5. android monochrome (432x432)
fs.writeFileSync(path.join(assetsDir, 'android-icon-monochrome.png'), createPng(432, 432, true));

// 6. favicon.png (64x64)
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), createPng(64, 64, false));

console.log('Successfully generated purple "S" icon and splash assets!');
