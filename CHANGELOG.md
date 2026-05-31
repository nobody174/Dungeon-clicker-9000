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
