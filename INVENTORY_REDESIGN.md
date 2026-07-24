# Inventory / Bag System + Gear Loadouts — Design Doc (draft, 2026-07-24)

Status: **DESIGN ONLY — not approved, not built.** Per CLAUDE.md rule 1
(design first) and rule 5 (ask before touching an already-shipped
system — this rewrites the loot-roll/auto-salvage flow and the save
format for `equipped`).

## Why this is needed (current behavior)

Today (`js/equipment.js`) there is no inventory at all:

- `rollLoot()` picks one item; if it's not strictly better/differently-
  shaped than what's equipped (`hasDifferentStatShape`, `itemPowerScore`,
  `wouldHelpCompleteSet`), it's **auto-salvaged for gold on the spot** —
  never seen, never kept (`rollLoot`, `equipment.js:157-162`).
- If it IS shown, the loot modal (`showLootModal`/`equipLoot`/
  `discardLoot`) offers exactly two choices: equip it (replacing and
  permanently discarding whatever was in that slot — no salvage even
  offered for the replaced piece today), or discard it (salvage for gold).
- There is nowhere a second copy of an item, or an off-meta item kept
  "just in case," can live. `state.equipped` (`state.js:46`) is the
  entire gear state: `{ weapon: Item|null, armor: Item|null, ring: Item|null }`.

This is fine for a single-build game but breaks down for multi-loadout
play (a gold-farming ring set vs. a boss-killing ring set) since nothing
persists once it's not equipped.

## Scope decision

Requested: "proper inventory/bag system" + "multiple saved gear sets."
These are sequenced, not parallel — loadouts need a bag to pull saved
items from; a bag with no loadouts is still useful on its own. This doc
designs both, but structured so **Part 1 (bag) ships and is useful
standalone**, and **Part 2 (loadouts) layers on top** without requiring
a second save-format migration.

Explicitly NOT in scope for this pass (flag if you want these instead):
- Inventory size limits / bag-full UI (unlimited bag, simplest for v1 —
  matches "no build step, keep it simple" project ethos). Revisit only
  if save-size becomes a real problem (see Pitfalls).
- Item comparison tooltips beyond what `showLootModal` already renders.
- Trading/sharing items between saves — out of scope entirely.

---

## Part 1: Bag / Inventory system

### Data structure

New state slice in `state.js`, alongside existing `equipped`:

```js
// state.js
export const equipped = { weapon: null, armor: null, ring: null }; // unchanged
export let inventory = []; // NEW: array of { itemId, acquiredAt }
```

Deliberately store `itemId` + a small metadata wrapper, not the full
item object — `equipment.js`'s `equipment` array is already the single
source of truth for an item's stats/name/icon (this is how `equipped`
already works via `equipment.find(e => e.id === eq[slot])` in
`save.js:135`, so this is the existing pattern, not a new one).
`acquiredAt` (timestamp) lets a "sort by newest" bag view exist for free.

```js
// state.js additions
export function addToInventory(itemId) {
  inventory.push({ itemId, acquiredAt: Date.now() });
}
export function removeFromInventory(index) {
  inventory.splice(index, 1);
}
```

### Loot flow rework

Current `rollLoot()` auto-salvages anything not strictly-better. New
flow: **auto-salvage only exact duplicates of something already in the
bag or equipped** (no point ever keeping 2 Rusted Blades); everything
else goes to the bag, silently, with a toast — no more forced modal
interrupting the click loop for every common drop.

```js
// pseudocode, equipment.js rollLoot()
export function rollLoot(bossFloor) {
  const dropped = /* ...unchanged rarity/eligibility roll... */;
  const alreadyOwned = state.inventory.some(i => i.itemId === dropped.id)
    || Object.values(state.equipped).some(e => e?.id === dropped.id);
  if (alreadyOwned) {
    const sv = dropped.salvageValue || 0;
    state.addGold(sv); state.addTotalGoldEarned(sv);
    showToast("⚗️ Salvaged (duplicate)", dropped.name + " → +" + formatNum(sv) + "g");
    return null;
  }
  state.addToInventory(dropped.id);
  showToast("🎒 " + dropped.name, "Added to inventory.");
  return dropped; // still returned so combat.js can flash a pickup notice if desired
}
```

