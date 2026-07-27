# Dungeon Clicker 9000 — Roadmap & Ideas

Open/forward-looking planning only. Once something is actually released
to players, its write-up lives in [CHANGELOG.md](CHANGELOG.md) — the
sole historical record — and is removed from here. A commit existing in
git is not the same as "shipped": an item only leaves this file once
it's live for players (see the v1.9.0 entry below for the current
example of committed-but-held-back work).

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
  CHANGELOG/Patreon-post prose (including past drafts) used
  "Ascend"/"Ascended" colloquially. Not urgent, but flagged so a future
  doc/UI pass can standardize on "Prestige" consistently rather than
  mixing both terms.

## Committed, held back pending the Google Play Store launch

**v1.9.0 — progression-curve rebalance.** Committed to git
(`8d7391d`), intentionally not pushed/released yet — full technical
write-up already in [CHANGELOG.md](CHANGELOG.md)'s 1.9.0 entry. Held
back so the next public release lines up with the upcoming Play Store
launch rather than going out immediately; update that CHANGELOG entry's
header to a real date once actually pushed live, and remove this note.

## Planned — future major patch (not scheduled)

**Itemization Overhaul.** Full design doc written:
[ITEMIZATION_REDESIGN.md](ITEMIZATION_REDESIGN.md). 6 equipment slots
(up from 3: adds Helmet/Boots/Amulet), 5 rarity tiers (up from 3: adds
Epic/Mythic), 8 named sets with new partial-set (2pc/full) tiering, 6
affixes including a new rarity/luck lever (`bossDmgMult`,
`damageReduction`, `playerMaxHPBonus`, `offlineGainMult`,
`potionDurationMult`, `rarityLuck`), and a 100-item table (numbers still
to be finalized once the architecture is greenlit for a build cycle).
Deliberately sequenced *after* the v1.9.0 progression-curve rebalance —
itemization is an additive-bonus expansion, and the curve fix showed
additive expansions delay a divergence wall without fixing it, so this
is tuned once against the corrected curve rather than twice.

**Gear Loadouts (Inventory/Bag system Part 2) — explicitly deferred,
not abandoned.** Full design doc written:
[INVENTORY_REDESIGN.md](INVENTORY_REDESIGN.md)'s "Part 2." Named gear
loadouts (e.g. "Gold Farm" / "Boss Killer") that swap all equipped
slots at once. Technically unblocked (Part 1, the Bag itself, already
shipped), but confirmed not worth building at today's ~19-item count —
parked until the Itemization Overhaul ships and there's enough gear
that loadout-swapping actually saves meaningful time.

**Decisions from the Bag/Inventory build, logged so they aren't
re-litigated next time Loadouts or Itemization is discussed:**
- **No purchasable/upgradeable bag slots.** Considered and explicitly
  declined — this game has no crafting/trading economy creating
  storage-scarcity pressure the way loot-based ARPGs do, so a "pay
  gold to hold more items" gate would be a fake choice, not a real
  one. Bag stays unlimited unless localStorage size ever becomes a
  real, measured problem.
- **Bag lives as a sub-tab under Gear, not a separate top-level tab** —
  mirrors the existing Shop → Weapons/Units sub-tab pattern
  (`showGearTab()` in `js/ui.js`).
- **Sub-tabs per item slot inside the Bag: declined for now**, at
  today's ~19-item count — over-engineering at this scale. Revisit
  once the Itemization Overhaul ships and the item/slot count actually
  grows; don't build the sub-tab structure ahead of knowing the final
  slot list, since building it against the wrong shape means redoing it.
- **Loot pop-up stays interrupting, not silent** — a silent auto-bag
  version was tried and reverted per player feedback wanting the
  Equip/Bag/Discard choice back.

**Real Artwork Pass — confirmed worth pursuing, sourcing decision is
the actual blocker.** Design doc written:
[ART_UPGRADE.md](ART_UPGRADE.md). The current all-emoji visual identity
(10 monsters × 8 tiers via CSS recoloring, 19 gear items, 8 heroes, the
player character itself) has hit a real ceiling — the same tier-recolor
trick repeating forever. Doc scopes a monsters-first real-art pass
(PNG/SVG, reusing the existing tier-recolor CSS trick so it stays at 10
base assets, not 80), sourcing options (AI-generated / commissioned /
licensed pack — undecided), and a fallback-safe technical swap-in plan.
**Not started — needs the sourcing decision made before anything else
here can move.**

**Playable hero characters with unique active abilities, unlocked via
prestige-count milestones — new idea, explicitly separate from the Real
Artwork Pass above.** Today's "Heroes" (`js/heroes.js`) are passive
stat-bonus unlocks, not playable characters with active abilities; this
is a genuinely bigger scope — a hero-swap/active-ability system layered
on top (e.g. "reach floor 250 to unlock a new selectable hero with
their own unique active ability"), not a visual reskin. Needs its own
design doc once picked up — touches core combat (a new "active ability"
concept doesn't exist anywhere in the game today). Sequenced after the
Real Artwork Pass's sourcing decision — a real-art pass on the existing
roster is the smaller, more immediate win.

**Cloud save — explicitly declined for now.** Decided against standing
up a backend/auth system. Export/import save (shipped, no backend
needed) already covers the actual player concern ("tied to browser
data seems dangerous") without the infrastructure cost. Revisit only
if there's a concrete reason true cross-device sync becomes worth a
backend investment.

**Leaderboard via Google Play Games Services — confirmed direction,
tied to the upcoming Play Store launch.** Full context in BACKLOG.md
#23/#27. Reuses the existing Daily Challenge Run's seeded/timed format
(`js/challenge.js`) for a fair score to submit — no new scoring design
needed. GPGS gives free, built-in leaderboard + score-moderation
tooling with zero backend to host; deliberately Play-Store-only for
now (itch.io players have no path into a Google account-based system)
— a separate web leaderboard is a distinct, optional future item, not
bundled into this one. Autoclicker/anti-cheat concern resolved the same
way the genre already handles it: bragging-rights framing (matches the
Daily Challenge's existing "no permanent rewards" stance) plus GPGS's
own score-flagging tools, no custom detection code planned.

## Content pipeline for regular post-launch updates

See [BACKLOG.md](BACKLOG.md)'s "Content pipeline" entry for the full,
categorized queue (Veteran Adventurer, Momentum, Soul Shard Milestones/
Ancient Forge/Hero Passives, and a batch of small independent QoL
items) — sourced specifically to have a steady stream of small, real
patches ready to release after the Play Store launch, rather than one
large update then silence.
