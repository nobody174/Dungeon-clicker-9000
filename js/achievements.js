// ─────────────────────────────────────
// 52 Achievements. Each grants a one-time gold reward on unlock (reward field, scaled to difficulty);
// total unlocked count also feeds a small permanent goldMult/dpsMult bonus (ACHIEVEMENT_POWER_PER_UNLOCK), never reset by Ascend.
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum } from "./utils.js";
import { units, totalUnits } from "./units.js";
import { showToast } from "./toast.js";
import { playAchievementSound } from "./audio.js";
import { applyGoldMult } from "./stats.js";
import { renderStats } from "./ui.js";
import { renderUnits } from "./units.js";
import { saveGame } from "./save.js";
import { updateGold, flashGold } from "./ui.js";
import { checkHeroTrials } from "./heroes.js";

export const ACHIEVEMENT_POWER_PER_UNLOCK = 0.005; // +0.5% gold AND +0.5% DPS per achievement unlocked (e.g. 52/52 = +26%)

export const achievements = [
  // Killing (9)
  { name: "First Blood",     desc: "Kill your first monster",           unlocked: false, reward: 20,      check: () => state.totalKills >= 1 },
  { name: "Monster Slayer",  desc: "Kill 10 monsters",                  unlocked: false, reward: 50,      check: () => state.totalKills >= 10 },
  { name: "Hundred Kills",   desc: "Kill 100 monsters",                 unlocked: false, reward: 200,     check: () => state.totalKills >= 100 },
  { name: "Thousand Kills",  desc: "Kill 1,000 monsters",               unlocked: false, reward: 1000,    check: () => state.totalKills >= 1000 },
  { name: "Ten Thousand",    desc: "Kill 10,000 monsters",              unlocked: false, reward: 8000,    check: () => state.totalKills >= 10000 },
  { name: "Boss Slayer",     desc: "Defeat your first boss",            unlocked: false, reward: 100,     check: () => state.bossKills >= 1 },
  { name: "Boss Hunter",     desc: "Defeat 5 bosses",                   unlocked: false, reward: 500,     check: () => state.bossKills >= 5 },
  { name: "Boss Destroyer",  desc: "Defeat 20 bosses",                  unlocked: false, reward: 2500,    check: () => state.bossKills >= 20 },
  { name: "Void Walker",     desc: "Defeat 100 bosses",                 unlocked: false, reward: 15000,   check: () => state.bossKills >= 100 },
  // Floors (9)
  { name: "First Steps",     desc: "Reach floor 5",                     unlocked: false, reward: 50,      check: () => state.currentFloor >= 5 },
  { name: "Going Deeper",    desc: "Reach floor 10",                    unlocked: false, reward: 150,     check: () => state.currentFloor >= 10 },
  { name: "Boss Country",    desc: "Reach floor 20",                    unlocked: false, reward: 500,     check: () => state.currentFloor >= 20 },
  { name: "Veteran",         desc: "Reach floor 30",                    unlocked: false, reward: 1500,    check: () => state.currentFloor >= 30 },
  { name: "Dungeon Master",  desc: "Reach floor 50",                    unlocked: false, reward: 5000,    check: () => state.currentFloor >= 50 },
  { name: "Legendary",       desc: "Reach floor 75",                    unlocked: false, reward: 15000,   check: () => state.currentFloor >= 75 },
  { name: "Immortal",        desc: "Reach floor 100",                   unlocked: false, reward: 40000,   check: () => state.currentFloor >= 100 },
  { name: "Mythic",          desc: "Reach floor 150",                   unlocked: false, reward: 120000,  check: () => state.currentFloor >= 150 },
  { name: "Eternal",         desc: "Reach floor 200",                   unlocked: false, reward: 350000,  check: () => state.currentFloor >= 200 },
  // Gold (8)
  { name: "Pocket Change",   desc: "Earn 100 total gold",               unlocked: false, reward: 20,      check: () => state.totalGoldEarned >= 100 },
  { name: "Saving Up",       desc: "Earn 1,000 total gold",             unlocked: false, reward: 100,     check: () => state.totalGoldEarned >= 1000 },
  { name: "Small Fortune",   desc: "Earn 10,000 total gold",            unlocked: false, reward: 500,     check: () => state.totalGoldEarned >= 10000 },
  { name: "Rich",            desc: "Earn 100,000 total gold",           unlocked: false, reward: 2500,    check: () => state.totalGoldEarned >= 100000 },
  { name: "Millionaire",     desc: "Earn 1,000,000 total gold",         unlocked: false, reward: 15000,   check: () => state.totalGoldEarned >= 1e6 },
  { name: "Gold Hoarder",    desc: "Hold 10,000 gold at once",          unlocked: false, reward: 500,     check: () => state.gold >= 10000 },
  { name: "The Treasury",    desc: "Hold 100,000 gold at once",         unlocked: false, reward: 3000,    check: () => state.gold >= 100000 },
  { name: "Dragon's Hoard",  desc: "Hold 1,000,000 gold at once",       unlocked: false, reward: 20000,   check: () => state.gold >= 1e6 },
  // Upgrades (9)
  { name: "First Purchase",  desc: "Buy any weapon upgrade",            unlocked: false, reward: 50,      check: () => Object.keys(state.weaponsBought).length >= 1 },
  { name: "Armed & Ready",   desc: "Buy a Better Sword",                unlocked: false, reward: 50,      check: () => state.weaponsBought.sword },
  { name: "Full Arsenal",    desc: "Buy the first 3 tiers of a weapon path", unlocked: false, reward: 800, check: () => Object.keys(state.weaponsBought).length >= 3 },
  { name: "Hired Help",      desc: "Buy your first unit",               unlocked: false, reward: 50,      check: () => totalUnits() >= 1 },
  { name: "Small Party",     desc: "Own 5 units total",                 unlocked: false, reward: 300,     check: () => totalUnits() >= 5 },
  { name: "Warband",         desc: "Own 20 units total",                unlocked: false, reward: 2000,    check: () => totalUnits() >= 20 },
  { name: "Legion",          desc: "Own 50 units total",                unlocked: false, reward: 10000,   check: () => totalUnits() >= 50 },
  { name: "Full Roster",     desc: "Own at least 1 of each unit type",  unlocked: false, reward: 1000,    check: () => units.squire.count > 0 && units.rogue.count > 0 && units.mage.count > 0 },
  { name: "Click Master",    desc: "Reach 100 click damage",            unlocked: false, reward: 1500,    check: () => state.clickDamage >= 100 },
  { name: "Master Trainer",  desc: "Reach mastery level 10 on any unit",unlocked: false, reward: 3000,    check: () => Object.values(units).some(u => u.mastery >= 10) },
  // Prestige (5)
  { name: "Brave Soul",      desc: "Prestige for the first time",       unlocked: false, reward: 0,       check: () => state.prestigeCount >= 1 },
  { name: "Twice Born",      desc: "Prestige 3 times",                  unlocked: false, reward: 0,       check: () => state.prestigeCount >= 3 },
  { name: "Phoenix",         desc: "Prestige 5 times",                  unlocked: false, reward: 0,       check: () => state.prestigeCount >= 5 },
  { name: "Reborn",          desc: "Prestige 10 times",                 unlocked: false, reward: 0,       check: () => state.prestigeCount >= 10 },
  { name: "Soul Collector",  desc: "Accumulate 50 total Soul Shards",   unlocked: false, reward: 0,       check: () => state.totalShardsEarned >= 50 },
  // DPS (5)
  { name: "Getting There",   desc: "Reach 10 passive DPS",              unlocked: false, reward: 100,     check: () => state.passiveDamage >= 10 },
  { name: "Speed Demon",     desc: "Reach 100 passive DPS",             unlocked: false, reward: 800,     check: () => state.passiveDamage >= 100 },
  { name: "War Machine",     desc: "Reach 1,000 passive DPS",           unlocked: false, reward: 5000,    check: () => state.passiveDamage >= 1000 },
  { name: "World Ender",     desc: "Reach 10,000 passive DPS",          unlocked: false, reward: 30000,   check: () => state.passiveDamage >= 10000 },
  { name: "Shard Master",    desc: "Spend 20 Soul Shards on upgrades",  unlocked: false, reward: 0,       check: () => state.shardsSpent >= 20 },
  // Potions (3)
  { name: "First Sip",       desc: "Drink your first potion",           unlocked: false, reward: 30,      check: () => state.totalPotionsBought >= 1 },
  { name: "Alchemist",       desc: "Drink 25 potions total",            unlocked: false, reward: 600,     check: () => state.totalPotionsBought >= 25 },
  { name: "Mixologist",      desc: "Have 3 different potions active at once", unlocked: false, reward: 400, check: () => state.activeBuffs.length >= 3 },
  // Boss mechanics (2)
  { name: "Shield Breaker",  desc: "Break a boss's shield",             unlocked: false, reward: 200,     check: () => state.shieldsBroken >= 1 },
  { name: "Phase Master",    desc: "Survive 10 boss phase shifts",      unlocked: false, reward: 1200,    check: () => state.phaseShiftsTriggered >= 10 },
];

