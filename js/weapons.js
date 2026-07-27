// ─────────────────────────────────────
// Weapon paths: pick one per ascension run. Each tier purchase is permanent for the run.
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum, bonusLabel } from "./utils.js";
import { renderStats, updateGold } from "./ui.js";
import { playBuySound } from "./audio.js";
import { checkAchievements } from "./achievements.js";
import { saveGame } from "./save.js";

export const weaponPaths = {
  brute: {
    name: "Brute", icon: "🗡️", desc: "Pure flat click damage. No frills.",
    tiers: [
      { id:"sword",       name:"Better Sword",  icon:"🗡️", cost:60,     clickBonus:5   },
      { id:"gloves",      name:"Iron Gloves",   icon:"🧤", cost:300,    clickBonus:10  },
      { id:"axe",         name:"Battle Axe",    icon:"🪓", cost:1000,   clickBonus:25  },
      { id:"warhammer",   name:"Warhammer",     icon:"🔨", cost:2500,   clickBonus:55  },
      { id:"colossus",    name:"Colossus Blade",icon:"⚔️", cost:7500,   clickBonus:100 },
      { id:"stormstrike", name:"Stormstrike",   icon:"⚡", cost:25000,  clickBonus:220 },
      { id:"shadowreaper",name:"Shadowreaper",  icon:"🌑", cost:100000, clickBonus:450 },
      { id:"deathscythe", name:"Deathscythe",   icon:"💀", cost:500000, clickBonus:900 },
    ],
  },
  duelist: {
    name: "Duelist", icon: "🎯", desc: "Lower damage per tier, but stacks crit chance and crit damage.",
    tiers: [
      { id:"sword",      name:"Better Sword",   icon:"🗡️", cost:60,     clickBonus:5  },
      { id:"daggers",    name:"Twin Daggers",   icon:"🔪", cost:300,    clickBonus:6,  critChance:0.02, critMult:1 },
      { id:"rapier",     name:"Rapier",         icon:"🤺", cost:1000,   clickBonus:14, critChance:0.03, critMult:1.5 },
      { id:"bow",        name:"Elven Bow",      icon:"🏹", cost:2500,   clickBonus:12, critChance:0.04, critMult:2 },
      { id:"crossbow",   name:"Hunter's Crossbow",icon:"🎯", cost:7500, clickBonus:24, critChance:0.05, critMult:2.5 },
      { id:"venomfang",  name:"Venomfang",      icon:"🐍", cost:25000,  clickBonus:50, critChance:0.06, critMult:3 },
      { id:"nightedge",  name:"Nightedge",      icon:"🌙", cost:100000, clickBonus:100,critChance:0.07, critMult:4 },
      { id:"executioner",name:"Executioner",    icon:"🪦", cost:500000, clickBonus:200,critChance:0.08, critMult:5 },
    ],
  },
  channeler: {
    name: "Channeler", icon: "🔮", desc: "Lower damage per tier, but boosts passive DPS too.",
    tiers: [
      { id:"sword",   name:"Better Sword",  icon:"🗡️", cost:60,     clickBonus:5  },
      { id:"wand",    name:"Apprentice Wand", icon:"🪄", cost:300,    clickBonus:6,  dpsMult:0.04 },
      { id:"tome",    name:"Spell Tome",    icon:"🔮", cost:1000,   clickBonus:14, dpsMult:0.06 },
      { id:"focus",   name:"Arcane Focus",  icon:"🔵", cost:2500,   clickBonus:12, dpsMult:0.09 },
      { id:"staff",   name:"Ember Staff",   icon:"🔥", cost:7500,   clickBonus:24, dpsMult:0.12 },
      { id:"orb",     name:"Storm Orb",     icon:"🌩️", cost:25000,  clickBonus:50, dpsMult:0.16 },
      { id:"grimoire",name:"Void Grimoire", icon:"📕", cost:100000, clickBonus:100,dpsMult:0.22 },
      { id:"scepter", name:"Scepter of Ruin",icon:"👑", cost:500000, clickBonus:200,dpsMult:0.30 },
    ],
  },
  // Unlocked after the player's first Ascend (prestigeCount >= 1) — same minFloor-style gate
  // pattern used elsewhere for content (e.g. units.js's minFloor). Execute mechanic (bonus damage
  // below ~20% monster HP) is a conditional multiplier check in combat.js's dealDamage/attack path.
  // Life-steal tier (heals the player-HP pool Boss Combat v1 added) is the late-tier signature
  // mechanic, completing the life-steal/DoT hybrid theme originally pitched for this path.
  reaper: {
    name: "Reaper", icon: "💀", desc: "Executes low-HP enemies and steals life. Unlocked after your first Prestige.",
    minPrestige: 1,
    tiers: [
      { id:"sword",     name:"Better Sword",    icon:"🗡️", cost:60,     clickBonus:5   },
      { id:"sickle",    name:"Bone Sickle",     icon:"🔪", cost:300,    clickBonus:7,  executeBonus:0.25 },
      { id:"scythe",    name:"Reaper's Scythe", icon:"⚰️", cost:1000,   clickBonus:15, executeBonus:0.25 },
      { id:"soulblade", name:"Soulblade",       icon:"🗡️", cost:2500,   clickBonus:13, executeBonus:0.30, lifeSteal:0.02 },
      { id:"harvester", name:"Harvester",       icon:"🌾", cost:7500,   clickBonus:26, executeBonus:0.30, lifeSteal:0.02 },
      { id:"deathgrip", name:"Deathgrip",       icon:"💀", cost:25000,  clickBonus:54, executeBonus:0.35, lifeSteal:0.03 },
      { id:"soulrender",name:"Soulrender",      icon:"🩸", cost:100000, clickBonus:110,executeBonus:0.40, lifeSteal:0.04 },
      { id:"grimreaper",name:"Grim Reaper",     icon:"☠️", cost:500000, clickBonus:220,executeBonus:0.50, lifeSteal:0.06 },
    ],
  },
};

