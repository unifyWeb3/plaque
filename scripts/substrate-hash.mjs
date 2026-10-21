// Minimal, dependency-free Substrate helpers: twox128 hash + storage-key maths.
// XXH64 (seed 0) implemented with BigInt so it runs on any arch (no native binaries).
const M = (1n << 64n) - 1n;
const P1 = 0x9e3779b185ebca87n, P2 = 0xc2b2ae3d27d4eb4fn, P3 = 0x165667b19e3779f9n,
      P4 = 0x85ebca77c2b2ae63n, P5 = 0x27d4eb2f165667c5n;

const rotl = (x, r) => (((x << r) | (x >> (64n - r))) & M);

function xxh64(buf, seed = 0n) {
  const len = BigInt(buf.length);
  let i = 0, h;
  const r64 = (o) => buf.readBigUInt64LE(o);
  const r32 = (o) => BigInt(buf.readUInt32LE(o));
  const round = (acc, val) => {
    acc = (acc + ((val * P2) & M)) & M;
    acc = rotl(acc, 31n);
    return (acc * P1) & M;
  };
  if (buf.length >= 32) {
    let v1 = (seed + P1 + P2) & M, v2 = (seed + P2) & M, v3 = seed & M, v4 = (seed - P1) & M;
    while (i <= buf.length - 32) {
      v1 = round(v1, r64(i)); i += 8;
      v2 = round(v2, r64(i)); i += 8;
      v3 = round(v3, r64(i)); i += 8;
      v4 = round(v4, r64(i)); i += 8;
    }
    h = (rotl(v1, 1n) + rotl(v2, 7n) + rotl(v3, 12n) + rotl(v4, 18n)) & M;
    const merge = (acc, val) => {
      let a = (acc ^ round(0n, val)) & M;
      return (a * P1 + P4) & M;
    };
    h = merge(h, v1); h = merge(h, v2); h = merge(h, v3); h = merge(h, v4);
  } else {
    h = (seed + P5) & M;
  }
  h = (h + len) & M;
  while (i + 8 <= buf.length) { h = (h ^ round(0n, r64(i))) & M; h = (rotl(h, 27n) * P1 + P4) & M; i += 8; }
  if (i + 4 <= buf.length) { h = (h ^ ((r32(i) * P1) & M)) & M; h = (rotl(h, 23n) * P2 + P3) & M; i += 4; }
  while (i < buf.length) { h = (h ^ ((BigInt(buf[i]) * P5) & M)) & M; h = (rotl(h, 11n) * P1) & M; i += 1; }
  h = (h ^ (h >> 33n)) & M; h = (h * P2) & M;
  h = (h ^ (h >> 29n)) & M; h = (h * P3) & M;
  h = (h ^ (h >> 32n)) & M;
  return h;
}

/** Serialize a u64 BigInt as 8 little-endian bytes (Substrate/Substrate-compatible hash encoding). */
const le64 = (n) => {
  let out = '';
  for (let i = 0n; i < 8n; i++) out += Number((n >> (8n * i)) & 0xffn).toString(16).padStart(2, '0');
  return out;
};

/** Substrate twox128 = xxh64(seed 0) LE ++ xxh64(seed 1) LE. Verified against sp_core constants. */
export function twox128(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return le64(xxh64(b, 0n)) + le64(xxh64(b, 1n));
}

/** Storage key for a pallet storage item: twox128(pallet) ++ twox128(item) ++ palletIndex(16B LE). */
export function storagePrefix(pallet, item, palletIndex) {
  let idx = '';
  let n = BigInt(palletIndex);
  for (let i = 0n; i < 16n; i++) { idx += Number(n & 0xffn).toString(16).padStart(2, '0'); n >>= 8n; }
  return twox128(pallet) + twox128(item) + idx;
}

export { xxh64 };
