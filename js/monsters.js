// ─────────────────────────────────────
// Monster roster + loadMonster (spawning a new monster/boss on a floor)
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum } from "./utils.js";
import { showToast } from "./toast.js";
import { applyGoldMult } from "./stats.js";
import { updateGold, flashGold, updateHPBar, updateAscendSection } from "./ui.js";
import { renderUnits } from "./units.js";
import { startBossFight, endBossFight } from "./bossCombat.js";

export const monsters = [
  { name: "Slime",      hp: 40,    gold: 8,    icon: "🟢" },
  { name: "Goblin",     hp: 80,    gold: 15,   icon: "👺" },
  { name: "Skeleton",   hp: 150,   gold: 25,   icon: "🦴" },
  { name: "Orc",        hp: 280,   gold: 45,   icon: "👹" },
  { name: "Werewolf",   hp: 500,   gold: 80,   icon: "🐺" },
  { name: "Vampire",    hp: 900,   gold: 140,  icon: "🧛" },
  { name: "Witch",      hp: 1600,  gold: 240,  icon: "🧙" },
  { name: "Dragon",     hp: 2800,  gold: 420,  icon: "🐲" },
  { name: "Demon Lord", hp: 5000,  gold: 750,  icon: "😈" },
  { name: "Lich King",  hp: 9000,  gold: 1350, icon: "💀" },
];

function spawnOverlay(cls, dur) {
  const el = document.createElement("div");
  el.className = cls;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), dur);
}

export const FLOOR_MILESTONES = [100, 200, 500, 1000, 2000, 5000, 10000];

// ── Tiered monster visual identity (1a) ──
// Every 10 floors (one full pass through `monsters`), each base monster gets a new name/icon
// prefix so floor 55's "Slime" reads as something distinct from floor 5's, without introducing
// any new mechanic (stats still scale via the existing `tier`/`scale` math elsewhere). Purely
// derived from floor — no save state. Tiers past the table just keep re-using the last prefix
// (tier is otherwise unbounded, so there's no natural "final" entry).
// `iconDecorator` is always shown alongside the base creature's own icon (never replaces it) —
// e.g. tier 4's "Frozen Dragon" renders as "🐲❄️", not a bare ice cube standing in for the dragon.
// Player feedback: a tier icon that fully replaces the base icon loses the creature entirely.
export const TIER_PREFIXES = [
  { suffix: "",              iconDecorator: null },   // tier 0: floors 1-10, base name/icon
  { suffix: "Feral ",        iconDecorator: "🔥" },   // tier 1: floors 11-20
  { suffix: "Acid ",         iconDecorator: "🧪" },   // tier 2: floors 21-30
  { suffix: "Shadow ",       iconDecorator: "🌑" },   // tier 3: floors 31-40
  { suffix: "Frozen ",       iconDecorator: "❄️" },   // tier 4: floors 41-50
  { suffix: "Infernal ",     iconDecorator: "🔥" },   // tier 5: floors 51-60
  { suffix: "Voidtouched ",  iconDecorator: "🌀" },   // tier 6: floors 61-70
  { suffix: "Ascendant ",    iconDecorator: "⭐" },   // tier 7+: floors 71+
];

// Single shared accessor: resolves the tiered name/icon/stats for a given floor.
// Consolidates what used to be 3 independent `monsters[(floor-1)%monsters.length]` lookups
// (loadMonster, combat.js kill branch, stats.js goldPerSecond) into one source of truth.
export function getMonsterIdentity(floor) {
  const baseIndex = (floor - 1) % monsters.length;
  const base  = monsters[baseIndex];
  const tier  = Math.floor((floor - 1) / monsters.length);
  const scale = Math.pow(1.8, tier);
  const prefixTier = TIER_PREFIXES[Math.min(tier, TIER_PREFIXES.length - 1)];
  const name = prefixTier.suffix ? prefixTier.suffix + base.name : base.name;
  const icon = prefixTier.iconDecorator ? base.icon + prefixTier.iconDecorator : base.icon;
  return { name, icon, baseIndex, tier, scale, baseHP: base.hp, baseGold: base.gold };
}

