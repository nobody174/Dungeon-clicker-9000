// ─────────────────────────────────────
// mulberry32 — small seedable PRNG. Used ONLY for outcome-affecting rolls (crit checks,
// loot rarity/item rolls) when challenge mode is active; cosmetic jitter (damage-float
// positions, screen shake) stays on normal unseeded Math.random() — no need to seed those.
// ─────────────────────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic daily/weekly seed: same calendar day (UTC) always produces the same seed,
// so every player attempting "today's challenge" plays the identical run.
export function dailySeed(date = new Date()) {
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
  return y * 10000 + m * 100 + d;
}
