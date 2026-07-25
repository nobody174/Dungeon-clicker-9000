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

// ── Equipment (19 items) ──
// BACKLOG.md #12: item variety expansion within the existing 3-slot/3-rarity system (no new
// slots/rarities — that's the deferred ITEMIZATION_REDESIGN.md scope). Each new item is a
// distinct stat *shape*, not a straight power-up of an existing one at the same rarity, giving
// each a reason to sit in the bag as a real alternative build rather than just a bigger number.
export const equipment = [
  { id:"rusted_blade",   slot:"weapon", rarity:"common",    name:"Rusted Blade",      icon:"🗡️",  flavor:"A forgotten soldier's last companion.",          bonus:{ clickMult:0.10 }, salvageValue:100 },
  { id:"bloodaxe",       slot:"weapon", rarity:"rare",      name:"Bloodstained Axe",  icon:"🪓",  flavor:"Still warm from its last kill.",                 bonus:{ clickMult:0.25 }, salvageValue:500 },
  { id:"voidreaver",     slot:"weapon", rarity:"legendary", name:"Voidreaver",         icon:"⚔️",  flavor:"It hungers for souls.",                          bonus:{ clickMult:0.50 }, minFloor:15, salvageValue:2500 },
  { id:"quickblade",     slot:"weapon", rarity:"common",    name:"Quickblade",         icon:"🔪",  flavor:"Light enough to swing twice as fast.",           bonus:{ attackSpeedMult:0.06 }, salvageValue:100 },
  { id:"headsman_axe",   slot:"weapon", rarity:"rare",      name:"Headsman's Axe",     icon:"🪃",  flavor:"Reserved for the finishing blow.",               bonus:{ critChance:0.06, critMult:1.5 }, salvageValue:500 },
  { id:"chronoblade",    slot:"weapon", rarity:"legendary", name:"Chronoblade",        icon:"⏳",  flavor:"Every swing arrives before you finish it.",      bonus:{ attackSpeedMult:0.14, clickMult:0.15 }, minFloor:15, salvageValue:2500 },
  { id:"leather_vest",   slot:"armor",  rarity:"common",    name:"Leather Vest",       icon:"🥋",  flavor:"Worn but reliable.",                             bonus:{ goldMult:0.10 }, salvageValue:100 },
  { id:"shadow_cloak",   slot:"armor",  rarity:"rare",      name:"Shadow Cloak",       icon:"🧥",  flavor:"Darkness clings to it like a second skin.",      bonus:{ goldMult:0.20 }, salvageValue:500 },
  { id:"dragonscale",    slot:"armor",  rarity:"rare",      name:"Dragonscale Mail",   icon:"🐉",  flavor:"Scales of a slain dragon, forged into armor.",   bonus:{ dpsMult:0.15 }, minFloor:10, salvageValue:500 },
  { id:"void_plate",     slot:"armor",  rarity:"legendary", name:"Void Plate",         icon:"🛡️",  flavor:"Heavier than regret.",                           bonus:{ dpsMult:0.30 }, minFloor:20, salvageValue:2500 },
  { id:"recruit_tunic",  slot:"armor",  rarity:"common",    name:"Recruit's Tunic",    icon:"🎽",  flavor:"Standard-issue, unremarkable, gets the job done.", bonus:{ unitDiscount:0.05 }, salvageValue:100 },
  { id:"warlord_plate",  slot:"armor",  rarity:"rare",      name:"Warlord's Plate",    icon:"🪖",  flavor:"Command radiates from every dent in this armor.", bonus:{ unitDiscount:0.10, dpsMult:0.08 }, minFloor:10, salvageValue:500 },
  { id:"aegis_of_ages",  slot:"armor",  rarity:"legendary", name:"Aegis of Ages",      icon:"🌌",  flavor:"It has outlasted every army that ever wore it.", bonus:{ unitDiscount:0.15, dpsMult:0.15 }, minFloor:20, salvageValue:2500 },
  { id:"copper_band",    slot:"ring",   rarity:"common",    name:"Copper Band",        icon:"💍",  flavor:"Simple but effective.",                          bonus:{ goldMult:0.05 }, salvageValue:100 },
  { id:"ring_avarice",   slot:"ring",   rarity:"rare",      name:"Ring of Avarice",    icon:"💍",  flavor:"Greed made manifest.",                           bonus:{ goldMult:0.20 }, minFloor:10, salvageValue:500 },
  { id:"soulstone_ring", slot:"ring",   rarity:"legendary", name:"Soulstone Ring",     icon:"💎",  flavor:"Pulsing with trapped souls.",                    bonus:{ clickMult:0.15, goldMult:0.15 }, minFloor:25, salvageValue:2500 },
  { id:"hunters_signet", slot:"ring",   rarity:"common",    name:"Hunter's Signet",    icon:"🔸",  flavor:"Marked with a tally of small kills.",            bonus:{ critChance:0.04 }, salvageValue:100 },
  { id:"band_of_tempo",  slot:"ring",   rarity:"rare",      name:"Band of Tempo",      icon:"🔶",  flavor:"Ticks along with your own heartbeat.",           bonus:{ attackSpeedMult:0.08 }, minFloor:10, salvageValue:500 },
  { id:"ring_of_ruin",   slot:"ring",   rarity:"legendary", name:"Ring of Ruin",       icon:"🌀",  flavor:"Worn by a king who conquered and kept nothing.", bonus:{ critChance:0.10, critMult:1.8 }, minFloor:25, salvageValue:2500 },
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
  {
    id: "swiftblade_set", name: "Swiftblade Zeal", icon: "⚡",
    itemIds: ["headsman_axe", "warlord_plate", "band_of_tempo"],
    bonus: { attackSpeedMult: 0.10, critChance: 0.05 },
    desc: "+10% attack speed, +5% crit chance",
  },
];

