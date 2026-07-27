# Dungeon Clicker 9000 — Roadmap & Ideas

## Process/communication decisions (so they aren't re-decided later)

- **Patch-note Patreon posts are public/free, not paywalled.** Decided
  2026-07-25: a "what changed" post benefits most from reaching
  prospective/new players (signals an actively maintained project) and
  existing free players whose own bug reports are being addressed —
  gating that behind a paywall would cut against both. Keep the
  **roadmap/direction preview posts** (Template B in
  PATREON_TEMPLATES.md) supporter-only, as already established — that
  split (public patch notes, supporter-only speculative previews)
  stays the rule going forward, not something to re-decide per post.
- **Terminology: the game's own UI/code call it "Prestige," not
  "Ascend."** A player corrected this (2026-07-25) — worth a
  consistency pass at some point: `js/prestige.js`, the Prestige tab
  label, and `prestigeCount` are all named correctly, but some BACKLOG/
  CHANGELOG/Patreon-post prose (including this session's own drafts)
  used "Ascend"/"Ascended" colloquially. Not urgent, but flagged so a
  future doc/UI pass can standardize on "Prestige" consistently rather
  than mixing both terms.

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

**Gear Loadouts (Inventory/Bag system Part 2) — explicitly deferred
(2026-07-27), not abandoned.** Full design doc written:
[INVENTORY_REDESIGN.md](INVENTORY_REDESIGN.md)'s "Part 2." Named gear
loadouts (e.g. "Gold Farm" / "Boss Killer") that swap all 3 (soon 6)
equipped slots at once. **Part 1 (the Bag itself) is done — shipped in
v1.7.0, see below** — so Loadouts is technically unblocked, but
confirmed not worth building yet at today's ~19-item count (swapping
between so few possible loadouts by hand isn't a real problem).
Deliberately parked until after the Itemization Overhaul ships and
there's enough gear that loadout-swapping actually saves meaningful
time — see BACKLOG.md's content-pipeline entry.

**Decisions made during Part 1's build (2026-07-25), logged so they
aren't re-litigated next time Loadouts or a bigger itemization pass is
discussed:**
- **No purchasable/upgradeable bag slots.** Considered and explicitly
  declined — this game has no crafting/trading economy creating
  storage-scarcity pressure the way loot-based ARPGs do, so a "pay
  gold to hold more items" gate would be a fake choice, not a real
  one. Bag stays unlimited unless localStorage size ever becomes a
  real, measured problem (see INVENTORY_REDESIGN.md's original
  estimate: "tens of thousands of items" away from mattering).
- **Bag lives as a sub-tab under Gear, not a separate top-level tab.**
  Player feedback during testing: too many top-level tabs. Mirrors the
  existing Shop → Weapons/Units sub-tab pattern exactly
  (`showGearTab()` in `js/ui.js`).
- **Sub-tabs per item slot (Weapon/Armor/Ring) inside the Bag: declined
  for now, at today's ~19-item count** — would be over-engineering at
  this scale (a single sorted, slot-grouped list scans fine up to
  ~20-30 items). Revisit specifically once the Itemization Overhaul
  ships and the item count/slot list actually grows — don't build the
  sub-tab structure ahead of knowing the final slot list (today's 3
  slots vs. the Overhaul's proposed 6), since building it against the
  wrong shape means redoing it.
- **Loot pop-up was restored, not kept silent.** An earlier version of
  this session's build made drops go straight into the Bag with no
  interrupting pop-up at all — reverted per player feedback ("I want
  the popup to come back, with equip/discard/bag options"). Final
  shipped behavior: a 3-way Equip / Place in Bag / Discard choice at
  drop time, with only an *exact duplicate* of an already-owned item
  still auto-salvaging silently (no possible use for a second copy).
- **A real, confirmed bug surfaced and fixed by this rebuild:** salvage
  value was a flat number (100/500/2500g) that had never been
  rebalanced against the exponential gold curve — worth roughly 1/3 of
  a single floor-20 boss kill, and functionally worthless by floor
  100+. Fixed to scale by the same 1.8×/tier curve monster gold
  already uses (`getSalvageValue()` in `js/equipment.js`). See
  BACKLOG.md #15.

**Real Artwork Pass — confirmed as the right call to pursue now
(2026-07-27), sourcing decision still the actual blocker.** Design doc
written, not yet approved: [ART_UPGRADE.md](ART_UPGRADE.md). Surfaced by
a player observation (Henvacelos, 2026-07-24) that the Skeleton
monster's 🦴 icon reads less "skeleton" than the Lich King boss's 💀 —
the specific icon swap was declined (both kept as-is on reflection),
but it exposed a real ceiling in the current all-emoji visual identity
system (10 monsters × 8 tiers, 19 gear items, 8 heroes, all
single-emoji strings). Reasoning behind revisiting now: the tier-recolor
CSS trick (same base emoji, just re-shaded per tier) is the same visual
trick repeated forever — genuinely time to break out of that loop with
real art, and this also covers giving the player character itself a
real look, not just monsters. Doc scopes a monsters-first real-art pass
(PNG/SVG, reusing the existing tier-recolor CSS trick so it stays at 10
base assets, not 80), sourcing options (AI-generated / commissioned /
licensed pack — undecided), and a fallback-safe technical swap-in plan.
**Still not started — needs the sourcing decision made before anything
else here can move.**

**New, separate idea (2026-07-27): playable hero characters with unique
active abilities, unlocked via prestige-count milestones.** Explicitly
NOT part of the Real Artwork Pass above, despite surfacing in the same
conversation — this is a genuinely different, bigger scope: today's
"Heroes" (`js/heroes.js`) are passive stat-bonus unlocks, not playable
characters with active abilities. What's being proposed is closer to a
hero-swap/active-ability system layered on top of the existing passive
unlocks (e.g. "reach floor 250 to unlock a new selectable hero, who has
their own unique active ability"), not a visual reskin. Needs its own
design doc once picked up — touches core combat (a new "active ability"
concept doesn't exist anywhere in the game today), not just art. Logged
here as a distinct future idea, sequenced after the Real Artwork Pass's
sourcing decision is made (a real-art pass on the *existing* hero
roster is the smaller, more immediate win; new playable characters with
new mechanics is a bigger, later swing).

**Cloud save — explicitly declined for now (2026-07-24).** Considered
alongside the above; decided against standing up a backend/auth system
for this. BACKLOG.md #11 (export/import save, no backend needed) covers
the actual player concern ("tied to browser data seems dangerous")
without the infrastructure cost. Revisit only if there's a concrete
reason true cross-device sync becomes worth a backend investment.

**Leaderboard via Google Play Games Services — confirmed direction
(2026-07-27), tied to the upcoming Play Store launch.** Full context in
BACKLOG.md #23/#27. Reuses the existing Daily Challenge Run's seeded/
timed format (`js/challenge.js`) for a fair score to submit — no new
scoring design needed. GPGS gives free, built-in leaderboard +
score-moderation tooling with zero backend to host; deliberately
Play-Store-only for now (itch.io players have no path into a Google
account-based system) — a separate web leaderboard is a distinct,
optional future item, not bundled into this one. Autoclicker/anti-cheat
concern resolved the same way the genre already handles it: bragging-
rights framing (matches the Daily Challenge's existing "no permanent
rewards" stance) plus GPGS's own score-flagging tools, no custom
detection code planned.

## Inventory/Bag system + boss combat rebalance — ✅ SHIPPED (2026-07-25), v1.7.0

Full write-ups: BACKLOG.md #13-18 (bug fixes/rebalance) plus the Bag
system entries. Design doc: [INVENTORY_REDESIGN.md](INVENTORY_REDESIGN.md)
Part 1 (now done — see decisions logged above under "Gear Loadouts").

- ✅ Bag/Inventory system — sub-tab under Gear, rarity-colored frames,
  slot-then-rarity sort, inline compare panel reusing the loot modal's
  layout.
- ✅ Loot pop-up restored — 3-way Equip / Place in Bag / Discard choice.
- ✅ Player max HP now scales with floor tier instead of a flat 4.
- ✅ New Healing Tonic potion (instant heal, distinct from the other 5
  duration-buff potions).
- ✅ Salvage value now scales with floor tier — see decision note above.
- ✅ Fixed: `weaponBonus` (crit/dps/execute/life-steal from weapon-path
  purchases) was never reset on Ascend, silently persisting across
  every future run regardless of path/gear — real, confirmed bug,
  root-caused via player report of unexplained HP regen. BACKLOG.md #17.
- ✅ Fixed: boss-dodge idle-detection was keyed on click recency
  instead of tab focus/visibility, causing real misses to occasionally
  silently no-op during normal play. BACKLOG.md #17.
- ✅ Fixed: hold-to-attack could get stuck firing if released outside
  the browser window.
- ✅ Cache-busting for JS module imports on every deploy
  (`scripts/stamp-versions.js`) — stops stale-browser-cache reports
  from being mistaken for real bugs (had happened at least 3 times).

**Known follow-up gap, NOT fixed in this batch — logged for next
session:** BACKLOG.md #18 — the loot pop-up blocks all further loot
rolls while it's open (idle/passive DPS kills happening in the
background during that window currently drop nothing). Needs a design
pass (candidate directions already written up in BACKLOG.md #18)
before implementation.

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
