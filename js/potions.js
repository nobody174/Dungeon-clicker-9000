// ─────────────────────────────────────
// Potions (consumable timed buffs)
// effect keys map onto getTotalMult() keys, except "autoClick" which is handled in the tick loop.
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum, bonusLabel } from "./utils.js";
import { showToast } from "./toast.js";
import { playBuySound } from "./audio.js";
import { checkAchievements } from "./achievements.js";
import { saveGame } from "./save.js";
import { renderStats, updateGold } from "./ui.js";
import { pruneExpiredBuffs } from "./stats.js";

export const potionDefs = [
  { id:"goldRush",    name:"Gold Rush Elixir",  icon:"🍯", flavor:"The air smells like coin.",          effect:{ goldMult:0.50 },              duration:60,  baseCost:150,  costScale:1.6 },
  { id:"berserkBrew", name:"Berserker's Brew",  icon:"🍺", flavor:"Pain is just weakness leaving.",      effect:{ clickMult:0.75 },             duration:45,  baseCost:200,  costScale:1.6 },
  { id:"swiftTonic",  name:"Swiftness Tonic",   icon:"🧪", flavor:"Time feels thinner.",                 effect:{ dpsMult:0.60 },                duration:60,  baseCost:180,  costScale:1.6 },
  { id:"luckyDraught",name:"Lucky Draught",     icon:"🍀", flavor:"Fortune favors the buzzed.",          effect:{ critChance:0.15, critMult:5 }, duration:40,  baseCost:300,  costScale:1.7 },
  { id:"frenzyVial",  name:"Frenzy Vial",       icon:"⚗️", flavor:"Your hands move before you think.",   effect:{ autoClick:3 },                 duration:30,  baseCost:400,  costScale:1.8 },
];

export function getPotionCost(id) {
  const def   = potionDefs.find(p => p.id === id);
  const bought = state.potionsBought[id] || 0;
  return Math.floor(def.baseCost * Math.pow(def.costScale, bought));
}

export function buyPotion(id) {
  const def  = potionDefs.find(p => p.id === id);
  const cost = getPotionCost(id);
  if (state.gold < cost) {
    document.getElementById("potion-shop-msg")?.remove();
    showToast("Not enough gold", "Need " + formatNum(cost) + "g for " + def.name + ".");
    return;
  }
  state.addGold(-cost);
  state.potionsBought[id] = (state.potionsBought[id] || 0) + 1;
  state.incTotalPotionsBought();

  const existing = state.activeBuffs.find(b => b.defId === id);
  const now = Date.now();
  if (existing) {
    existing.expiresAt = Math.max(existing.expiresAt, now) + def.duration * 1000;
  } else {
    state.activeBuffs.push({ defId: id, expiresAt: now + def.duration * 1000 });
  }

  updateGold();
  renderStats();
  renderActiveBuffs();
  renderPotionShop();
  document.getElementById("potion-dot").style.display = "inline";
  playBuySound();
  showToast(def.icon + " " + def.name, "Active for " + def.duration + "s.");
  checkAchievements();
  saveGame();
}

export function renderActiveBuffs() {
  const container = document.getElementById("active-buffs-list");
  if (!container) return;
  pruneExpiredBuffs();
  if (!state.activeBuffs.length) {
    container.innerHTML = `<p style="font-size:0.78rem;color:#9a9ab0;text-align:center;margin:0.4rem 0 1rem">No active effects.</p>`;
    document.getElementById("potion-dot").style.display = "none";
    return;
  }
  document.getElementById("potion-dot").style.display = "inline";
  container.innerHTML = "";
  const now = Date.now();
  for (const buff of state.activeBuffs) {
    const def     = potionDefs.find(p => p.id === buff.defId);
    const secsLeft= Math.max(0, Math.ceil((buff.expiresAt - now) / 1000));
    const effectStr = Object.entries(def.effect).map(([k,v]) => k === "autoClick" ? ("+" + v + " auto-clicks/sec") : bonusLabel(k, v)).join(", ");
    const div = document.createElement("div");
    div.className = "active-buff";
    div.innerHTML = `
      <span class="active-buff-icon">${def.icon}</span>
      <div class="active-buff-info">
        <div class="active-buff-name">${def.name}</div>
        <div class="active-buff-effect">${effectStr}</div>
      </div>
      <div class="active-buff-timer">${secsLeft}s</div>`;
    container.appendChild(div);
  }
}

export function renderPotionShop() {
  const container = document.getElementById("potion-shop-list");
  if (!container) return;
  container.innerHTML = "";
  for (const def of potionDefs) {
    const cost = getPotionCost(def.id);
    const canAfford = state.gold >= cost;
    const effectStr = Object.entries(def.effect).map(([k,v]) => k === "autoClick" ? ("+" + v + " auto-clicks/sec") : bonusLabel(k, v)).join(", ");
    const btn = document.createElement("button");
    btn.className = "upgrade-btn";
    btn.onclick = () => buyPotion(def.id);
    btn.innerHTML = `
      <span class="btn-left">
        <span class="btn-name">${def.icon} ${def.name}</span>
        <span class="btn-effect">${effectStr} — ${def.duration}s</span>
      </span>
      <span class="btn-right">
        <span class="btn-cost" style="color:${canAfford ? "#c9a84c" : "#664"}">🪙 ${formatNum(cost)}g</span>
      </span>`;
    container.appendChild(btn);
  }
}
