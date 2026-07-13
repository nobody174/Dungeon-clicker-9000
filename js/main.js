// ─────────────────────────────────────
// Entry point: imports everything, exposes functions referenced by inline
// HTML event handlers onto window (ES module top-level bindings are not
// globals), wires up the main game loops, and kicks off loadGame().
// ─────────────────────────────────────
import * as state from "./state.js";
import { getAutoClickRate, getTotalMult, pruneExpiredBuffs } from "./stats.js";
import { units, renderUnitCosts } from "./units.js";
import { toggleMute, setVolumeLevel } from "./audio.js";
import { showTab, showShopTab, resetGame, flashSaveIndicator, renderStats } from "./ui.js";
import { startAttackHold, stopAttackHold, attack, spawnPassiveFloats, dealDamage } from "./combat.js";
import { openAscendModal, closeModal, doAscend } from "./prestige.js";
import { equipLoot, discardLoot } from "./equipment.js";
import { levelUpHero } from "./heroes.js";
import { saveGame, loadGame } from "./save.js";
import { renderActiveBuffs } from "./potions.js";
import { loadMonster } from "./monsters.js";
import { updateGold } from "./ui.js";
import { dodge, markPlayerAction, renderPlayerHP } from "./bossCombat.js";
import { startChallenge, endChallenge, exitChallengeEarly, closeChallengeResult, isChallengeRunning } from "./challenge.js";
import { buyVoidUpgrade, setVoidRiskLevel } from "./voidFragments.js";
import { devAddGold, devSetFloor, devAddPrestige, devSetClickDamage, devRestoreClickDamage, isDevOneShotActive, devMaxMastery, devKillBoss } from "./dev.js";

function toggleDevOneShot() {
  const btn = document.getElementById("dev-oneshot-btn");
  if (isDevOneShotActive()) {
    devRestoreClickDamage();
    btn.textContent = "Toggle One-Shot Click Damage (off)";
  } else {
    devSetClickDamage(100000);
    btn.textContent = "Toggle One-Shot Click Damage (ON)";
  }
}

// ── Expose functions referenced by inline HTML event handlers (onclick=, onmousedown=, etc.) ──
// ES module top-level bindings are scoped to the module, not attached to `window`, so markup like
// onclick="attack(event)" would otherwise fail to find these at runtime. Every inline handler target
// found in index.html is exposed here.
window.toggleMute       = toggleMute;
window.setVolumeLevel   = setVolumeLevel;
window.startAttackHold  = startAttackHold;
window.stopAttackHold   = stopAttackHold;
window.showTab          = showTab;
window.showShopTab      = showShopTab;
window.openAscendModal  = openAscendModal;
window.resetGame        = resetGame;
window.doAscend         = doAscend;
window.closeModal       = closeModal;
window.equipLoot        = equipLoot;
window.discardLoot      = discardLoot;
window.levelUpHero      = levelUpHero;
window.dodgeAttack      = dodge;
window.startChallenge   = startChallenge;
window.exitChallengeEarly = exitChallengeEarly;
window.closeChallengeResult = closeChallengeResult;
window.buyVoidUpgrade   = buyVoidUpgrade;
window.setVoidRisk      = setVoidRiskLevel;

// ── Dev Tools — local testing only, never shipped to players ──
// Gated on hostname rather than removed from the codebase so the tab keeps working during local
// `npm run serve` testing. Real deploy targets (GitHub Pages, itch.io) are never localhost, so the
// tab button stays hidden and the cheat functions are never exposed on `window` for those builds —
// a player couldn't reach them from the console either, since they're only bound here.
const isLocalDev = ["localhost", "127.0.0.1", ""].includes(location.hostname);
if (isLocalDev) {
  window.devAddGold       = devAddGold;
  window.devSetFloor      = devSetFloor;
  window.devAddPrestige   = devAddPrestige;
  window.toggleDevOneShot = toggleDevOneShot;
  window.devMaxMastery    = devMaxMastery;
  window.devKillBoss      = devKillBoss;
} else {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("dev-tab-btn")?.remove();
  });
}

// ── Test-support hooks ──
// tests/smoke.spec.js drives the game via page.evaluate() to set up scenarios (e.g. "give the player
// enough gold to afford a unit"). Before this migration those tests assigned bare globals like
// `gold = 1000` directly, which worked only because the whole game lived in one un-scoped inline
// <script>. Under ES modules that assignment would silently create an unrelated `window.gold` with
// no effect on real game state, so tests/smoke.spec.js was updated to call these instead.
window.__setGold        = (v) => { state.setGold(v); updateGold(); };
window.__setClickDamage = state.setClickDamage;
window.__setCurrentFloor= state.setCurrentFloor;
window.__loadMonster    = loadMonster;
window.__saveGame       = saveGame;

// ─────────────────────────────────────
// Main loops
// ─────────────────────────────────────

setInterval(() => {
  if (state.passiveDamage > 0) {
    const eff = Math.floor(state.passiveDamage * (1 + getTotalMult("dpsMult")));
    if (state.monsterDead) { state.addDamageBuffer(eff); }
    else { spawnPassiveFloats(units); dealDamage(eff); }
  }

  const autoClicks = getAutoClickRate();
  if (autoClicks > 0 && !state.monsterDead) {
    for (let i = 0; i < autoClicks; i++) attack(null);
  }

  if (state.activeBuffs.length) {
    const expired = pruneExpiredBuffs();
    const potionTab = document.getElementById("tab-potions");
    if (potionTab && potionTab.style.display !== "none") renderActiveBuffs();
    if (expired) { renderStats(); renderUnitCosts(); }
  }
}, 1000);

setInterval(() => { saveGame(); flashSaveIndicator(); }, 30000);

document.addEventListener("keydown", e => {
  if (e.code === "Space" && !e.repeat) { e.preventDefault(); attack(null); }
  if (e.code === "KeyD" && !e.repeat) { e.preventDefault(); markPlayerAction(); dodge(); }
});

setInterval(renderPlayerHP, 250);

loadGame();