export function loadMonster(floor) {
  const identity = getMonsterIdentity(floor);
  const base   = { name: identity.name, icon: identity.icon, hp: identity.baseHP, gold: identity.baseGold };
  const isBoss = floor % 5 === 0;
  const tier   = identity.tier;
  const scale  = identity.scale;

  state.setMonsterMaxHP(Math.floor((isBoss ? base.hp * 2.5 : base.hp) * scale));
  state.setMonsterHP(state.monsterMaxHP);

  if (isBoss) {
    state.setBossPhaseCount(floor % 10 === 0 ? 3 : 2); // every 2nd boss (floor % 10) gets an extra phase
    state.setBossPhaseIndex(0);
    state.setMonsterShieldMax(Math.floor(state.monsterMaxHP * 0.35));
    state.setMonsterShield(state.monsterShieldMax);
    state.setPhaseShiftActive(false);
  } else {
    state.setBossPhaseCount(0);
    state.setBossPhaseIndex(0);
    state.setMonsterShieldMax(0);
    state.setMonsterShield(0);
    state.setPhaseShiftActive(false);
  }

  if (state.damageBuffer > 0) {
    state.setMonsterHP(Math.max(1, state.monsterHP - state.damageBuffer));
    state.setDamageBuffer(0);
  }

  if (FLOOR_MILESTONES.includes(floor)) {
    const bonus = floor * 1000;
    const earned = applyGoldMult(bonus);
    state.addGold(earned); state.addTotalGoldEarned(earned); updateGold(); flashGold();
    showToast("🏆 Floor " + floor + " Milestone!", "+" + formatNum(earned) + "g bonus reward!");
  }

  const emojiEl = document.getElementById("monster-emoji");
  const nameEl  = document.getElementById("monster-name");
  const fillEl  = document.getElementById("hp-fill");

  const isMegaBoss = isBoss && floor % 10 === 0;

  emojiEl.textContent = base.icon;
  emojiEl.classList.remove("phase-shifting");
  document.getElementById("shield-bar-wrap").classList.remove("breaking");
  nameEl.textContent  = isBoss ? (isMegaBoss ? "👑👑 " : "👑 ") + base.name : base.name;
  nameEl.className    = "monster-name" + (isBoss ? " boss-name" : "");

  document.getElementById("floor-label").textContent  = "Floor " + floor;
  const badgeEl = document.getElementById("boss-badge");
  badgeEl.style.display = isBoss ? "inline" : "none";
  badgeEl.textContent   = isMegaBoss ? "👑 MEGA BOSS" : "⚡ BOSS";
  badgeEl.classList.toggle("mega-badge", isMegaBoss);

  if (isBoss) {
    emojiEl.classList.add("boss-monster");
    emojiEl.classList.toggle("mega-boss-monster", isMegaBoss);
    fillEl.classList.add("boss-hp");
    spawnOverlay("boss-flash-overlay", 700);
  } else {
    emojiEl.classList.remove("boss-monster", "mega-boss-monster");
    fillEl.classList.remove("boss-hp");
  }

  const area = document.getElementById("monster-area");
  area.classList.remove("spawning");
  void area.offsetWidth;
  area.classList.add("spawning");

  updateHPBar();
  updateAscendSection();
  renderUnits();

  // Boss Combat v1 is exclusive to boss floors — player HP/dodge timer only runs here.
  if (isBoss) startBossFight(); else endBossFight();
}

// ── Boss Trophy Room support ──
// Gallery entries are keyed off tier identity (name+icon), reusing TIER_PREFIXES from 1a rather
// than inventing a separate identity list. Only the first few tiers are enumerated (per the
// review's explicit scope cut on unbounded content) — tier 7+ all collapse into "Ascendant"
// visually anyway, so cataloguing further tiers would just repeat entries.
export function getTrophyGallery() {
  const entries = [];
  for (let tier = 0; tier < TIER_PREFIXES.length; tier++) {
    const prefixTier = TIER_PREFIXES[tier];
    for (let i = 0; i < monsters.length; i++) {
      const base = monsters[i];
      const name = prefixTier.suffix ? prefixTier.suffix + base.name : base.name;
      const icon = prefixTier.iconDecorator ? base.icon + prefixTier.iconDecorator : base.icon;
      entries.push({ baseIndex: i, tier, name, icon, minFloor: tier * monsters.length + 1 });
    }
  }
  return entries;
}

export { spawnOverlay };
