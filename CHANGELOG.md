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
