# Dungeon Clicker 9000 — Content Backlog (2026-07-12)

Detailed write-ups behind the condensed bullets in ROADMAP.md. Grounded in
the current codebase (post `/js` module split), not just abstract pitches.

Each item below went through a full design review (Lead Game Designer pass)
before implementation. Status reflects where each currently stands.

**Architecture note:** the game was migrated from a single `index.html`
inline script into ES modules under `/js` (see ROADMAP.md's "Recently
Shipped" section) specifically to support this batch of 10 features safely.

**Agreed build order:** 8 → 9 → 1a → 2 → 3 → 4 → 7 → 10 → 6 → 5.
Rationale: cheap/independent wins first (8, 9, 1a), then idea 2 (Boss
Combat) as the architectural linchpin other items partially depend on,
then the items that were gated on it (3, 4), then 7/10 (10 gated on 1),
then 6, then 5 last as deliberately-endgame content.

---

1. **Tiered monster identity past floor 10.** `monsters[(currentFloor-1) %
   monsters.length]` means every tier past the first 10 floors reuses the
   same 10 names/icons with only a `tier` multiplier applied to stats —
   floor 55's "Slime" is mechanically identical to floor 5's.

   **Review verdict: Split into multiple backlog items.**
   - **1a — Visual re-tiering only** (new name/icon per tier, no new
     mechanic). Cheap, zero save-state risk. ✅ **SHIPPED (2026-07-12).**
   - **1b — Bounded passive mechanics** (crit/gold/miss-chance modifiers
     only, first 3-4 tiers), deferred behind 1a.
   - Rejected/parked: DoT tick loop, split-on-death, and other mechanics
     needing systems the game doesn't have — see item 2.

   Implemented (1a only): `js/monsters.js` — `TIER_PREFIXES` (8 entries,
   floors 1-10 unprefixed, then Feral/Acid/Shadow/Frozen/Infernal/
   Voidtouched/Ascendant every 10 floors, tier 7+ reuses "Ascendant") plus
   a single shared `getMonsterIdentity(floor)` accessor returning
   `{name, icon, baseHP, baseGold, tier, scale}`. Consolidated the 3
   independent `monsters[(floor-1) % monsters.length]` lookups
   (`loadMonster` in monsters.js, the kill branch in combat.js's
   `dealDamage`, and `goldPerSecond` in stats.js) to all call this one
   accessor instead of duplicating the modulo/tier math a 4th time. No
   save-state changes — name/icon are derived from floor, not stored.
   Verified in-browser: floor 21 renders "Acid Slime".

2. **Boss counter-attack / dodge — "Boss Combat v1: Player HP & Dodge."**
   Player HP bar, timed boss windup → attack, dodge input during windup,
   exclusive to boss fights.

   **Review verdict: Approve with revisions.** This is the architectural
   linchpin of the whole batch — the first system requiring a real-time
   tick loop independent of clicks. Approved scope: small fixed player-HP
   pool, mild (not run-ending) penalty on missed dodge, idle/away players
   auto-resolve as always-dodged so offline progression is never
   penalized. Items 3 (Survival Set) and 4 (life-steal tier) both
   partially depend on this shipping first.

   ✅ **SHIPPED (2026-07-12).** Implemented as a new, isolated module —
   `js/bossCombat.js` — with its own timers, fully decoupled from
   `goldPerSecond()`/offline math (neither reads from nor is read by this
   module). `state.js` adds a small real-time slice: `PLAYER_MAX_HP` (4,
   fully refills every boss fight, no persistent health meta-layer),
   `playerHP`, `bossAttackState`, `lastPlayerActionTime`. Flow: a 5s
   attack-interval timer schedules a 1.4s windup telegraph (pulsing ⚠️
   above the player sprite); pressing Dodge (button or the `D` key,
   wired in `js/main.js`) during the windup fully negates the attack;
   missing costs 1 HP + 5% of current gold (not run-ending — capped by
   the small HP pool, not a floor/run reset). Exclusive to boss floors:
   `monsters.js`'s `loadMonster` calls `startBossFight()`/`endBossFight()`
   based on the existing `isBoss` gate. Idle-safety: `resolveAttack()`
   checks `Date.now() - lastPlayerActionTime` against an 8s threshold
   before applying any penalty — if the player hasn't clicked/attacked
   recently, the swing silently auto-resolves as dodged, so this system
   never touches offline/idle progression. New Playwright test in
   `tests/smoke.spec.js` verifies the HP bar/dodge button show on boss
   floors and hide elsewhere.

3. **Equipment set bonuses.** Named sets across the 3 equipment slots
   (e.g. Voidreaver + Void Plate + Soulstone Ring → +global crit) so
   legendary loot rewards completing a set, not just the single biggest
   stat per slot.

   **Review verdict: Approve with revisions.** Core mechanism (slots
   cleanly into the existing `getTotalMult()` pipeline) approved now.
   "Survival Set" (damage reduction/healing) explicitly deferred until
   item 2 ships a player-HP stat. Also requires a correctness fix to the
   loot-comparison/auto-salvage logic so a set-completing item isn't
   silently discarded for having a lower raw stat score.

   ✅ **SHIPPED (2026-07-12).** Implemented `equipmentSets` (3 sets, full-
   set-only, no partial tiering) in `js/equipment.js`: Voidreaver's Fury
   (weapon/armor/ring legendary crit set, +8% crit chance/+2× crit dmg),
   Hoarder's Fortune (rare gold set, +25% gold), and — now that item 2
   shipped a player-HP stat — Warden's Resolve (common-tier Survival Set,
   -50% gold penalty from missed boss dodges, consumed directly in
   `bossCombat.js`'s miss-resolution branch via a new
   `missGoldPenaltyReduction` key). `getActiveSetBonus(key)` feeds into
   `stats.js`'s `getTotalMult()` alongside weapon/gear/hero/potion
   sources. Correctness fix: `rollLoot()`'s auto-salvage check now also
   calls `wouldHelpCompleteSet(dropped)` and skips the salvage-on-lower-
   score path if the drop would complete (or contribute toward) a set
   that isn't already active, so a set piece is never silently
   discarded just for having a lower raw stat sum than what's equipped.
   Gear tab shows live set progress (owned/total, highlighted when
   complete). Verified in-browser: equipping all 3 Voidreaver's Fury
   pieces reports `getActiveSetBonus('critChance') === 0.08` and the
   gear tab marks the row `set-complete`.

