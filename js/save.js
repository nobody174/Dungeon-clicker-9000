// ─────────────────────────────────────
// Save / Load
// ─────────────────────────────────────
import * as state from "./state.js";
import { units, recalcPassive, renderUnits } from "./units.js";
import { shardShop, renderShardUpgrades, applyRunBonuses, getOfflineCapSeconds, getOfflineGainMult } from "./prestige.js";
import { achievements, renderAchievements, updateAchCount } from "./achievements.js";
import { equipment, renderEquipment } from "./equipment.js";
import { heroes, renderHeroes, checkHeroUnlocks, heroTrials } from "./heroes.js";
import { formatNum } from "./utils.js";
import { goldPerSecond, pruneExpiredBuffs } from "./stats.js";
import { loadMonster } from "./monsters.js";
import { updateGold, renderStats, updateShardDisplay, updatePrestigeBadge, updateHPBar } from "./ui.js";
import { updateWeaponButtons } from "./weapons.js";
import { renderActiveBuffs, renderPotionShop } from "./potions.js";
import { renderTrophyRoom } from "./trophies.js";
import { renderVoidShop, voidShop } from "./voidFragments.js";

export function saveGame() {
  // Never persist the main save while a challenge run has swapped state.* to the challenge's
  // standardized baseline — the challenge module restores real state on exit/end and this guard
  // stops a mid-challenge autosave tick from clobbering the player's real progress.
  if (state.challengeModeActive) return;
  const s = localStorage;
  s.setItem("saveVersion",       state.SAVE_VERSION);
  s.setItem("gold",              state.gold);
  s.setItem("clickDamage",       state.clickDamage);
  s.setItem("floor",             state.currentFloor);
  s.setItem("monsterHP",         state.monsterHP);
  s.setItem("lastSeen",          Date.now());
  s.setItem("totalKills",        state.totalKills);
  s.setItem("bossKills",         state.bossKills);
  s.setItem("totalGoldEarned",   state.totalGoldEarned);
  s.setItem("prestigeCount",     state.prestigeCount);
  s.setItem("shardBalance",      state.shardBalance);
  s.setItem("totalShardsEarned", state.totalShardsEarned);
  s.setItem("shardsSpent",       state.shardsSpent);
  s.setItem("muted",             state.muted ? "1" : "0");
  s.setItem("unitCounts",        JSON.stringify(Object.fromEntries(Object.keys(units).map(k => [k, units[k].count]))));
  s.setItem("unitMastery",       JSON.stringify(Object.fromEntries(Object.keys(units).map(k => [k, units[k].mastery]))));
  s.setItem("weaponsBought",     JSON.stringify(state.weaponsBought));
  s.setItem("selectedWeaponPath",state.selectedWeaponPath || "");
  s.setItem("weaponBonus",       JSON.stringify(state.weaponBonus));
  s.setItem("shardUpgrades",     JSON.stringify(shardShop.map(u => u.owned)));
  s.setItem("achievements",      JSON.stringify(achievements.map(a => a.unlocked)));
  s.setItem("equipped",          JSON.stringify({ weapon: state.equipped.weapon?.id || null, armor: state.equipped.armor?.id || null, ring: state.equipped.ring?.id || null }));
  s.setItem("heroData",          JSON.stringify(heroes.map(h => ({ unlocked: h.unlocked, level: h.level }))));
  s.setItem("activeBuffs",       JSON.stringify(state.activeBuffs));
  s.setItem("potionsBought",     JSON.stringify(state.potionsBought));
  s.setItem("totalPotionsBought",state.totalPotionsBought);
  s.setItem("shieldsBroken",     state.shieldsBroken);
  s.setItem("phaseShiftsTriggered", state.phaseShiftsTriggered);
  s.setItem("bossKillsWithoutPotion", state.bossKillsWithoutPotion);
  s.setItem("heroTrials", JSON.stringify(Object.fromEntries(Object.entries(heroTrials).map(([id, t]) => [id, !!t.unlocked]))));
  s.setItem("bossTrophies", JSON.stringify(state.bossTrophies));
  s.setItem("voidFragments", state.voidFragments);
  s.setItem("totalVoidFragmentsEarned", state.totalVoidFragmentsEarned);
  s.setItem("voidRiskLevel", state.voidRiskLevel);
  s.setItem("voidUpgrades", JSON.stringify(voidShop.map(u => u.owned)));
}

