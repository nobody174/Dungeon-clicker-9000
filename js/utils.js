// ─────────────────────────────────────
// Pure formatting / math helpers with no game-state dependencies
// ─────────────────────────────────────

// Player report (2026-07-28): formatNum had no ceiling past "T" — it just kept dividing by 1e12
// forever and stamping "T" on the result regardless of actual magnitude, so a real save already
// deep enough (thanks in part to v1.9.0's own late-game numbers) displayed nonsense like
// "5644900902728448000T". Extended with named suffixes through Septillion (1e24) — matches the
// genre-standard idle-game convention (Cookie Clicker, Adventure Capitalist, etc. all use named
// tiers, not scientific notation, since "12 Septillion" reads as a satisfying reward while
// "1.2e28" reads as spreadsheet output to most players) — then falls back to scientific notation
// for anything beyond that as a correctness safety net, not a design centerpiece: by the time a
// number is that large almost no player will ever actually see it in normal play.
const SUFFIXES = [
  { value: 1e24, suffix: "Sp" }, // Septillion
  { value: 1e21, suffix: "Sx" }, // Sextillion
  { value: 1e18, suffix: "Qi" }, // Quintillion
  { value: 1e15, suffix: "Qa" }, // Quadrillion
  { value: 1e12, suffix: "T" },  // Trillion
  { value: 1e9,  suffix: "B" },  // Billion
  { value: 1e6,  suffix: "M" },  // Million
  { value: 1e3,  suffix: "K" },  // Thousand
];

export function formatNum(n) {
  if (n >= 1e27) return n.toExponential(2); // e.g. "1.23e+27" — safety net past named suffixes
  for (const { value, suffix } of SUFFIXES) {
    if (n >= value) return (n / value).toFixed(1).replace(/\.0$/, "") + suffix;
  }
  return String(Math.floor(n));
}

export function bonusLabel(key, val) {
  const pct = Math.round(val * 100);
  switch (key) {
    case "clickMult":    return "+" + pct + "% click damage";
    case "goldMult":     return "+" + pct + "% gold earned";
    case "dpsMult":      return "+" + pct + "% passive DPS";
    case "unitDiscount": return "-" + pct + "% unit costs";
    case "critChance":   return "+" + pct + "% crit chance";
    case "critMult":     return val + "× crit damage";
    case "attackSpeedMult": return "+" + pct + "% attack speed";
    case "instantHeal":  return "+" + val + " HP (instant)";
    default:             return "+" + pct + "% " + key;
  }
}
