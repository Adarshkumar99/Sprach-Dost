/**
 * Sec-MS-GEC v2 token generation for Microsoft Edge's online TTS service.
 *
 * Ported from rany2/edge-tts (Python) drm.py — Microsoft made the v2 token
 * format mandatory in October 2026; v1 tokens are rejected with a failed
 * WebSocket upgrade.
 *
 * Verified against the captured test vector:
 *   v2(1791888000) === "492D7694A183A45E-56E821F95D4579C5B7C7E33DC7303FF379EC36D510213555BBBB9EB17EF15876"
 */

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export const SEC_MS_GEC_VERSION = "2-143.0.3650.75";
export { TRUSTED_CLIENT_TOKEN };

const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;

const U32 = 0xffffffffn;

/* FIPS 180-4 SHA-256 initial state */
const SHA256_INITIAL = [
  0x6a09e667n, 0xbb67ae85n, 0x3c6ef372n, 0xa54ff53an,
  0x510e527fn, 0x9b05688cn, 0x1f83d9abn, 0x5be0cd19n,
];
/* Customised initial state for the v2 token hash */
const SHA256_STATE = [
  0xfd9fbea2n, 0x91243ce7n, 0xbe499094n, 0xcd2e1e0an,
  0x6c006f49n, 0x04bd35abn, 0xfeb0a7e4n, 0x03effbd2n,
];
const SHA256_SCHEDULE = [
  0xeb24bf9en, 0x1558691fn, 0xa0c09ee2n, 0x0cfa32ban,
  0xa622ee8cn, 0xd1dd9491n, 0xc0dd25a0n, 0xf9e70ab6n,
  0xf0c31573n, 0x7058ce4en, 0x7188e606n, 0x00e5ab33n,
  0xd258b060n, 0x72766564n,
];
const SHA256_ROUND_CONSTANTS = [
  0x428a2f98n, 0x71374491n, 0xb5c0fbcfn, 0xe9b5dba5n,
  0x3956c25bn, 0x59f111f1n, 0x923f82a4n, 0xab1c5ed5n,
  0xd807aa98n, 0x12835b01n, 0x243185ben, 0x550c7dc3n,
  0x72be5d74n, 0x80deb1fen, 0x9bdc06a7n, 0xc19bf174n,
  0xe49b69c1n, 0xefbe4786n, 0x0fc19dc6n, 0x240ca1ccn,
  0x2de92c6fn, 0x4a7484aan, 0x5cb0a9dcn, 0x76f988dan,
  0x983e5152n, 0xa831c66dn, 0xb00327c8n, 0xbf597fc7n,
  0xc6e00bf3n, 0xd5a79147n, 0x06ca6351n, 0x14292967n,
  0x27b70a85n, 0x2e1b2138n, 0x4d2c6dfcn, 0x53380d13n,
  0x650a7354n, 0x766a0abbn, 0x81c2c92en, 0x92722c85n,
  0xa2bfe8a1n, 0xa81a664bn, 0xc24b8b70n, 0xc76c51a3n,
  0xd192e819n, 0xd6990624n, 0xf40e3585n, 0x106aa070n,
  0x19a4c116n, 0x1e376c08n, 0x2748774cn, 0x34b0bcb5n,
  0x391c0cb3n, 0x4ed8aa4an, 0x5b9cca4fn, 0x682e6ff3n,
  0x748f82een, 0x78a5636fn, 0x84c87814n, 0x8cc70208n,
  0x90befffan, 0xa4506cebn, 0xbef9a3f7n, 0xc67178f2n,
];

const SHA256_ADJUSTMENT = 0xc9dc06a7n;
const SHA256_BLOCK_CONSTANTS = [
  ...SHA256_ROUND_CONSTANTS.slice(0, 14),
  SHA256_ADJUSTMENT,
  ...SHA256_ROUND_CONSTANTS.slice(15),
];
const SHA256_SIGMA0_ADJUSTMENT = 0x059c0b80n;
const SHA256_SIGMA1_ADJUSTMENT = 0x000b92c0n;

