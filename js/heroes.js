// ─────────────────────────────────────
// Hero system: roster, unlock conditions, level-up, rendering
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum, bonusLabel } from "./utils.js";
import { saveGame } from "./save.js";
import { showToast } from "./toast.js";
import { playAchievementSound, playBuySound } from "./audio.js";
import { renderStats, updateGold } from "./ui.js";
import { renderUnitCosts } from "./units.js";
import { units } from "./units.js";

// ── Heroes (5 core + 3 synergy) ──
export const heroes = [
  { id:"lyra",      name:"Lyra",      title:"the Archer",      icon:"🏹", heroClass:"Ranger",
    flavor:"Swift and precise. Her arrows never miss.",
    unlockCondition:{ type:"floor",   value:10,    desc:"Reach floor 10" },
    bonus:{ dpsMult:0.25 },       levelBonus:{ dpsMult:0.05 },      unlocked:false, level:0 },
  { id:"gorak",     name:"Gorak",     title:"the Berserker",   icon:"⚔️", heroClass:"Warrior",
    flavor:"His rage knows no bounds. Fear him.",
    unlockCondition:{ type:"prestige",value:1,     desc:"Prestige once" },
    bonus:{ critChance:0.05, critMult:10 }, levelBonus:{ critChance:0.01 }, unlocked:false, level:0 },
  { id:"seraphine", name:"Seraphine", title:"the Sorceress",   icon:"🧙‍♀️", heroClass:"Mage",
    flavor:"She bends reality to multiply your wealth.",
    unlockCondition:{ type:"kills",   value:500,   desc:"Kill 500 monsters" },
    bonus:{ goldMult:0.20 },      levelBonus:{ goldMult:0.05 },     unlocked:false, level:0 },
  { id:"thornwick", name:"Thornwick", title:"the Merchant",    icon:"💰", heroClass:"Rogue",
    flavor:"Everything has a price. He makes sure it's lower.",
    unlockCondition:{ type:"gold",    value:10000, desc:"Earn 10,000 total gold" },
    bonus:{ unitDiscount:0.15 },  levelBonus:{ unitDiscount:0.03 }, unlocked:false, level:0 },
  { id:"vex",       name:"Vex",       title:"the Shadowblade", icon:"🗡️", heroClass:"Assassin",
    flavor:"Strikes from darkness. Death follows.",
    unlockCondition:{ type:"bosses",  value:10,    desc:"Defeat 10 bosses" },
    bonus:{ clickMult:0.30 },     levelBonus:{ clickMult:0.06 },    unlocked:false, level:0 },
  // ── Synergy tier: bonuses scale with the rest of the roster, not just their own level ──
  { id:"aldric",    name:"Brother Aldric", title:"the Paladin", icon:"⚜️", heroClass:"Paladin",
    flavor:"His war-hymn quickens every blade in the party.",
    unlockCondition:{ type:"heroLevels", value:15, desc:"Reach 15 combined hero levels" },
    bonus:{ attackSpeedMult:0.08 }, levelBonus:{ attackSpeedMult:0.025 },
    perRosterMult:{ attackSpeedMult:0.05 },
    synergyDesc:"+5% attack speed (held-click rate) per other hero unlocked",
    unlocked:false, level:0 },
  { id:"mortis",    name:"Mortis",    title:"the Necromancer", icon:"💀", heroClass:"Necromancer",
    flavor:"He grows stronger feeding on the strength of others.",
    unlockCondition:{ type:"bosses", value:25, desc:"Defeat 25 bosses" },
    bonus:{ clickMult:0.05 }, levelBonus:{ clickMult:0.01 },
    perHeroLevelMult:{ dpsMult:0.008 },
    synergyDesc:"+0.8% DPS per level invested in OTHER heroes",
    unlocked:false, level:0 },
  { id:"lutessa",   name:"Lutessa",   title:"the Bard", icon:"🎻", heroClass:"Bard",
    flavor:"Every legend in the party becomes part of her song.",
    unlockCondition:{ type:"floor", value:40, desc:"Reach floor 40" },
    bonus:{ goldMult:0.05 }, levelBonus:{ goldMult:0.015 },
    perRosterMult:{ unitDiscount:0.02 },
    synergyDesc:"+2% unit discount per other hero unlocked",
    unlocked:false, level:0 },
];

// ── Hero Trials (companion quests) ──
// One 1-time objective per hero, reusing the achievements-array pattern (name/desc/unlocked/check).
// Cosmetic rewards ONLY — no gold, no stat bonus, no exceptions, per the review's explicit policy
// (avoids soft-mandatory grind pressure). Displayed on each hero's own card on the Heroes tab,
// not the Achievements tab, so the trial stays tied to that specific hero's personality.
// Prefer existing lifetime stats wherever possible so trials stay valid across Ascend resets;
// Vex's trial is the one exception needing the new `bossKillsWithoutPotion` run-scoped counter.
export const heroTrials = {
  lyra:      { title: "Deadeye",        desc: "Reach floor 40",                    check: () => state.currentFloor >= 40 },
  gorak:     { title: "Unstoppable",    desc: "Defeat 20 bosses",                  check: () => state.bossKills >= 20 },
  seraphine: { title: "Archmagus",      desc: "Earn 1,000,000 total gold",         check: () => state.totalGoldEarned >= 1e6 },
  thornwick: { title: "Tycoon",         desc: "Own 50 units total",                check: () => Object.values(units).reduce((s,u)=>s+u.count,0) >= 50 },
  vex:       { title: "Untouchable",    desc: "Defeat 5 bosses without an active potion", check: () => state.bossKillsWithoutPotion >= 5 },
  aldric:    { title: "War Chaplain",   desc: "Prestige 3 times",                  check: () => state.prestigeCount >= 3 },
  mortis:    { title: "Grave Warden",   desc: "Defeat 25 bosses",                  check: () => state.bossKills >= 25 },
  lutessa:   { title: "Living Legend",  desc: "Reach floor 75",                    check: () => state.currentFloor >= 75 },
};

