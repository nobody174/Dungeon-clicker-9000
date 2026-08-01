# Dungeon Clicker 9000 — Roadmap & Ideas

Open/forward-looking planning only. Once something is actually released
to players, its write-up lives in [CHANGELOG.md](CHANGELOG.md) — the
sole historical record — and is removed from here. A commit existing in
git is not the same as "shipped": an item only leaves this file once
it's live for players.

## Current status / where things stand (2026-08-01) — read this first next session

- **Google Play publishing is fully in progress — actively waiting on
  testers, not blocked on anything technical.** Everything below is done;
  the only remaining step is time + tester signups.
- **Play Console app is live and correctly configured:**
  package `io.github.nobody174.dungeonclicker9000`, all compliance
  sections submitted and cleared (privacy policy, data safety — declared
  "no data collected," content rating questionnaire, ads/financial
  features/health/government-app declarations all "No," target age
  includes children so the app is committed to the Play Families Policy,
  store listing with description/screenshots/icon/feature graphic all
  filled in).
- **Privacy policy is live**: `https://nobody174.github.io/Dungeon-clicker-9000/privacy.html`
  (added in v1.9.3 — states plainly the game collects no data at all).
- **The Android wrapper project now has its own git repo and is on
  GitHub**: https://github.com/nobody174/dungeon-clicker-android (public
  — the signing keystore and its password are gitignored, never
  committed; see that repo's README for how to restore them on a new
  machine). Previously this folder existed only on the desktop with no
  version control — fixed 2026-08-01.
  - Application ID (permanent): `io.github.nobody174.dungeonclicker9000`.
  - `bubblewrap build`'s interactive password prompt doesn't work from
    non-interactive/piped shells (hangs after the first prompt). Build
    via Gradle directly instead — see that repo's README for the exact
    command (uses `DC9000_KEYSTORE_PASSWORD`/`DC9000_KEYSTORE_PATH` env
    vars against a `signingConfigs` block added to `app/build.gradle`).
  - Current build: version code 6, pointed at the live root site
    (`https://nobody174.github.io/Dungeon-clicker-9000/`), not `/preview/`
    — earlier phone-testing builds used `/preview/`, switched to the
    real site once ready to upload to Play Console.
- **Internal testing**: done, confirmed working — installed via Play
  Store (not sideloaded) and tested live on a real phone.
- **Closed testing**: track is live, release submitted and passed
  Google's review. **Currently at the tester-recruitment stage** — Play
  Store requires **12 testers opted in, sustained for 14 continuous
  days** before Production access unlocks (this is a one-time gate for
  a new developer account's first app, not something repeated per
  future update). Recruiting via:
  - Discord: posted in the "Alpha Beta Gamer" server's testing channel.
  - Google Group (self-service join, so recruits don't need to be
    manually added one-by-one in Play Console): `dc9000-testers@googlegroups.com`,
    join at https://groups.google.com/g/dc9000-testers
  - Play Store opt-in link (paired with the group join): shared
    alongside the group link in the recruiting post.
- **Next actual milestone**: once 12 testers have opted in and stayed
  opted in for 14 days, Play Console unlocks the "Apply for production
  access" flow — that's a Play Console UI step, not a code/build task.
- **GitHub Pages deploy pipeline bug fixed (2026-07-31/08-01)**: the
  `/preview/` deploy job and the real tag-triggered release deploy job
  were both fully replacing the whole Pages site on every deploy
  (`actions/deploy-pages` doesn't merge across runs) — whichever ran
  most recently silently wiped the other one out. This caused the real
  root site to 404 for a while despite CI reporting success. Fixed by
  making each job also rebuild/carry-forward the other's content (see
  `.github/workflows/deploy.yml` comments) — confirmed both `/` and
  `/preview/` now survive being deployed in any order.

## Process/communication decisions (so they aren't re-decided later)

- **The `github-pages` deployment environment must explicitly allow
  version tags, not just the `main` branch — learned the hard way on
  v1.9.0's actual release (2026-07-28).** Pushing the `v1.9.0` tag
  correctly triggered the release workflow and itch.io deployed fine,
  but the GitHub Pages deploy job failed with `"Tag 'v1.9.0' is not
  allowed to deploy to github-pages due to environment protection
  rules"` — the environment's branch policy only had `main` allow-
  listed (left over from when only branch pushes ever deployed,
  before the tag-gated release workflow existed). Fixed by adding a
  `v*` tag pattern via `gh api repos/.../environments/github-pages/
  deployment-branch-policies -f name='v*' -f type='tag'`, then
  re-running the failed job. **This is a one-time repo setting, not
  something to redo per release** — future tag pushes should deploy
  cleanly now that the policy allows any `v*` tag. If a future release
  ever hits the same "environment protection rules" error again,
  check this policy first before assuming it's a workflow bug.