export function getActiveSetBonuses() {
  const equippedIds = Object.values(state.equipped).filter(Boolean).map(i => i.id);
  return equipmentSets.filter(set => set.itemIds.every(id => equippedIds.includes(id)));
}

export function getActiveSetBonus(key) {
  return getActiveSetBonuses().reduce((sum, set) => sum + (set.bonus[key] || 0), 0);
}

// Player feedback (2026-07-25): a legendary's flat 2500g salvage value is worth ~1/3 of a single
// floor-20 boss kill and becomes literally negligible well before endgame (a floor-100 boss kill
// nets 800k+ gold) — the flat values were never rebalanced against the exponential gold curve, so
// "salvage" had quietly become "discard with an irrelevant number attached." Scales the same way
// monster gold rewards do (1.8× per tier, monsters.js/stats.js) so salvaging stays a meaningful
// choice at every stage instead of only in the first ~20 floors.
export function getSalvageValue(item) {
  const base = item.salvageValue || 0;
  const tier = Math.floor((state.currentFloor - 1) / 10);
  return Math.floor(base * Math.pow(1.8, tier));
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

// A drop still auto-salvages if it's an exact duplicate of something already owned/equipped (a
// second copy of the same item has no possible use), but otherwise surfaces a loot modal so the
// player explicitly chooses Equip / Place in Bag / Discard, rather than silently landing in the bag.
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

  const alreadyOwned = state.inventory.some(i => i.itemId === dropped.id)
    || Object.values(state.equipped).some(e => e?.id === dropped.id);
  if (alreadyOwned) {
    const sv = getSalvageValue(dropped);
    state.addGold(sv); state.addTotalGoldEarned(sv); updateGold(); flashGold();
    showToast("⚗️ Salvaged (duplicate)", dropped.name + " → +" + formatNum(sv) + "g");
    return null;
  }

  return dropped;
}

