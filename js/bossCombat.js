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

// BACKLOG.md #19: a flat 5%-of-current-gold penalty sounds progression-safe but isn't — the
// percentage never changes, but the absolute amount lost keeps growing forever as gold grows, so
// a late-game hoarder saving toward an expensive purchase can lose a disproportionate chunk in
// one miss (player report, 2026-07-26). Tapers down by tier instead of staying flat, floored at
// MISS_GOLD_PENALTY_MIN so a miss always costs *something* at any depth.
const MISS_GOLD_PENALTY_BASE = 0.05;
const MISS_GOLD_PENALTY_STEP = 0.005;  // -0.5 percentage points per tier
const MISS_GOLD_PENALTY_MIN  = 0.015;  // never drops below 1.5%
function getMissGoldPenaltyPct() {
  const tier = Math.floor((state.currentFloor - 1) / 10);
  return Math.max(MISS_GOLD_PENALTY_MIN, MISS_GOLD_PENALTY_BASE - tier * MISS_GOLD_PENALTY_STEP);
}

let attackTimer = null;
let windupTimer = null;
let active = false;

// BACKLOG.md #19/#24 (revised 2026-07-26): reaching 0 HP means the player has "lost" the current
// boss fight — the boss stops attacking (no further HP/gold loss possible this fight) and the
// player must still land the killing blow to advance, but that kill grants no gold/loot/trophy/
// trial credit. Distinct from a normal boss kill, which still pays out in full. Resets to false
// every time a new boss fight starts (startBossFight()).
let fightLost = false;

export function hasLostCurrentFight() {
  return fightLost;
}

function els() {
  return {
    wrap: document.getElementById("player-hp-wrap"),
    fill: document.getElementById("player-hp-fill"),
    text: document.getElementById("player-hp-text"),
    telegraph: document.getElementById("boss-telegraph"),
    dodgeBtn: document.getElementById("dodge-btn"),
    defeatedBanner: document.getElementById("player-defeated-banner"),
  };
}

export function renderPlayerHP() {
  const { wrap, fill, text, dodgeBtn, defeatedBanner } = els();
  if (!wrap) return;
  if (!active) { wrap.style.display = "none"; if (defeatedBanner) defeatedBanner.style.display = "none"; return; }

  if (fightLost) {
    wrap.style.display = "none";
    if (dodgeBtn) dodgeBtn.style.display = "none";
    if (defeatedBanner) defeatedBanner.style.display = "block";
    return;
  }

  wrap.style.display = "flex";
  if (dodgeBtn) dodgeBtn.style.display = "";
  if (defeatedBanner) defeatedBanner.style.display = "none";
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
  fightLost = false;
  state.setPlayerHP(state.getPlayerMaxHP());
  state.setBossAttackState("idle");
  renderPlayerHP();
  scheduleNextAttack();
}

export function endBossFight() {
  active = false;
  fightLost = false;
  clearTimers();
  state.setBossAttackState("idle");
  const { telegraph } = els();
  if (telegraph) telegraph.classList.remove("telegraph-active");
  renderPlayerHP();
}

function scheduleNextAttack() {
  if (fightLost) return; // boss stops attacking once the fight is already lost — no more HP/gold to take
  clearTimeout(attackTimer);
  attackTimer = setTimeout(beginWindup, ATTACK_INTERVAL_MS);
}

function beginWindup() {
  if (!active || fightLost) return;
  state.setBossAttackState("windup");
  const { telegraph } = els();
  if (telegraph) telegraph.classList.add("telegraph-active");
  // Void Fragments' capped risk/reward trade-off shortens the windup (harder to react to) at
  // higher risk levels — the "harder run" half of that mechanic.
  const windup = WINDUP_MS / getVoidRiskBossAttackSpeedMult();
  windupTimer = setTimeout(resolveAttack, windup);
}

function resolveAttack() {
  if (!active || fightLost) return;
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
  const penalty = Math.floor(state.gold * getMissGoldPenaltyPct() * (1 - Math.min(reduction, 1)));
  if (penalty > 0) { state.addGold(-penalty); updateGold(); flashGold(); }

  // BACKLOG.md #19/#24 (revised 2026-07-26): hitting 0 HP means the player has lost this boss
  // fight — the boss stops attacking entirely (fightLost gates scheduleNextAttack/beginWindup/
  // resolveAttack above), so no further HP or gold can be lost this fight; that's also what caps
  // the *total* gold lost per fight at whatever the player's HP pool's worth of misses cost, per
  // design intent. The player still has to land the killing blow to advance (no skip past the
  // boss), but combat.js's kill branch checks hasLostCurrentFight() and withholds gold/loot/
  // trophy/trial credit for that kill. An earlier draft silently refilled HP and let the fight
  // continue as normal, which risked a struggling player re-entering the same HP/gold risk
  // repeatedly on one hard boss — this version caps the downside at exactly one loss.
  if (state.playerHP <= 0) {
    fightLost = true;
    clearTimers();
    showToast("💀 Defeated!", "You're down, but must still finish this boss. No reward for this kill.");
    renderPlayerHP();
    return;
  }

  showToast("💢 Hit!", "You failed to dodge. -1 HP" + (penalty > 0 ? ", -" + penalty + "g" : ""));
  renderPlayerHP();

  state.setBossAttackState("idle");
  scheduleNextAttack();
}

// Test-only: forces a single miss resolution without waiting on the real 5s/1.4s timers. Cancels
// the real attack/windup timers first so a slow test (multiple awaited assertions between forced
// misses) can't let the real ATTACK_INTERVAL_MS timer independently fire a second, uncontrolled
// miss in the background — every miss in a test should come only from this call.
// Requires the caller to already be in a boss fight (startBossFight() called).
export function forceMissForTest() {
  clearTimers();
  state.setBossAttackState("windup");
  resolveAttack();
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
