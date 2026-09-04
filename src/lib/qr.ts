/**
 * A QR encoder, byte mode, versions 1–10.
 *
 * This exists because the alternative is a dependency or a network round trip,
 * and both are wrong for what a QR code usually carries. The two things you
 * most often encode are a TOTP enrolment URL and a wallet address — a secret
 * and a payment destination. Sending either to `api.qrserver.com` to be drawn
 * hands it to a third party, and a QR generated somewhere else is a QR you
 * cannot verify. It is about 200 lines to do properly, so it is done properly.
 *
 * Versions 1–10 hold 271 bytes at level L and 213 at level M, which covers
 * `otpauth://` URLs, addresses, and short links. Past that the modules get too
 * small to scan off a screen anyway, and `encodeQr` throws rather than silently
 * truncating a secret.
 *
 * Mask selection is the real spec, not a fixed pattern: all eight are scored by
 * the four penalty rules and the best is used. Scanners genuinely fail on a bad
 * mask, and "mask 0 always" is the usual shortcut that makes a code that reads
 * on one phone and not another.
 */

/** Error correction level. Higher recovers more damage and holds less data. */
export type EccLevel = 'L' | 'M' | 'Q' | 'H'

/* --------------------------------------------------------- Galois field */

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)

{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    // x^8 + x^4 + x^3 + x^2 + 1, the field polynomial QR is defined over.
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}

const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

/** Reed–Solomon generator polynomial, highest degree first. */
function generator(degree: number): number[] {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= mul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

/** The remainder — the error correction codewords for one block. */
function remainder(data: Uint8Array, degree: number): Uint8Array {
  const gen = generator(degree)
  const buffer = new Uint8Array(data.length + degree)
  buffer.set(data)

  for (let i = 0; i < data.length; i++) {
    const factor = buffer[i]
    if (factor === 0) continue
    // gen[0] is 1, so this clears buffer[i] as it goes.
    for (let j = 0; j < gen.length; j++) buffer[i + j] ^= mul(gen[j], factor)
  }
  return buffer.slice(data.length)
}

/* ------------------------------------------------------------- capacity */

/**
 * Per version and level: EC codewords per block, then the two block groups as
 * (count, data codewords). Group two is empty when every block is the same size.
 */
const BLOCKS: Record<EccLevel, number[][]> = {
  L: [
    [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0], [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0], [18, 2, 68, 2, 69],
  ],
  M: [
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
  ],
  Q: [
    [13, 1, 13, 0, 0], [22, 1, 22, 0, 0], [18, 2, 17, 0, 0], [26, 2, 24, 0, 0],
    [18, 2, 15, 2, 16], [24, 4, 19, 0, 0], [18, 2, 14, 4, 15], [22, 4, 18, 2, 19],
    [20, 4, 16, 4, 17], [24, 6, 19, 2, 20],
  ],
  H: [
    [17, 1, 9, 0, 0], [28, 1, 16, 0, 0], [22, 2, 13, 0, 0], [16, 4, 9, 0, 0],
    [22, 2, 11, 2, 12], [28, 4, 15, 0, 0], [26, 4, 13, 1, 14], [26, 4, 14, 2, 15],
    [24, 4, 12, 4, 13], [28, 6, 15, 2, 16],
  ],
}

/** Alignment pattern centres, by version. */
const ALIGNMENT: number[][] = [
  [], [6, 18], [6, 22], [6, 26], [6, 30],
  [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
]

const ECC_BITS: Record<EccLevel, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 }

const dataCapacity = (version: number, level: EccLevel) => {
  const [, count1, size1, count2, size2] = BLOCKS[level][version - 1]
  return count1 * size1 + count2 * size2
}

/* -------------------------------------------------------------- encoding */

/** Bit-level writer. QR is a bit stream that only becomes bytes at the end. */
class Bits {
  private bits: number[] = []

  push(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >> i) & 1)
  }

  get length() {
    return this.bits.length
  }

  toBytes(): Uint8Array {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8))
    this.bits.forEach((bit, index) => {
      if (bit) out[index >> 3] |= 0x80 >> (index & 7)
    })
    return out
  }
}

