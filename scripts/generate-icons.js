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

// Icône "Extracto" : un entonnoir qui extrait une goutte (évoque l'extraction
// de l'essentiel d'une vidéo), dessiné en 2x puis sous-échantillonné pour
// lisser les bords (anti-aliasing simple par moyenne de blocs 2x2).
// opaque=true : remplit tout le carré jusqu'aux bords (requis par iOS, qui ignore
// la transparence des apple-touch-icon et la remplace par du noir).
function isInFunnel(relX, relY) {
  const bowlTop = -0.5;
  const bowlBottom = 0.02;
  const spoutBottom = 0.34;
  const bowlTopHalfWidth = 0.62;
  const spoutHalfWidth = 0.11;

  if (relY >= bowlTop && relY <= bowlBottom) {
    const t = (relY - bowlTop) / (bowlBottom - bowlTop);
    const halfWidth = bowlTopHalfWidth + (spoutHalfWidth - bowlTopHalfWidth) * t;
    return Math.abs(relX) <= halfWidth;
  }
  if (relY > bowlBottom && relY <= spoutBottom) {
    return Math.abs(relX) <= spoutHalfWidth;
  }
  return false;
}

function isInDroplet(relX, relY) {
  const dx = relX;
  const dy = relY - 0.5;
  return dx * dx + dy * dy <= 0.1 * 0.1;
}

// petit reflet pour donner un aspect "précieux" (goutte d'or) à l'essentiel extrait
function isInHighlight(relX, relY) {
  const dx = relX + 0.035;
  const dy = relY - 0.465;
  return dx * dx + dy * dy <= 0.028 * 0.028;
}

function drawIconAt(size, { opaque = false } = {}) {
  const px = new Uint8Array(size * size * 4);
  const bg = [30, 34, 63]; // fond sombre proche de --bg de l'app
  const accent = [108, 140, 255]; // --accent : l'entonnoir (le contenu brut de la vidéo)
  const essence = [247, 181, 56]; // or chaud : la goutte extraite, "l'essentiel" mis en valeur
  const highlight = [255, 226, 173]; // reflet clair sur la goutte, effet précieux
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size * 0.46;
  const half = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let alpha = 255;
      if (!opaque && dist > outerRadius) {
        alpha = 0; // transparent hors du cercle (icône adaptable/maskable Android)
      }

      const relX = dx / (half * 0.92);
      const relY = dy / (half * 0.92);

      let color = bg;
      if (isInHighlight(relX, relY)) color = highlight;
      else if (isInDroplet(relX, relY)) color = essence;
      else if (isInFunnel(relX, relY)) color = accent;

      px[idx] = color[0];
      px[idx + 1] = color[1];
      px[idx + 2] = color[2];
      px[idx + 3] = alpha;
    }
  }
  return px;
}

// sous-échantillonne un buffer RGBA (factor x factor) -> lissage des bords
function downsample(px, sourceSize, factor) {
  const targetSize = sourceSize / factor;
  const out = new Uint8Array(targetSize * targetSize * 4);
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const srcIdx = ((y * factor + sy) * sourceSize + (x * factor + sx)) * 4;
          r += px[srcIdx];
          g += px[srcIdx + 1];
          b += px[srcIdx + 2];
          a += px[srcIdx + 3];
        }
      }
      const n = factor * factor;
      const dstIdx = (y * targetSize + x) * 4;
      out[dstIdx] = Math.round(r / n);
      out[dstIdx + 1] = Math.round(g / n);
      out[dstIdx + 2] = Math.round(b / n);
      out[dstIdx + 3] = Math.round(a / n);
    }
  }
  return out;
}

function drawIcon(size, options) {
  const SUPERSAMPLE = 4;
  const big = drawIconAt(size * SUPERSAMPLE, options);
  return downsample(big, size * SUPERSAMPLE, SUPERSAMPLE);
}

function encodePng(size, options) {
  const px = drawIcon(size, options);
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

// Icône dédiée iOS : opaque et remplie jusqu'aux bords (180x180, taille recommandée
// par Apple pour apple-touch-icon sur les iPhone récents).
{
  const buf = encodePng(180, { opaque: true });
  const file = path.join(outDir, "apple-touch-icon.png");
  fs.writeFileSync(file, buf);
  console.log(`Généré ${file} (${buf.length} octets)`);
}
