// Deterministic seeded RNG so every simulated match gives the same result on every load,
// until the underlying data (ratings/squads/schedule) actually changes.
(function (global) {
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rngFromString(str) {
    return mulberry32(hashSeed(str));
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function weightedPick(weights, rng) {
    let total = 0;
    for (const k in weights) total += Math.max(0, weights[k]);
    let r = rng() * total;
    for (const k in weights) {
      const w = Math.max(0, weights[k]);
      if (r < w) return k;
      r -= w;
    }
    const keys = Object.keys(weights);
    return keys[keys.length - 1];
  }

  const PRNG = { hashSeed, mulberry32, rngFromString, shuffle, weightedPick };
  if (typeof module !== "undefined") module.exports = PRNG;
  else global.PRNG = PRNG;
})(typeof window !== "undefined" ? window : globalThis);
