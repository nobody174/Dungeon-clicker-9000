# Dungeon Clicker 9000 — Content Backlog (2026-07-08)

Detailed write-ups behind the condensed bullets in ROADMAP.md. Grounded in
the current `index.html` implementation, not just abstract pitches.

1. **Tiered monster identity past floor 10.** `monsters[(currentFloor-1) %
   monsters.length]` means every tier past the first 10 floors reuses the
   same 10 names/icons with only a `tier` multiplier applied to stats —
   floor 55's "Slime" is mechanically identical to floor 5's. Give each
   tier a distinct name/icon (tier 2 Slime → "Acid Slime" 🟢→🧪, tier 3 →
   "Corrupted Slime", etc.) and one new per-tier mechanic (poison DoT,
   heal-on-hit, brief dodge window) so late floors feel like new content
   instead of a bigger number on the same sprite.

2. **Boss counter-attack / dodge.** Already on the roadmap and still the
   biggest structural gap: the player only ever deals damage, never takes
   any. Add a thin player HP bar, a boss "windup" tell, and a dodge input
   (tap during windup) — turns the pure-clicker loop into something with
   light action-timing, without touching the core progression math.

3. **Equipment set bonuses.** The `equipment` array already has 3 slots
   (weapon/armor/ring) × 3 rarities. Add named sets — e.g. Voidreaver +
   Void Plate + Soulstone Ring → +global crit — so legendary loot rewards
   completing a matched set, not just chasing the single biggest stat per
   slot.

4. **A 4th weapon path, prestige-gated.** Brute/Duelist/Channeler already
   exist as `selectedWeaponPath` branches off the starter sword. A 4th
   path ("Path of the Reaper" — life-steal/DoT hybrid) unlocked only after
   at least one Ascend gives veteran players a reason to re-Ascend beyond
   pure shard-math optimization.

5. **Second prestige currency layer.** Noted as "maybe later" already.
   Concretely: past floor 100, Soul Shards unlock a "Void Fragments"
   meta-currency spent on run-modifiers (e.g. start a run with a random
   already-unlocked hero pre-leveled) — a prestige-of-the-prestige layer
   sitting above the existing shard shop.

6. **Daily/weekly seeded challenge run.** Reuse the existing save/load
   plumbing (`s.setItem`/`s.getItem` in the save functions) against a
   separate localStorage slot with a fixed RNG seed, scored by floor
   reached in a fixed time window (e.g. 10 minutes) — no server needed,
   shareable as a screenshot/score.

7. **Offline-progress duration upgrades.** The offline cap is currently
   hard-coded (`capped` in the save/load offline-earnings calc, banner
   text at "🍯 Welcome back!"). Sell shard-shop tiers that push it from
   8h → 12h → 24h → uncapped — a standard, well-loved idle-genre lever
   this game doesn't have yet.

8. **Companion quests.** The 8 heroes are static bonus-sticks once
   unlocked. Give each a one-time flavor objective using stats already
   tracked (`bossKills`, `potionsBought`, etc.) — e.g. Vex: defeat 3
   bosses without an active potion — rewarding a cosmetic title rather
   than another flat multiplier.

9. **Mastery milestones with visible payoff.** Per-unit Mastery is
   "infinitely repeatable" but featureless past a flat % per level. Add
   named milestone tiers (5/10/25/50) with a visible unit upgrade (sprite
   border glow) so "Master Trainer" (mastery 10) isn't the only
   checkpoint in an otherwise invisible grind.

10. **Boss trophy room tab.** Every boss kill already fires a screen-flash
    + loot modal, but nothing persists that moment afterward. A gallery
    tab logging first-kill floor/time per boss type is cheap — `bossKills`,
    `currentFloor`, and a timestamp are already available at kill time —
    and plays well to the same completionist pull as the 52 achievements.
