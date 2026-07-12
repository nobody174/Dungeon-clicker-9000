# Dungeon Clicker 9000 — Roadmap & Ideas

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
