// ─────────────────────────────────────
// Boss mechanics: phase-shift trigger (shield reform + visual/audio cues)
// ─────────────────────────────────────
import * as state from "./state.js";
import { showToast } from "./toast.js";
import { updateHPBar, shakeScreen } from "./ui.js";
import { checkAchievements } from "./achievements.js";

export function triggerPhaseShift() {
  state.setPhaseShiftActive(true);
  state.setMonsterShield(state.monsterShieldMax); // shield reforms on every phase boundary
  state.incPhaseShiftsTriggered();
  checkAchievements();
  updateHPBar();

  const emojiEl = document.getElementById("monster-emoji");
  emojiEl.classList.remove("phase-shifting"); void emojiEl.offsetWidth; emojiEl.classList.add("phase-shifting");
  shakeScreen();
  showToast("⚡ Phase Shift!", "The boss reinforces its shield. Keep clicking!");

  setTimeout(() => {
    state.setPhaseShiftActive(false);
    emojiEl.classList.remove("phase-shifting");
  }, 1500);
}