export function showLootModal(item) {
  state.setPendingLoot(item);
  const cur      = state.equipped[item.slot];
  const newBonus = Object.entries(item.bonus).map(([k,v]) => bonusLabel(k,v)).join(" • ");

  document.getElementById("loot-item-icon").textContent   = item.icon;
  document.getElementById("loot-item-name").innerHTML     = `<span class="rarity-${item.rarity}">${item.name}</span>`;
  document.getElementById("loot-item-slot").textContent   = item.slot === "ring" ? "JEWELRY" : item.slot.toUpperCase();
  document.getElementById("loot-item-flavor").textContent = item.flavor;
  document.getElementById("loot-item-bonus").textContent  = newBonus;

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
          <span class="loot-compare-tag tag-cur">EQUIPPED</span>
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

export function equipPendingLoot() {
  if (!state.pendingLoot) return;
  const item = state.pendingLoot;
  const previous = state.equipped[item.slot];
  state.equipped[item.slot] = item;
  if (previous) state.addToInventory(previous.id); // swapped-out piece goes to the bag, not lost
  state.setPendingLoot(null);
  document.getElementById("loot-modal").style.display = "none";
  renderEquipment();
  renderInventory();
  renderStats();
  renderUnitCosts();
  showToast("⚔️ Equipped!", item.name + " is now active.");
  saveGame();
}

export function bagPendingLoot() {
  if (!state.pendingLoot) return;
  const item = state.pendingLoot;
  state.addToInventory(item.id);
  state.setPendingLoot(null);
  document.getElementById("loot-modal").style.display = "none";
  renderInventory();
  showToast("🎒 Stored", item.name + " was added to your bag.");
  saveGame();
}

export function discardPendingLoot() {
  if (!state.pendingLoot) return;
  const item = state.pendingLoot;
  const sv = getSalvageValue(item);
  state.addGold(sv); state.addTotalGoldEarned(sv); updateGold(); flashGold();
  state.setPendingLoot(null);
  document.getElementById("loot-modal").style.display = "none";
  showToast("⚗️ Salvaged", item.name + " → +" + formatNum(sv) + "g");
  saveGame();
}

const SLOT_ORDER = ["weapon", "armor", "ring"];
const RARITY_ORDER = { common: 0, rare: 1, legendary: 2 };
const SLOT_ICONS = { weapon: "⚔️", armor: "🛡️", ring: "💍" };

let expandedBagIndex = null; // which bag row (if any) currently shows its compare panel

export function toggleBagCompare(index) {
  expandedBagIndex = expandedBagIndex === index ? null : index;
  renderInventory();
}

function compareRowsHtml(item, cur) {
  const newBonus = Object.entries(item.bonus).map(([k,v]) => bonusLabel(k,v)).join(" • ");
  if (!cur) return `<div class="loot-empty-slot">Slot is empty — no tradeoff.</div>`;
  const curBonus = Object.entries(cur.bonus).map(([k,v]) => bonusLabel(k,v)).join(" • ");
  return `
    <div class="loot-compare">
      <div class="loot-compare-label">Compare</div>
      <div class="loot-compare-row new-item">
        <span class="loot-compare-tag tag-new">BAG</span>
        <div class="loot-compare-info">
          <div class="loot-compare-name"><span class="rarity-${item.rarity}">${item.name}</span></div>
          <div class="loot-compare-bonus">${newBonus}</div>
        </div>
      </div>
      <div class="loot-compare-row cur-item">
        <span class="loot-compare-tag tag-cur">EQUIPPED</span>
        <div class="loot-compare-info">
          <div class="loot-compare-name"><span class="rarity-${cur.rarity}">${cur.name}</span></div>
          <div class="loot-compare-bonus cur-bonus">${curBonus}</div>
        </div>
      </div>
    </div>`;
}

export function renderInventory() {
  const container = document.getElementById("tab-bag-content");
  if (!container) return;
  if (!state.inventory.length) {
    container.innerHTML = `<p style="font-size:0.8rem;color:#9a9ab0;text-align:center;margin:1rem 0">Your bag is empty. Defeat bosses for a chance at loot.</p>`;
    return;
  }
  // Sorted by slot group first (matches how a player actually browses — "what could fill my
  // empty ring slot" — rather than interleaving weapons/armor/rings), rarity within each group.
  const sortedIndices = state.inventory
    .map((entry, i) => ({ entry, i, item: equipment.find(e => e.id === entry.itemId) }))
    .filter(x => x.item)
    .sort((a, b) => {
      const slotDiff = SLOT_ORDER.indexOf(a.item.slot) - SLOT_ORDER.indexOf(b.item.slot);
      if (slotDiff !== 0) return slotDiff;
      return RARITY_ORDER[a.item.rarity] - RARITY_ORDER[b.item.rarity];
    });

  container.innerHTML = sortedIndices.map(({ item, i }) => {
    const bonusText = Object.entries(item.bonus).map(([k,v]) => bonusLabel(k,v)).join(", ");
    const isExpanded = expandedBagIndex === i;
    const cur = state.equipped[item.slot];
    return `<div class="bag-item-row rarity-frame-${item.rarity}">
      <div class="bag-item-icon">${item.icon}</div>
      <div class="bag-item-info">
        <div class="bag-item-name">${SLOT_ICONS[item.slot]} <span class="rarity-${item.rarity}">${item.name}</span></div>
        <div class="bag-item-bonus">${bonusText}</div>
        ${isExpanded ? compareRowsHtml(item, cur) : ""}
      </div>
      <div class="bag-item-actions">
        <button class="upgrade-btn" onclick="equipFromInventory(${i})">Equip</button>
        <button class="loot-bag-btn" onclick="toggleBagCompare(${i})">${isExpanded ? "Hide" : "Compare"}</button>
        <button class="reset-btn" onclick="salvageFromInventory(${i})">🪙 ${formatNum(getSalvageValue(item))}</button>
      </div>
    </div>`;
  }).join("");
}

export function equipFromInventory(index) {
  const entry = state.inventory[index];
  if (!entry) return;
  const item = equipment.find(e => e.id === entry.itemId);
  if (!item) return;
  const previous = state.equipped[item.slot];
  state.equipped[item.slot] = item;
  state.removeFromInventory(index);
  if (previous) state.addToInventory(previous.id); // swapped-out piece returns to the bag, not lost
  renderEquipment();
  renderInventory();
  renderStats();
  renderUnitCosts();
  showToast("⚔️ Equipped!", item.name + " is now active.");
  saveGame();
}

export function salvageFromInventory(index) {
  const entry = state.inventory[index];
  if (!entry) return;
  const item = equipment.find(e => e.id === entry.itemId);
  const sv = item ? getSalvageValue(item) : 0;
  state.addGold(sv); state.addTotalGoldEarned(sv);
  state.removeFromInventory(index);
  updateGold(); flashGold(); renderInventory();
  showToast("⚗️ Salvaged", (item?.name || "Item") + " → +" + formatNum(sv) + "g");
  saveGame();
}
