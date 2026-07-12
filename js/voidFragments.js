// ─────────────────────────────────────
// Void Fragments — "Run Rules" (second prestige currency, deliberately last/endgame content)
// Same architectural pattern as shardShop/shardBalance in prestige.js: a parallel currency +
// shop array. Framed as "Run Rules" everywhere in UI copy, never "prestige-of-prestige" — Soul
// Shards are Power (flat multipliers), Void Fragments are Run Rules (start-of-run advantages +
// one capped difficulty/reward trade-off). Gated on prestigeCount (veteran-run-count), not a
// raw floor number. Phase 1-2 scope only: currency + unlock gate + applyRunBonuses()-style reuse
// for 2-3 starting-advantage modifiers, plus the one genuinely novel mechanic (the capped
// difficulty/reward slider). "Alternate boss behaviors" is explicitly out of scope for this pass.
// ─────────────────────────────────────
import * as state from "./state.js";
import { playBuySound } from "./audio.js";
import { checkAchievements } from "./achievements.js";
import { saveGame } from "./save.js";
import { showToast } from "./toast.js";
import { units, recalcPassive } from "./units.js";
import { renderStats } from "./ui.js";
import { renderUnits } from "./units.js";

export const VOID_UNLOCK_PRESTIGE_COUNT = 5; // veteran gate — reach this many Ascends to unlock Run Rules
export const VOID_RISK_MAX = 3; // capped difficulty/reward trade-off — never uncapped, never mandatory-optimal

// Run Rules shop: start-of-run advantages, same applyRunBonuses()-style consumption pattern
// prestige.js already uses for shardShop.
export const voidShop = [
  { id: "headStartFloor", name: "Veteran's Memory",  desc: "Start each run on floor 3 instead of 1", cost: 3, owned: 0, max: 1 },
  { id: "startDps",       name: "Echo of Power",      desc: "+5 passive DPS at run start per level",  cost: 2, owned: 0, max: 5 },
  { id: "startCrit",      name: "Void-Touched Blade", desc: "+2% crit chance at run start per level",  cost: 4, owned: 0, max: 3 },
];

export function isVoidUnlocked() {
  return state.prestigeCount >= VOID_UNLOCK_PRESTIGE_COUNT;
}

// Capped difficulty/reward trade-off — the one genuinely novel Void Fragments mechanic.
// Each level: monsters hit harder (scales the boss miss-penalty and windup speed slightly)
// in exchange for a flat % bonus to gold AND shard/fragment yield. Capped at VOID_RISK_MAX so
// it never becomes a new "mandatory optimal" choice every run — diminishing, bounded upside.
export function getVoidRiskGoldMult() {
  return 1 + state.voidRiskLevel * 0.15; // +15%/level, max +45% at level 3
}
export function getVoidRiskFragmentMult() {
  return 1 + state.voidRiskLevel * 0.15;
}
export function getVoidRiskBossAttackSpeedMult() {
  // Higher risk = boss windups resolve slightly faster (harder to react to) — the "harder run" side
  // of the trade-off. Capped so even max risk stays a real fight, not an unfair spike.
  return 1 + state.voidRiskLevel * 0.1; // +10%/level, max +30%
}

export function setVoidRiskLevel(level) {
  const clamped = Math.max(0, Math.min(VOID_RISK_MAX, level));
  state.setVoidRiskLevel(clamped);
  saveGame();
}

export function calcVoidFragmentsToEarn() {
  // Deliberately modest — Void Fragments are an endgame layer on top of Soul Shards, not a
  // replacement income stream. Same shape as calcShardsToEarn() in stats.js but scaled down.
  const base = Math.max(0, Math.floor(state.currentFloor / 20) - 1);
  return Math.floor(base * getVoidRiskFragmentMult());
}

export function applyVoidRunBonuses() {
  const startDps  = voidShop.find(u => u.id === "startDps");
  const startCrit = voidShop.find(u => u.id === "startCrit");
  const headStart = voidShop.find(u => u.id === "headStartFloor");

  if (startDps.owned > 0) {
    state.setPassiveDamage(state.passiveDamage + startDps.owned * 5);
  }
  if (headStart.owned > 0) {
    state.setCurrentFloor(Math.max(state.currentFloor, 3));
  }
  // startCrit is consumed directly by stats.js's getTotalMult via weaponBonus-style read —
  // simplest v1 approach: fold it into weaponBonus.critChance at run-bonus application time.
  if (startCrit.owned > 0) {
    state.weaponBonus.critChance += startCrit.owned * 0.02;
  }
  recalcPassive();
  renderStats();
  renderUnits();
}

export function renderVoidShop() {
  const container = document.getElementById("void-shop-list");
  if (!container) return;
  if (!isVoidUnlocked()) {
    container.innerHTML = `<p style="font-size:0.78rem;color:#9a9ab0;text-align:center">Reach ${VOID_UNLOCK_PRESTIGE_COUNT} Ascends to unlock Run Rules.</p>`;
    return;
  }
  let html = `<div class="void-balance">🌀 <span id="void-balance">${state.voidFragments}</span> Void Fragments</div>`;
  html += voidShop.map((u, i) => {
    const maxed = u.owned >= u.max;
    const canAfford = state.voidFragments >= u.cost;
    return `<button class="upgrade-btn void-upgrade-btn" ${maxed ? "disabled" : `onclick="buyVoidUpgrade(${i})"`}>
      <span class="btn-left"><span class="btn-name">${u.name}</span><span class="btn-effect">${u.desc}</span></span>
      <span class="btn-right"><span class="btn-cost" style="color:${canAfford && !maxed ? "#c080ff" : "#7a7a98"}">${maxed ? "MAXED" : "🌀 " + u.cost}</span><span class="count">${u.owned}/${u.max}</span></span>
    </button>`;
  }).join("");

  html += `<h2 style="margin-top:1rem">⚖️ Risk / Reward</h2>
    <p style="font-size:0.74rem;color:#9a9ab0;margin-bottom:0.5rem">
      Capped trade-off, chosen once per run. Higher risk = faster/harder boss windups,
      in exchange for bonus gold and Void Fragment yield. Never mandatory.</p>
    <div class="void-risk-row">`;
  for (let lvl = 0; lvl <= VOID_RISK_MAX; lvl++) {
    html += `<button class="void-risk-btn ${state.voidRiskLevel === lvl ? "active" : ""}" onclick="setVoidRisk(${lvl})">${lvl === 0 ? "Safe" : "Risk " + lvl}</button>`;
  }
  html += `</div><p style="font-size:0.72rem;color:#c080ff;margin-top:0.4rem">Current: +${Math.round((getVoidRiskGoldMult()-1)*100)}% gold, +${Math.round((getVoidRiskFragmentMult()-1)*100)}% fragments</p>`;

  container.innerHTML = html;
}

export function buyVoidUpgrade(index) {
  const u = voidShop[index];
  if (state.voidFragments < u.cost || u.owned >= u.max) return;
  state.addVoidFragments(-u.cost);
  u.owned += 1;
  renderVoidShop();
  playBuySound();
  checkAchievements();
  saveGame();
  showToast("🌀 " + u.name, "Run Rule acquired.");
}
