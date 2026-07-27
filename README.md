# ⚔️ Dungeon Clicker 9000

A browser-based dungeon idle/clicker game — no install, no account, no backend. Just open and play, and your progress saves automatically in your browser.

Built from scratch in vanilla HTML, CSS and JavaScript as a learning project.

---

## 🎮 How to Play

- **Click** the Attack button (or hold it down) to deal damage to the current monster
- **Earn gold** when monsters die — bosses drop more
- **Buy upgrades** in the Shop to increase your click damage
- **Hire units** (Squire, Rogue, Mage, Knight, Archmage, Dragoon, Titan) for passive damage per second, then sink gold into per-unit **Mastery** for permanent multipliers
- **Descend** through floors — every 5th floor is a Boss, every 10th a Mega-Boss with shields and multiple phases
- **Dodge boss attacks** — a warning icon telegraphs an incoming hit; press Dodge (or the `D` key) in time to fully avoid it
- **Pick a weapon path** — Brute, Duelist, Channeler, or (after your first Prestige) Reaper — each branching from the starter sword with a different damage style
- **Brew potions** for timed buffs to gold, crit, attack speed and more, or drink a Healing Tonic for an instant heal
- **Collect gear** dropped by bosses — weapon, armor and ring slots across Common/Rare/Legendary rarity, with named equipment sets for extra bonuses when a full set is equipped
- **Manage your Bag** — loot you don't equip on the spot isn't lost; it's stored for later, with a side-by-side compare against what you currently have equipped
- **Unlock heroes** by hitting milestones — each gives a unique permanent bonus, including roster-synergy heroes, plus a one-time Hero Trial objective per hero
- **Prestige** at floor 20+ to reset your run in exchange for Soul Shards — a permanent gold multiplier that grows in steps as you earn more over your lifetime, plus a shop of one-time permanent upgrades
- **Unlock Void Fragments** after your 5th Prestige — a second currency spent on starting-run advantages and a capped risk/reward difficulty slider
- **Chase achievements** across kills, floors, gold, upgrades, Prestige and DPS — each pays a one-time gold reward and builds permanent Achievement Power
- **Collect Boss Trophies** — a gallery tracking every monster tier you've defeated as a boss, with first-kill floor and total kill count
- **Try the Daily Challenge** — a seeded, time-limited run isolated from your main save; same seed for everyone each day, score-only, no permanent rewards

---

## ✨ Features

- 10 base monster types, visually re-tiered every 10 floors (new name/icon prefix), scaling across effectively infinite floors
- Boss every 5th floor with shields and phase transitions; Mega-Boss every 10th floor with an extra phase
- Real-time Boss Combat: a player HP pool (scales with depth) and a dodge mechanic exclusive to boss fights — missing a dodge costs HP and a small, depth-scaled gold penalty; running out of HP mid-fight means no reward for that kill, though the boss still has to be beaten to move on
- 3 equipment slots (weapon / armor / ring) across Common, Rare and Legendary rarity, plus 4 named equipment sets for full-set bonuses
- A real Bag/Inventory — dropped loot offers a genuine Equip / Bag / Discard choice, with an auto-timeout if you walk away, and nothing is ever silently skipped even if multiple bosses drop loot back-to-back
- Branching weapon paths (Brute / Duelist / Channeler / Reaper) after a shared starter weapon — Reaper unlocks after your first Prestige
- 8 unlockable heroes with level-up progression and roster-synergy bonuses, each with a one-time cosmetic Hero Trial
- Potion shop with 5 timed combat buffs plus an instant-heal Healing Tonic
- Per-unit Mastery — infinitely repeatable damage multiplier sink for late-game gold, with visible milestone badges (Bronze/Silver/Gold/Aura)
- Full Prestige system: Soul Shards give a milestone-stepped permanent gold multiplier plus a one-time upgrade shop; Void Fragments (unlocked at Prestige 5) add a second currency for run-modifiers and a capped risk/reward difficulty slider
- Boss Trophy Room — a collection tab tracking every monster tier defeated as a boss
- Daily Challenge Run — a seeded, fixed-time mode isolated from your main save, score-only
- Export/Import save codes — back up or move your save between browsers/devices without any account or backend
- Achievements with gold rewards, toast notifications and a permanent Achievement Power bonus
- Floating damage numbers on click and from passive units
- Combat arena with player lunge and monster recoil animations
- Offline progress — earn gold while away, with an upgradeable cap
- Web Audio API sound effects (no audio files needed)
- Auto-save to localStorage every 30 seconds
- Number formatting (1K / 1M / 1B)
- Mobile responsive layout
- Mute button

