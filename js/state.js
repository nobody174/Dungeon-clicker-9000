// ─────────────────────────────────────
// Shared mutable state
// ─────────────────────────────────────
// This game's original inline script relied on ~55 top-level `let`/`const`
// bindings shared by implicit scope across ~84 functions. ES modules don't
// have a shared implicit scope, so this module holds that state explicitly.
// Other modules `import` the pieces they need and mutate fields on these
// objects/arrays directly (arrays/objects are mutable references, so this
// preserves the original "everything shares live state" behavior without
// reintroducing globals).

export const SAVE_VERSION = 2;

// ── Run-state (resets on ascend) ──
export let monsterHP     = 40;
export let monsterMaxHP  = 40;
export let gold          = 0;
export let clickDamage   = 10;
export let passiveDamage = 0;
export let currentFloor  = 1;
export let monsterDead   = false;
export let weaponsBought = {}; // tier id -> true, scoped to selectedWeaponPath; resets on ascend
export let weaponBonus = { critChance: 0, critMult: 0, dpsMult: 0, executeBonus: 0, lifeSteal: 0 }; // accumulated from path tier purchases (Duelist/Channeler/Reaper); resets on ascend
export let selectedWeaponPath = null; // null until the player picks brute/duelist/channeler this run

// ── Boss mechanics: shield (click-only) + multi-phase HP ──
export let monsterShield     = 0;     // current shield HP; only click damage reduces this
export let monsterShieldMax  = 0;
export let bossPhaseCount    = 0;     // total phases for the current boss (0 if not a boss)
export let bossPhaseIndex    = 0;     // which phase boundary has been crossed (0 = none yet)
export let phaseShiftActive  = false; // brief window after crossing a phase boundary: shield reforms, no dmg processed

// ── Persistent state (survives ascend) ──
export let totalKills        = 0;
export let bossKills          = 0;
export let totalGoldEarned   = 0;
export let prestigeCount     = 0;
export let shardBalance      = 0;
export let totalShardsEarned = 0;
export let shardsSpent       = 0;
export let totalPotionsBought = 0;
export let shieldsBroken         = 0;
export let phaseShiftsTriggered  = 0;

// ── Equipment / loot ──
export const equipped = { weapon: null, armor: null, ring: null };
export let inventory = []; // bag: array of { itemId, acquiredAt } for owned-but-unequipped gear
export let pendingLoot = null; // item awaiting an Equip/Bag/Discard choice in the loot modal

export function addToInventory(itemId) {
  inventory.push({ itemId, acquiredAt: Date.now() });
}
export function removeFromInventory(index) {
  inventory.splice(index, 1);
}
export function setInventory(v) { inventory = v; }
export function setPendingLoot(v) { pendingLoot = v; }

// ── Potions ──
export let activeBuffs   = [];
export let potionsBought = {};  // id -> total purchase count this run (resets on ascend), used for cost scaling

// ── Misc ──
export let killMsgTimer      = null;
export let audioCtx          = null;
export let muted             = false;
export let volume             = 1; // 0-1 master gain multiplier for playTone(), independent of mute
export let damageBuffer      = 0;
export let saveIndicatorTimer = null;
export let holdTimeout       = null;
export let holdInterval      = null;
export let lastLungeTime = 0;
export let lastRecoilTime = 0;

// ── Boss Combat v1: Player HP & Dodge (real-time tick loop, decoupled from goldPerSecond/offline math) ──
// BACKLOG.md #13 design pass (2026-07-25): max HP scales with tier (same 10-floor bands
// getMonsterIdentity() already uses for monster stats/icons) instead of a flat constant — a
// floor-100 player having the exact same 4 HP as a floor-5 player read as "strange" (player
// feedback), since the miss-gold-penalty side already scaled (it's a % of current gold) while HP
// didn't. +1 max HP per tier, uncapped (tier itself is already unbounded past floor 71+), fully
// refills every boss fight same as before — no persistent meta-layer, no save-state change.
const PLAYER_BASE_HP = 4;
export function getPlayerMaxHP() {
  const tier = Math.floor((currentFloor - 1) / 10);
  return PLAYER_BASE_HP + tier;
}
export let playerHP = PLAYER_BASE_HP;
export let bossAttackState = "idle"; // "idle" | "windup" | "resolved" — idle = no boss fight running

export function setPlayerHP(v) { playerHP = Math.max(0, Math.min(getPlayerMaxHP(), v)); }
export function setBossAttackState(v) { bossAttackState = v; }

// ── Hero Trials: run-scoped negative-condition counter ──
// Most trials (js/heroes.js's `trial.check()`) can read existing lifetime stats directly
// (bossKills, currentFloor, totalKills, etc.) so they stay valid across Ascend resets. Vex's
// trial needs a "without an active potion" negative condition that doesn't exist anywhere else,
// so this is the one minimal new counter added for it — persists across Ascend (lifetime, like
// bossKills) since trials are one-time unlocks, not per-run challenges.
export let bossKillsWithoutPotion = 0;
export function incBossKillsWithoutPotion() { bossKillsWithoutPotion += 1; }
export function setBossKillsWithoutPotion(v) { bossKillsWithoutPotion = v; }

