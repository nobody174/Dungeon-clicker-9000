// ─────────────────────────────────────
// Entry point: imports everything, exposes functions referenced by inline
// HTML event handlers onto window (ES module top-level bindings are not
// globals), wires up the main game loops, and kicks off loadGame().
// ─────────────────────────────────────
import * as state from "./state.js";
import { getAutoClickRate, getTotalMult, pruneExpiredBuffs, getShardMilestoneMult } from "./stats.js";
import { units, renderUnitCosts } from "./units.js";
import { toggleMute, setVolumeLevel } from "./audio.js";
import { showTab, showShopTab, showGearTab, resetGame, flashSaveIndicator, renderStats } from "./ui.js";
import { startAttackHold, stopAttackHold, forceStopAttackHold, attack, spawnPassiveFloats, dealDamage } from "./combat.js";
import { openAscendModal, closeModal, doAscend } from "./prestige.js";
import { equipFromInventory, salvageFromInventory, toggleBagCompare, equipPendingLoot, bagPendingLoot, discardPendingLoot } from "./equipment.js";
import { levelUpHero } from "./heroes.js";
import { saveGame, loadGame, exportSaveString, importSaveString } from "./save.js";
import { renderActiveBuffs } from "./potions.js";
import { loadMonster, getMonsterIdentity } from "./monsters.js";
import { updateGold } from "./ui.js";
import { dodge, renderPlayerHP, forceMissForTest } from "./bossCombat.js";
import { startChallenge, endChallenge, exitChallengeEarly, closeChallengeResult, isChallengeRunning } from "./challenge.js";
import { buyVoidUpgrade, setVoidRiskLevel } from "./voidFragments.js";
import { devAddGold, devSetFloor, devPromptSetFloor, devAddPrestige, devSetClickDamage, devRestoreClickDamage, isDevOneShotActive, devMaxMastery, devKillBoss } from "./dev.js";
import { GAME_VERSION } from "./version.js";
import { showToast } from "./toast.js";

document.getElementById("version-tag").textContent = "v" + GAME_VERSION;

// ── Export / Import Save UI glue (BACKLOG.md #11) ──
function openExportModal() {
  document.getElementById("export-save-text").value = exportSaveString();
  document.getElementById("export-copy-msg").textContent = "";
  document.getElementById("export-modal").style.display = "flex";
}
function closeExportModal() {
  document.getElementById("export-modal").style.display = "none";
}
function copyExportSave() {
  const text = document.getElementById("export-save-text");
  text.select();
  navigator.clipboard?.writeText(text.value)
    .then(() => { document.getElementById("export-copy-msg").textContent = "Copied!"; })
    .catch(() => { document.getElementById("export-copy-msg").textContent = "Couldn't copy automatically — select the text above and copy manually."; });
}
function openImportModal() {
  document.getElementById("import-save-text").value = "";
  document.getElementById("import-error-msg").textContent = "";
  document.getElementById("import-modal").style.display = "flex";
}
function closeImportModal() {
  document.getElementById("import-modal").style.display = "none";
}
function confirmImportSave() {
  const code = document.getElementById("import-save-text").value;
  if (!code.trim()) {
    document.getElementById("import-error-msg").textContent = "Paste a save code first.";
    return;
  }
  if (!confirm("This will overwrite your current progress on this browser. Continue?")) return;
  const error = importSaveString(code);
  if (error) {
    document.getElementById("import-error-msg").textContent = error;
    return;
  }
  closeImportModal();
  showToast("📥 Save Imported", "Your progress has been restored.");
}

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
window.showGearTab      = showGearTab;
window.openAscendModal  = openAscendModal;
window.resetGame        = resetGame;
window.doAscend         = doAscend;
window.closeModal       = closeModal;
window.equipFromInventory   = equipFromInventory;
window.salvageFromInventory = salvageFromInventory;
window.toggleBagCompare     = toggleBagCompare;
window.equipPendingLoot     = equipPendingLoot;
window.bagPendingLoot       = bagPendingLoot;
window.discardPendingLoot   = discardPendingLoot;
window.levelUpHero      = levelUpHero;
window.dodgeAttack      = dodge;
window.startChallenge   = startChallenge;
window.exitChallengeEarly = exitChallengeEarly;
window.closeChallengeResult = closeChallengeResult;
window.buyVoidUpgrade   = buyVoidUpgrade;
window.setVoidRisk      = setVoidRiskLevel;
window.openExportModal  = openExportModal;
window.closeExportModal = closeExportModal;
window.copyExportSave   = copyExportSave;
window.openImportModal  = openImportModal;
window.closeImportModal = closeImportModal;
window.confirmImportSave = confirmImportSave;

// ── Dev Tools — local testing only, never shipped to players ──
// Gated on hostname rather than removed from the codebase so the tab keeps working during local
// `npm run serve` testing. Real deploy targets (GitHub Pages, itch.io) are never localhost, so the
// tab button stays hidden and the cheat functions are never exposed on `window` for those builds —
// a player couldn't reach them from the console either, since they're only bound here.
const isLocalDev = ["localhost", "127.0.0.1", ""].includes(location.hostname);
if (isLocalDev) {
  window.devAddGold       = devAddGold;
  window.devSetFloor      = devSetFloor;
  window.devPromptSetFloor= devPromptSetFloor;
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
window.__lootQueueLen   = () => state.lootQueue.length;
window.__dealDamage     = dealDamage; // lets tests land a kill without a real click (blocked by an open modal overlay, same as a real player)
window.__forceMiss      = forceMissForTest; // lets tests force a boss-combat miss without waiting on real 5s/1.4s timers
window.__playerHP       = () => state.playerHP;
window.__monsterScale   = (floor) => getMonsterIdentity(floor).scale;
window.__shardMult      = getShardMilestoneMult;
window.__setTotalShardsEarned = state.setTotalShardsEarned;
window.__isHoldAttackActive = () => state.holdInterval !== null || state.holdTimeout !== null;

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
  if (e.code === "KeyD" && !e.repeat) { e.preventDefault(); dodge(); }
});

// Safety net for hold-to-attack (startAttackHold/stopAttackHold in combat.js): the button's own
// mouseup/mouseleave/touchend/touchcancel handlers only fire if the release event lands back on
// that element. If the mouse button is released outside the browser window, or the tab loses
// focus mid-hold (alt-tab, an OS/extension popup stealing focus — reported by a player using
// Brave, whose shields UI can do this), neither fires, and the recursive setTimeout attack-repeat
// chain in startAttackHold runs forever with nothing left to clear it — surfacing as "attacks keep
// happening on their own" until the page is closed and reopened. These window-level listeners
// catch every path that can end a hold, not just the ones that land back on the button itself.
// Uses forceStopAttackHold() (clears unconditionally), not stopAttackHold() (releases one
// tracked contact at a time) — a multi-touch phone report (2026-07-28) had multiple fingers
// stuck down on the attack button when focus was lost, and a single stopAttackHold() call would
// only have released one of them, leaving the loop running at a reduced-but-still-wrong speed.
window.addEventListener("mouseup",   forceStopAttackHold);
window.addEventListener("blur",      forceStopAttackHold);
document.addEventListener("visibilitychange", () => { if (document.hidden) forceStopAttackHold(); });

setInterval(renderPlayerHP, 250);

loadGame();