export function getWeaponTierBonusDesc(tier) {
  const parts = ["+" + tier.clickBonus + " click damage"];
  if (tier.critChance) parts.push(bonusLabel("critChance", tier.critChance));
  if (tier.critMult)   parts.push("+" + tier.critMult + "× crit dmg");
  if (tier.dpsMult)    parts.push(bonusLabel("dpsMult", tier.dpsMult));
  if (tier.executeBonus) parts.push("+" + Math.round(tier.executeBonus * 100) + "% dmg vs <20% HP");
  if (tier.lifeSteal)  parts.push("heal " + Math.round(tier.lifeSteal * 100) + "% chance on hit");
  return parts.join(", ");
}

export function selectWeaponPath(pathId) {
  if (state.selectedWeaponPath || !state.weaponsBought.sword) return;
  state.setSelectedWeaponPath(pathId);
  updateWeaponButtons();
  saveGame();
}

export function findWeaponTier(id) {
  const pathId = state.selectedWeaponPath || "brute"; // before a path is chosen, only the shared starter sword (tier 0) is buyable
  return weaponPaths[pathId].tiers.find(t => t.id === id);
}

export function buyUpgrade(id) {
  if (state.weaponsBought[id]) return;
  const tier = findWeaponTier(id);
  if (!tier) return;
  if (state.gold < tier.cost) { document.getElementById("shop-msg").textContent = "Not enough gold!"; return; }
  state.addGold(-tier.cost);
  state.addClickDamage(tier.clickBonus);
  state.weaponBonus.critChance   += tier.critChance   || 0;
  state.weaponBonus.critMult     += tier.critMult     || 0;
  state.weaponBonus.dpsMult      += tier.dpsMult      || 0;
  state.weaponBonus.executeBonus += tier.executeBonus || 0;
  state.weaponBonus.lifeSteal    += tier.lifeSteal    || 0;
  state.weaponsBought[id] = true;
  updateGold();
  renderStats();
  document.getElementById("shop-msg").textContent = "";
  updateWeaponButtons();
  playBuySound();
  checkAchievements();
}