export function loadGame() {
  try { _loadGame(); } catch(e) { console.warn("Save load failed, resetting:", e); localStorage.clear(); }
}

// ── Export / Import (BACKLOG.md #11) ──
// Player-portable backup of the save, independent of browser/device localStorage. Deliberately
// reuses every key saveGame() already writes (dumps the whole origin's localStorage) rather than
// hand-listing fields a second time — a hand-maintained field list would silently go stale the
// next time a feature adds a new save key, exactly the kind of drift BACKLOG.md #11 warned against.
export function exportSaveString() {
  saveGame(); // ensure what's exported reflects current state, not the last autosave tick
  const dump = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    dump[key] = localStorage.getItem(key);
  }
  const json = JSON.stringify(dump);
  // btoa can't handle non-Latin1 chars directly; encodeURIComponent/unescape round-trips any
  // JSON string (item names/flavor text are plain ASCII today, but this stays correct if that changes).
  return btoa(unescape(encodeURIComponent(json)));
}

// Returns null on success, or a user-facing error string on failure. Never partially applies a
// bad import — validates the whole payload before touching real localStorage.
export function importSaveString(encoded) {
  let dump;
  try {
    const json = decodeURIComponent(escape(atob(encoded.trim())));
    dump = JSON.parse(json);
  } catch (e) {
    return "That doesn't look like a valid save code.";
  }
  if (!dump || typeof dump !== "object" || Array.isArray(dump) || !("gold" in dump)) {
    return "That doesn't look like a Dungeon Clicker 9000 save.";
  }
  localStorage.clear();
  for (const key in dump) localStorage.setItem(key, dump[key]);
  try {
    _loadGame();
  } catch (e) {
    console.warn("Imported save failed to load, resetting:", e);
    localStorage.clear();
    return "That save code is corrupted and couldn't be loaded.";
  }
  return null;
}

