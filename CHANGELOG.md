# Changelog

All notable changes to Dungeon Clicker 9000 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).
Version numbers follow [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH

## How to version your commits

Use these prefixes in your commit messages:

- `fix:` → bug fix → bumps PATCH  (1.0.0 → 1.0.1)
- `feat:` → new feature → bumps MINOR  (1.0.0 → 1.1.0)
- `BREAKING CHANGE:` → major rework → bumps MAJOR  (1.0.0 → 2.0.0)
- `chore:` → maintenance, refactoring, no gameplay change
- `docs:` → README or documentation only

When you bump the version, update the number in package.json and add an entry below.

---

## [1.4.0] — 2026-07-13

Content batch of 10 features, each carried through a full design-review
pass before implementation (see git history for the pre-1.7.0 BACKLOG.md
if the original review verdicts/rationale are ever needed — condensed
out of this changelog since the code itself is now the source of truth).
Agreed build order: 8 → 9 → 1a → 2 → 3 → 4 → 7 → 10 → 6 → 5.

### Changed
- Migrated the single-file `index.html` inline script (~1,720 lines, 84 functions, 55 shared globals) into ES modules under `js/` — no build step, no bundler. CSS stays inline in `index.html`. Prerequisite for the feature batch below; also fixes the itch.io deploy workflow, which previously only copied `index.html` and would have silently shipped a JS-less build once the split landed.
- Added a Playwright smoke-test suite (`tests/smoke.spec.js`) as the regression harness for the module migration and the features below.
- Tier icon visuals reworked per QA feedback: tier now recolors the base creature's own icon in place (CSS filter + a tier-colored ring) instead of appending a second decorator emoji beside it — `js/monsters.js`, `js/trophies.js`, `index.html`.

### Added
- **Tiered monster visual identity** (item 1a). `monsters[(currentFloor-1) % monsters.length]` meant every tier past floor 10 reused the same 10 names/icons with only a stat multiplier — floor 55's "Slime" was mechanically identical to floor 5's. Fixed with `js/monsters.js`'s `TIER_PREFIXES` (8 entries: floors 1-10 unprefixed, then Feral/Acid/Shadow/Frozen/Infernal/Voidtouched/Ascendant every 10 floors, tier 7+ collapses into "Ascendant") plus one shared `getMonsterIdentity(floor)` accessor, consolidating 3 previously-duplicated floor→monster lookups (`loadMonster`, the kill branch in `combat.js`'s `dealDamage`, `goldPerSecond` in `stats.js`) into one. No save-state change — name/icon are derived from floor, not stored. Scoped to visuals only; a follow-up "bounded passive mechanics" pass (crit/gold/miss-chance modifiers per tier) was considered and explicitly deferred.
- **Boss Combat v1: player HP & dodge** (item 2) — the architectural linchpin of the batch, the first system needing a real-time tick loop independent of clicks. New isolated module `js/bossCombat.js`, fully decoupled from `goldPerSecond()`/offline math. `state.js` adds `PLAYER_MAX_HP` (4, refills every boss fight), `playerHP`, `bossAttackState`, `lastPlayerActionTime`. Flow: a 5s attack-interval timer schedules a 1.4s windup telegraph; pressing Dodge (button or `D` key) during the windup fully negates the attack; missing costs 1 HP + 5% of current gold. Exclusive to boss floors via the existing `isBoss` gate. Idle-safety: an away/idle player (no recent action within 8s at the time) auto-resolves as dodged, so this system never touches offline/idle progression.
- **Equipment set bonuses** (item 3). 3 sets in `js/equipment.js`: Voidreaver's Fury (weapon/armor/ring legendary crit set, +8% crit chance/+2× crit dmg), Hoarder's Fortune (rare gold set, +25% gold), and Warden's Resolve (common Survival Set, -50% gold penalty from missed boss dodges, gated on Boss Combat v1 shipping first). `getActiveSetBonus(key)` feeds into `stats.js`'s `getTotalMult()`. Also fixed a pre-existing bug: `rollLoot()`'s auto-salvage check now calls `wouldHelpCompleteSet(dropped)` so a set-completing item is never silently discarded for having a lower raw stat score than what's equipped.
- **Path of the Reaper** (item 4), a 4th weapon path in `js/weapons.js`'s `weaponPaths` (8 tiers, 60g→500,000g), gated on `minPrestige: 1` (unlocked after the player's first Ascend). Two new multiplier keys: `executeBonus` (bonus damage when monster HP < 20%, sums to +235% at max tier) and `lifeSteal` (chance per hit to heal 1 player HP during boss fights, sums to 17% at max tier, capped at `PLAYER_MAX_HP`).
- **Hero Trials** (item 7) — one cosmetic-reward objective per hero (8 total) in `js/heroes.js`, reusing the achievements-array `name/desc/unlocked/check` shape. Rewards are cosmetic-only (title/badge, no gold or stat bonus), shown on each hero's own card in the Heroes tab. 7 of 8 read purely from existing lifetime stats; Vex's ("defeat 5 bosses without an active potion") needed one new lifetime counter, `state.bossKillsWithoutPotion`.
- **Boss Trophy Room** (item 10) — new "👑 Trophy Room" tab. Per-monster-type record (`defeated`, `firstFloor`, `kills`) tracked in `state.bossTrophies`, recorded at the boss-kill site in `combat.js`. Gallery (`js/trophies.js`) reuses the `TIER_PREFIXES` structure from item 1a — 80 entries (10 base monsters × 8 tiers). Deliberately did not build fastest-kill-time or highest-damage-hit tracking (no existing instrumentation for either).
- **Daily/weekly seeded Challenge Run** (item 6) — `js/prng.js`, a self-contained mulberry32 PRNG plus `dailySeed()` (UTC-calendar-day seed, so every player attempting "today's challenge" gets an identical run). Only outcome-affecting rolls are routed through the seeded RNG (crit chance, life-steal proc, loot rarity/item rolls); cosmetic jitter stays on raw `Math.random()`. `js/challenge.js` owns a fixed 10-minute countdown, snapshots + resets `state.*` to a standardized baseline on start, restores the real snapshot on end. Results (`lastScore`/`bestScore` = floor reached) persist in a separate `challengeState` key, never touching the main save. No permanent-currency rewards — bragging rights only, to avoid daily-play FOMO pressure.
- **Second prestige currency layer: Void Fragments** (item 5, deliberately shipped last as endgame content) — `js/voidFragments.js`, same architectural pattern as `shardShop`/`shardBalance` in `prestige.js`. Gated on `prestigeCount >= 5` (a veteran-run-count gate, not a raw floor number). UI/copy consistently frames this as "Run Rules" (never "prestige-of-prestige") — 3 start-of-run advantages (earlier starting floor, flat starting DPS, starting crit chance). The one novel mechanic: a capped (`VOID_RISK_MAX = 3`) difficulty/reward trade-off, reselectable per run — each level adds +15% gold and +15% Void Fragment yield in exchange for +10%/level faster boss windups.
- **Offline-progress duration upgrades** (item 8) — finite `offlineCap` shard-shop tier ladder (+12h/level, 4 levels, 8h→56h) plus a one-time "Offline Mastery" capstone (+24h flat, +25% offline gains) — `js/prestige.js`; offline-earnings calc in `js/save.js` now reads `getOfflineCapSeconds()`/`getOfflineGainMult()` instead of the old hard-coded 8-hour cap. Offline boss kills/equipment drops explicitly cut from scope, not deferred.
- **Mastery Milestones with visible payoff** (item 9) — cosmetic Bronze/Silver/Gold/Aura badges at mastery 5/10/25/50 on each unit's Mastery row, plus a one-time unlock toast — `js/units.js`. No new save state; tier is fully derived from the existing `mastery` integer.