This is a **behavior change**, not just additive: the loot modal
(equip-or-discard, one drop at a time) goes away as the primary flow.
Equipping becomes something the player does deliberately from a new
Bag UI, not a decision forced at drop time. `showLootModal`/`equipLoot`/
`discardLoot` (current modal-driven functions) get replaced by:

```js
// equipment.js — new equip-from-bag flow
export function equipFromInventory(index) {
  const entry = state.inventory[index];
  const item = equipment.find(e => e.id === entry.itemId);
  if (!item) return;
  const previous = state.equipped[item.slot];
  state.equipped[item.slot] = item;
  state.removeFromInventory(index);
  if (previous) state.addToInventory(previous.id); // swapped-out piece returns to the bag, not lost
  renderEquipment(); renderInventory(); renderStats(); renderUnitCosts();
  saveGame();
}

export function salvageFromInventory(index) {
  const entry = state.inventory[index];
  const item = equipment.find(e => e.id === entry.itemId);
  const sv = item?.salvageValue || 0;
  state.addGold(sv); state.addTotalGoldEarned(sv);
  state.removeFromInventory(index);
  updateGold(); flashGold(); renderInventory();
  saveGame();
}
```

Note the fix baked in here: today, equipping a new item **destroys**
the old one with no salvage offered (`equipLoot`, `equipment.js:243`
just overwrites `state.equipped[item.slot]`). With a bag, the displaced
item returns to inventory instead of vanishing — a genuine improvement,
not just a refactor, and directly answers "the best one is auto-equipped
and you automatically sell the inferior ones" from the original player
feedback (Henvacelos) in a way that gives the player back control.

### UI

New "🎒 Bag" tab (same `TAB_ORDER` pattern as Achievements/Heroes/Gear/
Trophies in `js/ui.js`), a scrollable grid of owned-but-unequipped items,
each row: icon, name, rarity color, bonus text (reuses `bonusLabel`),
two buttons — "Equip" / "Salvage." Gear tab keeps showing the 3 equipped
slots as today, just adds a "Change" button per slot that jumps to Bag
filtered to that slot's items.

### Save format impact

New key, additive only — old saves simply get `inventory = []` on load
(matches SAVESTATE SAFETY's fallback-default rule exactly, same pattern
as every other feature in BACKLOG.md):

```js
// save.js saveGame() — add one line
s.setItem("inventory", JSON.stringify(state.inventory));

// save.js _loadGame() — add
const inv = j("inventory");
if (inv) state.inventory = inv;
```

No `SAVE_VERSION` bump needed — this is a pure addition, not a shape
change to any existing key (contrast with Part 2 below, which changes
`equipped` shape and DOES need one).

---

## Part 2: Multiple gear loadouts

### Data structure

Builds on Part 1 — a loadout is just a named snapshot of 3 slot→itemId
mappings. Since Part 1 already keeps every owned item in `inventory`
(equipping something no longer destroys the alternative), swapping
loadouts is a pure state operation, no gold/item loss risk:

```js
// state.js
export let loadouts = [
  // { id, name, weaponId, armorId, ringId }
];
export let activeLoadoutId = null; // null = using equipped ad-hoc, not a saved loadout
```

### Why loadouts must come after Part 1, not before

A loadout-swap has to pull the OTHER slots' items from somewhere when
you switch away from your current gear — that pool is exactly the bag
from Part 1. Building loadouts on the current (bag-less) system would
mean re-inventing a mini-bag just to make loadouts work, then throwing
that away when Part 1 ships — wasted, throwaway work. Sequencing them
saves a rebuild.

### Core operations

