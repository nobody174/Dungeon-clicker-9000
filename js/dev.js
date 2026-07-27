// ─────────────────────────────────────
// Dev Tools — local testing shortcuts only, not part of real game balance.
// Every action here reuses real game functions (loadMonster, setGold, etc.)
// rather than hand-rolling parallel logic, so achievements/saves/renders
// all stay consistent with normal play.
// ─────────────────────────────────────
import * as state from "./state.js";
import { loadMonster } from "./monsters.js";
import { units, recalcPassive, renderUnits, renderUnitCosts } from "./units.js";
import { updateGold, renderStats, updatePrestigeBadge, updateHPBar } from "./ui.js";
import { saveGame } from "./save.js";
import { renderVoidShop } from "./voidFragments.js";

export function devAddGold(amount) {
  state.addGold(amount);
  state.addTotalGoldEarned(amount);
  updateGold();
  renderStats();
  saveGame();
}

export function devSetFloor(floor) {
  state.setCurrentFloor(floor);
  loadMonster(floor);
  saveGame();
}

// Free-form floor jump — a prompt() beats hand-picking preset floors, since testing needs
// change from session to session (e.g. checking a specific tier's monster identity or a
// specific difficulty-curve breakpoint) more often than the old fixed set of buttons covered.
export function devPromptSetFloor() {
  const input = prompt("Jump to floor:", String(state.currentFloor));
  if (input === null) return;
  const floor = parseInt(input, 10);
  if (!Number.isFinite(floor) || floor < 1) return;
  devSetFloor(floor);
}

export function devAddPrestige(amount) {
  // "+1" buttons add; the "Set to 5" button is really a floor, not an add —
  // callers pass the target value directly when they mean "set", and a small
  // delta when they mean "add". Distinguish by using setPrestigeCount with
  // max() so repeated clicks on the "+1" button still behave additively.
  const next = amount <= 1 ? state.prestigeCount + amount : Math.max(state.prestigeCount, amount);
  state.setPrestigeCount(next);
  updatePrestigeBadge();
  renderVoidShop();
  saveGame();
}

let savedClickDamage = null; // stashed value so the "one-shot" toggle can be turned back off cleanly

export function devSetClickDamage(amount) {
  if (savedClickDamage === null) savedClickDamage = state.clickDamage; // remember real value on first activation
  state.setClickDamage(amount);
  renderStats();
  saveGame();
}

export function devRestoreClickDamage() {
  if (savedClickDamage !== null) {
    state.setClickDamage(savedClickDamage);
    savedClickDamage = null;
  }
  renderStats();
  saveGame();
}

export function isDevOneShotActive() {
  return savedClickDamage !== null;
}

export function devMaxMastery() {
  units.squire.mastery = 50;
  recalcPassive();
  renderUnits();
  renderUnitCosts();
  renderStats();
  saveGame();
}

export function devKillBoss() {
  // Leave 1 HP so the very next real attack (click or passive tick) finishes
  // the kill through the normal dealDamage() path — this keeps gold, boss
  // counters, achievements, and trophy-room recording all firing correctly,
  // instead of duplicating that logic here. Also clear any active shield —
  // dealDamage() routes click damage into the shield first, so a boss floor
  // with a shield still up would otherwise absorb the next click entirely
  // and never reach the 1 remaining HP.
  if (state.monsterMaxHP > 0) {
    state.setMonsterHP(1);
    state.setMonsterShield(0);
    updateHPBar();
  }
}