// ── Boss Trophy Room ──
// Per-monster-type record: defeated, first-kill floor, total-defeats-as-boss. Keyed by the base
// monster's index in monsters.js's `monsters` array (0-9), since tier-identity (1a) reskins the
// same 10 base monsters rather than introducing new ones. Lifetime, persists across Ascend.
export let bossTrophies = {}; // baseIndex -> { defeated: true, firstFloor, kills }
export function setBossTrophies(v) { bossTrophies = v; }
// ── Daily/Weekly Seeded Challenge Run ──
// Fully isolated from the main save: separate localStorage key, no progression carry-over.
// `challengeModeActive` gates which rolls route through the seeded PRNG (see js/prng.js /
// js/challenge.js) instead of raw Math.random().
export let challengeModeActive = false;
export let challengeRng = null; // set by challenge.js when a run starts
export function setChallengeModeActive(v) { challengeModeActive = v; }
export function setChallengeRng(fn) { challengeRng = fn; }
export function rollRandom() { // outcome-affecting roll: seeded during challenge mode, else Math.random()
  return challengeModeActive && challengeRng ? challengeRng() : Math.random();
}

export function recordBossTrophy(baseIndex, floor) {
  const t = bossTrophies[baseIndex] || { defeated: false, firstFloor: null, kills: 0 };
  t.defeated = true;
  if (t.firstFloor === null) t.firstFloor = floor;
  t.kills += 1;
  bossTrophies[baseIndex] = t;
}

// ── Setters for primitive (non-object/array) state that other modules need to reassign ──
export function setMonsterHP(v) { monsterHP = v; }
export function setMonsterMaxHP(v) { monsterMaxHP = v; }
export function setGold(v) { gold = v; }
export function addGold(v) { gold += v; }
export function setClickDamage(v) { clickDamage = v; }
export function addClickDamage(v) { clickDamage += v; }
export function setPassiveDamage(v) { passiveDamage = v; }
export function setCurrentFloor(v) { currentFloor = v; }
export function incCurrentFloor() { currentFloor++; }
export function setMonsterDead(v) { monsterDead = v; }
export function setWeaponsBought(v) { weaponsBought = v; }
export function setWeaponBonus(v) { weaponBonus = v; }
export function setSelectedWeaponPath(v) { selectedWeaponPath = v; }

export function setMonsterShield(v) { monsterShield = v; }
export function addMonsterShield(v) { monsterShield -= v; }
export function setMonsterShieldMax(v) { monsterShieldMax = v; }
export function setBossPhaseCount(v) { bossPhaseCount = v; }
export function setBossPhaseIndex(v) { bossPhaseIndex = v; }
export function incBossPhaseIndex() { bossPhaseIndex += 1; }
export function setPhaseShiftActive(v) { phaseShiftActive = v; }

export function setTotalKills(v) { totalKills = v; }
export function incTotalKills() { totalKills += 1; }
export function setBossKills(v) { bossKills = v; }
export function incBossKills() { bossKills += 1; }
export function setTotalGoldEarned(v) { totalGoldEarned = v; }
export function addTotalGoldEarned(v) { totalGoldEarned += v; }
export function setPrestigeCount(v) { prestigeCount = v; }
export function incPrestigeCount() { prestigeCount += 1; }
export function setShardBalance(v) { shardBalance = v; }
export function addShardBalance(v) { shardBalance += v; }
export function setTotalShardsEarned(v) { totalShardsEarned = v; }
export function addTotalShardsEarned(v) { totalShardsEarned += v; }
export function setShardsSpent(v) { shardsSpent = v; }
export function addShardsSpent(v) { shardsSpent += v; }

// ── Void Fragments ("Run Rules") — second prestige currency ──
// Positioning: Soul Shards = Power (flat stat multipliers), Void Fragments = Run Rules
// (start-of-run advantages + a capped difficulty/reward trade-off), never framed as
// "prestige-of-prestige" in any UI copy. Gated on prestigeCount (a veteran-run-count gate),
// not a raw floor number — see voidFragments.js for the unlock threshold.
export let voidFragments = 0;
export let totalVoidFragmentsEarned = 0;
export let voidRiskLevel = 0; // 0..VOID_RISK_MAX — capped difficulty/reward trade-off, chosen once per run
export function setVoidFragments(v) { voidFragments = v; }
export function addVoidFragments(v) { voidFragments += v; }
export function setTotalVoidFragmentsEarned(v) { totalVoidFragmentsEarned = v; }
export function addTotalVoidFragmentsEarned(v) { totalVoidFragmentsEarned += v; }
export function setVoidRiskLevel(v) { voidRiskLevel = v; }
export function setTotalPotionsBought(v) { totalPotionsBought = v; }
export function incTotalPotionsBought() { totalPotionsBought += 1; }
export function setShieldsBroken(v) { shieldsBroken = v; }
export function incShieldsBroken() { shieldsBroken += 1; }
export function setPhaseShiftsTriggered(v) { phaseShiftsTriggered = v; }
export function incPhaseShiftsTriggered() { phaseShiftsTriggered += 1; }

export function setActiveBuffs(v) { activeBuffs = v; }
export function setPotionsBought(v) { potionsBought = v; }

export function setKillMsgTimer(v) { killMsgTimer = v; }
export function setAudioCtx(v) { audioCtx = v; }
export function setMuted(v) { muted = v; }
export function setVolume(v) { volume = v; }
export function setDamageBuffer(v) { damageBuffer = v; }
export function addDamageBuffer(v) { damageBuffer += v; }
export function setSaveIndicatorTimer(v) { saveIndicatorTimer = v; }
export function setHoldTimeout(v) { holdTimeout = v; }
export function setHoldInterval(v) { holdInterval = v; }
export function setLastLungeTime(v) { lastLungeTime = v; }
export function setLastRecoilTime(v) { lastRecoilTime = v; }