```js
// equipment.js (or a new js/loadouts.js — TBD at implementation time
// based on file size; equipment.js is already ~260 lines)

export function saveCurrentAsLoadout(name) {
  const id = "loadout_" + Date.now();
  state.loadouts.push({
    id, name,
    weaponId: state.equipped.weapon?.id || null,
    armorId:  state.equipped.armor?.id  || null,
    ringId:   state.equipped.ring?.id   || null,
  });
  state.setActiveLoadoutId(id);
  saveGame();
}

export function applyLoadout(id) {
  const loadout = state.loadouts.find(l => l.id === id);
  if (!loadout) return;
  // Whatever is currently equipped goes back to the bag first — nothing is lost mid-swap.
  for (const slot of ["weapon", "armor", "ring"]) {
    if (state.equipped[slot]) state.addToInventory(state.equipped[slot].id);
  }
  const findAndEquip = (slot, itemId) => {
    if (!itemId) { state.equipped[slot] = null; return; }
    const invIndex = state.inventory.findIndex(i => i.itemId === itemId);
    if (invIndex === -1) return; // player must have salvaged this piece since saving the loadout
    state.equipped[slot] = equipment.find(e => e.id === itemId);
    state.removeFromInventory(invIndex);
  };
  findAndEquip("weapon", loadout.weaponId);
  findAndEquip("armor",  loadout.armorId);
  findAndEquip("ring",   loadout.ringId);
  state.setActiveLoadoutId(id);
  renderEquipment(); renderInventory(); renderStats(); renderUnitCosts();
  saveGame();
}
```

**Pitfall handled above:** a loadout can reference an item the player
later salvaged. `applyLoadout` degrades gracefully (leaves that slot
alone / empty) rather than crashing — must NOT assume the referenced
item is still in the bag.

### UI

Loadout bar above the 3 equip slots in the Gear tab: named pill buttons
(e.g. "💰 Gold Farm," "👑 Boss Killer," "+ Save Current as Loadout").
Clicking a pill calls `applyLoadout`; a small ✕ per pill deletes that
loadout (does NOT salvage its items — they're already safe in the bag
by definition, per how `applyLoadout` works).

### Save format impact — DOES need a version bump

`equipped`'s serialized shape doesn't change, but this is the first
place multiple named collections of items need persisting:

```js
// save.js saveGame() — add
s.setItem("loadouts", JSON.stringify(state.loadouts));
s.setItem("activeLoadoutId", state.activeLoadoutId || "");

// save.js _loadGame() — add
const lo = j("loadouts");
if (lo) state.loadouts = lo;
const alid = s.getItem("activeLoadoutId");
if (alid) state.activeLoadoutId = alid;
```

Additive-only again (old saves get `loadouts = []`), so actually no
`SAVE_VERSION` bump needed here either on reflection — flagged as a
question above the code, not a hard requirement, since nothing about
an *existing* key's shape changes. Correcting the earlier claim: only a
genuine breaking change (an existing key's stored shape changing) needs
`SAVE_VERSION` bumped per `_loadGame`'s existing wipe-on-mismatch logic
(`save.js:69`) — pure additions never need it.

---

## Pitfalls & best practices

1. **Unbounded bag growth.** No cap in v1 (deliberate, see Scope
   Decision) — but `localStorage` has a ~5-10MB origin quota. At maybe
   ~60 bytes/item JSON-serialized, that's tens of thousands of items
   before it's a real risk — not a v1 concern, but worth a future
   "auto-salvage commons below X rarity once bag exceeds N items"
   safety valve if it ever comes up.
2. **Displaced-item-goes-to-bag must not double-count salvage value.**
   `equipFromInventory` above returns the old item to the bag rather
   than salvaging it — confirm no code path salvages AND re-adds the
   same item (would duplicate gold or dupe the item).
3. **`applyLoadout` must tolerate a missing referenced item** (already
   handled above) — a player can salvage a piece from the bag after
   saving a loadout that references it. Silent skip, not a crash.
3. **Existing loot-modal call sites** (`combat.js` calling
   `showLootModal`) need updating to the new silent-bag-add flow —
   this isn't just adding new functions, it's confirming nothing still
   calls the old `equipLoot`/`discardLoot`/modal path after the swap.
4. **`itemPowerScore`/`hasDifferentStatShape`/`wouldHelpCompleteSet`**
   (existing auto-salvage heuristics) become mostly obsolete once
   *nothing* auto-salvages except exact duplicates — don't leave dead
   code; explicitly remove or repurpose them.
5. **Test-suite impact.** `tests/smoke.spec.js` likely asserts on the
   current loot-modal flow (per TESTING_PROGRESS.md's existing set-bonus
   test coverage) — needs updating alongside the implementation, not
   as an afterthought.

## Suggested build order

1. Part 1 (bag) alone — useful standalone, smaller diff, lower risk.
   Ship and test in isolation first.
2. Part 2 (loadouts) as a follow-up once Part 1 is confirmed stable.

**Waiting for go-ahead before touching any code.**
