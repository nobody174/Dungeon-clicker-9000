// ─────────────────────────────────────
// Boss Combat v1 — Player HP & Dodge
// First real-time tick-loop system in the codebase. Deliberately isolated from
// goldPerSecond()/offline-progress closed-form math — this module owns its own
// timers and never feeds into those calculations.
//
// Idle-safety: the boss-attack timer only *schedules* windups on boss floors, but
// resolution checks whether the tab is visible/focused (recentlyActive()) before
// applying any penalty. An away/backgrounded/offline tab auto-resolves as dodged.
// Previously this checked click recency instead (last click within 8s) — that
// punished/rewarded based on click cadence rather than actual presence: a player
// watching a fight but pacing clicks slower than 8s got real misses silently
// no-op'd, which read as unexplained HP regen (player report, 2026-07-25:
// "I can watch the boss attack me without losing any HP... as soon as I attack
// again, I regain the HP back"). Tab focus is what "away" actually means here.
// ─────────────────────────────────────
import * as state from "./state.js";
import { showToast } from "./toast.js";
import { updateGold, flashGold } from "./ui.js";
import { getActiveSetBonus } from "./equipment.js";
import { getVoidRiskBossAttackSpeedMult } from "./voidFragments.js";

const WINDUP_MS = 1400;        // telegraph duration before the boss "strikes"
const ATTACK_INTERVAL_MS = 5000; // time between boss attack attempts while a boss fight is active
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
  const maxHP = state.getPlayerMaxHP();
  const pct = (state.playerHP / maxHP) * 100;
  fill.style.width = pct + "%";
  text.textContent = "❤️ " + state.playerHP + " / " + maxHP;
}

export function isBossCombatActive() {
  return active;
}

// "Recently active" is meant to mean "not away/idle/offline" (see file header), not "clicked in
// the last few seconds" — a player who's actively watching a boss fight but pacing their clicks
// slower than IDLE_THRESHOLD_MS was getting real misses silently no-op'd, which read as
// unexplained HP regen (player report, 2026-07-25: "I can watch the boss attack me without
// losing any HP... as soon as I attack again, I regain the HP back"). The tab being visible and
// focused is the actual signal for "the player is here," independent of click cadence — a
// genuinely away/backgrounded/offline tab is what this check exists to protect, not someone
// who's simply not spamming clicks every few seconds.
function recentlyActive() {
  return !document.hidden && document.hasFocus();
}

function clearTimers() {
  clearTimeout(attackTimer); clearTimeout(windupTimer);
  attackTimer = null; windupTimer = null;
}

export function startBossFight() {
  active = true;
  state.setPlayerHP(state.getPlayerMaxHP());
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