4. **A 4th weapon path, prestige-gated — "Path of the Reaper."** Unlocked
   after the player's first Ascend; life-steal/DoT/execute-flavored
   playstyle alongside Brute/Duelist/Channeler.

   **Review verdict: Approve with revisions.** Execute mechanic and
   sustained-DPS tiers can ship immediately using existing multiplier
   keys. Life-steal tier explicitly deferred until item 2 ships a player
   HP stat to steal into.

   ✅ **SHIPPED (2026-07-12).** Added a `reaper` entry to `js/weapons.js`'s
   `weaponPaths` (8 tiers mirroring the existing Brute/Duelist/Channeler
   cost curve: 60→500,000g). Gated on `minPrestige: 1` — `updateWeaponButtons()`'s
   path-picker skips any path whose `minPrestige` exceeds
   `state.prestigeCount`, the same `minFloor`-style gating pattern used
   elsewhere (e.g. `units.js`). Two new multiplier keys, `executeBonus`
   and `lifeSteal`, accumulate into `weaponBonus` the same way
   `critChance`/`critMult`/`dpsMult` already do. Execute: `attack()` in
   `combat.js` checks `monsterHP/monsterMaxHP < 0.2` and applies
   `1 + executeBonus` (deltas sum to +235% by the final tier) as a damage
   multiplier on click hits. Life-steal (the late-tier signature
   mechanic, now that item 2 shipped a player-HP stat to steal into):
   each hit has a `lifeSteal` chance (sums to 17% at max tier) to heal 1
   player HP, capped at `PLAYER_MAX_HP`; a no-op outside boss fights
   since HP only matters there. Verified in-browser: the path picker
   shows no "Reaper" option at `prestigeCount === 0` and shows it after
   `incPrestigeCount()`.

5. **Second prestige currency layer — "Void Fragments."** Meta-currency
   unlocked past a high floor/prestige-count milestone, spent on
   run-modifiers (start-of-run advantages, difficulty/reward trade-offs)
   rather than flat stat multipliers.

   **Review verdict: Postpone (deliberately last).** Correctly an endgame
   answer, not a midgame feature — shipping before the rest of the batch
   gives the base loop more depth risks it landing as a hollow second
   currency. "Alternate boss behaviors" modifier category is hard-gated
   on item 2. Positioning: Soul Shards = Power, Void Fragments = Run
   Rules (not "prestige-of-prestige").

   ✅ **SHIPPED (2026-07-12), last item in the batch as planned.**
   `js/voidFragments.js` — same architectural pattern as `shardShop`/
   `shardBalance` in prestige.js: a parallel currency (`state.voidFragments`,
   `totalVoidFragmentsEarned`) + a shop array (`voidShop`, 3 start-of-run
   advantages: earlier starting floor, flat starting DPS, starting crit
   chance). Gated on `prestigeCount >= VOID_UNLOCK_PRESTIGE_COUNT` (5) —
   a veteran-run-count gate, not a raw floor number, per the review.
   UI/code copy consistently frames this as "Run Rules" (section header:
   "🌀 Void Fragments — Run Rules"), never "prestige-of-prestige".
   `applyVoidRunBonuses()` reuses the exact `applyRunBonuses()`-style
   consumption pattern prestige.js's `doAscend()` already calls. The one
   genuinely novel mechanic: a capped (`VOID_RISK_MAX = 3`) difficulty/
   reward trade-off chosen once per run — each level adds +15% gold
   AND +15% Void Fragment yield (`getVoidRiskGoldMult()`/
   `getVoidRiskFragmentMult()`, folded into `stats.js`'s
   `applyGoldMult()` and `calcVoidFragmentsToEarn()`) in exchange for
   +10%/level faster (harder-to-react-to) boss windups
   (`getVoidRiskBossAttackSpeedMult()`, consumed in `bossCombat.js`'s
   `beginWindup()`). Capped and reselectable per run rather than a
   creeping always-on multiplier, so it never becomes a new mandatory-
   optimal choice. Explicitly did NOT build "alternate boss behaviors" —
   out of scope for this pass per the review, even with item 2 shipped.
   Verified in-browser: the Run Rules panel shows a locked message
   before 5 Ascends and the full shop (with live balance) after.