export function renderAchievements() {
  const container = document.getElementById("achievements-list");
  container.innerHTML = "";
  achievements.forEach(a => {
    const div = document.createElement("div");
    div.className = "achievement " + (a.unlocked ? "unlocked" : "locked");
    if (a.unlocked) {
      const rewardStr = a.reward > 0 ? `<span class="ach-reward">🪙 +${formatNum(a.reward)}g</span>` : "";
      div.innerHTML = `<span class="ach-icon">🏆</span><span class="ach-info"><span class="ach-name">${a.name}</span><span class="ach-desc">${a.desc}</span></span>${rewardStr}`;
    } else {
      div.innerHTML = `<span class="ach-icon">🔒</span><span class="ach-info"><span class="ach-name">???</span><span class="ach-desc">${a.desc}</span></span>`;
    }
    container.appendChild(div);
  });
  const power = document.getElementById("achievement-power");
  if (power) {
    const pct = (achievements.filter(a => a.unlocked).length * ACHIEVEMENT_POWER_PER_UNLOCK * 100).toFixed(1);
    power.textContent = "🏅 Achievement Power: +" + pct + "% gold & DPS (permanent, never resets)";
  }
}

export function updateAchCount() {
  document.getElementById("ach-count").textContent = achievements.filter(a => a.unlocked).length;
  document.getElementById("ach-total").textContent = achievements.length;
}

export function checkAchievements() {
  let anyNew = false;
  for (const a of achievements) {
    if (!a.unlocked && a.check()) {
      a.unlocked = true;
      anyNew = true;
      if (a.reward > 0) {
        const earned = applyGoldMult(a.reward);
        state.addGold(earned); state.addTotalGoldEarned(earned);
        updateGold(); flashGold();
        showToast("🏆 " + a.name, a.desc + " — +" + formatNum(earned) + "g");
      } else {
        showToast("🏆 " + a.name, a.desc);
      }
      playAchievementSound();
    }
  }
  if (anyNew) {
    renderAchievements(); updateAchCount(); renderStats(); renderUnits(); saveGame();
  }
  checkHeroTrials(); // cheap idempotent check; achievements.js's checkAchievements() is already called ubiquitously
}