---

## [1.9.1] — committed, not yet released

### Fixed
- **Multi-touch attack exploit/bug: holding the attack button with multiple fingers on a touchscreen permanently increased attack speed, surviving well past release.** Discovered during real-device Android testing (2026-07-28). Root cause: `startAttackHold()`/`stopAttackHold()` (`combat.js`) tracked the hold-repeat loop in single global timer variables — a touchscreen fires an independent `touchstart` per finger on the same element, so placing a 2nd/3rd/4th finger on the button while the 1st was already held each called `startAttackHold()` again, silently overwriting the previous timer ID without ever clearing it. Lifting fingers one at a time then only released whichever timer was *currently* referenced, leaving every earlier, orphaned interval loop running forever in the background with no way left to cancel it — reported as attack speed scaling up with more fingers used and persisting indefinitely (through looting, equipping gear, etc.), only "unsticking" via unrelated coincidental interactions. Fixed by counting active contacts (`activeHoldContacts` in `combat.js`): the hold-loop now only starts on the true first contact and only stops once every contact has released, so extra fingers on the same button are a no-op instead of spawning parallel un-cancellable loops. The existing window-level safety nets (`blur`/`visibilitychange`/`mouseup`, added in 1.7.0 for a related but distinct desktop bug) now call a new `forceStopAttackHold()` that resets the contact counter to zero unconditionally, rather than releasing one contact at a time — needed because those safety nets must fully clear the hold in one call even if multiple contacts were stuck down when focus was lost.

