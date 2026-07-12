// ─────────────────────────────────────
// Equipment: item table, loot roll, equip/discard/salvage
// ─────────────────────────────────────
import * as state from "./state.js";
import { formatNum, bonusLabel } from "./utils.js";
import { showToast } from "./toast.js";
import { saveGame } from "./save.js";
import { applyGoldMult } from "./stats.js";
import { renderStats, updateGold, flashGold } from "./ui.js";
import { renderUnitCosts } from "./units.js";

// ── Equipment (10 items) ──
export const equipment = [
  { id:"rusted_blade",   slot:"weapon", rarity:"common",    name:"Rusted Blade",      icon:"🗡️",  flavor:"A forgotten soldier's last companion.",          bonus:{ clickMult:0.10 }, salvageValue:100 },
  { id:"bloodaxe",       slot:"weapon", rarity:"rare",      name:"Bloodstained Axe",  icon:"🪓",  flavor:"Still warm from its last kill.",                 bonus:{ clickMult:0.25 }, salvageValue:500 },
  { id:"voidreaver",     slot:"weapon", rarity:"legendary", name:"Voidreaver",         icon:"⚔️",  flavor:"It hungers for souls.",                          bonus:{ clickMult:0.50 }, minFloor:15, salvageValue:2500 },
  { id:"leather_vest",   slot:"armor",  rarity:"common",    name:"Leather Vest",       icon:"🥋",  flavor:"Worn but reliable.",                             bonus:{ goldMult:0.10 }, salvageValue:100 },
  { id:"shadow_cloak",   slot:"armor",  rarity:"rare",      name:"Shadow Cloak",       icon:"🧥",  flavor:"Darkness clings to it like a second skin.",      bonus:{ goldMult:0.20 }, salvageValue:500 },
  { id:"dragonscale",    slot:"armor",  rarity:"rare",      name:"Dragonscale Mail",   icon:"🐉",  flavor:"Scales of a slain dragon, forged into armor.",   bonus:{ dpsMult:0.15 }, minFloor:10, salvageValue:500 },
  { id:"void_plate",     slot:"armor",  rarity:"legendary", name:"Void Plate",         icon:"🛡️",  flavor:"Heavier than regret.",                           bonus:{ dpsMult:0.30 }, minFloor:20, salvageValue:2500 },
  { id:"copper_band",    slot:"ring",   rarity:"common",    name:"Copper Band",        icon:"💍",  flavor:"Simple but effective.",                          bonus:{ goldMult:0.05 }, salvageValue:100 },
  { id:"ring_avarice",   slot:"ring",   rarity:"rare",      name:"Ring of Avarice",    icon:"💍",  flavor:"Greed made manifest.",                           bonus:{ goldMult:0.20 }, minFloor:10, salvageValue:500 },
  { id:"soulstone_ring", slot:"ring",   rarity:"legendary", name:"Soulstone Ring",     icon:"💎",  flavor:"Pulsing with trapped souls.",                    bonus:{ clickMult:0.15, goldMult:0.15 }, minFloor:25, salvageValue:2500 },
];

// ── Equipment Set Bonuses ──
// Full-set-only bonuses (no partial-set tiering for v1). Uses existing multiplier keys so it
// slots into the same getTotalMult() pipeline (stats.js) everything else already flows through.
// "Survival Set" uses the player-HP stat Boss Combat v1 (bossCombat.js) shipped — a damageReduction
// key consumed as a mild miss-penalty reducer there.
export const equipmentSets = [
  {
    id: "voidreaver_set", name: "Voidreaver's Fury", icon: "⚔️",
    itemIds: ["voidreaver", "void_plate", "soulstone_ring"],
    bonus: { critChance: 0.08, critMult: 2 },
    desc: "+8% crit chance, +2× crit damage",
  },
  {
    id: "avarice_set", name: "Hoarder's Fortune", icon: "💰",
    itemIds: ["bloodaxe", "shadow_cloak", "ring_avarice"],
    bonus: { goldMult: 0.25 },
    desc: "+25% gold earned",
  },
  {
    id: "survival_set", name: "Warden's Resolve", icon: "🛡️",
    itemIds: ["dragonscale", "leather_vest", "copper_band"],
    bonus: { missGoldPenaltyReduction: 0.5 },
    desc: "-50% gold penalty from missed boss dodges",
  },
];