6. **Daily/weekly seeded challenge run.** Fixed-seed run, separate
   localStorage slot, scored by floor reached in a fixed time window,
   shareable as a screenshot/score. No server needed.

   **Review verdict: Approve with revisions.** Fully independent of every
   other item — no dependency chain. Real engineering cost the original
   pitch understated: needs a seedable PRNG utility (current code uses
   raw unseeded `Math.random()` at every outcome-affecting roll) and a
   new timer/countdown primitive, not just a reused save slot. No
   progression carry-over from the main save, no permanent-currency
   rewards (score/bragging-rights only, to avoid daily-play FOMO
   pressure).

   ✅ **SHIPPED (2026-07-12).** `js/prng.js` — self-contained mulberry32
   PRNG (~10 lines) plus `dailySeed()` (UTC-calendar-day seed, so every
   player attempting "today's challenge" gets the identical run). Routed
   only outcome-affecting rolls through `state.rollRandom()` (seeded
   when `challengeModeActive`, else plain `Math.random()`): crit-chance
   check and life-steal proc in `combat.js`'s `attack()`, and the loot
   rarity/item rolls in `equipment.js`'s `rollLoot()`. Cosmetic jitter
   (damage-float offsets, screen shake) deliberately left on raw
   `Math.random()` — no need to seed those. `js/challenge.js` owns a
   fixed 10-minute countdown (`setInterval` tick, end-of-run
   lock/freeze via `running` flag), snapshots + fully resets `state.*`
   to a standardized baseline on start (0 gold, floor 1, no units/gear/
   weapon progress — completely isolated from the main save), and
   restores the real snapshot on end/early-exit. Challenge results
   (`lastScore`/`bestScore`, score = floor reached) persist in a
   separate `challengeState` localStorage key, never touching the main
   save's keys; `save.js`'s `saveGame()` also short-circuits entirely
   while `challengeModeActive` so a mid-challenge 30s autosave tick
   can't clobber real progress with the swapped-out baseline state. No
   permanent-currency rewards — the result modal explicitly states
   "bragging rights only." Mode-select entry point is a 🗓️ button next
   to the mute button; a live countdown bar replaces it during a run.
   Verified in-browser: starting a challenge zeroes gold/floor
   immediately, and exiting restores the pre-challenge gold exactly.

7. **Companion quests — "Hero Trials."** One-time flavor objectives per
   hero using stats already tracked (`bossKills`, `potionsBought`, etc.),
   rewarding a cosmetic title rather than a flat multiplier.

   **Review verdict: Approve with revisions.** Reuses the existing
   achievements-array pattern almost exactly. Cosmetic-only rewards, no
   exceptions (not even "small" QoL bonuses) to avoid soft-mandatory
   grind pressure. Some example trials ("without an active potion") need
   new run-scoped negative-condition tracking that doesn't exist today —
   most trials can use existing lifetime stats directly. Pairs with item
   9 as a "player achievements / unit achievements" set.

   ✅ **SHIPPED (2026-07-12).** Added `heroTrials` to `js/heroes.js` — one
   entry per hero (8 total), each with a cosmetic `title` (e.g. Vex →
   "Untouchable"), reusing the achievements-array `name/desc/unlocked/check`
   shape. Rewards are cosmetic-only, no exceptions: unlocking a trial
   only sets `.unlocked = true` (surfaced as a badge/title on the hero's
   own card, plus a one-time toast) — no gold, no stat bonus anywhere in
   the check/unlock path. 7 of 8 trials read purely from existing
   lifetime stats (`currentFloor`, `bossKills`, `totalGoldEarned`,
   `prestigeCount`, unit counts) so they stay valid across Ascend
   resets. Vex's trial ("defeat 5 bosses without an active potion") is
   the one exception needing new tracking — added a minimal
   `state.bossKillsWithoutPotion` lifetime counter, incremented in
   `combat.js`'s boss-kill branch only when `state.activeBuffs.length === 0`.
   Displayed on the Heroes tab, on each hero's own card (not buried in
   the Achievements tab), so the trial stays tied to that hero's
   personality. `checkHeroTrials()` is called from `checkAchievements()`
   (already invoked ubiquitously throughout the codebase) so trial
   progress is checked on the same cadence as everything else. Persisted
   via `heroTrials`/`bossKillsWithoutPotion` in `save.js`.

8. **Offline-progress duration upgrades.** ✅ **SHIPPED (2026-07-12).**
   Finite shard-shop tier ladder for the offline-earnings cap, plus a
   one-time "Offline Mastery" capstone (cap boost + % gain bonus).
   Explicitly no true-uncapped tier — an unbounded cap would let a long
   absence collapse the floor-by-floor progression curve into a single
   lump-sum payout.

   Implemented: `js/prestige.js` — `offlineCap` tier (+12h/level, 4
   levels, 8h→56h) and `offlineMastery` capstone (+24h flat, +25% offline
   gains, one-time). `js/save.js`'s offline-earnings calc now reads
   `getOfflineCapSeconds()`/`getOfflineGainMult()` instead of the old
   hard-coded `8 * 3600` literal. Offline boss kills / offline equipment
   drops explicitly cut from scope (not deferred) — a structurally
   different feature (would require simulating floor advancement/loot
   rolls while offline) that doesn't belong in this ticket.

9. **Mastery milestones with visible payoff.** ✅ **SHIPPED (2026-07-12).**
   Named tiers (5/10/25/50) with a visible unit upgrade (border glow/frame),
   so "Master Trainer" (mastery 10) isn't the only checkpoint in an
   otherwise flat, invisible grind.

   **Review verdict: Approve.** Cleanest architecture fit in the whole
   batch — milestone tier is fully derived from the existing `mastery`
   integer, zero new save state. Cosmetic-only, no exceptions (same
   policy as item 7) to keep Mastery's existing %dmg curve as the only
   power lever. One-time crossing flourish, settling into a persistent
   but subdued badge (protects UI clarity when multiple units are
   maxed). Threshold spacing needs verifying against the actual
   `MASTERY_COST_SCALE` exponential curve before locking numbers.

   Implemented: `js/units.js` — `MASTERY_MILESTONES` (Bronze 5 / Silver 10
   / Gold 25 / Aura 50) and `getMasteryMilestone()` derive tier purely from
   `unit.mastery`, no new save state. `buyMastery()` fires a one-time
   `showToast()` on crossing a threshold; `renderUnits()` applies a
   persistent `mastery-<tier>` class to the `.mastery-row` for a subdued
   border/badge. Verified the ×1.4 `MASTERY_COST_SCALE` curve makes 25/50
   a steep late-game flex (same exponential shape as existing kill-count
   achievement thresholds) — kept the proposed numbers as-is, no
   adjustment needed.