export function updateWeaponButtons() {
  const choiceEl = document.getElementById("weapon-path-choice");
  const listEl   = document.getElementById("weapon-path-list");
  if (!choiceEl || !listEl) return;

  if (!state.weaponsBought.sword) {
    // Starter sword hasn't been bought yet — show only that, no path choice yet.
    choiceEl.innerHTML = "";
    listEl.innerHTML = "";
    const tier = weaponPaths.brute.tiers[0];
    const btn = document.createElement("button");
    btn.className = "upgrade-btn";
    btn.onclick = () => buyUpgrade("sword");
    btn.innerHTML = `
      <span class="btn-left"><span class="btn-name">${tier.icon} ${tier.name}</span><span class="btn-effect">${getWeaponTierBonusDesc(tier)}</span></span>
      <span class="btn-right"><span class="btn-cost">🪙 ${formatNum(tier.cost)}g</span></span>`;
    listEl.appendChild(btn);
    return;
  }

  if (!state.selectedWeaponPath) {
    listEl.innerHTML = "";
    choiceEl.innerHTML = `<p style="font-size:0.78rem;color:#9a9ab0;text-align:center;margin:0.2rem 0 0.8rem">Choose your weapon path for this run. Locked until your next Prestige.</p>`;
    for (const pathId in weaponPaths) {
      const path = weaponPaths[pathId];
      if (path.minPrestige && state.prestigeCount < path.minPrestige) continue; // e.g. Reaper: unlocked after first Ascend
      const card = document.createElement("button");
      card.className = "upgrade-btn";
      card.onclick = () => selectWeaponPath(pathId);
      card.innerHTML = `
        <span class="btn-left"><span class="btn-name">${path.icon} ${path.name}</span><span class="btn-effect">${path.desc}</span></span>
        <span class="btn-right"><span class="btn-cost">Choose</span></span>`;
      choiceEl.appendChild(card);
    }
    return;
  }

  choiceEl.innerHTML = "";
  listEl.innerHTML = "";
  const path = weaponPaths[state.selectedWeaponPath];
  const header = document.createElement("p");
  header.style = "font-size:0.78rem;color:#9a9ab0;text-align:center;margin:0.2rem 0 0.8rem";
  header.textContent = path.icon + " " + path.name + " path — locked in until next Prestige.";
  listEl.appendChild(header);

  for (let i = 1; i < path.tiers.length; i++) { // tier 0 is the shared starter sword, already bought
    const tier = path.tiers[i];
    const prevTier = path.tiers[i - 1];
    const unlocked = !!state.weaponsBought[prevTier.id];
    if (!unlocked) break; // gate strictly sequential, same as before

    const btn = document.createElement("button");
    btn.className = "upgrade-btn";
    if (state.weaponsBought[tier.id]) {
      btn.style.opacity = "0.45"; btn.style.cursor = "default";
      btn.innerHTML = `
        <span class="btn-left"><span class="btn-name">${tier.icon} ${tier.name}</span><span class="btn-effect">${getWeaponTierBonusDesc(tier)}</span></span>
        <span class="btn-right"><span class="btn-cost">Purchased</span></span>`;
    } else {
      btn.onclick = () => buyUpgrade(tier.id);
      btn.innerHTML = `
        <span class="btn-left"><span class="btn-name">${tier.icon} ${tier.name}</span><span class="btn-effect">${getWeaponTierBonusDesc(tier)}</span></span>
        <span class="btn-right"><span class="btn-cost">🪙 ${formatNum(tier.cost)}g</span></span>`;
    }
    listEl.appendChild(btn);
  }
}
