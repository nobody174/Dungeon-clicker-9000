// ─────────────────────────────────────
// Prestige / Ascend system
// ─────────────────────────────────────
import * as state from "./state.js";
import { units, recalcPassive, renderUnits, renderUnitCosts } from "./units.js";
import { calcShardsToEarn } from "./stats.js";
import { playAscendSound, playBuySound } from "./audio.js";
import { checkAchievements } from "./achievements.js";
import { saveGame } from "./save.js";
import { showToast } from "./toast.js";
import { spawnOverlay } from "./monsters.js";
import { loadMonster } from "./monsters.js";
import {
  updateGold, renderStats, updateShardDisplay, updatePrestigeBadge, showTab,
} from "./ui.js";
import { checkHeroUnlocks } from "./heroes.js";
import { updateWeaponButtons } from "./weapons.js";
import { renderPotionShop } from "./potions.js";
import { isVoidUnlocked, calcVoidFragmentsToEarn, applyVoidRunBonuses, renderVoidShop } from "./voidFragments.js";

export const shardShop = [
  { id: "startGold",  name: "Head Start",      desc: "Start each run with 200 gold",        cost: 2, owned: 0, max: 5  },
  { id: "goldBonus",  name: "Golden Touch",     desc: "+10% all gold per level",              cost: 3, owned: 0, max: 10 },
  { id: "cheapUnits", name: "Loyal Retainers",  desc: "All units cost 25% less",              cost: 4, owned: 0, max: 1  },
  { id: "clickStart", name: "Warrior's Soul",   desc: "Start with +10 click dmg per level",   cost: 2, owned: 0, max: 5  },
  { id: "freeSquire", name: "Ghostly Squire",   desc: "Start each run with 1 free Squire",    cost: 5, owned: 0, max: 3  },
  { id: "offlineCap", name: "Traveler's Rest",  desc: "+12h offline progress cap per level",  cost: 6, owned: 0, max: 4  },
  { id: "offlineMastery", name: "Offline Mastery", desc: "+24h offline cap and +25% offline gains", cost: 25, owned: 0, max: 1 },
];

// Offline cap ladder: 8h base, +12h per "Traveler's Rest" level (8/20/32/44/56h),
// plus a flat +24h and +25% gain multiplier from the one-time "Offline Mastery" capstone.
// Deliberately finite (56h + 24h = 80h max) — no uncapped tier, so a long absence can't
// let a single return trip skip past floor-by-floor progression via a single lump payout.
const OFFLINE_BASE_HOURS       = 8;
const OFFLINE_HOURS_PER_LEVEL  = 12;
const OFFLINE_MASTERY_BONUS_HOURS = 24;
const OFFLINE_MASTERY_GAIN_MULT   = 0.25;

export function getOfflineCapSeconds() {
  const capTier     = shardShop.find(u => u.id === "offlineCap");
  const masteryTier = shardShop.find(u => u.id === "offlineMastery");
  let hours = OFFLINE_BASE_HOURS + (capTier ? capTier.owned * OFFLINE_HOURS_PER_LEVEL : 0);
  if (masteryTier && masteryTier.owned > 0) hours += OFFLINE_MASTERY_BONUS_HOURS;
  return hours * 3600;
}

export function getOfflineGainMult() {
  const masteryTier = shardShop.find(u => u.id === "offlineMastery");
  return 1 + (masteryTier && masteryTier.owned > 0 ? OFFLINE_MASTERY_GAIN_MULT : 0);
}

export function renderShardUpgrades() {
  const container = document.getElementById("shard-upgrade-list");
  container.innerHTML = "";
  shardShop.forEach((u, i) => {
    const maxed     = u.owned >= u.max;
    const canAfford = state.shardBalance >= u.cost;
    const btn = document.createElement("button");
    btn.className = "upgrade-btn shard-upgrade-btn";
    btn.disabled  = maxed;
    if (!maxed) btn.onclick = () => buyShardUpgrade(i);
    btn.innerHTML = `
      <span class="btn-left">
        <span class="btn-name">${u.name}</span>
        <span class="btn-effect">${u.desc}</span>
      </span>
      <span class="btn-right">
        <span class="btn-cost shard-cost" style="color:${canAfford && !maxed ? "#9090ff" : "#7a7a98"}">${maxed ? "MAXED" : "⚡ " + u.cost}</span>
        <span class="count">${u.owned}/${u.max}</span>
      </span>`;
    container.appendChild(btn);
  });
}

