import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height) {
  // A simple RGBA image buffer: Red #dc2626 with rounded border and white lightning
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Coordinate normalized to 512
      const nx = (x / width) * 512;
      const ny = (y / height) * 512;

      // Rounded rect check (rx = 112)
      let inside = true;
      const r = 112;
      if (nx < r && ny < r) {
        if ((nx - r) ** 2 + (ny - r) ** 2 > r ** 2) inside = false;
      } else if (nx > 512 - r && ny < r) {
        if ((nx - (512 - r)) ** 2 + (ny - r) ** 2 > r ** 2) inside = false;
      } else if (nx < r && ny > 512 - r) {
        if ((nx - r) ** 2 + (ny - (512 - r)) ** 2 > r ** 2) inside = false;
      } else if (nx > 512 - r && ny > 512 - r) {
        if ((nx - (512 - r)) ** 2 + (ny - (512 - r)) ** 2 > r ** 2) inside = false;
      }

      if (!inside) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0; // Transparent
        continue;
      }

      // Default red #dc2626
      let rCol = 220, gCol = 38, bCol = 38;

      // Check lightning bolt polygon: (286, 58), (126, 277), (234, 277), (218, 454), (386, 214), (278, 214)
      // Horizontal wire line: y between 354 and 374, x between 75 and 437
      if (ny >= 354 && ny <= 374 && nx >= 75 && nx <= 437) {
        rCol = 254; gCol = 226; bCol = 226; // #fee2e2
      }

      // Approximate lightning bolt
      const inBolt = (
        (nx >= 200 && nx <= 320 && ny >= 100 && ny <= 260 && (nx - 126) * 1.5 > (ny - 58)) ||
        (nx >= 210 && nx <= 330 && ny >= 240 && ny <= 400 && (nx - 218) * 1.4 < (454 - ny))
      );

      if (inBolt) {
        rCol = 255; gCol = 255; bCol = 255;
      }

      rawData[pxOffset] = rCol;
      rawData[pxOffset + 1] = gCol;
      rawData[pxOffset + 2] = bCol;
      rawData[pxOffset + 3] = 255;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const pngBuffer = createPng(512, 512);
fs.writeFileSync('public/powerline-icon.png', pngBuffer);
console.log('Successfully generated public/powerline-icon.png (512x512)');

