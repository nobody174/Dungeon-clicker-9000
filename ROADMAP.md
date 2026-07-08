# Dungeon Clicker 9000 — Roadmap & Ideas

## Recently Shipped (v1.3.0)
- ⚜️ Brother Aldric (Paladin) — reworked from the original "massive DPS" pitch into an attack-speed aura hero, since flat DPS clashed with the new boss-shield mechanic
- ⚗️ Potion shop — 5 timed combat buffs
- 🏆 Achievement rewards — gold payouts + permanent Achievement Power, in place of a separate "legendary tier"
- Dragoon and Titan units, branching weapon paths, per-unit Mastery sink

## Features (New Additions)
- More weapons — additional tiers beyond Deathscythe
- More heroes — new companions with unique bonuses
- More units — new hire-able fighters beyond Titan
- More achievements — especially endgame / prestige milestones
- 👹 More monster types — deeper floors, new enemy designs (not yet built).
  Concretely: past floor 10 the roster just recycles the same 10
  monsters with a bigger `tier` multiplier — give each tier a distinct
  name/icon (e.g. tier 2 Slime → "Acid Slime") plus one new mechanic
  (poison DoT, heal-on-hit, phase dodge) so depth reads as new content,
  not just bigger numbers. See BACKLOG.md #1.
- Companion quests — one-time flavor objectives per hero (e.g. Vex:
  defeat 3 bosses without a potion active) using stats already tracked
  (bossKills, potionsBought), rewarding a cosmetic title. BACKLOG.md #8.
- Boss trophy room tab — log first-kill floor/time per boss type; cheap
  since bossKills/floor/timestamps already exist. BACKLOG.md #10.

## Balance & Polish
- Dodge mechanic — boss attacks back, player can sidestep
- More floor milestone rewards
- More equipment items and set bonuses — named sets across the 3 slots
  (e.g. Voidreaver + Void Plate + Soulstone Ring → +global crit) so
  legendary loot rewards completing a set, not just biggest single stat.
  BACKLOG.md #3.
- Mastery milestones with visible payoff — named tiers (5/10/25/50) with
  a unit visual upgrade, not just a flat % climbing forever. BACKLOG.md #9.
- Offline-progress duration upgrades — shard-shop tiers to push the 8h
  offline cap to 12h/24h/uncapped. BACKLOG.md #7.

## Maybe Later
- Second prestige tier / deeper progression loop — concretely, a
  "Void Fragments" meta-currency earned only past floor 100, spent on
  run-modifiers, sitting above Soul Shards. BACKLOG.md #5.
- Seasonal or limited-time events
- 4th weapon path, unlocked only via Ascend (e.g. a life-steal/DoT
  "Path of the Reaper") — a reason to re-Ascend beyond shard math.
  BACKLOG.md #4.
- Daily/weekly seeded challenge run with a shareable score, reusing the
  existing save/reset plumbing in a separate localStorage slot.
  BACKLOG.md #6.

Full write-up with rationale for each of the above: see [BACKLOG.md](BACKLOG.md).