/** The data codewords, interleaved with their error correction, as one stream. */
function codewords(text: string, version: number, level: EccLevel): Uint8Array {
  const bytes = new TextEncoder().encode(text)
  const capacity = dataCapacity(version, level)
  const bits = new Bits()

  bits.push(0b0100, 4) // byte mode
  bits.push(bytes.length, version >= 10 ? 16 : 8)
  for (const byte of bytes) bits.push(byte, 8)

  // Terminator, then pad to a whole byte, then the two alternating pad bytes.
  bits.push(0, Math.min(4, capacity * 8 - bits.length))
  if (bits.length % 8) bits.push(0, 8 - (bits.length % 8))

  const encoded = bits.toBytes()
  const data = new Uint8Array(capacity)
  data.set(encoded)
  // The spec's two pad bytes, alternating, until the block is full.
  for (let i = encoded.length; i < capacity; i++) {
    data[i] = (i - encoded.length) % 2 === 0 ? 0xec : 0x11
  }

  // Split into blocks, compute EC per block, then interleave both — the spec
  // spreads a burst of damage across every block rather than destroying one.
  const [ecLength, count1, size1, count2, size2] = BLOCKS[level][version - 1]
  const blocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  let offset = 0

  for (let i = 0; i < count1 + count2; i++) {
    const size = i < count1 ? size1 : size2
    const block = data.slice(offset, offset + size)
    offset += size
    blocks.push(block)
    ecBlocks.push(remainder(block, ecLength))
  }

  const out: number[] = []
  for (let i = 0; i < Math.max(size1, size2); i++) {
    for (const block of blocks) if (i < block.length) out.push(block[i])
  }
  for (let i = 0; i < ecLength; i++) for (const block of ecBlocks) out.push(block[i])

  return new Uint8Array(out)
}

/* ------------------------------------------------------------ the matrix */

type Grid = { modules: boolean[][]; reserved: boolean[][]; size: number }

function blank(version: number): Grid {
  const size = version * 4 + 17
  return {
    size,
    modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    reserved: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
  }
}

function place(grid: Grid, x: number, y: number, dark: boolean, reserve = true) {
  if (x < 0 || y < 0 || x >= grid.size || y >= grid.size) return
  grid.modules[y][x] = dark
  if (reserve) grid.reserved[y][x] = true
}

function patterns(grid: Grid, version: number) {
  const { size } = grid

  // Finders, with their separators.
  for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
        const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6
        place(grid, ox + x, oy + y, inside && (edge || core))
      }
    }
  }

  // Timing.
  for (let i = 8; i < size - 8; i++) {
    place(grid, i, 6, i % 2 === 0)
    place(grid, 6, i, i % 2 === 0)
  }

  // Alignment, skipping the three that would sit on a finder.
  const centres = ALIGNMENT[version - 1]
  for (const cy of centres) {
    for (const cx of centres) {
      const onFinder =
        (cx === 6 && cy === 6) ||
        (cx === 6 && cy === size - 7) ||
        (cx === size - 7 && cy === 6)
      if (onFinder) continue
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          place(grid, cx + x, cy + y, Math.max(Math.abs(x), Math.abs(y)) !== 1)
        }
      }
    }
  }

  // The dark module, and the reserved format areas.
  place(grid, 8, size - 8, true)
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      place(grid, i, 8, false)
      place(grid, 8, i, false)
    }
  }
  for (let i = 0; i < 8; i++) place(grid, size - 1 - i, 8, false)
  // Seven, not eight: the eighth is the dark module placed just above, and the
  // second format copy starts at size - 7.
  for (let i = 0; i < 7; i++) place(grid, 8, size - 1 - i, false)

  // Version information, v7 and up: BCH(18,6) with generator 0x1f25.
  if (version >= 7) {
    let value = version << 12
    let rest = value
    for (let i = 0; i < 6; i++) {
      if (rest & (1 << (17 - i))) rest ^= 0x1f25 << (5 - i)
    }
    value |= rest & 0xfff

    for (let i = 0; i < 18; i++) {
      const bit = ((value >> i) & 1) === 1
      place(grid, i % 3 + size - 11, Math.floor(i / 3), bit)
      place(grid, Math.floor(i / 3), i % 3 + size - 11, bit)
    }
  }
}

/** The zigzag walk: two columns at a time, right to left, skipping column 6. */
function fill(grid: Grid, stream: Uint8Array) {
  const { size } = grid
  let index = 0
  let upward = true

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step
      for (const x of [right, right - 1]) {
        if (grid.reserved[y][x]) continue
        const dark = index < stream.length * 8 && ((stream[index >> 3] >> (7 - (index & 7))) & 1) === 1
        grid.modules[y][x] = dark
        index++
      }
    }
    upward = !upward
  }
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
]

/**
 * The four penalty rules. A high score means a pattern a scanner may misread —
 * runs of one colour, solid blocks, something that looks like a finder, or an
 * unbalanced share of dark modules.
 */