---

## [1.9.0] — committed, not yet released

Held back deliberately — ready to ship, but the next public release is
timed to follow the upcoming Google Play Store launch rather than go
out immediately. Update this header to a real date once actually
released/pushed live.

Progression-curve rebalance (BACKLOG.md #21/#25), driven by a full
mathematical modeling pass rather than a guessed coefficient tweak — see
the session's balance-model artifact for the full player-power-vs-
monster-scale analysis this is based on. Both items share one root
cause: player power grows via bounded additive percentages (units, gear,
achievements — all finite), while monster difficulty grew via an
uncapped geometric curve. Those two curve *shapes* diverge no matter
what the exponent's coefficient is — lowering 1.8 to, say, 1.6 was
explicitly modeled and rejected as a fix, since it only delays the same
wall rather than removing the structural mismatch (modeling put the old
formula's divergence point around floor 210–260).

### Changed
- **Monster HP/gold scaling now flattens past tier 14 (floor 150) instead of compounding `1.8^tier` forever.** `monsters.js`'s `getMonsterIdentity()` keeps the original, player-validated `1.8^tier` curve exactly as-is through tier 14 (floors 1–150) — deliberately untouched, since that range was already reported as feeling good — then switches to a much shallower `1.3^tier` continuation past that threshold. Still strictly increasing forever (never flat — the "number always goes up" idle-game feel is preserved), just no longer runaway: floor 200's scale drops from 70,824× to ~13,900× baseline, floor 500 from ~3.2 trillion× to ~36 million×. This also indirectly un-sticks BACKLOG.md #25 (Boss Trophy Room "stuck past floor 240") — the underlying `TIER_PREFIXES` naming table wasn't touched (still 8 entries), but the difficulty-wall complaint that made floor 71+ content scarcity actually painful is now addressed; extending the naming table itself remains a separate, lower-priority content task.
- **Soul Shard gold multiplier is now milestone-stepped (every 25 lifetime shards permanently doubles it) instead of linear.** The old formula, `1 + totalShardsEarned × 0.1`, was the only source of player power with no ceiling, yet it grew at the same flat, slow rate whether a player had 5 or 5,000 lifetime shards — nowhere near fast enough to be the long-term scaling engine the additive systems can't be. Deliberately NOT made a smooth exponential curve on shard *value*: shard *income* per prestige cycle is itself linear-in-floor (`calcShardsToEarn()`, reset every Ascend), so pairing smooth exponential value with linear income would just relocate the same divergence one layer up. Milestone-stepped doublings stay provably reachable against that linear income instead. New `stats.js`'s `getShardMilestoneMult()`; `ui.js`'s Prestige-tab multiplier display updated to match.
- **"Ascend" retired from all player-visible text — "Prestige" is now the single consistent term.** A player correction turned out to point at a real inconsistency: the Prestige tab was labeled correctly, but the button/modal inside that same tab said "Ascend" — different words for the same action shown in the same place. Fixed every player-facing string (button, modal title/body, toast, weapon-path unlock descriptions, Void Fragments unlock message) — `index.html`, `js/ui.js`, `js/prestige.js`, `js/voidFragments.js`, `js/weapons.js`. Internal function/variable names (`doAscend`, `openAscendModal`, etc.) deliberately left as-is — never shown to a player, not worth renaming just for internal consistency.

---

## [1.8.0] — 2026-07-26

Both items sourced from BACKLOG.md's post-launch feedback batches (external
playtester report + direct user report), each carried through a short design
pass before implementation to avoid an exploit/regression the first draft of
each fix would have introduced (see design-pass notes below).

### Added
- **Loot pop-up queue + auto-timeout** (BACKLOG.md #18). A boss kill previously granted no loot roll at all if a prior drop's pop-up was still open (`combat.js`'s kill branch gated the entire roll behind `pendingLoot === null`) — a player who left the modal open (or was away) silently missed every drop from every boss killed by passive DPS/units in the meantime, with no indication anything was skipped. Fixed with two combined mechanisms rather than picking one: every boss kill now always rolls and queues its drop (`state.js`'s `lootQueue` array replaces the single `pendingLoot` slot); a drop rolled while a pop-up is already open waits its turn instead of being blocked or silently auto-bagged, and is shown once the current one resolves. Separately, an unattended pop-up now auto-resolves to "Place in Bag" (the safe, non-destructive default — never auto-discards) after a visible 8s countdown (bar + numeric seconds-remaining label), so a walked-away player doesn't block the queue indefinitely either. `js/equipment.js`'s `queueLoot()`/`advanceLootQueue()`, `index.html`'s `.loot-timeout-bar`/`.loot-timeout-label`.
- **Defeated banner for a lost boss fight** — when the player reaches 0 HP, the HP bar/dodge button are replaced with a "💀 Defeated — no reward for this kill" banner for the rest of that fight, making the no-reward state unambiguous rather than inferring it from HP reading 0. `index.html`'s `#player-defeated-banner`.

### Changed
- **Miss-penalty gold loss now tapers by floor tier instead of a flat 5% forever** (BACKLOG.md #19). A flat percentage-of-current-gold penalty sounds progression-safe but isn't fully — the percentage never changes, but the absolute gold lost keeps growing forever as gold grows, so a late-game player who'd stockpiled toward an expensive purchase could lose a disproportionate chunk in a single miss. `bossCombat.js`'s `getMissGoldPenaltyPct()` now steps the penalty down by ~0.5 percentage points per tier (same 10-floor bands used everywhere else), floored at 1.5% so a miss always costs something at any depth.
- **Reaching 0 HP now permanently "loses" the current boss fight instead of doing nothing** (BACKLOG.md #24, resolved in the same design pass as #19 since both touch `resolveAttack()`). Previously, HP silently clamped at 0 (`state.setPlayerHP`) while the gold miss-penalty kept firing on every subsequent miss exactly as if HP still mattered — reaching 0 HP changed nothing about the player's situation, which defeated the purpose of the tier-scaled HP pool (1.7.0). Went through two design revisions before landing: an initial idea (end the fight early with no reward, then advance past the boss) was caught and rejected as a real exploit — it would let a player deliberately tank to 0 HP on every boss to skip Boss Combat entirely while farming trash-mob gold and advancing floors. A second draft (silently refill HP and restart the fight in place) shipped briefly but was reverted after manual playtesting — refilling HP meant a struggling player could keep re-entering the same HP/gold risk indefinitely on one hard boss, with no real cap on the downside. The final design: hitting 0 HP sets a `fightLost` flag (`bossCombat.js`) — the boss stops attacking entirely for the rest of that fight (no further HP or gold can be lost), but the player must still land the killing blow to advance; that kill grants no gold/loot/kill-count/trophy/trial credit (`combat.js`'s kill branch checks the new `hasLostCurrentFight()`). This caps the total downside at exactly one lost reward per lost fight, no more, no less. Idle-safety is unaffected: an idle/away player never accumulates real misses in the first place (unchanged `recentlyActive()` check from 1.7.0).

---

## [1.7.0] — 2026-07-25

### Added
- Bag/Inventory system: a new "🎒 Bag" sub-tab under Gear — dropped loot no longer forces an immediate keep-or-discard choice with no middle ground. Owned-but-unequipped gear lives in the Bag, sorted by slot then rarity, with rarity-colored item frames and an inline Equip/Salvage compare panel (reusing the loot pop-up's own compare layout) — `js/equipment.js`, `js/state.js`, `js/save.js`, `index.html`.
- Loot pop-up restored with a real 3-way choice: **Equip**, **Place in Bag**, or **Discard** — `js/equipment.js`, `index.html`. Equipping something now returns whatever was previously equipped back to the Bag instead of destroying it.
- Healing Tonic potion — an instant +2 HP heal on drink, capped at current max HP, never added to `activeBuffs` (a genuinely different effect shape from the other 5 timed-duration potions) — `js/potions.js`. `bonusLabel()` gained an `instantHeal` case ("+2 HP (instant)").
- Export/Import compare-tag CSS: "BAG"/"EQUIPPED" tags in the loot compare panel now render as a small pill positioned over the item card's top-left corner instead of squeezing into a narrow fixed-width column — `index.html`'s `.loot-compare-row`. Applies to both the loot pop-up and the Bag tab's inline compare panel.

### Changed
- Player max HP now scales with floor tier instead of a flat 4 forever — a floor-100 player had the exact same HP pool as a floor-5 player, which read as "strange" per direct player feedback. `state.js`'s `PLAYER_MAX_HP` constant replaced with `getPlayerMaxHP()` = `4 + tier` (same tier unit `getMonsterIdentity()` already uses), uncapped. Floor 5 (tier 0) stays 4 HP unchanged; floor 100 (tier 9) becomes 13 HP. Chosen deliberately linear (not steeper) since the existing miss-gold-penalty is already a percentage of current gold and auto-scales on its own — this restores parity between the two penalty types without making Boss Combat trivially safe at depth. A separate permanent shard-shop HP tier was considered and deferred (not rejected) pending playtesting after this change.
- Salvage value now scales with floor tier the same way monster gold rewards do (`getSalvageValue(item)`, same 1.8×/tier curve) — flat salvage values had quietly become worthless well before endgame (a legendary's flat 2500g was worth a fraction of a single late-game boss kill by floor 100+). All 4 salvage call sites (`rollLoot`'s duplicate-auto-salvage, `discardPendingLoot`, the Bag list's salvage button, `salvageFromInventory`) now read through this function — `js/equipment.js`.

### Fixed
- **Stale weapon-path bonuses never cleared on Ascend.** `state.js`'s `weaponBonus` object (accumulates crit/DPS/execute/life-steal from Duelist/Channeler/Reaper weapon-path purchases) carried an inline comment claiming it "resets on ascend," but `doAscend()` only ever reset `weaponsBought`/`selectedWeaponPath`, never `weaponBonus` itself — any stat from a past run's weapon path silently persisted forever, independent of what was picked or equipped afterward. Surfaced as a player report of unexplained HP regeneration on attack with no potions, gear, or life-steal active (a stale Reaper life-steal value from an earlier run). `doAscend()` now explicitly zeroes `weaponBonus` alongside the other run-reset fields — `js/prestige.js`. Verified via a real Ascend + re-pick of a non-life-steal path.
- Boss-dodge idle-detection was keyed on click recency (last click within 8s) rather than actual tab focus/visibility — a player watching a fight but pacing clicks slower than 8s got real misses silently no-op'd, which read as unexplained HP regen. `recentlyActive()` now checks `!document.hidden && document.hasFocus()` instead; the now-unused click-recency tracking (`markPlayerAction`/`lastPlayerActionTime`) was removed from `state.js`/`combat.js`/`main.js` — `js/bossCombat.js`.
- Hold-to-attack could get stuck firing indefinitely if the mouse button was released outside the browser window or the tab lost focus mid-hold — `js/main.js`.
- Cache-busting for JS module imports on every deploy. Each `import "./x.js"` was cached independently by the browser, so a version bump alone never forced a re-fetch of every module — caused real player confusion at least 3 times (icon-merge report, itch.io download-vs-play confusion, a "NaN/undefined" HP bar that was actually just a stale cache). New `scripts/stamp-versions.js` appends `?v=<version>` to every relative import (and the entry `<script>` tag), run only as a build step against a deploy-time copy of the repo (`pages-build/`, `itch-build/`) — local dev source in `js/`/`index.html` is never touched, so `npm run serve` keeps clean unversioned paths — `.github/workflows/deploy.yml`.

---

## [1.6.0] — 2026-07-25

### Added
- Export/Import Save: a "Copy Save" code (base64-encoded snapshot of the full localStorage save) that can be pasted back in on any browser/device via a new Import Save modal, both in the Achievements tab — `js/save.js`'s `exportSaveString()`/`importSaveString()`, `index.html`. Addresses the player-trust concern that progress "tied to browser data seems dangerous" (Henvacelos, 2026-07-23) without standing up any backend/account system — reuses whatever `saveGame()` already persists rather than hand-listing fields a second time, so it can't silently drift out of sync as new save keys get added later. Payload is base64-encoded JSON; import rejects malformed base64/JSON and anything missing a `gold` key ("not a Dungeon Clicker 9000 save") before touching real `localStorage`, and never partially applies a corrupt code. Full cloud save (cross-device sync via an account + backend) was explicitly declined for now — this local-only approach solves the actual reported concern without that infrastructure cost. Verified in-browser: exporting at floor 110, resetting to floor 1, then importing the code correctly restored floor 110 and all other progress.

---

## [1.5.0] — 2026-07-24

### Added
- Version tag (bottom-left of the game panel, e.g. "v1.5.0") so bug reports can be matched to a build — `js/version.js`, `index.html`. Prompted by a player bug report that turned out to be an old cached/deployed build, not a real regression; the tag makes that distinguishable going forward.
- 9 new equipment items (10 → 19 total) across the existing weapon/armor/ring slots and common/rare/legendary rarities — `js/equipment.js`: Quickblade/Headsman's Axe/Chronoblade (weapon), Recruit's Tunic/Warlord's Plate/Aegis of Ages (armor, introducing a new `unitDiscount`-flavored line), Hunter's Signet/Band of Tempo/Ring of Ruin (ring). Each new item deliberately uses a stat shape not already covered at that slot+rarity (e.g. pure `attackSpeedMult`, pure `critChance`/`critMult`) rather than just a bigger number on an existing shape, so `hasDifferentStatShape()`'s existing auto-salvage guard actually surfaces them as real choices instead of silently treating them as sidegrades. Scoped deliberately small — no new slots/rarities (that larger redesign, 6 slots/5 rarities/100 items, is documented separately in ITEMIZATION_REDESIGN.md and deferred).
- 4th equipment set, "Swiftblade Zeal" (Headsman's Axe + Warlord's Plate + Band of Tempo → +10% attack speed, +5% crit chance) — `js/equipment.js`, giving the new attack-speed/crit items a set identity.

---

## [1.4.1] — 2026-07-13

### Fixed
- Dev Tools tab shipped to the live GitHub Pages and itch.io builds in the 1.4.0 release, exposing gold/floor/prestige cheat buttons to real players. Gated the tab button and `window.dev*` bindings behind a localhost hostname check — `js/main.js`, `index.html` — so the tab still works for local `npm run serve` testing but is never present (or callable) on real deploy targets.

---

## [1.3.0] — 2026-06-25

### Added
- Potion shop: 5 timed buffs (Gold Rush, Berserker's Brew, Swiftness Tonic, Lucky Draught, Frenzy Vial), stack duration not magnitude
- Boss shields and multi-phase HP bars — shields render as a glowing frame around the HP bar (no layout shift); idle/passive DPS chips shields at 15% efficiency so idle players never hard-stall
- Mega-boss tier (every 10th floor) with distinct visuals and badge
- 3 new synergy heroes: Brother Aldric (attack-speed aura), Mortis the Necromancer (scales with other heroes' levels), Lutessa the Bard (scales with roster size)
- Branching weapon paths — Brute (flat damage), Duelist (crit chance/damage), Channeler (passive DPS) fork after a shared starter sword; path choice locks until next Ascend
- Dragoon (floor 50) and Titan (floor 80) units
- Per-unit Mastery: infinitely repeatable gold sink, +4% damage per level per unit, persists through Ascend
- Achievement gold rewards on every unlock, scaled to difficulty (20g – 350,000g)
- Achievement Power: permanent +0.5% gold and DPS per achievement unlocked, never resets — shown live in the Achievements tab
- "Master Trainer" achievement (mastery level 10 on any unit)
- Temporary dev-tools panel (Achievements tab) for manual gold/shard grants during testing — flagged for removal before shipping

### Changed
- Paladin reworked from a shield-themed hero into an attack-speed aura (⚜️) — the old shield flavor clashed with the new boss-shield mechanic
- Crit chance/damage now routed through the same multiplier pipeline as all other bonuses — fixes Lucky Draught's crit effect, which was previously silently inert
- Units shop converted to dynamic rendering (was 7 hardcoded buttons) to support per-unit Mastery rows and floor-gated visibility in one place
- Ring equipment slot renamed to "Jewelry" in all UI text
- Achievements tab counter is now dynamic instead of a hardcoded "/50" label

### Fixed
- Sitewide low-contrast dark-gray text (~20 instances) replaced with readable colors across Shop, Heroes, Gear, Potions, Prestige and Achievements tabs
- Locked achievement requirement text was unreadable (inherited a 0.4 opacity on top of already-muted gray) — now uses the same readable green as other bonus text

---

## [1.2.0] — 2026-05-31

### Changed
- Renamed game from "Delve" to "Dungeon Clicker 9000"
- Renamed GitHub repo from dungeon-idle to dungeon-clicker-9000

### Added
- Deathscythe weapon (500,000g, +300 click damage)
- Shop split into Weapons and Units sub-tabs with scrolling
- Combat arena with player (🧙‍♂️) lunge and monster recoil animations
- Passive DPS floating damage numbers (blue, per unit type)
- Hold-to-attack on both mouse and touch
- Ownership header and LICENSE file added to all repos
- Knight unit (floor 15, 80 dps) and Archmage unit (floor 30, 400 dps)
- 4 new weapon tiers: Elven Bow, Spell Tome, Stormstrike, Shadowreaper
- Floor milestone bonuses at floors 100 / 200 / 500 / 1000 / 2000 / 5000 / 10000
- Auto-discard inferior loot with salvage gold payout
- Prestige badge in HUD (⚡ P1, P2...)
- Auto-save indicator ("Saved ✓")
- Space bar attack support
- Screen shake on boss kills and crits
- Gold flash animation on gold gain
- Fantasy title font (Cinzel Decorative)
- Mobile title size fix for iPhone

### Fixed
- Weapon buttons staying "Purchased" after prestige reset
- Hold-to-attack no longer shows damage numbers (now spawns near monster)
- Unit cost display not updating after purchase
- Duplicate `.tab-btn` CSS rule removed
- Missing CSS for `.floor-header`, `.floor-label`, `.boss-badge`

---

## [1.0.0] — 2026-05-28

### Added
- Initial release
- 50 floors of dungeon combat with 10 monster types
- Equipment system: weapon, armour and ring slots with Common, Rare and Legendary rarity
- 5 unlockable heroes with permanent bonuses
- Full prestige system with Soul Shards
- 45 achievements
- Offline progress (capped at 8 hours)
- Web Audio API sound effects
- Auto-save to localStorage
- Mobile responsive layout
- CI/CD pipeline with Playwright tests and GitHub Pages deploy
