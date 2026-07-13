# Testing Progress Log — 2026-07-12

Manual QA pass on the full 10-feature batch (see BACKLOG.md/ROADMAP.md for
the feature specs and CHANGELOG.md `[Unreleased]` for the implementation
list). This file tracks what's been tested, what's confirmed working, what
was found broken and fixed, and what's still untested — so testing can
resume from the cabin without re-deriving context.

## Session tooling added during testing

- **Volume slider** next to the mute button (independent of mute toggle,
  persists across reload).
- **Dev Tools tab** (🛠️ Dev) with quick-access buttons: gold grants, floor
  jumps (5/10/11/20), prestige-count jumps, a **toggleable** one-shot click
  damage button (was a one-way action initially — fixed to a proper on/off
  toggle per testing feedback), max-mastery shortcut, and force-kill-boss
  (sets HP to 1 and clears any shield so the next real attack finishes the
  kill through the normal code path — keeps achievements/gold/trophy
  recording consistent with real play).
- **Reminder for next session:** this is an ES-module game with no bundler
  — the browser caches each `.js` file individually. **Hard-refresh
  (Ctrl+Shift+R) before every test pass**, especially after a fix lands.
  At least two "bugs" reported during testing turned out to be stale
  browser cache, not real regressions — confirmed by reproducing the flow
  headlessly against the actual served files.

## Bugs found and fixed this session

1. **Loot auto-salvage didn't account for stat "shape."** Equal-power
   same-type drops (e.g. two rings both only granting `goldMult`) were
   showing up in the loot modal as if new, when they should auto-salvage.
   Fixed in `js/equipment.js` (`hasDifferentStatShape` + `isWorthShowing`
   logic in `rollLoot`).

2. **Tier icons fully replaced the base creature icon instead of
   decorating it.** "Frozen Dragon" showed a bare 🧊 ice cube with no
   dragon. Fixed in `js/monsters.js` — `iconDecorator` is now always
   appended to the base creature's own icon (e.g. 🐲❄️), never replaces
   it. Also fixed an identical duplicated bug in the Trophy Room gallery
   (`getTrophyGallery()`), which had its own copy of the old broken logic.

3. **Duplicate equipped items still surfaced in the loot modal.** The
   set-completion "protect this drop from auto-salvage" check only looked
   at whether the *set* was incomplete, not whether the *specific dropped
   item* was already the exact piece equipped. Result: a second Voidreaver
   kept appearing as "new loot" even with Voidreaver already equipped,
   because Voidreaver's Fury (the set it belongs to) was still only 1/3
   complete. Fixed in `js/equipment.js`'s `wouldHelpCompleteSet` — an
   exact duplicate of an already-equipped piece is now always filtered
   out regardless of set-completion status. Verified via 300 simulated
   rolls with zero duplicate drops surfacing.

4. **Force-Kill Boss dev tool didn't clear the boss's shield.** Set
   `monsterHP` to 1 but left the shield up; since click damage routes into
   the shield first, the next click did nothing and the "kill" silently
   failed. Fixed — now also zeroes `monsterShield`.

5. **Dev tool: Void Fragments render gap.** `devAddPrestige`'s jump-to-5
   shortcut set state correctly but didn't trigger a re-render of the
   Void Fragments shop panel (that panel is normally only re-rendered by
   a real `doAscend()` call or a page load). Fixed by calling
   `renderVoidShop()` directly from the dev tool. Note: this was **only**
   a dev-tool gap — the real Ascend flow (`doAscend()` → `renderVoidShop()`)
   was independently verified correct via a 5x-Ascend simulation.

## Confirmed working (tested and passed)

- **Setup**: loads with no console errors, baseline click/gold/floor loop.
- **1. Tiered Monster Identity**: names good from the start; icons fixed
  and now confirmed showing base creature + tier decorator correctly.
- **3. Equipment Set Bonuses**: set progress display (e.g. "1/3 Voidreaver's
  Fury") confirmed. Set bonus application confirmed (+8% crit chance / +2×
  crit dmg from a completed Voidreaver's Fury). Loot-modal set-membership
  label confirmed showing correctly (e.g. "💰 Part of Hoarder's Fortune
  (0/3 equipped) — +25% gold earned"). Duplicate-drop bug (see above)
  fixed and verified.
- **5. Hero Trials**: trial display on hero cards confirmed.
- **6. Boss Trophy Room**: confirmed.
- **7. Daily Challenge Run**: confirmed — exiting early correctly restores
  the player to their pre-challenge state.
- **8. Void Fragments**: unlock-at-5-Ascends flow independently verified
  correct in the real (non-dev-tool) Ascend path; the earlier "doesn't
  show up" report was stale browser cache, not a real bug.
- **10. Mastery Milestones**: badge display confirmed good.
- **General**: save/reload persistence confirmed working across a full
  session (gold, floor, gear, heroes, trials, trophies all survive).
- **2. Boss Combat v1**: retested with one-shot dev tool OFF — windup
  telegraph, dodge warning visual, and dodge itself all confirmed. Failing
  to dodge (HP hits 0) correctly triggers the attack and gold-loss penalty.
- **4. Path of the Reaper**: confirmed working end to end.
- **Tier icon visuals**: reworked per player feedback — tier now recolors
  the base creature icon in place (CSS filter + colored ring) instead of
  appending a second decorator emoji. Confirmed looking better in testing.

## Confirmed working by design (not bugs)

- **Dragonscale Mail still appearing despite Void Plate being strictly
  better** (both `dpsMult` only, Void Plate higher) — this is correct:
  Dragonscale is the sole armor piece for "Warden's Resolve," an
  incomplete set. Per the equipment review's own design (protect
  set-completing drops from auto-salvage even if raw-stat-worse), this is
  intentional, and the loot modal now labels it as part of that set so
  the player can make an informed call. No fix needed — confirmed as
  intended behavior.

## Still untested

- **9. Offline Progression**: tested in an earlier session pass, not
  re-verified against the final build — low risk, low priority to
  re-check.

## Next steps (resume here from the cabin)

1. Hard-refresh before starting (stale-cache gotcha above).
2. Optionally re-verify Offline Progression against the final build
   (low priority).
3. Batch is otherwise fully tested and ready to consider
   shipping/tagging a version bump in `package.json` + finalizing the
   `CHANGELOG.md [Unreleased]` section into a real version number (left
   as a deliberate open decision — see CHANGELOG.md's own note).