export function getActiveSetBonuses() {
  const equippedIds = Object.values(state.equipped).filter(Boolean).map(i => i.id);
  return equipmentSets.filter(set => set.itemIds.every(id => equippedIds.includes(id)));
}

export function getActiveSetBonus(key) {
  return getActiveSetBonuses().reduce((sum, set) => sum + (set.bonus[key] || 0), 0);
}

export function itemPowerScore(item) {
  return Object.values(item.bonus).reduce((sum, v) => sum + v, 0);
}

// A dropped item is only worth showing to the player if it's strictly better than what's
// equipped, or it grants different bonus types entirely (e.g. a ring with clickMult+goldMult
// vs. one with goldMult only) — matching stat shape at equal-or-lower power is pure clutter.
function hasDifferentStatShape(item, current) {
  const itemKeys    = Object.keys(item.bonus).sort().join(",");
  const currentKeys = Object.keys(current.bonus).sort().join(",");
  return itemKeys !== currentKeys;
}

// Whether equipping `item` in place of `current` would complete (or maintain progress toward)
// a set that isn't already fully equipped. Prevents the auto-salvage logic below from silently
// discarding a set-completing drop just because its raw stat sum is lower than what's equipped.
// Does NOT protect a drop that is simply a duplicate of the piece already equipped for that
// set — that item is already contributing to the set, so a second copy adds nothing (this was
// a real bug: a second Voidreaver kept surfacing in the loot modal even with Voidreaver already
// equipped, because the set-progress check only looked at set-completeness, not at whether this
// exact item was the one already worn).
function wouldHelpCompleteSet(item) {
  const equippedIds = Object.values(state.equipped).filter(Boolean).map(i => i.id);
  if (equippedIds.includes(item.id)) return false; // exact duplicate of an already-equipped piece
  return equipmentSets.some(set => {
    if (!set.itemIds.includes(item.id)) return false;
    const alreadyComplete = set.itemIds.every(id => equippedIds.includes(id));
    if (alreadyComplete) return false; // already got the bonus, no need to protect this drop
    return true;
  });
}

export function renderEquipment() {
  const slotLabels = { weapon: "⚔️ Weapon", armor: "🛡️ Armor", ring: "💍 Jewelry" };
  const container  = document.getElementById("tab-gear-content");
  container.innerHTML = "";

  const setsEl = document.getElementById("tab-gear-sets");
  if (setsEl) {
    const equippedIds = Object.values(state.equipped).filter(Boolean).map(i => i.id);
    setsEl.innerHTML = equipmentSets.map(set => {
      const owned = set.itemIds.filter(id => equippedIds.includes(id)).length;
      const complete = owned === set.itemIds.length;
      return `<div class="set-bonus-row ${complete ? "set-complete" : ""}">
        <span class="set-bonus-name">${set.icon} ${set.name} <span class="set-bonus-progress">(${owned}/${set.itemIds.length})</span></span>
        <span class="set-bonus-desc">${set.desc}</span>
      </div>`;
    }).join("");
  }

  for (const slot of ["weapon","armor","ring"]) {
    const item = state.equipped[slot];
    const div  = document.createElement("div");
    div.className = "equip-slot";
    if (item) {
      const bonusText = Object.entries(item.bonus).map(([k,v]) => bonusLabel(k,v)).join(", ");
      div.innerHTML = `
        <div class="equip-slot-icon">${item.icon}</div>
        <div class="equip-slot-info">
          <div class="equip-slot-label">${slotLabels[slot]}</div>
          <div class="equip-slot-name"><span class="rarity-${item.rarity}">${item.name}</span></div>
          <div class="equip-slot-flavor">${item.flavor}</div>
          <div class="equip-slot-bonus">${bonusText}</div>
        </div>`;
    } else {
      div.innerHTML = `
        <div class="equip-slot-icon" style="color:#2a2a4a;font-size:1.4rem">—</div>
        <div class="equip-slot-info">
          <div class="equip-slot-label">${slotLabels[slot]}</div>
          <div class="equip-slot-empty">Empty slot</div>
        </div>`;
    }
    container.appendChild(div);
  }
}

