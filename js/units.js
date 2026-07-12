// ─────────────────────────────────────
// Units + Mastery (per-unit repeatable dps upgrade)
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum } from "./utils.js";
import { getUnitCost } from "./stats.js";
import { renderStats, updateGold } from "./ui.js";
import { playBuySound } from "./audio.js";
import { checkAchievements } from "./achievements.js";
import { saveGame } from "./save.js";
import { showToast } from "./toast.js";

export const units = {
  squire:   { baseCost: 200,    dps: 2,     count: 0, mastery: 0 },
  rogue:    { baseCost: 500,    dps: 5,     count: 0, mastery: 0 },
  mage:     { baseCost: 1500,   dps: 15,    count: 0, mastery: 0 },
  knight:   { baseCost: 8000,   dps: 80,    count: 0, mastery: 0, minFloor: 15 },
  archmage: { baseCost: 35000,  dps: 400,   count: 0, mastery: 0, minFloor: 30 },
  dragoon:  { baseCost: 150000, dps: 2000,  count: 0, mastery: 0, minFloor: 50 },
  titan:    { baseCost: 700000, dps: 10000, count: 0, mastery: 0, minFloor: 80 },
};
export const unitMeta = {
  squire:   { icon: "🛡️", name: "Squire" },
  rogue:    { icon: "🗡️", name: "Rogue" },
  mage:     { icon: "🧙", name: "Mage" },
  knight:   { icon: "⚔️", name: "Knight" },
  archmage: { icon: "🔮", name: "Archmage" },
  dragoon:  { icon: "🐉", name: "Dragoon" },
  titan:    { icon: "🗿", name: "Titan" },
};
// Mastery: infinitely-repeatable per-unit gold sink. Each level adds +4% to that unit's dps.
// Cost scales steeply (×1.4/level off a base tied to the unit's own cost) so it mainly matters once
// a player has saturated unit purchases and weapon tiers and still has gold piling up.
export const MASTERY_DPS_PER_LEVEL = 0.04;
export const MASTERY_COST_SCALE    = 1.4;

// Mastery Milestones: named cosmetic tiers derived purely from the existing `mastery` integer.
// No new save state, no gameplay bonus — the flat %dmg curve above is the only power lever.
// Cost scale (×1.4/level) means 25/50 are a steep late-game flex, same shape as the exponential
// achievement thresholds elsewhere (e.g. 10k kills) — kept as designed, not adjusted.
export const MASTERY_MILESTONES = [
  { level: 5,  tier: "bronze", label: "Bronze",  icon: "🥉" },
  { level: 10, tier: "silver", label: "Silver",  icon: "🥈" },
  { level: 25, tier: "gold",   label: "Gold",    icon: "🥇" },
  { level: 50, tier: "aura",   label: "Aura",    icon: "✨" },
];

export function getMasteryMilestone(level) {
  let m = null;
  for (const ms of MASTERY_MILESTONES) if (level >= ms.level) m = ms;
  return m;
}

export function totalUnits() {
  return Object.values(units).reduce((sum, u) => sum + u.count, 0);
}

export function recalcPassive() {
  let passiveDamage = 0;
  for (const k in units) {
    const u = units[k];
    passiveDamage += u.count * u.dps * (1 + u.mastery * MASTERY_DPS_PER_LEVEL);
  }
  state.setPassiveDamage(passiveDamage);
}

export function getMasteryCost(id) {
  const u = units[id];
  return Math.floor(u.baseCost * 0.5 * Math.pow(MASTERY_COST_SCALE, u.mastery));
}

export function buyMastery(id) {
  const cost = getMasteryCost(id);
  if (state.gold < cost) { document.getElementById("shop-msg").textContent = "Not enough gold!"; return; }
  state.addGold(-cost);
  const before = getMasteryMilestone(units[id].mastery);
  units[id].mastery += 1;
  const after = getMasteryMilestone(units[id].mastery);
  if (after && after !== before) {
    showToast(after.icon + " " + after.label + " Mastery!", unitMeta[id].name + " reached " + after.label + " tier.");
  }
  recalcPassive();
  updateGold();
  renderStats();
  renderUnitCosts();
  document.getElementById("shop-msg").textContent = "";
  playBuySound();
  checkAchievements();
  saveGame();
}

export function renderUnits() {
  const container = document.getElementById("unit-list");
  if (!container) return;
  container.innerHTML = "";
  for (const id in units) {
    const u = units[id];
    if (u.minFloor && state.currentFloor < u.minFloor) continue;
    const meta = unitMeta[id];
    const cost = getUnitCost(id, units);
    const masteryCost = getMasteryCost(id);
    const masteryPctTotal = Math.round(u.mastery * MASTERY_DPS_PER_LEVEL * 100);

    const card = document.createElement("div");
    card.className = "unit-card";

    const buyBtn = document.createElement("button");
    buyBtn.className = "upgrade-btn unit-buy-btn";
    buyBtn.onclick = () => buyUnit(id);
    buyBtn.innerHTML = `
      <span class="btn-left"><span class="btn-name">${meta.icon} ${meta.name}</span><span class="btn-effect">+${formatNum(u.dps)} dmg / sec</span></span>
      <span class="btn-right"><span class="btn-cost">🪙 ${formatNum(cost)}g</span><span class="count">owned: ${u.count}</span></span>`;
    card.appendChild(buyBtn);

    if (u.count > 0) {
      const milestone = getMasteryMilestone(u.mastery);
      const masteryRow = document.createElement("button");
      masteryRow.className = "mastery-row" + (milestone ? " mastery-" + milestone.tier : "");
      masteryRow.onclick = () => buyMastery(id);
      const badge = milestone ? `<span class="mastery-badge">${milestone.icon} ${milestone.label}</span>` : "";
      masteryRow.innerHTML = `
        <span class="mastery-label">⭐ Mastery Lv.${u.mastery} <span class="mastery-pct">(+${masteryPctTotal}% dmg)</span> ${badge}</span>
        <span class="mastery-cost">🪙 ${formatNum(masteryCost)}g</span>`;
      card.appendChild(masteryRow);
    }
    container.appendChild(card);
  }
}

export function renderUnitCosts() {
  renderUnits();
}

export function buyUnit(id) {
  const cost = getUnitCost(id, units);
  if (state.gold < cost) { document.getElementById("shop-msg").textContent = "Not enough gold!"; return; }
  state.addGold(-cost);
  units[id].count += 1;
  recalcPassive();
  updateGold();
  renderStats();
  document.getElementById("shop-msg").textContent = "";
  renderUnits();
  playBuySound();
  checkAchievements();
  saveGame();
}
