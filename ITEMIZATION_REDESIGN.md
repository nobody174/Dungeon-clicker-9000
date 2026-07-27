# Itemization Overhaul — Design Doc (draft, 2026-07-24)

Status: **DESIGN ONLY — not approved, not built.** Per CLAUDE.md rule 1
(design first) and rule 5 (ask before touching anything that affects an
already-shipped system — this touches Ascend indirectly via prestige-shifted
drop rates, and rewrites the save format). Nothing below is committed to
`equipment.js`, `state.js`, or `save.js` yet.

## Why this is a bigger lift than BACKLOG #12

BACKLOG.md #12 ("item variety expansion") scoped a content-volume top-up:
more items in the existing 3 slots / 3 rarities, no architecture changes.
This doc is for the larger ask that superseded it: **6 slots, 6 rarities
(including a new "Magic" tier — see Rarity Tiers below), 100 items, 8
sets, partial-set tiering, new affix types.** That means:

- `state.equipped` (`state.js:46`) goes from a 3-key object to 6 keys —
  **save-format change**, needs the SAVESTATE SAFETY fallback-default
  treatment (old saves have no `helmet`/`boots`/`trinket`/`amulet` keys).
- `save.js`'s save/load functions hardcode the 3 slot names explicitly
  (`save.js:46`, `save.js:135`) rather than looping — both need editing,
  and old saves must load cleanly with the new slots defaulting to `null`.
- `stats.js:18` already loops `for (const slot in state.equipped)`, so new
  slots plug into the multiplier pipeline for free — no change needed there
  as long as new affixes reuse existing multiplier keys (see Affix Catalog).
- `equipment.js`'s `rollLoot`/`showLootModal`/`renderEquipment` all assume
  exactly `["weapon","armor","ring"]` in a few places and need the slot
  list extended, not rewritten.
- Partial-set bonuses are a new mechanic — today's `getActiveSetBonuses()`
  is strictly all-or-nothing (`set.itemIds.every(...)`). This needs a
  genuinely new tiered-bonus function.

## Proposed slots (6 total, up from 3)

| Slot | Existing? | Notes |
|---|---|---|
| Weapon | yes | unchanged |
| Armor | yes | unchanged |
| Ring | yes | unchanged |
| Helmet | **new** | |
| Boots | **new** | |
| Amulet | **new** | separate from Ring — distinct slot, not a reskin |

Trinket was considered and cut for v1 — 6 slots is already double the
current count; a 7th adds surface area without a clear distinct identity
from Amulet. Can revisit in a later pass.

## Rarity tiers (6, up from 3)

**Revised 2026-07-28** to add a "Magic" tier below Rare, driven by a
real, confirmed gap in the *current* 19-item table: today's items mix
1-stat and 2-stat items with no consistent rule tying stat *count* to
rarity (e.g. common Rusted Blade and legendary Void Plate are both
1-stat; rare Headsman's Axe and legendary Chronoblade are both
2-stat). Going forward, stat count scales predictably with rarity —
this is the actual mechanical differentiator between tiers, not just a
bigger number on the same single stat.

| Rarity | Stat count | Stat pool | Color (existing CSS var pattern) | Relative power | Drop weight baseline (floor 1-9) |
|---|---|---|---|---|---|
| Common | 1 | Standard pool | `rarity-common` (existing) | 1.0× | 50% |
| Magic | 1 | **Better** pool (stronger rolls than Common draws from, still 1 stat) — **new** | — needs a `rarity-magic` CSS rule | 1.4× | 25% |
| Rare | 2 | Standard pool | `rarity-rare` (existing) | 1.8× | 15% |
| Epic | 3 | Standard pool | **new** — needs a `rarity-epic` CSS rule | 3.0× | 7% |
| Legendary | 4 | Standard pool | `rarity-legendary` (existing) | 5.0× | 2.5% |
| Mythic | 4 (same count as Legendary — **not** a 5th slot) | Best-in-slot rolls + exclusive affixes, gated `minPrestige: 1` | **new** — needs a `rarity-mythic` CSS rule | 8.5× | 0.5%, only rollable post-Prestige |

Mythic deliberately does NOT get a 5th stat slot — capping stat count at
4 avoids overloading a single item card with more numbers than a player
can meaningfully read at a glance. Mythic's power jump instead comes
from rolling the *best possible* value at each of its 4 stat slots
(where Legendary might roll a range) plus access to Mythic-exclusive
affixes ordinary Legendaries can't roll at all.

Power multipliers are relative to a common item's single-stat roll at the
same slot; used below to keep the 100-item table internally consistent
rather than hand-waved.

**Retrofit note:** the existing 19 shipped items (`js/equipment.js`)
don't follow this stat-count rule today and should be brought in line
with it as part of this rebuild, not left as legacy exceptions —
confirmed explicitly: rework the current item table alongside building
the new 100-item table, rather than grandfathering the old items'
inconsistent stat counts forward.

