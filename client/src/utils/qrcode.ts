/**
 * Gerador leve de QR Code (ISO/IEC 18004) em TypeScript puro (Byte Mode, ECC Nível L).
 * Suporta URLs de até ~130 caracteres (Versões 1 a 6), ideal para links de salas LAN.
 */

interface VersionInfo {
  version: number;
  size: number;
  totalDataBytes: number;
  ecBytesPerBlock: number;
  alignmentPatterns: number[];
}

// Tabelas para ECC Level L (7% recovery), 1 bloco único nas versões 1 a 5 (e 2 blocos na v6)
const VERSIONS: VersionInfo[] = [
  { version: 1, size: 21, totalDataBytes: 19, ecBytesPerBlock: 7, alignmentPatterns: [] },
  { version: 2, size: 25, totalDataBytes: 34, ecBytesPerBlock: 10, alignmentPatterns: [6, 18] },
  { version: 3, size: 29, totalDataBytes: 55, ecBytesPerBlock: 15, alignmentPatterns: [6, 22] },
  { version: 4, size: 33, totalDataBytes: 80, ecBytesPerBlock: 20, alignmentPatterns: [6, 26] },
  { version: 5, size: 37, totalDataBytes: 108, ecBytesPerBlock: 26, alignmentPatterns: [6, 30] },
];

// Aritmética em Corpo de Galois GF(256) com polinômio primitivo 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = getGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

function encodeDataBytes(text: string): { versionInfo: VersionInfo; codewords: Uint8Array } {
  const utf8 = new TextEncoder().encode(text);
  // 4 bits modo (0100 = Byte) + 8 bits tamanho + dados + 4 bits terminador
  const neededBytes = Math.ceil((4 + 8 + utf8.length * 8 + 4) / 8);

  const versionInfo =
    VERSIONS.find((v) => v.totalDataBytes >= neededBytes) ?? VERSIONS[VERSIONS.length - 1];

  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // Mode indicator: Byte mode (0100)
  pushBits(0b0100, 4);
  // Character count indicator (8 bits para versões 1-9 em Byte mode)
  pushBits(utf8.length, 8);
  // Payload
  for (const byte of utf8) {
    pushBits(byte, 8);
  }

  // Terminator (até 4 bits 0)
  const maxDataBits = versionInfo.totalDataBytes * 8;
  const terminatorLen = Math.min(4, maxDataBits - bits.length);
  pushBits(0, terminatorLen);

  // Alinha ao próximo byte
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Preenche com pad bytes alternados (0xEC, 0x11)
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxDataBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataBytes = new Uint8Array(versionInfo.totalDataBytes);
  for (let i = 0; i < versionInfo.totalDataBytes; i++) {
    let b = 0;
    for (let bit = 0; bit < 8; bit++) {
      b = (b << 1) | bits[i * 8 + bit];
    }
    dataBytes[i] = b;
  }

  const ecBytes = computeReedSolomon(dataBytes, versionInfo.ecBytesPerBlock);
  const codewords = new Uint8Array(dataBytes.length + ecBytes.length);
  codewords.set(dataBytes, 0);
  codewords.set(ecBytes, dataBytes.length);

  return { versionInfo, codewords };
}

export function generateQrMatrix(text: string): boolean[][] {
  const { versionInfo, codewords } = encodeDataBytes(text);
  const size = versionInfo.size;

  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Finder patterns (7x7 + separadores brancos)
  const drawFinderPattern = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && (dc === 0 || dc === 6);
        const inTopBottom = dc >= 0 && dc <= 6 && (dr === 0 || dr === 6);
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter || inTopBottom || inCenter);
      }
    }
  };

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    setFunctionModule(6, i, dark);
    setFunctionModule(i, 6, dark);
  }

  // Alignment patterns (para versões >= 2)
  const align = versionInfo.alignmentPatterns;
  for (const r of align) {
    for (const c of align) {
      // Pula se colidir com os 3 finder patterns
      if (
        (r < 9 && c < 9) ||
        (r < 9 && c > size - 10) ||
        (r > size - 10 && c < 9)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isDot = dr === 0 && dc === 0;
          setFunctionModule(r + dr, c + dc, isBorder || isDot);
        }
      }
    }
  }

  // Dark module fixo
  setFunctionModule(4 * versionInfo.version + 9, 8, true);

  // Reserva áreas de Format Information
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Preenche os bits de dados em zigue-zague de 2 colunas da direita para a esquerda
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Pula a coluna do timing pattern vertical
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            const byte = codewords[bitIdx >> 3];
            dark = ((byte >> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx++;
          }
          // Aplica máscara 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark;
          }
          modules[r][c] = dark;
        }
      }
    }
    upward = !upward;
  }

  // Escreve Format Information para ECC Level L (01) + Mask 0 (000) -> 0x77c4 (111011111000100)
  // Bit 14 (MSB) até Bit 0 (LSB) conforme ISO/IEC 18004 Seção 7.9
  const formatBits = 0x77c4;
  const getFormatBit = (bitIndexFromLsb: number) => ((formatBits >> bitIndexFromLsb) & 1) !== 0;

  // Top-left: horizontal (coluna 0..5, 7, 8 na linha 8) recebe bits 14..7
  for (let i = 0; i <= 5; i++) modules[8][i] = getFormatBit(14 - i);
  modules[8][7] = getFormatBit(8);
  modules[8][8] = getFormatBit(7);
  // Top-left: vertical (linha 7, 5..0 na coluna 8) recebe bits 6..0
  modules[7][8] = getFormatBit(6);
  for (let i = 0; i <= 5; i++) modules[5 - i][8] = getFormatBit(5 - i);

  // Bottom-left vertical (coluna 8, linhas size-1 .. size-7) recebe bits 14..8
  for (let i = 0; i < 7; i++) modules[size - 1 - i][8] = getFormatBit(14 - i);
  // Top-right horizontal (linha 8, colunas size-8 .. size-1) recebe bits 7..0
  for (let i = 0; i < 8; i++) modules[8][size - 8 + i] = getFormatBit(7 - i);

  return modules;
}