export function buyShardUpgrade(index) {
  const u = shardShop[index];
  if (state.shardBalance < u.cost || u.owned >= u.max) {
    document.getElementById("shard-msg").textContent = "Not enough shards!";
    return;
  }
  state.setShardBalance(state.shardBalance - u.cost);
  state.addShardsSpent(u.cost);
  u.owned += 1;
  updateShardDisplay();
  renderShardUpgrades();
  renderUnitCosts();
  document.getElementById("shard-msg").textContent = "";
  playBuySound();
  checkAchievements();
  saveGame();
}

export function openAscendModal() {
  if (state.currentFloor < 20) return;
  const n = calcShardsToEarn();
  document.getElementById("modal-shards").textContent = n + " Soul Shard" + (n !== 1 ? "s" : "");
  document.getElementById("ascend-modal").style.display = "flex";
}

export function closeModal() {
  document.getElementById("ascend-modal").style.display = "none";
}

export function doAscend() {
  if (state.currentFloor < 20) return;
  const earned = calcShardsToEarn();
  state.addShardBalance(earned);
  state.addTotalShardsEarned(earned);

  // Void Fragments only start accruing once already unlocked (prestigeCount gate) — checked
  // BEFORE incrementing prestigeCount below, so the Ascend that crosses the unlock threshold
  // doesn't retroactively grant fragments for a run that started before Run Rules existed.
  let fragmentsEarned = 0;
  if (isVoidUnlocked()) {
    fragmentsEarned = calcVoidFragmentsToEarn();
    if (fragmentsEarned > 0) {
      state.addVoidFragments(fragmentsEarned);
      state.addTotalVoidFragmentsEarned(fragmentsEarned);
    }
  }

  state.incPrestigeCount();

  // Reset run state (gear + heroes persist)
  state.setGold(0);
  state.setClickDamage(10);
  state.setCurrentFloor(1);
  state.setMonsterDead(false);
  state.setWeaponsBought({});
  state.setSelectedWeaponPath(null);
  state.setPotionsBought({});
  for (const k in units) units[k].count = 0;
  recalcPassive();

  closeModal();
  playAscendSound();
  spawnOverlay("ascend-flash-overlay", 900);

  updateGold();
  renderStats();
  renderUnits();
  updateShardDisplay();
  renderShardUpgrades();

  updatePrestigeBadge();
  loadMonster(1);
  applyRunBonuses();
  applyVoidRunBonuses();
  renderVoidShop();
  checkHeroUnlocks();
  updateWeaponButtons();
  renderPotionShop();

  checkAchievements();
  saveGame();
  showTab("shards");
  const fragMsg = fragmentsEarned > 0 ? " +" + fragmentsEarned + " Void Fragment" + (fragmentsEarned !== 1 ? "s" : "") + "." : "";
  showToast("⚡ Ascended!", "Gained " + earned + " Soul Shard" + (earned !== 1 ? "s" : "") + "." + fragMsg + " Gear kept.");
}

export function applyRunBonuses() {
  const headStart  = shardShop.find(u => u.id === "startGold");
  const clickBonus = shardShop.find(u => u.id === "clickStart");
  const freeSquire = shardShop.find(u => u.id === "freeSquire");

  if (headStart.owned  > 0) { state.addGold(headStart.owned * 200); updateGold(); }
  if (clickBonus.owned > 0) { state.addClickDamage(clickBonus.owned * 10); }
  if (freeSquire.owned > 0) {
    units.squire.count += freeSquire.owned;
    recalcPassive();
  }
  renderStats();
  renderUnits();
}