function _loadGame() {
  const s = localStorage;
  const savedVersion = Number(s.getItem("saveVersion") || 0);
  if (s.getItem("gold") !== null && savedVersion < state.SAVE_VERSION) {
    localStorage.clear();
  }
  const n = v => v !== null ? Number(v) : null;
  const j = k => { const v = s.getItem(k); return v !== null ? JSON.parse(v) : null; };

  const savedGold = s.getItem("gold");
  if (n(savedGold)                        !== null) state.setGold(n(savedGold));
  if (n(s.getItem("clickDamage"))         !== null) state.setClickDamage(n(s.getItem("clickDamage")));
  if (n(s.getItem("floor"))               !== null) state.setCurrentFloor(n(s.getItem("floor")));
  if (n(s.getItem("totalKills"))          !== null) state.setTotalKills(n(s.getItem("totalKills")));
  if (n(s.getItem("bossKills"))           !== null) state.setBossKills(n(s.getItem("bossKills")));
  if (n(s.getItem("totalGoldEarned"))     !== null) state.setTotalGoldEarned(n(s.getItem("totalGoldEarned")));
  if (n(s.getItem("prestigeCount"))       !== null) state.setPrestigeCount(n(s.getItem("prestigeCount")));
  if (n(s.getItem("shardBalance"))        !== null) state.setShardBalance(n(s.getItem("shardBalance")));
  if (n(s.getItem("totalShardsEarned"))   !== null) state.setTotalShardsEarned(n(s.getItem("totalShardsEarned")));
  if (n(s.getItem("shardsSpent"))         !== null) state.setShardsSpent(n(s.getItem("shardsSpent")));
  if (n(s.getItem("totalPotionsBought"))  !== null) state.setTotalPotionsBought(n(s.getItem("totalPotionsBought")));
  if (n(s.getItem("shieldsBroken"))       !== null) state.setShieldsBroken(n(s.getItem("shieldsBroken")));
  if (n(s.getItem("phaseShiftsTriggered"))!== null) state.setPhaseShiftsTriggered(n(s.getItem("phaseShiftsTriggered")));
  if (n(s.getItem("bossKillsWithoutPotion")) !== null) state.setBossKillsWithoutPotion(n(s.getItem("bossKillsWithoutPotion")));

  const savedTrials = j("heroTrials");
  if (savedTrials) for (const id in savedTrials) { if (heroTrials[id]) heroTrials[id].unlocked = savedTrials[id]; }

  const savedTrophies = j("bossTrophies");
  if (savedTrophies) state.setBossTrophies(savedTrophies);

  if (n(s.getItem("voidFragments")) !== null) state.setVoidFragments(n(s.getItem("voidFragments")));
  if (n(s.getItem("totalVoidFragmentsEarned")) !== null) state.setTotalVoidFragmentsEarned(n(s.getItem("totalVoidFragmentsEarned")));
  if (n(s.getItem("voidRiskLevel")) !== null) state.setVoidRiskLevel(n(s.getItem("voidRiskLevel")));
  const savedVoidUpgrades = j("voidUpgrades");
  if (savedVoidUpgrades) savedVoidUpgrades.forEach((owned, i) => { if (voidShop[i]) voidShop[i].owned = owned; });

  state.setMuted(s.getItem("muted") === "1");
  document.getElementById("mute-btn").textContent = state.muted ? "🔇" : "🔊";

  const savedVolume = s.getItem("volume");
  if (savedVolume !== null) {
    state.setVolume(Number(savedVolume));
    const slider = document.getElementById("volume-slider");
    if (slider) slider.value = Number(savedVolume) * 100;
  }

  const uc = j("unitCounts");
  if (uc) for (const k in uc) units[k].count = uc[k];
  const um = j("unitMastery");
  if (um) for (const k in um) units[k].mastery = um[k];

  const wb = j("weaponsBought");
  if (wb) state.setWeaponsBought(wb);
  const swp = s.getItem("selectedWeaponPath");
  if (swp) state.setSelectedWeaponPath(swp);
  const wbo = j("weaponBonus");
  if (wbo) state.setWeaponBonus(wbo);

  const su = j("shardUpgrades");
  if (su) su.forEach((owned, i) => { if (shardShop[i]) shardShop[i].owned = owned; });

  const ach = j("achievements");
  if (ach) ach.forEach((unlocked, i) => { if (achievements[i]) achievements[i].unlocked = unlocked; });

  // Load gear (persists through prestige)
  const eq = j("equipped");
  if (eq) {
    for (const slot in eq) {
      state.equipped[slot] = eq[slot] ? (equipment.find(e => e.id === eq[slot]) || null) : null;
    }
  }

  // Load hero data (persists through prestige)
  const hd = j("heroData");
  if (hd) hd.forEach((d, i) => { if (heroes[i]) { heroes[i].unlocked = d.unlocked; heroes[i].level = d.level; } });

  const savedBuffs = j("activeBuffs");
  if (savedBuffs) state.setActiveBuffs(savedBuffs);
  const savedPotionsBought = j("potionsBought");
  if (savedPotionsBought) state.setPotionsBought(savedPotionsBought);
  pruneExpiredBuffs();

  recalcPassive();

  // Offline progress
  const lastSeen = s.getItem("lastSeen");
  if (lastSeen !== null && state.passiveDamage > 0) {
    const secs   = Math.floor((Date.now() - Number(lastSeen)) / 1000);
    const capped = Math.min(secs, getOfflineCapSeconds());
    if (capped > 5) {
      const earned = Math.floor(capped * goldPerSecond() * getOfflineGainMult());
      if (earned > 0) {
        state.addGold(earned);
        state.addTotalGoldEarned(earned);
        document.getElementById("offline-text").textContent =
          "⏳ Welcome back! Earned " + formatNum(earned) + "g offline (" + formatNum(capped) + "s).";
        document.getElementById("offline-banner").style.display = "flex";
      }
    }
  }

  loadMonster(state.currentFloor);

  const savedHP = s.getItem("monsterHP");
  if (savedHP !== null) {
    const hp = Number(savedHP);
    if (hp > 0 && hp <= state.monsterMaxHP) { state.setMonsterHP(hp); updateHPBar(); }
  }

  if (savedGold === null) applyRunBonuses();

  updateGold();
  renderStats();
  updateShardDisplay();
  renderShardUpgrades();
  renderUnits();
  renderAchievements();
  updateAchCount();
  renderEquipment();
  renderHeroes();
  checkHeroUnlocks();
  updatePrestigeBadge();
  updateWeaponButtons();
  renderActiveBuffs();
  renderPotionShop();
  renderTrophyRoom();
  renderVoidShop();
}