Existing `rollLoot()` rarity-weight logic (floor/prestige shifts common→
rare→legendary) extends the same way to epic/mythic — same shape, just
one more rarity band folded into the existing `common`/`rare`/`legendary`
percentage variables, replaced with a 5-way weight table.

## Affix catalog

Existing multiplier keys already in `stats.js`'s `getTotalMult()` pipeline
(reused, not replaced): `clickMult`, `goldMult`, `dpsMult`, `critChance`,
`critMult`, `executeBonus`, `lifeSteal`, `missGoldPenaltyReduction`.

New affixes needed for the requested build variety (gold farming / boss
killing / shield-tank / crit / click-focused / passive DPS / hybrid):

| New affix key | Effect | Where consumed |
|---|---|---|
| `bossDmgMult` | + damage vs. boss-flagged monsters only | `combat.js`'s `attack()`/`dealDamage`, gated on existing `isBoss` |
| `damageReduction` | flat % reduction to boss-dodge-miss HP loss (distinct from existing `missGoldPenaltyReduction`, which only touches the gold penalty) | `bossCombat.js` miss-resolution branch |
| `playerMaxHPBonus` | + flat player HP (tank identity, currently nothing modifies `PLAYER_MAX_HP`) | `bossCombat.js` / `state.js` |
| `offlineGainMult` | + % offline earnings (hybrid/gold-farm identity) | `save.js` offline calc, alongside existing `getOfflineGainMult()` from prestige shop |
| `potionDurationMult` | potions from `potions.js` last longer | `potions.js` buff-duration calc |
| `rarityLuck` **(new, 2026-07-27)** | + % chance to roll a higher rarity band on any drop (a genuinely new lever — today's rarity odds are only floor/prestige-gated, never gear-gated) | `equipment.js`'s `rollLoot()`, folded into the rarity-roll step as an additive shift to the legendary/mythic weight, same shape as the existing `prestigeShift` variable |

All six are additive percentages/flats consumed the same way existing
keys are, no new pipeline architecture — `getTotalMult()` stays a flat
sum-of-sources function, just with a longer key list. `rarityLuck` is
the exception worth flagging: it doesn't feed `getTotalMult()`, since
it needs to be read at roll-time inside `rollLoot()` specifically, not
applied as a stat multiplier — same category of "special-cased affix"
as `missGoldPenaltyReduction` already is today.

## Set list (8 sets, up from 3)

Existing 3 sets (Voidreaver's Fury, Hoarder's Fortune, Warden's Resolve)
kept as-is, now spanning the wider slot list where thematically fitting.
5 new sets to reach 8 total, one per requested archetype:

1. **Voidreaver's Fury** (existing) — crit build.
2. **Hoarder's Fortune** (existing) — gold farming. Confirmed (2026-07-27) as the "pure gold farm" archetype requested — already covers it, no new set needed for this identity.
3. **Warden's Resolve** (existing) — shield/tank (dodge-miss mitigation).
4. **Slayer's Vindication** (new) — boss killing. Confirmed (2026-07-27) as the requested "boss killing, +%dmg to shields/bosses" archetype. 4pc: weapon/helmet/armor/amulet. Uses new `bossDmgMult` (and should read against monster/boss shields specifically, not just raw HP, since shields are already a distinct mechanic in `combat.js`).
5. **Quickstrike Fury** (new) — click-focused. 3pc: weapon/ring/boots. Pure `clickMult` stacking, no crit overlap with set 1 (distinct identity).
6. **Endless March** (new) — passive DPS / "trash killing." Confirmed (2026-07-27) as the requested "clearing regular monsters fast" archetype — pure `dpsMult` is the right shape for this (raw kill speed against non-boss floors), distinct from set 4's boss-specific focus. 3pc: armor/boots/amulet. Complements existing `dragonscale`/`void_plate` items rather than replacing them.
7. **Ironclad Vow** (new) — shield/tank v2, deeper than Warden's Resolve. 4pc: helmet/armor/boots/ring. Uses new `playerMaxHPBonus` + `damageReduction`.
8. **Wanderer's Fortune** (new) — hybrid. 4pc: any-slot mixed rarity (deliberately the "no single build" set) — small `goldMult` + small `dpsMult` + small `offlineGainMult`, for players not chasing a single archetype.

All 4 requested archetypes (gold farm, trash-killing, boss-killing,
plus a rarity/luck-boosting angle) are covered: sets 2, 6, and 4
respectively, with `rarityLuck` (new affix, see Affix Catalog above)
available as an item-level roll rather than needing its own dedicated
set — keeps it flexible enough to slot into any build rather than
forcing a "luck build" as a 5th fixed archetype.

### Partial-set tiering (new mechanic)

Existing sets are all-or-nothing. New sets introduce **2-piece / full-piece**
tiering (not more granular — keeps the "collect the set" pull without
diluting into per-piece noise):

- 2pc bonus: ~40% of the full bonus value.
- Full bonus: as specified above.

`getActiveSetBonuses()` needs a rewrite from `.every(...)` (boolean) to a
tier-lookup (`ownedCount / totalCount` → matched threshold), consumed the
same way by `getActiveSetBonus(key)`'s summation — existing call sites in
`stats.js` don't need to change, just what feeds them.

## Progression curve (bounded, not hand-wavy)

Anchoring to existing `minFloor` gates (10/15/20/25 today) and the new
epic/mythic bands:

| Tier | minFloor range | Slot power example (single-stat common baseline ×) |
|---|---|---|
| Common | 1+ | 1.0× |
| Magic | 5+ | 1.4× |
| Rare | 10+ | 1.8× |
| Epic | 18+ | 3.0× |
| Legendary | 25+ | 5.0× |
| Mythic | 40+, `minPrestige: 1` | 8.5× |

100 items ÷ 6 slots ÷ 6 rarities ≈ **~2-3 items per slot-rarity cell**,
distinguished by which affix(es) they roll (e.g. 3 different Epic Rings:
one crit-leaning, one gold-leaning, one hybrid) — avoids strict power
creep where every new item just replaces the last; players choose based
on build identity, consistent with `hasDifferentStatShape()`'s existing
"different shape beats pure salvage" logic in `equipment.js`.

## Item card display format (2026-07-27)

Set-member items should show their set membership directly on the item
card, not only inside the loot-compare panel where it's shown today.
Confirmed layout:

```
[Item Name]
(Set Name — 1/3)
+X% stat 1
+X% stat 2

Set Bonus: description
```

Set name + progress (`owned/total`) sits directly under the item name,
parenthesized, matching the existing "Part of X (n/total equipped)"
line `equipment.js`'s loot modal already shows — this formalizes that
same information as a consistent per-item label wherever an item is
displayed (Bag list, equipped-slot view, loot pop-up), not just in the
compare panel.

## Drop tables

Same two-step roll `rollLoot()` already does (rarity roll, then uniform
pick within that rarity's eligible pool) — extended to 6 rarities and
6 slots, no new roll mechanism:

```
rarity roll (floor/prestige-shifted, 6-way instead of 3-way)
  → filter eligible items (slot pool is now 6-wide, same minFloor gate)
    → uniform pick within rarity+slot-agnostic pool
      → for Magic/Rare+, additionally roll each stat slot from that
        rarity's stat pool (better pool for Magic, standard for others)
```

Slot is NOT weighted in the roll (matches current behavior — the roll
picks an item, whatever slot it happens to be) so 6 slots naturally
dilutes how often any single slot refreshes; no change needed to
`rollLoot()`'s core algorithm, only its input tables.

## Open questions before implementation

1. Do old players' currently-equipped weapon/armor/ring stay equipped
   as-is with helmet/boots/amulet simply starting empty? (Recommended:
   yes — matches SAVESTATE SAFETY's "fallback default" rule exactly.)
2. Confirm mythic's `minPrestige: 1` gate doesn't create a chicken-and-egg
   problem before a player's first Ascend (matches the existing
   `weaponPaths` Reaper-path precedent, so should be fine, but worth
   a sanity check against BACKLOG #4's void).
3. Full 100-item table + all set/affix numeric tuning to be written up
   as a follow-on doc once the above architecture is approved — this
   doc is scoped to structure/math, not the literal item list, since
   that's meaningless to finalize before the slot/rarity/affix shape
   is signed off.

**Waiting for go-ahead before writing the item table or touching code.**
Deliberately sequenced *after* the progression-curve rebalance
(BACKLOG.md — difficulty ceiling / floor 21/25 work, shipped v1.9.0,
2026-07-26) rather than before or alongside it: itemization is an
additive-bonus expansion, and the balance model showed additive
expansions delay the divergence wall without fixing it — better to
tune this doc's item power table once, against the already-corrected
curve, than tune it now and re-tune after the curve changes shape.
**The curve fix has now shipped (v1.9.0)** — the sequencing dependency
this doc was waiting on is cleared; itemization can move forward
whenever picked up next.

**User's item/affix/set-bonus wishes — captured (2026-07-27).** What
was flagged as TBD on 2026-07-26 is now folded into this doc: the
`rarityLuck` affix (Affix Catalog), the gold-farm/trash-kill/boss-kill
set archetype confirmations (Set list), and the item card display
format (new section above). Still open: the literal 100-item table
itself (names, icons, flavor text, exact per-item affix rolls) —
deliberately not written yet per open question 3 below, since
finalizing individual items before the slot/rarity/affix architecture
is signed off risks having to redo them.