const CS64_COEFFICIENTS: [bigint, bigint][] = [
  [0xe82e91b1n, 0xb32700d0n],
  [0x44de24c6n, 0x88dff51dn],
  [0x3beb65bcn, 0x29514038n],
  [0xc89c5933n, 0xb328cbdfn],
  [0x8d1ec211n, 0xd405b4d5n],
  [0x314ef5d5n, 0x26e55f3cn],
  [0xe92491b1n, 0x607801c6n],
  [0xf0a5b9d5n, 0x82b2c1fbn],
  [0x06064cf3n, 0xfa51a3dan],
  [0xda79fa60n, 0x207cc464n],
  [0xbed20560n, 0x3c3c74f3n],
  [0x89f9c9f8n, 0xd2d14b61n],
  [0x35fa38c6n, 0xbb04a2c1n],
  [0xcb49e3c6n, 0xc5626167n],
];
const CS64_FACTOR = 0x82893933n;
const CS64_ADJUSTMENT0 = 0xf2f90b1an;
const CS64_ADJUSTMENT1 = 0x0b1a0000n;

function rol16(value: bigint): bigint {
  value &= U32;
  return ((value << 16n) | (value >> 16n)) & U32;
}

/* little-endian 32-bit words, zero-padded to an even count */
function wordsLe4Even(data: Buffer): bigint[] {
  const padded = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)]);
  const words: bigint[] = [];
  for (let i = 0; i < padded.length; i += 4) words.push(BigInt(padded.readUInt32LE(i)));
  if (words.length % 2) words.push(0n);
  return words;
}

/* SHA-256 small sigma, truncating the combined rotations once */
function sigma0(value: bigint): bigint {
  return ((value >> 7n) ^ (value << 25n) ^ (value >> 18n) ^ (value << 14n) ^ (value >> 3n)) & U32;
}
function sigma1(value: bigint): bigint {
  return ((value >> 17n) ^ (value << 15n) ^ (value >> 19n) ^ (value << 13n) ^ (value >> 10n)) & U32;
}

/* run SHA-256 rounds, optionally resuming inside the first block */
function sha256Rounds(state: bigint[], words: bigint[], firstRound = 0): bigint[] {
  let [a, b, c, d, e, f, g, h] = state;
  const constants = firstRound === 14 ? SHA256_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS;
  const aligned = Math.min(64, Math.floor((firstRound + 7) / 8) * 8);
  for (let index = firstRound; index < aligned; index++) {
    const rotE = e * 0x100000001n;
    const rotA = a * 0x100000001n;
    const t1 =
      h +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (g ^ (e & (f ^ g))) +
      constants[index] +
      words[index];
    const t2 = ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((a & b) | (c & (a | b)));
    [a, b, c, d, e, f, g, h] = [(t1 + t2) & U32, a, b, c, (d + t1) & U32, e, f, g];
  }
  for (let index = aligned; index < 64; index += 8) {
    let rotE = e * 0x100000001n;
    let rotA = a * 0x100000001n;
    let t1 =
      h +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (g ^ (e & (f ^ g))) +
      constants[index] +
      words[index];
    d = (d + t1) & U32;
    h = (t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((a & b) | (c & (a | b)))) & U32;

    rotE = d * 0x100000001n;
    rotA = h * 0x100000001n;
    t1 =
      g +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (f ^ (d & (e ^ f))) +
      constants[index + 1] +
      words[index + 1];
    c = (c + t1) & U32;
    g = (t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((h & a) | (b & (h | a)))) & U32;

    rotE = c * 0x100000001n;
    rotA = g * 0x100000001n;
    t1 =
      f +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (e ^ (c & (d ^ e))) +
      constants[index + 2] +
      words[index + 2];
    b = (b + t1) & U32;
    f = (t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((g & h) | (a & (g | h)))) & U32;

    rotE = b * 0x100000001n;
    rotA = f * 0x100000001n;
    t1 =
      e +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (d ^ (b & (c ^ d))) +
      constants[index + 3] +
      words[index + 3];
    a = (a + t1) & U32;
    e = (t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((f & g) | (h & (f | g)))) & U32;

    rotE = a * 0x100000001n;
    rotA = e * 0x100000001n;
    t1 =
      d +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (c ^ (a & (b ^ c))) +
      constants[index + 4] +
      words[index + 4];
    h = (h + t1) & U32;
    d = (t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((e & f) | (g & (e | f)))) & U32;

    rotE = h * 0x100000001n;
    rotA = d * 0x100000001n;
    t1 =
      c +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (b ^ (h & (a ^ b))) +
      constants[index + 5] +
      words[index + 5];
    g = (g + t1) & U32;
    c = (t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((d & e) | (f & (d | e)))) & U32;

    rotE = g * 0x100000001n;
    rotA = c * 0x100000001n;
    t1 =
      b +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (a ^ (g & (h ^ a))) +
      constants[index + 6] +
      words[index + 6];
    f = (f + t1) & U32;
    b = (t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((c & d) | (e & (c | d)))) & U32;

    rotE = f * 0x100000001n;
    rotA = b * 0x100000001n;
    t1 =
      a +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (h ^ (f & (g ^ h))) +
      constants[index + 7] +
      words[index + 7];
    e = (e + t1) & U32;
    a = (t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((b & c) | (d & (b | c)))) & U32;
  }
  return [a, b, c, d, e, f, g, h];
}

