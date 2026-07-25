// ─────────────────────────────────────
// Core combat loop: attack / dealDamage, plus the visual/audio effects tied
// to it (lunge, monster flash, floating damage numbers, kill message).
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum } from "./utils.js";
import { getTotalMult, applyGoldMult } from "./stats.js";
import { initAudio, playClickSound, playKillSound, playBossKillSound } from "./audio.js";
import { updateGold, flashGold, updateHPBar, shakeScreen } from "./ui.js";
import { getMonsterIdentity, loadMonster } from "./monsters.js";
import { triggerPhaseShift } from "./bosses.js";
import { rollLoot, showLootModal } from "./equipment.js";
import { showToast } from "./toast.js";
import { checkAchievements } from "./achievements.js";
import { checkHeroUnlocks, checkHeroTrials } from "./heroes.js";
import { renderTrophyRoom } from "./trophies.js";

export function spawnOverlay(cls, dur) {
  const el = document.createElement("div");
  el.className = cls;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), dur);
}

export function triggerLunge() {
  const now = Date.now();
  if (now - state.lastLungeTime < 280) return;
  state.setLastLungeTime(now);
  const el = document.getElementById("player-emoji");
  if (!el) return;
  el.classList.remove("lunging"); void el.offsetWidth; el.classList.add("lunging");
}

export function flashMonster() {
  const emoji = document.getElementById("monster-emoji");
  emoji.classList.remove("hit"); void emoji.offsetWidth; emoji.classList.add("hit");
  const now = Date.now();
  if (now - state.lastRecoilTime >= 260) {
    state.setLastRecoilTime(now);
    const side = emoji.closest(".monster-side");
    if (side) { side.classList.remove("recoil"); void side.offsetWidth; side.classList.add("recoil"); }
  }
}

export function spawnPassiveFloats(units) {
  const emojiEl = document.getElementById("monster-emoji");
  if (!emojiEl) return;
  const rect = emojiEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;
  const effDPSMult = 1 + getTotalMult("dpsMult");
  const contributors = Object.values(units).map(u => ({ count: u.count, dps: u.dps })).filter(u => u.count > 0);
  if (!contributors.length) return;
  contributors.forEach((u, i) => {
    const dmg    = Math.floor(u.count * u.dps * effDPSMult);
    const side   = (i % 2 === 0) ? -1 : 1;
    const offsetX = (Math.random() * 30 + 10) * side;
    const offsetY = Math.random() * 20 - 10;
    const el = document.createElement("div");
    el.className = "dmg-float passive";
    el.textContent = "-" + formatNum(dmg);
    el.style.left = (cx + offsetX - 12) + "px";
    el.style.top  = (cy + offsetY - 20) + "px";
    el.style.setProperty("--dx", (offsetX * 0.8) + "px");
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  });
}

export function showKillMsg(amount, isBoss) {
  const el = document.getElementById("kill-msg");
  el.textContent = (isBoss ? "⚡ BOSS DEFEATED!  +" : "+") + formatNum(amount) + "g";
  el.className   = "kill-msg" + (isBoss ? " boss-kill" : "");
  clearTimeout(state.killMsgTimer);
  state.setKillMsgTimer(setTimeout(() => { el.textContent = ""; el.className = "kill-msg"; }, isBoss ? 3000 : 1200));
}

const PASSIVE_SHIELD_EFFICIENCY = 0.15; // idle DPS still chips shields, just much slower than clicking

