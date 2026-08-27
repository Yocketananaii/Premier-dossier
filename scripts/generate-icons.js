// Génère des icônes PNG (192x192 et 512x512) pour le manifest PWA,
// sans dépendance externe : encodeur PNG minimal (RGBA, sans filtre).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// dessine l'icône dans un buffer RGBA (accent bleu + triangle "lecture" blanc arrondi)
function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const bg = [30, 34, 63]; // fond sombre proche de --bg de l'app
  const accent = [108, 140, 255]; // --accent
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.46;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let color = bg;
      let alpha = 255;

      if (dist > radius) {
        alpha = 0; // transparent hors du cercle (icône adaptable/maskable)
      } else {
        // triangle "play" centré, pointant vers la droite
        const triSize = size * 0.32;
        const relX = (x - cx) / triSize;
        const relY = (y - cy) / triSize;
        const inTriangle = relX >= -0.5 && relX <= 0.75 && Math.abs(relY) <= (0.75 - relX) * 0.85;
        color = inTriangle ? accent : bg;
      }

      px[idx] = color[0];
      px[idx + 1] = color[1];
      px[idx + 2] = color[2];
      px[idx + 3] = alpha;
    }
  }
  return px;
}

function encodePng(size) {
  const px = drawIcon(size);
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // pas de filtre
    px.subarray(y * size * 4, (y + 1) * size * 4).forEach((byte, i) => {
      raw[rowStart + 1 + i] = byte;
    });
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const buf = encodePng(size);
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`Généré ${file} (${buf.length} octets)`);
}