/* expand SHA-256 words, combining rotations before modular addition */
function expandSha256Schedule(words: bigint[], firstWord = 16): void {
  for (let index = firstWord; index < 64; index++) {
    const x = words[index - 2];
    const y = words[index - 15];
    const sig1 = (x >> 17n) ^ (x << 15n) ^ (x >> 19n) ^ (x << 13n) ^ (x >> 10n);
    const sig0 = (y >> 7n) ^ (y << 25n) ^ (y >> 18n) ^ (y << 14n) ^ (y >> 3n);
    words.push((sig1 + words[index - 7] + sig0 + words[index - 16]) & U32);
  }
}

/* initial SHA-256 state for the token data */
function sha256Init(data: Buffer): bigint[] {
  const words: bigint[] = [
    ...Array<bigint>(14).fill(0n),
    BigInt(data.readUIntBE(0, 3)),
    BigInt(data.readUIntBE(3, 4)),
  ];
  for (let index = 16; index < 30; index++) {
    let value = SHA256_SCHEDULE[index - 16];
    if (index - 2 >= 14) {
      value += index === 16 ? (sigma1(words[index - 2]) ^ SHA256_SIGMA1_ADJUSTMENT) : sigma1(words[index - 2]);
    }
    if (index - 7 >= 14) value += words[index - 7];
    if (index - 15 >= 14) {
      value += index === 29 ? (sigma0(words[index - 15]) ^ SHA256_SIGMA0_ADJUSTMENT) : sigma0(words[index - 15]);
    }
    words.push(value & U32);
  }
  words.push(
    (sigma1(words[28]) + words[23] + sigma0(words[15]) + words[14] + SHA256_ADJUSTMENT - SHA256_ROUND_CONSTANTS[14]) & U32
  );
  expandSha256Schedule(words, 31);
  const working = sha256Rounds(SHA256_STATE, words, 14);
  return SHA256_INITIAL.map((x, i) => (x + working[i]) & U32);
}