---

## 🛠️ Tech Stack

- Vanilla HTML, CSS and JavaScript — ES modules, zero dependencies, no build tooling
- Web Audio API for procedurally generated sound effects
- localStorage for save/load, with a portable export/import save-code option
- Playwright for automated regression testing
- GitHub Pages and itch.io for hosting

---

## 🚀 Running Locally

No build step needed, but the game must be served over HTTP — it uses ES modules
(`<script type="module">`), which browsers block from loading via `file://`. Use the
included dev server:

```bash
git clone https://github.com/nobody174/dungeon-clicker-9000.git
cd dungeon-clicker-9000
npm install
npm run serve
```

Then open http://localhost:3000 in your browser.

---

## 📁 Project Structure

```
dungeon-clicker-9000/
├── index.html          # HTML shell + inline <style> CSS + <script type="module" src="js/main.js">
└── js/
    ├── main.js          # Entry point: wires up modules, exposes onclick-handler functions, starts game loops
    ├── state.js         # Shared mutable game state
    ├── stats.js         # Cross-cutting stat math (getTotalMult, gold/DPS formulas, Soul Shard scaling)
    ├── utils.js         # Pure formatting helpers
    ├── heroes.js        # Hero roster, unlocks, level-up, Hero Trials
    ├── equipment.js     # Gear table, sets, loot rolls, Bag/Inventory, equip/salvage
    ├── combat.js        # Attack / damage core loop
    ├── monsters.js      # Monster roster, tiered identity, spawning
    ├── bosses.js        # Boss phase-shift mechanic
    ├── bossCombat.js    # Real-time player HP & dodge system (boss fights only)
    ├── weapons.js       # Weapon paths and tier upgrades
    ├── units.js         # Units + Mastery
    ├── prestige.js      # Soul Shard shop, Prestige reset logic
    ├── voidFragments.js # Void Fragments currency, Run Rules, risk/reward slider
    ├── potions.js       # Potion shop + active buffs
    ├── achievements.js  # Achievement list + checks
    ├── trophies.js      # Boss Trophy Room gallery
    ├── challenge.js     # Daily Challenge Run (seeded, isolated save state)
    ├── prng.js          # Seedable PRNG used by the Daily Challenge
    ├── audio.js         # Procedural sound effects
    ├── ui.js            # DOM render/update/tab functions
    ├── toast.js         # Toast notifications
    ├── save.js          # Save/load (localStorage) + export/import save codes
    ├── version.js        # Displayed build version tag
    └── dev.js            # Local-testing-only shortcuts, gated to localhost — never active for real players
```

---

## 🗺️ Roadmap

Currently in progress or planned: a bigger itemization overhaul (more slots, rarities and set bonuses), named gear loadouts, a platform leaderboard, real (non-emoji) artwork, and further Soul Shard/Void Fragment content.

See [ROADMAP.md](ROADMAP.md) for the full list and ideas under consideration, and [CHANGELOG.md](CHANGELOG.md) for everything already shipped.

---

## 👤 Author

Built by [nobody174](https://github.com/nobody174).
**Support:** [Patreon](https://www.patreon.com/Nobody174/posts/dungeon-clicker-159797306)
Copyright © 2025 nobody174 — All rights reserved.

---

*"It's never too late to give up!"*

---

*Built with assistance from [Claude Code](https://claude.ai/code) by Anthropic.*
