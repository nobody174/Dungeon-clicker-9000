// ─────────────────────────────────────
// Boss Combat v1 — Player HP & Dodge
// First real-time tick-loop system in the codebase. Deliberately isolated from
// goldPerSecond()/offline-progress closed-form math — this module owns its own
// timers and never feeds into those calculations.
//
// Idle-safety: the boss-attack timer only *schedules* windups on boss floors, but
// resolution checks state.lastPlayerActionTime before applying any penalty. If the
// player hasn't interacted (click/attack) recently, the swing auto-resolves as
// dodged — an away/idle/offline player is never punished by this system.
// ─────────────────────────────────────
import * as state from "./state.js";
import { showToast } from "./toast.js";
import { updateGold, flashGold } from "./ui.js";
import { getActiveSetBonus } from "./equipment.js";
import { getVoidRiskBossAttackSpeedMult } from "./voidFragments.js";

const WINDUP_MS = 1400;        // telegraph duration before the boss "strikes"
const ATTACK_INTERVAL_MS = 5000; // time between boss attack attempts while a boss fight is active
const IDLE_THRESHOLD_MS = 8000;  // no player action within this window => treat as away, auto-dodge
const MISS_GOLD_PENALTY = 0.05;  // mild, not run-ending: lose 5% of current gold on a missed dodge

let attackTimer = null;
let windupTimer = null;
let active = false;

function els() {
  return {
    wrap: document.getElementById("player-hp-wrap"),
    fill: document.getElementById("player-hp-fill"),
    text: document.getElementById("player-hp-text"),
    telegraph: document.getElementById("boss-telegraph"),
    dodgeBtn: document.getElementById("dodge-btn"),
  };
}

export function renderPlayerHP() {
  const { wrap, fill, text } = els();
  if (!wrap) return;
  if (!active) { wrap.style.display = "none"; return; }
  wrap.style.display = "flex";
  const pct = (state.playerHP / state.PLAYER_MAX_HP) * 100;
  fill.style.width = pct + "%";
  text.textContent = "❤️ " + state.playerHP + " / " + state.PLAYER_MAX_HP;
}

export function isBossCombatActive() {
  return active;
}

function recentlyActive() {
  return Date.now() - state.lastPlayerActionTime < IDLE_THRESHOLD_MS;
}

function clearTimers() {
  clearTimeout(attackTimer); clearTimeout(windupTimer);
  attackTimer = null; windupTimer = null;
}

// Called from combat.js whenever the player clicks/attacks, so this module can tell
// an actively-playing session apart from an idle/backgrounded tab.
export function markPlayerAction() {
  state.setLastPlayerActionTime(Date.now());
}

export function startBossFight() {
  active = true;
  state.setPlayerHP(state.PLAYER_MAX_HP);
  state.setBossAttackState("idle");
  renderPlayerHP();
  scheduleNextAttack();
}

export function endBossFight() {
  active = false;
  clearTimers();
  state.setBossAttackState("idle");
  const { telegraph } = els();
  if (telegraph) telegraph.classList.remove("telegraph-active");
  renderPlayerHP();
}

function scheduleNextAttack() {
  clearTimeout(attackTimer);
  attackTimer = setTimeout(beginWindup, ATTACK_INTERVAL_MS);
}

function beginWindup() {
  if (!active) return;
  state.setBossAttackState("windup");
  const { telegraph } = els();
  if (telegraph) telegraph.classList.add("telegraph-active");
  // Void Fragments' capped risk/reward trade-off shortens the windup (harder to react to) at
  // higher risk levels — the "harder run" half of that mechanic.
  const windup = WINDUP_MS / getVoidRiskBossAttackSpeedMult();
  windupTimer = setTimeout(resolveAttack, windup);
}

function resolveAttack() {
  if (!active) return;
  const { telegraph } = els();
  if (telegraph) telegraph.classList.remove("telegraph-active");

  // Idle/away players always auto-resolve as dodged — never penalize a player who isn't
  // actively at the keyboard (this is what keeps this system decoupled from offline progress).
  if (state.bossAttackState !== "windup" || !recentlyActive()) {
    state.setBossAttackState("idle");
    scheduleNextAttack();
    return;
  }

  // Player was active but didn't press dodge during the windup window — miss.
  state.setPlayerHP(state.playerHP - 1);
  const reduction = getActiveSetBonus("missGoldPenaltyReduction"); // Warden's Resolve set (equipment.js)
  const penalty = Math.floor(state.gold * MISS_GOLD_PENALTY * (1 - Math.min(reduction, 1)));
  if (penalty > 0) { state.addGold(-penalty); updateGold(); flashGold(); }
  showToast("💢 Hit!", "You failed to dodge. -1 HP" + (penalty > 0 ? ", -" + penalty + "g" : ""));
  renderPlayerHP();

  state.setBossAttackState("idle");
  scheduleNextAttack();
}

export function dodge() {
  if (!active || state.bossAttackState !== "windup") return;
  state.setBossAttackState("resolved");
  clearTimeout(windupTimer);
  const { telegraph } = els();
  if (telegraph) telegraph.classList.remove("telegraph-active");
  showToast("✨ Dodged!", "Fully negated the boss's attack.");
  scheduleNextAttack();
}
