// ─────────────────────────────────────
// Pure formatting / math helpers with no game-state dependencies
// ─────────────────────────────────────

export function formatNum(n) {
  if (n >= 1e12) return (n/1e12).toFixed(1).replace(/\.0$/,"") + "T";
  if (n >= 1e9)  return (n/1e9 ).toFixed(1).replace(/\.0$/,"") + "B";
  if (n >= 1e6)  return (n/1e6 ).toFixed(1).replace(/\.0$/,"") + "M";
  if (n >= 1e3)  return (n/1e3 ).toFixed(1).replace(/\.0$/,"") + "K";
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
    default:             return "+" + pct + "% " + key;
  }
}