export function rollLoot(bossFloor) {
  const effectiveFloor = bossFloor + state.prestigeCount * 3;
  const eligible = equipment.filter(e => !e.minFloor || effectiveFloor >= e.minFloor);
  let common = 60, rare = 35, legendary = 5;
  if (bossFloor >= 20)      { common = 20; rare = 45; legendary = 35; }
  else if (bossFloor >= 10) { common = 40; rare = 45; legendary = 15; }
  const prestigeShift = Math.floor(state.prestigeCount / 3) * 5;
  common    = Math.max(10, common - prestigeShift * 2);
  rare      = Math.min(60, rare + prestigeShift);
  legendary = Math.min(50, legendary + prestigeShift);
  const roll = state.rollRandom() * 100;
  const targetRarity = roll < legendary ? "legendary" : roll < legendary + rare ? "rare" : "common";
  let pool = eligible.filter(e => e.rarity === targetRarity);
  if (!pool.length) pool = eligible;
  const dropped = pool[Math.floor(state.rollRandom() * pool.length)];
  const current = state.equipped[dropped.slot];
  const isWorthShowing = !current
    || itemPowerScore(dropped) > itemPowerScore(current)
    || hasDifferentStatShape(dropped, current)
    || wouldHelpCompleteSet(dropped);
  if (current && !isWorthShowing) {
    const sv = dropped.salvageValue || 0;
    state.addGold(sv); state.addTotalGoldEarned(sv); updateGold(); flashGold();
    showToast("⚗️ Salvaged!", dropped.name + " (weaker) → +" + formatNum(sv) + "g");
    return null;
  }
  return dropped;
}

export function showLootModal(item) {
  state.setPendingLoot(item);
  const cur       = state.equipped[item.slot];
  const newBonus  = Object.entries(item.bonus).map(([k,v]) => bonusLabel(k,v)).join(" • ");

  document.getElementById("loot-item-icon").textContent   = item.icon;
  document.getElementById("loot-item-name").innerHTML     = `<span class="rarity-${item.rarity}">${item.name}</span>`;
  document.getElementById("loot-item-slot").textContent   = item.slot === "ring" ? "JEWELRY" : item.slot.toUpperCase();
  document.getElementById("loot-item-flavor").textContent = item.flavor;
  document.getElementById("loot-item-bonus").textContent  = newBonus;

  // Show which equipment set (if any) this item belongs to, and current progress toward it,
  // so the player can judge a drop's set value before deciding to equip or discard it.
  const setEl = document.getElementById("loot-item-set");
  if (setEl) {
    const equippedIds = Object.values(state.equipped).filter(Boolean).map(i => i.id);
    const memberSet = equipmentSets.find(set => set.itemIds.includes(item.id));
    if (memberSet) {
      const owned = memberSet.itemIds.filter(id => equippedIds.includes(id)).length;
      setEl.textContent = `${memberSet.icon} Part of ${memberSet.name} (${owned}/${memberSet.itemIds.length} equipped) — ${memberSet.desc}`;
      setEl.style.display = "block";
    } else {
      setEl.style.display = "none";
    }
  }

  const sec = document.getElementById("loot-compare-section");
  if (cur) {
    const curBonus = Object.entries(cur.bonus).map(([k,v]) => bonusLabel(k,v)).join(" • ");
    sec.innerHTML = `
      <div class="loot-compare">
        <div class="loot-compare-label">Compare</div>
        <div class="loot-compare-row new-item">
          <span class="loot-compare-tag tag-new">NEW</span>
          <div class="loot-compare-info">
            <div class="loot-compare-name"><span class="rarity-${item.rarity}">${item.name}</span></div>
            <div class="loot-compare-bonus">${newBonus}</div>
          </div>
        </div>
        <div class="loot-compare-row cur-item">
          <span class="loot-compare-tag tag-cur">NOW</span>
          <div class="loot-compare-info">
            <div class="loot-compare-name"><span class="rarity-${cur.rarity}">${cur.name}</span></div>
            <div class="loot-compare-bonus cur-bonus">${curBonus}</div>
          </div>
        </div>
      </div>`;
  } else {
    sec.innerHTML = `<div class="loot-empty-slot">Slot is empty — no tradeoff.</div>`;
  }

  document.getElementById("loot-modal").style.display = "flex";
}

export function equipLoot() {
  if (!state.pendingLoot) return;
  const item = state.pendingLoot;
  state.equipped[item.slot] = item;
  state.setPendingLoot(null);
  document.getElementById("loot-modal").style.display = "none";
  renderEquipment();
  renderStats();
  renderUnitCosts();
  showToast("⚔️ Equipped!", item.name + " is now active.");
  saveGame();
}

export function discardLoot() {
  state.setPendingLoot(null);
  document.getElementById("loot-modal").style.display = "none";
}
