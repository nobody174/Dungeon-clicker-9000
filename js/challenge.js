// ─────────────────────────────────────
// Daily/Weekly Seeded Challenge Run
// Fully independent of every other item — no dependency on Boss Combat, Void Fragments, etc.
// Isolated in its own localStorage slot ("challengeState") so it never touches the main save.
// Score = floor reached in a fixed 10-minute window. No permanent-currency rewards (score/
// summary only) to avoid daily-play FOMO pressure, per the review.
// ─────────────────────────────────────
import * as state from "./state.js";
import { mulberry32, dailySeed } from "./prng.js";
import { units, recalcPassive } from "./units.js";
import { loadMonster } from "./monsters.js";
import { updateGold, renderStats, showTab } from "./ui.js";
import { renderUnits } from "./units.js";
import { showToast } from "./toast.js";

const CHALLENGE_DURATION_MS = 10 * 60 * 1000; // fixed 10-minute window
const STORAGE_KEY = "challengeState";

let running = false;
let endsAt = 0;
let tickInterval = null;

export function isChallengeRunning() { return running; }

// Standardized baseline — completely reset, no carry-over from the main save. Snapshot the
// player's normal-mode run-state so we can restore it when the challenge ends/exits.
let mainSaveSnapshot = null;

function snapshotMainState() {
  mainSaveSnapshot = {
    gold: state.gold, clickDamage: state.clickDamage, currentFloor: state.currentFloor,
    passiveDamage: state.passiveDamage, monsterDead: state.monsterDead,
    unitCounts: Object.fromEntries(Object.keys(units).map(k => [k, units[k].count])),
    weaponsBought: { ...state.weaponsBought }, selectedWeaponPath: state.selectedWeaponPath,
    weaponBonus: { ...state.weaponBonus },
  };
}

function restoreMainState() {
  if (!mainSaveSnapshot) return;
  state.setGold(mainSaveSnapshot.gold);
  state.setClickDamage(mainSaveSnapshot.clickDamage);
  state.setCurrentFloor(mainSaveSnapshot.currentFloor);
  state.setPassiveDamage(mainSaveSnapshot.passiveDamage);
  state.setMonsterDead(mainSaveSnapshot.monsterDead);
  for (const k in units) units[k].count = mainSaveSnapshot.unitCounts[k] || 0;
  state.setWeaponsBought(mainSaveSnapshot.weaponsBought);
  state.setSelectedWeaponPath(mainSaveSnapshot.selectedWeaponPath);
  state.setWeaponBonus(mainSaveSnapshot.weaponBonus);
  recalcPassive();
  loadMonster(state.currentFloor);
  updateGold(); renderStats(); renderUnits();
  mainSaveSnapshot = null;
}

function standardizedBaseline() {
  state.setGold(0);
  state.setClickDamage(10);
  state.setCurrentFloor(1);
  state.setMonsterDead(false);
  for (const k in units) units[k].count = 0;
  state.setWeaponsBought({});
  state.setSelectedWeaponPath(null);
  state.setWeaponBonus({ critChance: 0, critMult: 0, dpsMult: 0, executeBonus: 0, lifeSteal: 0 });
  recalcPassive();
}

export function startChallenge() {
  if (running) return;
  snapshotMainState();
  state.setChallengeModeActive(true);
  const seed = dailySeed();
  state.setChallengeRng(mulberry32(seed));
  standardizedBaseline();
  loadMonster(1);
  updateGold(); renderStats(); renderUnits();

  running = true;
  endsAt = Date.now() + CHALLENGE_DURATION_MS;
  renderChallengeBar();
  tickInterval = setInterval(tick, 500);
  showToast("🗓️ Challenge Started!", "10 minutes. Same seed for everyone today. Floor reached is your score.");
}

function tick() {
  const remaining = endsAt - Date.now();
  if (remaining <= 0) { endChallenge(); return; }
  renderChallengeBar(remaining);
}

export function endChallenge() {
  if (!running) return;
  running = false;
  clearInterval(tickInterval);
  tickInterval = null;
  const score = state.currentFloor;
  saveChallengeResult(score);
  state.setChallengeModeActive(false);
  state.setChallengeRng(null);
  showResultScreen(score);
  restoreMainState();
}

export function exitChallengeEarly() {
  if (!running) return;
  running = false;
  clearInterval(tickInterval);
  tickInterval = null;
  state.setChallengeModeActive(false);
  state.setChallengeRng(null);
  restoreMainState();
  hideChallengeUI();
}

function saveChallengeResult(score) {
  const seed = dailySeed();
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  data.lastSeed = seed;
  data.lastScore = score;
  data.bestScore = Math.max(data.bestScore || 0, score);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getChallengeHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function renderChallengeBar(remainingMs) {
  const bar = document.getElementById("challenge-bar");
  if (!bar) return;
  bar.style.display = "flex";
  const remaining = remainingMs ?? Math.max(0, endsAt - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  document.getElementById("challenge-timer").textContent =
    mins + ":" + String(secs).padStart(2, "0");
  document.getElementById("challenge-score-live").textContent = "Floor " + state.currentFloor;
}

function hideChallengeUI() {
  const bar = document.getElementById("challenge-bar");
  if (bar) bar.style.display = "none";
}

function showResultScreen(score) {
  hideChallengeUI();
  const modal = document.getElementById("challenge-result-modal");
  if (!modal) return;
  const history = getChallengeHistory();
  document.getElementById("challenge-result-score").textContent = "Floor " + score;
  document.getElementById("challenge-result-best").textContent = "Best today: Floor " + history.bestScore;
  modal.style.display = "flex";
}

export function closeChallengeResult() {
  const modal = document.getElementById("challenge-result-modal");
  if (modal) modal.style.display = "none";
}