10. **Boss trophy room tab.** Gallery logging first-kill floor/time and
    stats per boss type, reusing the same completionist pull as the
    achievement system.

    **Review verdict: Approve with revisions — gated on item 1.** The
    mechanism is cheap, but there's currently no such thing as a
    distinct "boss identity" to collect — bosses today are just the same
    10 monster types with a stat multiplier. Without item 1 shipping
    first, this is a 10-entry gallery fully complete by floor 5. "Fastest
    kill" / "highest damage hit" stats need genuinely new instrumentation
    (no timer or per-hit max tracking exists today) — scope those as a
    later phase, not launch scope, so the tab doesn't ship with blank
    stat fields.

    ✅ **SHIPPED (2026-07-12).** New "👑 Trophy Room" tab, same tab-bar
    pattern as Achievements/Heroes/Gear (added to `TAB_ORDER` in
    `js/ui.js`). Per-monster-type record — `defeated` (bool),
    `firstFloor`, `kills` (total defeats as boss) — tracked in
    `state.bossTrophies` (keyed by base monster index 0-9) and recorded
    directly at the existing boss-kill site in `combat.js`'s
    `dealDamage` kill branch via `state.recordBossTrophy()`. Since item
    1a shipped first, the gallery (`js/monsters.js`'s `getTrophyGallery()`)
    reuses its `TIER_PREFIXES` structure directly rather than building a
    separate identity list — 80 gallery entries (10 base monsters × 8
    tiers) with locked/unlocked card grid UI mirroring the Achievements
    tab's visual pattern (`js/trophies.js`). Explicitly did NOT build
    fastest-kill-time or highest-damage-hit tracking, per the review's
    scope cut — only defeated/first-floor/kill-count are shown, no blank
    stat fields. New Playwright smoke test confirms 80 gallery cards
    render and the counter starts at 0/10.

---

## Post-launch batch (2026-07-23)

Sourced from first community feedback (first Patreon supporter,
Henvacelos). Not yet reviewed/prioritized against each other — logged
as raw backlog items pending design pass.

11. **Export/import save.** Progress currently lives only in
    localStorage (`save.js`), so clearing browser data or switching
    devices/browsers silently wipes a run. Reported as a player-trust
    concern, not a crash bug: "being tied to browser data seems
    dangerous."

    ✅ **SHIPPED (2026-07-25), v1.6.0.** Built as scoped: no backend,
    stays entirely local. `js/save.js`'s `exportSaveString()` dumps the
    full localStorage key set (whatever `saveGame()` already writes,
    read generically rather than hand-listed a second time, so it can't
    silently drift out of sync as new save keys get added by future
    features) into JSON, then base64-encodes it into one copyable code.
    `importSaveString()` validates the payload (rejects malformed
    base64/JSON, rejects anything missing a `gold` key as "not a
    Dungeon Clicker 9000 save") before ever touching real
    `localStorage`, and never partially applies a corrupt code — on any
    failure the original save is left untouched. New Export/Import
    modals in the Achievements tab (`index.html`), reusing the existing
    `.modal`/`.modal-overlay` styling. Full cloud save (cross-device
    sync via an account + backend) was explicitly declined for now —
    see ROADMAP.md's note dated 2026-07-24 — since this local-only
    approach solves the actual reported concern ("tied to browser data
    seems dangerous") without that infrastructure cost. Verified
    in-browser: exported at floor 110, reset to floor 1, imported the
    code back, floor 110 and all other progress correctly restored.

12. **Item variety expansion.** Currently only 10 gear items total (3
    weapon, 4 armor, 3 ring — see `equipment.js`), across 3 rarities.
    Reported directly: "the variety of items could increase." Auto-
    equip/auto-salvage logic already handles picking the best item
    per slot correctly (verified, not a bug) — this is a content-volume
    gap, not a logic gap.

    ✅ **SHIPPED (2026-07-24), v1.5.0.** Scoped deliberately small: no
    new slots/rarities (that larger redesign — 6 slots, 5 rarities, 100
    items, partial-set tiering — is fully designed but explicitly
    deferred; see [ROADMAP.md](ROADMAP.md) → "Planned — future major
    patch" → [ITEMIZATION_REDESIGN.md](ITEMIZATION_REDESIGN.md)). Added
    9 items to `js/equipment.js` (10 → 19 total), 3 per existing slot
    (one common/rare/legendary each): Quickblade/Headsman's Axe/
    Chronoblade (weapon), Recruit's Tunic/Warlord's Plate/Aegis of Ages
    (armor, introducing a new `unitDiscount`-flavored line), Hunter's
    Signet/Band of Tempo/Ring of Ruin (ring). Each new item deliberately
    uses a stat *shape* not already covered at that slot+rarity (e.g.
    pure `attackSpeedMult`, pure `critChance`/`critMult`) rather than
    just a bigger number on an existing shape, so the existing
    `hasDifferentStatShape()` auto-salvage guard actually surfaces them
    as real choices instead of silently treating them as sidegrades.
    Added a 4th equipment set, "Swiftblade Zeal" (Headsman's Axe +
    Warlord's Plate + Band of Tempo → +10% attack speed, +5% crit
    chance), giving the new attack-speed/crit items a set identity
    alongside the existing 3. No new mechanics, no save-format changes.

13. **Player HP regen / max-HP source, delivery method undecided.**
    Reported by Henvacelos (2026-07-25): "you could add hp regen or as
    ascension bonus or challenges completed, and/or HP potion, not
    sure, something like it." Not a bug report — a build-variety wish
    for Boss Combat v1 (`js/bossCombat.js`), where `PLAYER_MAX_HP` is
    currently a hard-coded constant (4, see `state.js:74`) that fully
    refills at the start of every boss fight and is otherwise untouched
    except by the Path of the Reaper's life-steal tier (`combat.js:182`,
    prestige-gated, weapon-path-specific). There is currently no
    lifetime/permanent way to raise the pool or heal mid-fight outside
    that one weapon path.

    **Needs a design pass before implementation** — three candidate
    delivery mechanisms were suggested, not mutually exclusive, and
    picking the wrong one risks colliding with the "small, non-run-
    ending penalty" design intent Boss Combat v1 was built around (see
    BACKLOG.md #2's review verdict: "mild (not run-ending) penalty on
    missed dodge... capped by the small HP pool"). Raising the pool too
    much would blunt that design; a bounded per-run consumable is safer
    than a permanent stat increase.

    - **Ascension bonus** (a `shardShop` tier, same pattern as
      `offlineCap`/`offlineMastery` in `prestige.js`): a permanent
      `+1 PLAYER_MAX_HP` per level, finite/capped like every other
      shard-shop tier — straightforward to slot in, but permanently
      trivializes the existing miss-penalty design the more it's
      leveled, so needs a low cap (e.g. 2-3 levels) if pursued.
    - **Challenge-completion reward** — would need to violate the Daily
      Challenge Run's existing, deliberate "no permanent-currency
      rewards, score/bragging-rights only" rule (BACKLOG.md #6:
      "to avoid daily-play FOMO pressure"). Not a clean fit without
      either relaxing that rule (needs an explicit decision, not a
      side effect of this item) or making the reward one-time/cosmetic
      instead of a stat.
    - **HP potion** — cleanest fit architecturally: `js/potions.js`
      already has a timed-buff pattern (`potionDefs`, `activeBuffs`)
      that Boss Combat v1 already reads from indirectly. A new potion
      effect key (e.g. `playerMaxHPBonus` or an instant-heal-on-use
      rather than a duration buff) would need one new case in
      `getTotalMult()`'s consumers and `bonusLabel()`, following the
      exact same shape as the existing 5 potions — smallest, most
      self-contained option of the three, no cross-system rule
      conflicts.

    **Recommendation for the eventual design pass:** HP potion is the
    most self-contained starting point (no conflict with an existing
    design rule, unlike the challenge-reward option) and could be
    layered later with a small, capped ascension-bonus tier if more
    permanent progression is wanted. Not scoped further here — pending
    a proper design pass before any implementation, per CLAUDE.md rule 1.

    **Follow-up from the same player (2026-07-25):** "could increase
    the hp to implement what i said and scale with the level,
    difficulty, like a balance system. A mage at floor 100 with 4 of
    HP seems strange." This sharpens the ask — it's not just "add *a*
    source of more HP," it's that `PLAYER_MAX_HP` itself (`state.js:74`)
    is a flat constant that never scales with floor/tier/prestige at
    all. Confirmed in `bossCombat.js`: a floor-5 and a floor-100 player
    face the exact same 4-HP pool and the same 3-miss wipe threshold —
    only the *gold* penalty scales (it's a % of current gold, not
    flat), HP does not. This is a legitimate balance gap distinct from
    (but related to) the delivery-mechanism question above.

    Two sub-questions for the eventual design pass, not resolved here:
    - **Should the base pool scale automatically** (e.g. +1 max HP
      every N floors or every tier, mirroring how monster stats already
      scale via `getMonsterIdentity()`'s tier/scale math in
      `monsters.js`) **or only through an earned upgrade** (shard-shop
      tier from above)? Auto-scaling changes the felt difficulty curve
      of Boss Combat v1 itself — a deliberate rebalance, not just a
      new item/currency sink — so needs to go through the same design-
      review treatment BACKLOG.md #2 originally got, not be folded in
      as a side effect of adding a potion.
    - Whichever path is chosen, needs a numbers pass against the
      existing miss-penalty design intent ("mild, not run-ending") so
      a bigger HP pool doesn't just mean "more misses before the exact
      same outcome" without adding real depth.

    ---

    **Design pass (2026-07-25). Review verdict: Approve with revisions.**

    Resolving the two sub-questions above with concrete numbers, and
    settling the delivery-mechanism question from the top of this item.

    **1. Base pool: scale it, but off tier (existing 10-floor bands),
    not raw floor number.** `getMonsterIdentity()`'s `tier` value
    (`Math.floor((floor-1)/10)`, `monsters.js`) is already the game's
    established "how far in are you" unit — monster stats, trophy
    tiers, and icon recoloring all key off it. Reusing it here means no
    new progression axis, just one more thing reading the same tier
    number. Proposed curve: **`PLAYER_MAX_HP = 4 + tier`** (uncapped —
    tier is already unbounded past 71+, same as monster scaling). Floor
    5 (tier 0) stays exactly 4 HP (today's live-tested value, unchanged
    for early game); floor 100 (tier 9) becomes 13 HP — meaningfully
    less "strange" per the player's own framing, without inventing new
    balance language.

    Why linear-per-tier and not steeper: the miss penalty is already a
    *percentage* of current gold (`MISS_GOLD_PENALTY = 0.05`,
    `bossCombat.js`), which auto-scales with progression on its own —
    only the HP side was flat. A modest, linear HP increase restores
    parity between the two penalty types without also making Boss
    Combat trivially safe at depth (still capped by *some* pool, "mild,
    not run-ending" intent preserved — just no longer flatly the same
    3-miss threshold at floor 5 and floor 200).

    Implementation shape (not yet built): `PLAYER_MAX_HP` in `state.js`
    stops being an exported constant and becomes a function of current
    tier, computed the same place `getMonsterIdentity()` is already
    called from (`loadMonster()` in `monsters.js`) — `bossCombat.js`'s
    `startBossFight()` reads the current value at fight-start (matches
    existing "fully refills every boss fight" behavior, no new
    persistent meta-layer, no save-state change).

    **2. Delivery mechanism for *extra* HP on top of the scaled base:
    HP potion, as originally recommended — confirmed, not revised.**
    Still the cleanest fit (`potions.js`'s existing timed-buff pattern,
    no conflict with the Daily Challenge's "no permanent rewards" rule
    unlike the challenge-reward option). Scope: an instant-heal-on-use
    potion (not a duration buff like the other 5 — a genuinely
    different effect shape, consistent with how new equipment items
    were required to have distinct stat *shapes* in BACKLOG.md #12),
    healing a flat amount (e.g. +2 HP, capped at the tier-scaled max)
    on drink, consumed immediately rather than added to `activeBuffs`.

    **3. Ascension bonus tier: deferred, not rejected.** With the base
    pool now scaling automatically, a permanent shard-shop HP tier is
    lower-priority — the original "seems strange to have 4 HP at floor
    100" complaint is substantially addressed by #1 alone. Revisit only
    if playtesting after #1+#2 ship shows depth is still too punishing;
    don't build all three at once.

    ✅ **SHIPPED (2026-07-25).** `state.js`'s `PLAYER_MAX_HP` constant
    replaced with `getPlayerMaxHP()` — `4 + tier` (`PLAYER_BASE_HP = 4`,
    tier computed the same way `getMonsterIdentity()` does). All 3 call
    sites updated (`bossCombat.js`'s `renderPlayerHP()`/`startBossFight()`,
    `combat.js`'s life-steal check) — `setPlayerHP()`'s existing clamp
    now clamps against the live tier-scaled max instead of a constant.
    Added "Healing Tonic" to `js/potions.js`'s `potionDefs` — a new
    `instantHeal:2` effect key, special-cased in `buyPotion()` to heal
    immediately (capped at current max HP) and never touch
    `activeBuffs`, distinct from every other potion's timed-duration
    shape. `bonusLabel()` (`utils.js`) gained an `instantHeal` case
    ("+2 HP (instant)") instead of falling through to the generic
    percentage-based default. `renderPotionShop()`'s duration suffix
    is now conditional (`def.duration > 0`) so the 0-duration Healing
    Tonic doesn't render a nonsensical "— 0s". No save-format changes —
    max HP is derived from `currentFloor` (already saved), not stored
    separately. Ascension-bonus tier (option 3) intentionally not
    built — deferred per the design pass above.

14. **Cache-busting for JS module imports.** Not a feature — a
    reliability fix. Stale browser/CDN caching of individual `js/*.js`
    files (each `import "./x.js"` is cached independently by the
    browser, separate from the entry `<script>` tag) caused real
    confusion at least 3 times: twice with Henvacelos (the "flame/feral
    icon merge" report and the itch.io download-vs-play-in-browser
    confusion) and once in-session verifying BACKLOG.md #13 (HP bar
    showing "NaN/undefined", Healing Tonic not appearing — both
    resolved by a hard refresh, not a code fix). A version bump alone
    never forced a re-fetch of every module, only whichever the
    browser happened to already consider stale.

    ✅ **SHIPPED (2026-07-25).** New `scripts/stamp-versions.js` —
    reads `package.json`'s version and appends `?v=<version>` to every
    relative `from "./x.js"` import across `js/*.js`, plus the entry
    `<script type="module" src="js/main.js">` tag. Runs only as a
    build step against a **copy** of the repo during deploy
    (`.github/workflows/deploy.yml`'s GitHub Pages job now builds into
    a new `pages-build/` folder instead of uploading the raw checkout
    directly; the itch.io job's existing `itch-build/` folder gets the
    same treatment) — local source files in `js/`/`index.html` are
    never touched, so local dev (`npm run serve`) keeps clean,
    unversioned import paths. Verified: stamped output passes
    `node --check` on every file, loads with zero console errors under
    Playwright, and the local test suite (unaffected, since it runs
    against unstamped source) still passes 19/19.

15. **Salvage value never rebalanced against the gold curve.** Flat
    `salvageValue` (100/500/2500g per rarity) was worth roughly 1/3 of
    a single floor-20 boss kill, and became literally negligible by
    floor 100+ (a single kill nets 800k+ gold at that depth) — "salvage"
    had quietly become "discard with an irrelevant number attached,"
    since the values were set once and never rebalanced against the
    exponential gold curve monster rewards already scale by.

    ✅ **SHIPPED (2026-07-25).** Added `getSalvageValue(item)` in
    `js/equipment.js` — scales `item.salvageValue` by the same `1.8×`
    per-tier curve monster gold rewards already use
    (`monsters.js`/`stats.js`), so a legendary salvaged at floor 100 is
    worth a meaningful fraction of what you're actually earning there,
    not a fixed number set for floor-1-20 balance. All 4 salvage call
    sites (`rollLoot`'s duplicate-auto-salvage, `discardPendingLoot`,
    the Bag list's salvage button, `salvageFromInventory`) now read
    through this function instead of the raw flat value.

16. **"BAG"/"EQUIPPED" compare tags cramped inside the item card.**
    Reported during testing (2026-07-25): the compare-panel tag text
    ("BAG" / "EQUIPPED") sat squeezed against the item name inside a
    narrow fixed-width column, especially cramped once "NOW" was
    relabeled to the longer "EQUIPPED" per player feedback.

    ✅ **SHIPPED (2026-07-25).** Reworked `.loot-compare-row` in
    `index.html`: the tag now renders as a small pill positioned over
    the top-left corner of the item card (`position: absolute`) rather
    than sharing horizontal space with the name/bonus text in a
    cramped fixed-width flex column. Applies identically to both the
    loot pop-up's compare section and the Bag tab's inline compare
    panel, since both reuse the same `compareRowsHtml()` markup
    (`equipment.js`).

17. **Stale `weaponBonus` never reset on Ascend — real, confirmed
    bug.** Reported by a player (2026-07-25): gaining 1 HP back after
    attacking during a Lich King fight, reproduced consistently even
    while continuously clicking (ruling out the idle-detection theory
    from #13/#14's session), with no potions active, no life-steal
    gear, no unspent-shard purchases (72 shards sitting unspent).

    Root cause: `state.js`'s `weaponBonus` object (accumulates
    `critChance`/`critMult`/`dpsMult`/`executeBonus`/`lifeSteal` from
    Duelist/Channeler/Reaper weapon-path tier purchases) carries an
    inline comment claiming it "resets on ascend" — but `doAscend()`
    in `prestige.js` only ever reset `weaponsBought` and
    `selectedWeaponPath`, never the separate `weaponBonus` object
    itself. Any stat accumulated from a weapon path on a past run
    (e.g. Reaper's life-steal) silently persisted forever across every
    future Ascend, independent of which path was picked afterward or
    what gear was equipped — exactly matching the report (Brute path,
    no gear life-steal, no shard purchases, yet life-steal still
    procced from a stale earlier-run value).

    ✅ **SHIPPED (2026-07-25).** `doAscend()` now explicitly calls
    `state.setWeaponBonus({ critChance: 0, critMult: 0, dpsMult: 0,
    executeBonus: 0, lifeSteal: 0 })` alongside the existing
    `weaponsBought`/`selectedWeaponPath` resets. Fixes the leak for all
    future Ascends; a run already carrying a stale value needs one
    more real Ascend to clear (confirmed acceptable — verifying via a
    real Ascend rather than a manual state edit, since the player was
    already past floor 20).

    **Verified (2026-07-25):** player Ascended for real, re-picked
    Brute path, resumed boss fights — confirmed no more HP regen on
    attack. Root cause and fix both confirmed correct.

    Also fixed in the same session, unrelated root cause but same
    testing pass — `bossCombat.js`'s idle-detection check
    (`recentlyActive()`) was keyed on click recency (last click within
    8s) rather than tab focus/visibility, which could independently
    cause real misses to silently no-op during normal slower-paced
    play. Not the cause of this particular report (ruled out once the
    player confirmed continuous clicking still reproduced it), but a
    real second issue worth having fixed regardless — see the
    `recentlyActive()` rewrite in `bossCombat.js` (now checks
    `!document.hidden && document.hasFocus()`), with the now-unused
    `markPlayerAction`/`lastPlayerActionTime` tracking removed from
    `state.js`/`combat.js`/`main.js`.

18. **Loot pop-up blocks all future drops while it's open — no auto-
    discard/timeout.** Reported by a player (2026-07-25): if a loot
    pop-up is left open on screen, idle/passive DPS and potion-boosted
    auto-clicks keep killing bosses in the background, but **no new
    loot roll happens at all** until the open pop-up is resolved
    (Equip/Bag/Discard) — confirmed in code, not a misunderstanding:
    `combat.js`'s boss-kill branch gates the entire roll behind
    `if (state.pendingLoot === null)`. A player who walks away with the
    pop-up open (or just doesn't notice it) is silently missing loot
    from every boss kill in the meantime, with no feedback that
    anything was skipped.

    Real tradeoff to design around, not a one-line fix: this exact
    gate is what BACKLOG.md #12/#13's earlier "always silently bag it,
    no pop-up" version avoided entirely, but that version got reverted
    because the player specifically wanted the pop-up back with a
    genuine 3-way Equip/Bag/Discard choice (see this file's Bag/
    Inventory system entries above). Bringing the choice back
    necessarily reintroduces *some* form of "what happens to the next
    drop while a choice is pending" question — the player's own
    suggestion (a timer that auto-resolves the pop-up after N seconds)
    is one reasonable answer, not the only one.

    Needs a design pass before implementation. Candidate directions,
    not decided here:
    - **Auto-timeout on the pop-up** (player's suggestion): after N
      seconds unattended, auto-resolve to a default action (most likely
      "Place in Bag," since that's the safest/least-destructive default
      — never auto-discard on a timer, that risks silently salvaging
      something valuable the player would have kept). Needs a visible
      countdown so it doesn't feel like a surprise.
    - **Queue additional drops instead of blocking them.** Let
      `rollLoot()` keep rolling even while a pop-up is open, queueing
      results, and show them one at a time as each is resolved (or bulk
      -offer them together). More faithful to "nothing should be
      missed," but a queue-of-modals UX needs its own care (could turn
      into pop-up spam during a fast idle-clear).
    - **Only gate the modal, not the roll** — silently auto-bag
      (today's pre-revert behavior) any drop that occurs *while a pop-
      up is already open*, and only show the pop-up for the "next"
      drop once the current one resolves. Simplest change (one
      condition tweak), and arguably the least surprising: the item
      isn't lost, it just doesn't interrupt with its own pop-up on top
      of an existing one.

    No implementation yet — flagged for the next backlog session.

---

## Feedback batch (2026-07-25) — external playtester report

Sourced from a written feedback/design-suggestion report (not
Henvacelos — a different player/tester). Cross-checked against the
current codebase and prior BACKLOG entries below before logging, per
the "analyze new feedback" workflow — some items are genuinely new,
one overlaps a fix already shipped this session, one may be a
misunderstanding of an existing deterministic mechanic rather than a
bug.

19. **Gold-loss half of the miss penalty never got the same
    progression-aware treatment as the HP half.** Report: "losing
    accumulated resources when taking a hit becomes overly punitive in
    advanced stages... undoing time and effort spent farming."

    **Partially already addressed, partially new.** BACKLOG.md #13
    already fixed the *HP* side of this exact complaint (max HP now
    scales with tier instead of a flat 4). What's NOT yet addressed:
    `bossCombat.js`'s `MISS_GOLD_PENALTY = 0.05` (5% of *current* gold)
    is percentage-based, which sounds progression-safe but isn't
    fully — it doesn't distinguish "gold you're about to spend anyway"
    from "gold you've been hoarding to afford a big purchase," so a
    miss at the exact moment you've stockpiled toward an expensive
    unit/upgrade can feel disproportionately painful even though the
    percentage itself hasn't changed. The player's suggested fix
    ("replace resource loss with HP+regen") is really asking to drop
    the gold-loss half entirely, not just rebalance it — a bigger
    design call than #13 made (which kept both penalties, just scaled
    HP).

    **Needs a design pass, not decided here:**
    - Keep both penalties as-is (current state) — the % scaling was a
      deliberate choice (see BACKLOG.md #2's original review verdict:
      "mild, not run-ending"), and HP is now progression-aware too.
    - Drop the gold penalty entirely, keep only the (now-scaling) HP
      loss — matches the player's actual ask, simplest change, but
      removes an existing risk/reward lever without a replacement.
    - Add HP regen (over time, or on kill) as the player suggested,
      **on top of** keeping both penalties as a mitigation rather than
      a replacement — closer to "smooths the punishment" than "removes
      it."
    Not implemented — flagged for the next design pass.

20. **Dodge mechanic reported as inconsistent — likely a
    discoverability gap, not a broken mechanic.** Report: "no clear
    criteria... regardless of how fast the player clicks or how quick
    their reflexes are, they still take unavoidable damage."

    **Investigated, likely NOT a bug.** `bossCombat.js`'s dodge is
    fully deterministic, zero RNG: press Dodge (button or `D` key)
    while `bossAttackState === "windup"` (a 1.4s telegraph window,
    shrinking to as low as ~1.08s at max Void Risk via
    `getVoidRiskBossAttackSpeedMult()`) → always succeeds, no roll, no
    hitbox, no click-speed dependency at all. The player's framing
    ("fast clicking," "reflexes," "i-frames," "hitbox precision") reads
    like they may be modeling this as an action-game reflex/twitch
    mechanic, when it's actually a simple "press this specific button
    within a visible window" mechanic — a different mental model
    entirely. Possible real gap underneath the misunderstanding: is the
    telegraph (⚠️ pulsing icon per `js/main.js`'s existing UI) visually
    obvious enough, and is there anywhere in-game that explains "dodge
    is a deliberate button press, not a reflex/speed check"? Worth a
    small clarity pass (e.g. a one-time tooltip/tutorial toast the
    first time a boss fight starts) rather than touching the mechanic
    itself, which already works as designed. Not implemented — needs
    confirmation this is really a UX-clarity issue before spending
    effort on it.

21. **Difficulty curve has no ceiling or new content past floor
    200 — confirmed real, genuinely new.** Report: "very sharp spike
    in difficulty after floor 200... prevents smooth progression."

    Confirmed mathematically: `monsters.js`'s `getMonsterIdentity()`
    scales both monster stats AND (since BACKLOG.md #13) player max HP
    by `1.8^tier`, completely uncapped — floor 200 is tier 19, i.e.
    `1.8^19` ≈ 156,000× base stats, with no new mechanic, unit, or
    upgrade tier introduced past whatever currently exists to keep
    pace. Nothing in ROADMAP.md or BACKLOG.md currently addresses this
    — genuinely new, not covered by any parked design doc.

    Candidate directions, not decided or scoped here:
    - Flatten the exponential curve at some point (e.g. switch from
      pure `1.8^tier` to a slower-growing function past a threshold
      tier) — purely a numbers change, no new content, but a real
      rebalance of every existing tier past that point.
    - Introduce new unit/weapon/upgrade tiers gated deep enough to
      keep pace with the curve instead of flattening it (keeps the
      "number goes up forever" idle-game feel, but is ongoing content
      work, not a one-time fix).
    - Some combination: flatten growth *and* add periodic new power
      tiers, so progression stays smooth without the curve needing to
      do all the work forever.
    Needs a real design pass (numbers modeling against the existing
    curve) before any of these get scoped further.

22. **Soul Shards / Void Fragments have no sink once fully
    upgraded — confirmed real, genuinely new.** Report: "lack of
    utility or progression paths to spend high-tier resources."

    Confirmed: every `shardShop` tier (`prestige.js`) and every
    `voidShop` tier (`voidFragments.js`) is finite (`max: 1` to `10`
    depending on tier) — once maxed, both currencies have literally
    nothing left to spend on. This is a real, structural gap distinct
    from BACKLOG.md #5's original Void Fragments design (which was
    scoped as "Run Rules," a deliberately small, capped first pass —
    see that entry's review verdict), not a regression.

    Candidate directions per the report's own suggestions (permanent
    upgrades, cosmetics, map modifiers, exclusive content), not scoped
    or decided here — needs its own design pass, likely sizeable enough
    to warrant a doc similar to ITEMIZATION_REDESIGN.md rather than a
    single BACKLOG entry, given "map modifiers"/"exclusive content"
    implies new systems, not just new shop rows.

23. **Procedural "Abyss Mode" / online multiplayer — long-term,
    out of scope for now.** Report frames this explicitly as
    "after polishing the core game" / "long-term vision," not an
    immediate ask.

    Two very different asks bundled together:
    - **Procedural/infinite endgame mode** — conceptually adjacent to
      the existing Daily Challenge Run (`js/challenge.js`,
      `js/prng.js`'s seeded PRNG already exists) and to BACKLOG.md
      #21's difficulty-curve problem above (an "Abyss" mode is one
      possible answer to "what's the endgame loop," alongside just
      fixing the curve). Feasible within this project's existing
      architecture (no backend needed) — a real future roadmap
      candidate, not scoped further here.
    - **Online multiplayer** — a fundamentally different scale of
      work, same category of decision as cloud save (ROADMAP.md:
      "explicitly declined for now... would need a backend/auth
      system"). Not a small feature; would need real infrastructure
      this project doesn't have and previously chose not to build.
    Not implemented, not scoped — logged as a long-term idea per the
    report's own framing, not a near-term backlog item. Revisit only
    once nearer-term items (bug fixes, the #21/#22 endgame gaps) are
    further along.
