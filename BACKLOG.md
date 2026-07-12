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