export function dealDamage(amount, isClick) {
  if (state.monsterDead || state.phaseShiftActive) return;

  if (state.monsterShield > 0) {
    const shieldDmg = isClick ? amount : amount * PASSIVE_SHIELD_EFFICIENCY;
    const absorbed  = Math.min(state.monsterShield, shieldDmg);
    state.setMonsterShield(state.monsterShield - absorbed);
    amount = isClick ? amount - absorbed : 0; // passive damage never bleeds through to HP while shielded
    if (state.monsterShield <= 0) {
      const wrap = document.getElementById("shield-bar-wrap");
      wrap.classList.remove("breaking"); void wrap.offsetWidth; wrap.classList.add("breaking");
      showToast("🛡️ Shield Broken!", "Full damage now applies.");
      state.incShieldsBroken();
      checkAchievements();
    }
    if (amount <= 0) { flashMonster(); updateHPBar(); return; }
  }

  state.setMonsterHP(state.monsterHP - amount);
  if (state.monsterHP < 0) state.setMonsterHP(0);
  flashMonster();
  updateHPBar();

  if (state.bossPhaseCount > 0 && state.bossPhaseIndex < state.bossPhaseCount - 1 && state.monsterHP > 0) {
    const phaseThreshold = state.monsterMaxHP * (1 - (state.bossPhaseIndex + 1) / state.bossPhaseCount);
    if (state.monsterHP <= phaseThreshold) {
      state.incBossPhaseIndex();
      triggerPhaseShift();
    }
  }

  if (state.monsterHP <= 0) {
    state.setMonsterDead(true);
    const identity  = getMonsterIdentity(state.currentFloor);
    const isBoss    = state.currentFloor % 5 === 0;
    const bossFloor = state.currentFloor;
    const scale     = identity.scale;
    const earned    = applyGoldMult(Math.floor((isBoss ? identity.baseGold * 3 : identity.baseGold) * scale));

    state.addGold(earned);
    state.addTotalGoldEarned(earned);
    state.incTotalKills();
    if (isBoss) {
      state.incBossKills();
      if (state.activeBuffs.length === 0) state.incBossKillsWithoutPotion(); // Hero Trials: Vex's negative-condition trial
      state.recordBossTrophy(identity.baseIndex, bossFloor); // Boss Trophy Room
      renderTrophyRoom();
    }

    updateGold();
    flashGold();
    showKillMsg(earned, isBoss);

    if (isBoss) {
      playBossKillSound();
      shakeScreen();
      if (state.pendingLoot === null) {
        setTimeout(() => {
          const item = rollLoot(bossFloor);
          if (item) showLootModal(item);
        }, 1500);
      }
    } else {
      playKillSound();
    }

    const area = document.getElementById("monster-area");
    area.classList.remove("shaking");
    void area.offsetWidth;
    area.classList.add("shaking");

    state.incCurrentFloor();
    checkHeroUnlocks();
    checkHeroTrials();

    setTimeout(() => {
      loadMonster(state.currentFloor);
      state.setMonsterDead(false);
      checkAchievements();
    }, 310);
  }
}

export function attack(event) {
  if (state.monsterDead) return;
  initAudio();
  playClickSound();
  triggerLunge();

  const critChance = getTotalMult("critChance");
  const isCrit     = state.rollRandom() < critChance;
  const critMult   = 1 + getTotalMult("critMult"); // additive stacking: Gorak (10x) + Lucky Draught (5x) + weapon tiers

  const base = Math.floor(state.clickDamage * (1 + getTotalMult("clickMult")));
  let dmg  = isCrit ? base * critMult : base;

  // Path of the Reaper — execute: bonus damage while the monster is below ~20% HP.
  const executeBonus = getTotalMult("executeBonus");
  const isExecute = executeBonus > 0 && state.monsterMaxHP > 0 && state.monsterHP > 0 && (state.monsterHP / state.monsterMaxHP) < 0.2;
  if (isExecute) dmg = Math.floor(dmg * (1 + executeBonus));

  // Path of the Reaper — life-steal: chance to heal 1 player HP on hit (only meaningful during
  // a boss fight, where playerHP/getPlayerMaxHP() actually matters; harmless no-op otherwise).
  const lifeSteal = getTotalMult("lifeSteal");
  if (lifeSteal > 0 && state.rollRandom() < lifeSteal && state.playerHP < state.getPlayerMaxHP()) {
    state.setPlayerHP(state.playerHP + 1);
  }

  if (isCrit) shakeScreen();

  const spawnFloat = (x, y) => {
    const el = document.createElement("div");
    el.className   = "dmg-float" + (isCrit ? " crit" : "");
    el.textContent = (isCrit ? "💥 " : "-") + formatNum(dmg);
    el.style.left  = (x - 16) + "px";
    el.style.top   = (y - 30) + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  };

  if (event && event.clientX != null) {
    spawnFloat(event.clientX, event.clientY);
  } else {
    const emojiEl = document.getElementById("monster-emoji");
    if (emojiEl) {
      const r = emojiEl.getBoundingClientRect();
      spawnFloat(r.left + r.width / 2 + (Math.random() * 40 - 20), r.top + r.height / 2 + (Math.random() * 20 - 10));
    }
  }

  dealDamage(dmg, true);
  checkAchievements();
}

const BASE_HOLD_ATTACK_DELAY = 220; // ms between auto-repeats while the attack button is held

export function getAttackHoldDelay() {
  // attackSpeedMult is a synergy-driven multiplier (e.g. Paladin's aura); higher = faster repeats
  const speedMult = 1 + getTotalMult("attackSpeedMult");
  return Math.max(60, BASE_HOLD_ATTACK_DELAY / speedMult);
}

export function startAttackHold(event) {
  initAudio();
  const pos = event.touches ? event.touches[0] : event;
  attack(pos);
  state.setHoldTimeout(setTimeout(() => {
    const tick = () => {
      attack(null);
      state.setHoldInterval(setTimeout(tick, getAttackHoldDelay()));
    };
    state.setHoldInterval(setTimeout(tick, getAttackHoldDelay()));
  }, 300));
}

export function stopAttackHold() {
  clearTimeout(state.holdTimeout); clearTimeout(state.holdInterval);
  state.setHoldTimeout(null); state.setHoldInterval(null);
}