/* SHA-256 digest for the token data (single/multi block) */
function sha256Digest(data: Buffer): Buffer {
  const length = 57 + data.length;
  const padding = Buffer.alloc(((55 - length) % 64 + 64) % 64);
  const padded = Buffer.concat([
    data.subarray(7),
    Buffer.from([0x80]),
    padding,
    (() => {
      const b = Buffer.alloc(8);
      b.writeBigUInt64BE(BigInt(length) * 8n);
      return b;
    })(),
  ]);
  let state = sha256Init(data.subarray(0, 7));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words: bigint[] = [];
    for (let i = 0; i < 16; i++) words.push(BigInt(padded.readUInt32BE(offset + i * 4)));
    expandSha256Schedule(words);
    const working = sha256Rounds(state, words);
    state = state.map((x, i) => (x + working[i]) & U32);
  }
  const out = Buffer.alloc(32);
  state.forEach((w, i) => out.writeUInt32BE(Number(w), i * 4));
  return out;
}

/* CS64 digest words for the token data */
function cs64Digest(data: Buffer, digest: Buffer): [bigint, bigint] {
  let keyA = BigInt(digest.readUInt32LE(0));
  let keyB = BigInt(digest.readUInt32LE(4));
  keyA |= 1n;
  keyB |= 1n;
  const factors: [bigint, bigint] = [(keyA * CS64_FACTOR) & U32, (keyB * CS64_FACTOR) & U32];
  const terms: bigint[] = CS64_COEFFICIENTS.map(([coef], i) => (coef * factors[i % 2]) & U32);
  const offsets: bigint[] = CS64_COEFFICIENTS.map(([, off]) => off);
  const dataWords = wordsLe4Even(Buffer.concat([Buffer.from([0]), data]));
  dataWords.forEach((word, index) => {
    let term = word * (index % 2 === 0 ? keyA : keyB);
    let offset = rol16(word) * BigInt(index % 2 === 0 ? 0xef0569fb : 0xc31713db);
    if (index === 0) {
      term += CS64_ADJUSTMENT0 * factors[0];
      offset += CS64_ADJUSTMENT1;
    }
    terms.push(term & U32);
    offsets.push(offset & U32);
  });

  let swapAcc = 0n;
  let swapLast = 0n;
  let state = 0n;
  let acc = 0n;
  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index];
    const y = terms[index + 1];
    let t = rol16((offsets[index] + x) & U32);
    let q = (t * 0x76f50f34n) & U32;
    swapAcc += (rol16(q) * 0xc3efea97n + q) & U32;
    t = rol16((offsets[index + 1] + y) & U32);
    q = (t * 0x1881ce3cn) & U32;
    swapLast = (rol16(q) * 0x35bd1ec9n + q) & U32;
    swapAcc = (swapAcc + swapLast) & U32;

    state = (state * keyA + x) & U32;
    state = (rol16(state) * 0xcf98b111n) & U32;
    state = (rol16(state) * 0x87085b9fn) & U32;
    state = (rol16(state) * 0x12ceb96dn) & U32;
    state = (rol16(state) * 0x257e1d83n) & U32;
    acc += state;
    t = (state * keyB + y) & U32;
    t = (rol16(t) * 0xa27416f5n) & U32;
    t = (rol16(t) * 0xd38396ffn) & U32;
    state = (rol16((rol16(t) * 0x7c932b89n) & U32) * 0xbfa49f69n) & U32;
    acc = (acc + state) & U32;
  }
  return [swapLast ^ state, swapAcc ^ acc];
}

/* Generate the v2 Sec-MS-GEC token: "<16 hex>-<64 hex>" */
export function generateSecMsGecV2(unixTimestamp?: number): string {
  let ticks = unixTimestamp ?? Date.now() / 1000;
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const strToHash = Buffer.from(`${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`, "ascii");
  const digest = sha256Digest(strToHash);
  const [cs64a, cs64b] = cs64Digest(strToHash, digest);
  const cs64 = Buffer.alloc(8);
  cs64.writeUInt32LE(Number(cs64a), 0);
  cs64.writeUInt32LE(Number(cs64b), 4);
  return `${cs64.toString("hex").toUpperCase()}-${digest.toString("hex").toUpperCase()}`;
}