export function trialFor(heroId) {
  return heroTrials[heroId] || null;
}

export function checkHeroTrials() {
  let anyNew = false;
  for (const h of heroes) {
    if (!h.unlocked) continue;
    const trial = heroTrials[h.id];
    if (!trial || trial.unlocked) continue;
    if (trial.check()) {
      trial.unlocked = true;
      anyNew = true;
      showToast("🎖️ Trial Complete!", h.name + " earned the title \"" + trial.title + "\".");
      playAchievementSound();
    }
  }
  if (anyNew) { renderHeroes(); saveGame(); }
}

export function unlockedHeroCount() {
  return heroes.filter(h => h.unlocked).length;
}

export function totalHeroLevels() {
  return heroes.reduce((sum, h) => sum + (h.unlocked ? h.level : 0), 0);
}

export function heroBonusDesc(hero) {
  return Object.entries(hero.bonus).map(([k, v]) => {
    const total = v + (hero.levelBonus?.[k] || 0) * hero.level;
    return bonusLabel(k, total);
  }).join(", ");
}

export function heroLevelCost(hero) {
  return Math.floor(500 * Math.pow(3, hero.level));
}

export function renderHeroes() {
  const container = document.getElementById("tab-heroes-content");
  container.innerHTML = "";
  for (const h of heroes) {
    const div = document.createElement("div");
    div.className = "hero-card " + (h.unlocked ? "hero-unlocked" : "hero-locked");
    if (h.unlocked) {
      const cost  = heroLevelCost(h);
      const maxed = h.level >= 10;
      const trial = heroTrials[h.id];
      const trialHtml = trial ? `
        <div class="hero-trial ${trial.unlocked ? "trial-done" : ""}">
          ${trial.unlocked ? "🎖️" : "⬜"} <strong>Trial: ${trial.title}</strong> — ${trial.desc}
        </div>` : "";
      div.innerHTML = `
        <div class="hero-card-header">
          <div class="hero-icon">${h.icon}</div>
          <div>
            <div class="hero-name">${h.name} <span style="color:#9a96b8;font-size:0.78rem">${h.title}</span>${trial?.unlocked ? ` <span class="hero-trial-badge">"${trial.title}"</span>` : ""}</div>
            <div class="hero-class">${h.heroClass}</div>
          </div>
        </div>
        <div class="hero-flavor">${h.flavor}</div>
        <div class="hero-bonus">${heroBonusDesc(h)}</div>
        ${h.synergyDesc ? `<div class="hero-synergy">🔗 ${h.synergyDesc}</div>` : ""}
        ${trialHtml}
        <div class="hero-footer">
          <span class="hero-level">Level ${h.level}/10</span>
          ${maxed
            ? `<span class="hero-level-max">MAX LEVEL</span>`
            : `<button class="hero-level-btn" onclick="levelUpHero('${h.id}')">Level Up — 🪙 ${formatNum(cost)}g</button>`}
        </div>`;
    } else {
      div.innerHTML = `
        <div class="hero-card-header">
          <div class="hero-icon" style="filter:grayscale(1) opacity(0.25)">${h.icon}</div>
          <div>
            <div class="hero-name" style="color:#334">???</div>
            <div class="hero-class">${h.heroClass}</div>
          </div>
        </div>
        <div class="hero-flavor" style="color:#222">...</div>
        <div class="hero-lock-cond">🔒 ${h.unlockCondition.desc}</div>`;
    }
    container.appendChild(div);
  }
}

export function checkHeroUnlocks() {
  let anyNew = false;
  for (const h of heroes) {
    if (h.unlocked) continue;
    const c = h.unlockCondition;
    let met = false;
    if (c.type === "floor"   && state.currentFloor     >= c.value) met = true;
    if (c.type === "prestige"&& state.prestigeCount    >= c.value) met = true;
    if (c.type === "kills"   && state.totalKills        >= c.value) met = true;
    if (c.type === "gold"    && state.totalGoldEarned   >= c.value) met = true;
    if (c.type === "bosses"  && state.bossKills         >= c.value) met = true;
    if (c.type === "heroLevels" && totalHeroLevels() >= c.value) met = true;
    if (met) {
      h.unlocked = true;
      anyNew = true;
      showToast("🧙 " + h.name + " joined!", h.title + " — " + h.flavor.slice(0,40));
      playAchievementSound();
      const card = document.getElementById("tab-heroes-content")?.children[heroes.indexOf(h)];
      if (card) card.classList.add("hero-new");
    }
  }
  if (anyNew) { renderHeroes(); renderStats(); renderUnitCosts(); saveGame(); }
}

export function levelUpHero(id) {
  const h = heroes.find(h => h.id === id);
  if (!h || !h.unlocked || h.level >= 10) return;
  const cost = heroLevelCost(h);
  if (state.gold < cost) {
    showToast("Not enough gold", "Need " + formatNum(cost) + "g to level up " + h.name + ".");
    return;
  }
  state.addGold(-cost);
  h.level += 1;
  updateGold();
  renderHeroes();
  renderStats();
  renderUnitCosts();
  playBuySound();
  showToast("⬆️ " + h.name + " leveled up!", "Now level " + h.level + "/10.");
  checkHeroUnlocks();
  saveGame();
}
