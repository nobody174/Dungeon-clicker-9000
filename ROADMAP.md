# Dungeon Clicker 9000 — Roadmap & Ideas

## Planned — future major patch (not scheduled)

**Itemization Overhaul.** Full design doc already written and approved
for later: [ITEMIZATION_REDESIGN.md](ITEMIZATION_REDESIGN.md). 6 equipment
slots (up from 3: adds Helmet/Boots/Amulet), 5 rarity tiers (up from 3:
adds Epic/Mythic), 8 named sets with new partial-set (2pc/full) tiering,
5 new affixes (`bossDmgMult`, `damageReduction`, `playerMaxHPBonus`,
`offlineGainMult`, `potionDurationMult`), and a 100-item table (numbers
still to be finalized in a follow-on pass once the architecture below is
actually greenlit for a build cycle).

**Deliberately deferred, not started:** this is a save-format-changing,
multi-system redesign — much bigger than a single BACKLOG item — and
current priority is the smaller-scoped BACKLOG.md #12 (item variety
expansion within the existing 3-slot/3-rarity system) instead, since
that's what the immediate player feedback (Henvacelos, 2026-07-23) asked
for. Revisit this doc when scoping the next major content patch.

**Inventory/Bag system + Gear Loadouts.** Full design doc written,
not yet approved for a build cycle:
[INVENTORY_REDESIGN.md](INVENTORY_REDESIGN.md). Part 1: a real bag —
loot no longer force-auto-salvages anything not strictly better,
displaced gear returns to the bag instead of being destroyed on equip.
Part 2 (depends on Part 1 shipping first): named gear loadouts (e.g.
"Gold Farm" / "Boss Killer") that swap all 3 slots at once. Also not
started — same reasoning as the itemization overhaul above.

**Cloud save — explicitly declined for now (2026-07-24).** Considered
alongside the above; decided against standing up a backend/auth system
for this. BACKLOG.md #11 (export/import save, no backend needed) covers
the actual player concern ("tied to browser data seems dangerous")
without the infrastructure cost. Revisit only if there's a concrete
reason true cross-device sync becomes worth a backend investment.

## Post-launch batch (from player feedback) — ✅ COMPLETE (2026-07-25)

Sourced from first community feedback (Henvacelos, 2026-07-23). See
[BACKLOG.md](BACKLOG.md)'s "Post-launch batch" section for full write-ups.

1. ✅ Item variety expansion — 9 new items (10→19), 4th equipment set
   ("Swiftblade Zeal"). Shipped 2026-07-24, v1.5.0. BACKLOG.md #12.
2. ✅ Export/import save — base64 save-code export + validated import,
   no backend. Shipped 2026-07-25, v1.6.0. BACKLOG.md #11.

Both items in this batch are now shipped — batch complete.

Also shipped alongside this batch, not from a numbered BACKLOG item:
- ✅ Version tag (bottom-left of game panel) so bug reports can be
  matched to a build — `js/version.js`. Shipped 2026-07-24, v1.5.0.

## 10-feature batch, post-architecture-migration — ✅ COMPLETE (2026-07-12)

All 10 items below went through a full design review before
implementation and have all shipped. See [BACKLOG.md](BACKLOG.md) for
the complete write-up, review verdict, and implementation notes for
each. Build order as agreed:

1. ✅ **Offline-progress duration upgrades** — shipped 2026-07-12.
   BACKLOG.md #8.
2. ✅ Mastery milestones with visible payoff — named tiers (5/10/25/50)
   with a visible unit upgrade. Shipped 2026-07-12. BACKLOG.md #9.
3. ✅ Tiered monster visual identity (1a) — new name/icon per floor
   tier, no new mechanic yet. Shipped 2026-07-12. BACKLOG.md #1.
4. ✅ Boss Combat v1 — player HP bar + dodge, boss fights only. The
   architectural linchpin (first real-time tick loop in the codebase).
   Shipped 2026-07-12. BACKLOG.md #2.
5. ✅ Equipment set bonuses — named sets across weapon/armor/ring slots.
   Shipped 2026-07-12. BACKLOG.md #3.
6. ✅ Path of the Reaper — 4th weapon path, unlocked after first Ascend.
   Shipped 2026-07-12. BACKLOG.md #4.
7. ✅ Hero Trials (companion quests) — one-time per-hero objectives,
   cosmetic titles. Shipped 2026-07-12. BACKLOG.md #7.
8. ✅ Boss trophy room tab — gated on tiered monster identity (#3 above)
   shipping first. Shipped 2026-07-12. BACKLOG.md #10.
9. ✅ Daily/weekly seeded challenge run. Shipped 2026-07-12. BACKLOG.md #6.
10. ✅ Void Fragments — second prestige currency layer. Deliberately
    last; true endgame content. Shipped 2026-07-12. BACKLOG.md #5.

## Recently Shipped

### Architecture migration (2026-07-12)
- Split the single-file `index.html` inline script (~1,720 lines, 84
  functions, 55 shared globals) into ES modules under `/js` — no build
  step, no bundler, no framework. Prerequisite for the 10-feature batch
  above, since several items (Boss Combat's tick loop, Seeded Challenge
  Run's isolated save state) need real module boundaries to avoid
  tangling with the rest of the game's logic.
- Added a Playwright smoke-test suite (`tests/smoke.spec.js`) as the
  regression harness for the migration and everything after it.
- Fixed the itch.io deploy workflow, which previously only copied
  `index.html` and would have silently shipped a broken (JS-less) build
  once the split landed.

### v1.3.0
- ⚜️ Brother Aldric (Paladin) — reworked from the original "massive DPS"
  pitch into an attack-speed aura hero, since flat DPS clashed with the
  new boss-shield mechanic
- ⚗️ Potion shop — 5 timed combat buffs
- 🏆 Achievement rewards — gold payouts + permanent Achievement Power, in
  place of a separate "legendary tier"
- Dragoon and Titan units, branching weapon paths, per-unit Mastery sink

Full write-up with rationale for each backlog item: see
[BACKLOG.md](BACKLOG.md).
