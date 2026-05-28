# Changelog

All notable changes to Delve are documented here.
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

## [1.0.0] — 2026-05-28

### Added
- Initial release of Delve
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