- **Manually triggering the "CI/CD — Test, Preview & Release" workflow
  (workflow_dispatch) does NOT touch itch.io or the real GitHub Pages
  site — verified twice (2026-07-27).** Investigated a real-seeming
  scare: an itch.io "new build live" email arrived within minutes of
  running the workflow manually to test the Android/TWA icon fix.
  Checked both suspect runs directly via `gh run view` — in both, the
  `🎮 Release to itch.io` and `🚀 Release to GitHub Pages` jobs showed
  as skipped (`-`, 0s runtime, no execution log at all), confirming
  their `if: startsWith(github.ref, 'refs/tags/v')` gate worked
  correctly; only `workflow_dispatch`'s own `deploy-preview` job (gated
  separately on `if: github.event_name == 'workflow_dispatch'`) ran.
  The itch.io email itself reported **v1.8.0** — the version already
  actually live since 2026-07-26, not anything newer — consistent with
  a delayed/re-sent notification about that real prior release, not a
  new unintended push. No workflow bug found; logging this here so a
  future similar-timed coincidence doesn't get re-investigated from
  scratch — the fix already has verified, confirmed-working gating.
- **Patch-note Patreon posts are public/free, not paywalled.** Decided
  2026-07-25: a "what changed" post benefits most from reaching
  prospective/new players (signals an actively maintained project) and
  existing free players whose own bug reports are being addressed —
  gating that behind a paywall would cut against both. Keep the
  **roadmap/direction preview posts** (Template B in
  PATREON_TEMPLATES.md) supporter-only, as already established — that
  split (public patch notes, supporter-only speculative previews)
  stays the rule going forward, not something to re-decide per post.
- **✅ Terminology fixed (2026-07-28): "Prestige" is the single
  player-facing term, "Ascend" is retired from the UI.** A player
  correction (2026-07-25) turned out to point at a real, live
  inconsistency, not just prose: the Prestige tab itself was labeled
  "Prestige," but the button/modal *inside* that same tab said
  "Ascend" — a player clicking into a tab called Prestige was
  immediately shown a different word for the same action. Fixed every
  player-visible string (button text, modal title/body, toast, weapon-
  path unlock descriptions, Void Fragments unlock message) to say
  "Prestige"/"Prestiged" — `index.html`, `js/ui.js`, `js/prestige.js`,
  `js/voidFragments.js`, `js/weapons.js`. Internal function/variable
  names (`doAscend`, `openAscendModal`, `playAscendSound`, etc.) were
  deliberately left as-is — pure internal naming, never shown to a
  player, not worth the churn of renaming just for consistency. Historical
  BACKLOG.md/CHANGELOG.md prose from before this fix also keeps
  "Ascend" as originally written, since those are dated logs of what
  was said at the time, not live UI text.

## Planned — future major patch (not scheduled)

**Itemization Overhaul.** Full design doc written:
[ITEMIZATION_REDESIGN.md](ITEMIZATION_REDESIGN.md). 6 equipment slots
(up from 3: adds Helmet/Boots/Amulet), 6 rarity tiers (up from 3: adds
Magic/Epic/Mythic — Magic is new, a low-tier rung below Rare) each with
a fixed stat count (Common/Magic 1 stat, Rare 2, Epic 3, Legendary/
Mythic 4), 8 named sets with new partial-set (2pc/full) tiering, 6
affixes including a new rarity/luck lever (`bossDmgMult`,
`damageReduction`, `playerMaxHPBonus`, `offlineGainMult`,
`potionDurationMult`, `rarityLuck`), and a 100-item table (numbers still
to be finalized once the architecture is greenlit for a build cycle).
Also folds in a retrofit of the current 19 shipped items, which don't
follow a consistent stat-count-per-rarity rule today.
Deliberately sequenced *after* the v1.9.0 progression-curve rebalance —
itemization is an additive-bonus expansion, and the curve fix showed
additive expansions delay a divergence wall without fixing it, so this
is tuned once against the corrected curve rather than twice.

