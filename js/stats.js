// ─────────────────────────────────────
// Cross-cutting stat calculations (getTotalMult and things built on it).
// This is the hub every system's numbers flow through: weapon bonus, gear,
// heroes, active potion buffs, and achievement power all combine here.
// ─────────────────────────────────────
import * as state from "./state.js";
import { heroes, unlockedHeroCount, totalHeroLevels } from "./heroes.js";
import { potionDefs } from "./potions.js";
import { achievements, ACHIEVEMENT_POWER_PER_UNLOCK } from "./achievements.js";
import { shardShop } from "./prestige.js";
import { getMonsterIdentity } from "./monsters.js";
import { getActiveSetBonus } from "./equipment.js";
import { getVoidRiskGoldMult } from "./voidFragments.js";

export function getTotalMult(key) {
  let total = 0;
  if (state.weaponBonus[key]) total += state.weaponBonus[key];
  for (const slot in state.equipped) {
    const item = state.equipped[slot];
    if (item && item.bonus[key]) total += item.bonus[key];
  }
  total += getActiveSetBonus(key);
  for (const h of heroes) {
    if (!h.unlocked) continue;
    total += (h.bonus[key] || 0) + (h.levelBonus?.[key] || 0) * h.level;
    // Roster synergy: some heroes' bonuses scale with how many OTHER heroes are unlocked/leveled.
    if (h.perRosterMult?.[key]) total += h.perRosterMult[key] * (unlockedHeroCount() - 1);
    if (h.perHeroLevelMult?.[key]) total += h.perHeroLevelMult[key] * (totalHeroLevels() - h.level);
  }
  for (const buff of state.activeBuffs) {
    const def = potionDefs.find(p => p.id === buff.defId);
    if (def && def.effect[key]) total += def.effect[key];
  }
  // Achievement Power: every unlocked achievement adds a tiny permanent goldMult + dpsMult, never resets.
  if (key === "goldMult" || key === "dpsMult") {
    total += achievements.filter(a => a.unlocked).length * ACHIEVEMENT_POWER_PER_UNLOCK;
  }
  return total;
}

export function pruneExpiredBuffs() {
  const now = Date.now();
  const before = state.activeBuffs.length;
  state.setActiveBuffs(state.activeBuffs.filter(b => b.expiresAt > now));
  return state.activeBuffs.length !== before;
}

export function getAutoClickRate() {
  let rate = 0;
  for (const buff of state.activeBuffs) {
    const def = potionDefs.find(p => p.id === buff.defId);
    if (def && def.effect.autoClick) rate += def.effect.autoClick;
  }
  return rate;
}

// Progression balance pass (2026-07-26, see the progression balance model artifact from that
// session): totalShardsEarned's multiplier used to be a flat `1 + totalShardsEarned * 0.1` — linear
// in a lifetime-cumulative currency. That's part of why long-term progression stalls: it's the
// only source of player power that grows forever (everything else — units, gear, achievements — is
// additive but bounded), yet it was growing at the same flat rate the whole game, nowhere near
// fast enough to keep pace with monster scaling at depth. Deliberately NOT made a smooth
// exponential curve on shard *value* — shard *income* per prestige cycle is itself linear-in-floor
// (see calcShardsToEarn() below, reset every Ascend), so pairing smooth exponential value with
// linear income would just relocate the exact same additive-vs-geometric mismatch one layer up.
// Milestone-stepped growth is provably reachable against linear income instead: every
// SHARD_MILESTONE_INTERVAL lifetime shards permanently doubles this multiplier, uncapped (there's
// always a next milestone, however far away), which is what actually lets this be the long-term
// scaling engine the additive systems can't be.
const SHARD_MILESTONE_INTERVAL = 25;
export function getShardMilestoneMult() {
  const milestonesHit = Math.floor(state.totalShardsEarned / SHARD_MILESTONE_INTERVAL);
  return Math.pow(2, milestonesHit);
}

export function applyGoldMult(base) {
  const bonus      = shardShop.find(u => u.id === "goldBonus");
  const shardMult  = getShardMilestoneMult() * (1 + bonus.owned * 0.1);
  const gearMult   = 1 + getTotalMult("goldMult");
  const voidMult   = getVoidRiskGoldMult(); // Void Fragments' capped risk/reward trade-off
  return Math.floor(base * shardMult * gearMult * voidMult);
}

export function calcShardsToEarn() {
  return Math.max(1, Math.floor(state.currentFloor / 5) - 3);
}

export function getUnitCost(id, units) {
  const cheap     = shardShop.find(u => u.id === "cheapUnits");
  const shardDisc = cheap.owned > 0 ? 0.25 : 0;
  const heroDisc  = getTotalMult("unitDiscount");
  const totalDisc = Math.min(shardDisc + heroDisc, 0.75);
  const base      = Math.floor(units[id].baseCost * Math.pow(1.15, units[id].count));
  return Math.max(1, Math.floor(base * (1 - totalDisc)));
}

export function goldPerSecond() {
  if (state.passiveDamage <= 0) return 0;
  const identity = getMonsterIdentity(state.currentFloor);
  const isBoss = state.currentFloor % 5 === 0;
  const hp     = Math.floor((isBoss ? identity.baseHP * 2.5 : identity.baseHP) * identity.scale);
  const gld    = Math.floor((isBoss ? identity.baseGold * 3 : identity.baseGold) * identity.scale);
  const effDPS = state.passiveDamage * (1 + getTotalMult("dpsMult"));
  return (effDPS / hp) * applyGoldMult(gld);
}