function penalty(grid: Grid): number {
  const { size, modules } = grid
  let score = 0

  const runScore = (run: number) => (run >= 5 ? 3 + (run - 5) : 0)

  for (let i = 0; i < size; i++) {
    let rowRun = 1
    let colRun = 1
    for (let j = 1; j < size; j++) {
      rowRun = modules[i][j] === modules[i][j - 1] ? rowRun + 1 : (score += runScore(rowRun), 1)
      colRun = modules[j][i] === modules[j - 1][i] ? colRun + 1 : (score += runScore(colRun), 1)
    }
    score += runScore(rowRun) + runScore(colRun)
  }

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const value = modules[y][x]
      if (value === modules[y][x + 1] && value === modules[y + 1][x] && value === modules[y + 1][x + 1]) {
        score += 3
      }
    }
  }

  // 1:1:3:1:1 with four light modules either side — the finder signature.
  const finder = [true, false, true, true, true, false, true]
  const matches = (get: (i: number) => boolean, at: number) =>
    finder.every((want, i) => get(at + i) === want)

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - 6; j++) {
      const row = (k: number) => modules[i][k]
      const col = (k: number) => modules[k][i]
      for (const get of [row, col]) {
        if (!matches(get, j)) continue
        const before = Array.from({ length: 4 }, (_, k) => j - 1 - k).every(
          (k) => k < 0 || !get(k),
        )
        const after = Array.from({ length: 4 }, (_, k) => j + 7 + k).every(
          (k) => k >= size || !get(k),
        )
        if (before || after) score += 40
      }
    }
  }

  const dark = modules.flat().filter(Boolean).length
  const percent = (dark * 100) / (size * size)
  score += Math.floor(Math.abs(percent - 50) / 5) * 10

  return score
}

/** Format information: BCH(15,5) with generator 0x537, XORed with 0x5412. */
function formatBits(level: EccLevel, mask: number): number {
  const value = (ECC_BITS[level] << 3) | mask
  let rest = value << 10
  for (let i = 0; i < 5; i++) {
    if (rest & (1 << (14 - i))) rest ^= 0x537 << (4 - i)
  }
  return ((value << 10) | (rest & 0x3ff)) ^ 0x5412
}

function writeFormat(grid: Grid, level: EccLevel, mask: number) {
  const bits = formatBits(level, mask)
  const { size } = grid

  for (let i = 0; i < 15; i++) {
    const dark = ((bits >> i) & 1) === 1
    // Copy one: down the left edge and along the top, skipping the timing row.
    if (i < 6) place(grid, 8, i, dark)
    else if (i < 8) place(grid, 8, i + 1, dark)
    else if (i === 8) place(grid, 7, 8, dark)
    else place(grid, 14 - i, 8, dark)

    // Copy two, so a damaged corner does not cost the whole code.
    if (i < 8) place(grid, size - 1 - i, 8, dark)
    else place(grid, 8, size - 15 + i, dark)
  }
}

/* ---------------------------------------------------------------- public */

export type QrMatrix = {
  /** Row-major, `true` is a dark module. Square, and quiet zone not included. */
  modules: boolean[][]
  size: number
  version: number
  level: EccLevel
  mask: number
}

/**
 * Encode text as a QR matrix.
 *
 * Throws when the text does not fit version 10 at the requested level, rather
 * than truncating — a half-written TOTP secret scans fine and enrols nothing.
 */
export function encodeQr(text: string, level: EccLevel = 'M'): QrMatrix {
  const length = new TextEncoder().encode(text).length

  const version = (() => {
    for (let candidate = 1; candidate <= 10; candidate++) {
      // Byte mode overhead: 4 mode bits plus the character count field.
      const overhead = 4 + (candidate >= 10 ? 16 : 8)
      if (length * 8 + overhead <= dataCapacity(candidate, level) * 8) return candidate
    }
    return 0
  })()

  if (version === 0) {
    throw new RangeError(
      `${length} bytes does not fit a version 10 QR at level ${level} (max ${dataCapacity(10, level)}).`,
    )
  }

  const stream = codewords(text, version, level)

  let best: Grid | null = null
  let bestMask = 0
  let bestScore = Infinity

  for (let mask = 0; mask < 8; mask++) {
    const grid = blank(version)
    patterns(grid, version)
    fill(grid, stream)

    for (let y = 0; y < grid.size; y++) {
      for (let x = 0; x < grid.size; x++) {
        if (!grid.reserved[y][x] && MASKS[mask](x, y)) grid.modules[y][x] = !grid.modules[y][x]
      }
    }
    writeFormat(grid, level, mask)

    const score = penalty(grid)
    if (score < bestScore) {
      bestScore = score
      best = grid
      bestMask = mask
    }
  }

  const grid = best as Grid
  return { modules: grid.modules, size: grid.size, version, level, mask: bestMask }
}