**Gear Loadouts (Inventory/Bag system Part 2) — explicitly deferred,
not abandoned.** Full design doc written:
[INVENTORY_REDESIGN.md](INVENTORY_REDESIGN.md)'s "Part 2." Named gear
loadouts (e.g. "Gold Farm" / "Boss Killer") that swap all equipped
slots at once. Technically unblocked (Part 1, the Bag itself, already
shipped), but confirmed not worth building at today's ~19-item count —
parked until the Itemization Overhaul ships and there's enough gear
that loadout-swapping actually saves meaningful time.

**Decisions from the Bag/Inventory build, logged so they aren't
re-litigated next time Loadouts or Itemization is discussed:**
- **No purchasable/upgradeable bag slots.** Considered and explicitly
  declined — this game has no crafting/trading economy creating
  storage-scarcity pressure the way loot-based ARPGs do, so a "pay
  gold to hold more items" gate would be a fake choice, not a real
  one. Bag stays unlimited unless localStorage size ever becomes a
  real, measured problem.
- **Bag lives as a sub-tab under Gear, not a separate top-level tab** —
  mirrors the existing Shop → Weapons/Units sub-tab pattern
  (`showGearTab()` in `js/ui.js`).
- **Sub-tabs per item slot inside the Bag: declined for now**, at
  today's ~19-item count — over-engineering at this scale. Revisit
  once the Itemization Overhaul ships and the item/slot count actually
  grows; don't build the sub-tab structure ahead of knowing the final
  slot list, since building it against the wrong shape means redoing it.
- **Loot pop-up stays interrupting, not silent** — a silent auto-bag
  version was tried and reverted per player feedback wanting the
  Equip/Bag/Discard choice back.

**Real Artwork Pass — confirmed worth pursuing, sourcing decision is
the actual blocker.** Design doc written:
[ART_UPGRADE.md](ART_UPGRADE.md). The current all-emoji visual identity
(10 monsters × 8 tiers via CSS recoloring, 19 gear items, 8 heroes, the
player character itself) has hit a real ceiling — the same tier-recolor
trick repeating forever. Doc scopes a monsters-first real-art pass
(PNG/SVG, reusing the existing tier-recolor CSS trick so it stays at 10
base assets, not 80), sourcing options (AI-generated / commissioned /
licensed pack — undecided), and a fallback-safe technical swap-in plan.
**Not started — needs the sourcing decision made before anything else
here can move.**

**Playable hero characters with unique active abilities, unlocked via
prestige-count milestones — new idea, explicitly separate from the Real
Artwork Pass above.** Today's "Heroes" (`js/heroes.js`) are passive
stat-bonus unlocks, not playable characters with active abilities; this
is a genuinely bigger scope — a hero-swap/active-ability system layered
on top (e.g. "reach floor 250 to unlock a new selectable hero with
their own unique active ability"), not a visual reskin. Needs its own
design doc once picked up — touches core combat (a new "active ability"
concept doesn't exist anywhere in the game today). Sequenced after the
Real Artwork Pass's sourcing decision — a real-art pass on the existing
roster is the smaller, more immediate win.

**Cloud save — explicitly declined for now.** Decided against standing
up a backend/auth system. Export/import save (shipped, no backend
needed) already covers the actual player concern ("tied to browser
data seems dangerous") without the infrastructure cost. Revisit only
if there's a concrete reason true cross-device sync becomes worth a
backend investment.

**Leaderboard via Google Play Games Services — confirmed direction,
tied to the upcoming Play Store launch.** Full context in BACKLOG.md
#23/#27. Reuses the existing Daily Challenge Run's seeded/timed format
(`js/challenge.js`) for a fair score to submit — no new scoring design
needed. GPGS gives free, built-in leaderboard + score-moderation
tooling with zero backend to host; deliberately Play-Store-only for
now (itch.io players have no path into a Google account-based system)
— a separate web leaderboard is a distinct, optional future item, not
bundled into this one. Autoclicker/anti-cheat concern resolved the same
way the genre already handles it: bragging-rights framing (matches the
Daily Challenge's existing "no permanent rewards" stance) plus GPGS's
own score-flagging tools, no custom detection code planned.

## Content pipeline for regular post-launch updates

See [BACKLOG.md](BACKLOG.md)'s "Content pipeline" entry for the full,
categorized queue (Veteran Adventurer, Momentum, Soul Shard Milestones/
Ancient Forge/Hero Passives, and a batch of small independent QoL
items) — sourced specifically to have a steady stream of small, real
patches ready to release after the Play Store launch, rather than one
large update then silence.
