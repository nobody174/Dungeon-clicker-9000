# Dungeon Clicker 9000 — Roadmap & Ideas

Open/forward-looking planning only. Once something is actually released
to players, its write-up lives in [CHANGELOG.md](CHANGELOG.md) — the
sole historical record — and is removed from here. A commit existing in
git is not the same as "shipped": an item only leaves this file once
it's live for players.

## Current status / where things stand (2026-07-28) — read this first next session

- **Blocked on: Google Play Console developer ID verification.** Submitted
  ID card + (after a second request) passport; told it could take a few
  days. Nothing else can move on the Play Store side until this clears.
  Everything else below is ready and waiting for that.
- **A full local Android test pipeline is set up and working**, separate
  from this repo (not tracked in git here — its own folder, not yet its
  own git repo either):
  - Project folder: `D:\Claude AI Projects\projects\GitHub\dungeon-clicker-android`
    (Bubblewrap-generated TWA wrapper — Gradle/Android Studio project,
    points at the game via a live URL, contains no game code itself).
  - Signing keystore: `android.keystore` in that folder, alias `android`.
    **Backed up** to `C:\Users\Vartd\Desktop\Learning AI\vscode\android.keystore`
    — still only on this one machine; a real off-machine backup (cloud/
    password manager) is still outstanding. Losing this file + its
    password permanently blocks future updates to whatever Play listing
    it eventually signs.
  - Application ID (permanent once published): `io.github.nobody174.dungeonclicker9000`.
  - The app currently installs and runs correctly on a real Android
    phone, pointed at `.../Dungeon-clicker-9000/preview/` (the
    manually-triggered preview deploy path, separate from the real
    site) — confirmed working end-to-end, including catching and fixing
    a real multi-touch bug (see CHANGELOG.md 1.9.1) that only surfaced
    on a real touchscreen.
  - To test a new build on the phone again: trigger the deploy workflow
    manually (Actions tab → "Run workflow"), confirm `/preview/js/version.js`
    shows the expected version, then just reopen the already-installed
    app on the phone (no rebuild needed — it re-fetches the page live
    each time). Only rebuild in Android Studio if changing the icon/app
    name/manifest settings, not for ordinary gameplay code changes.
  - GitHub Pages `github-pages` environment now explicitly allows `v*`
    tag deploys (was `main`-branch-only before, fixed 2026-07-28) — a
    real release should deploy cleanly without needing a manual re-run
    this time.
- **v1.9.0 and v1.9.1 are both already live** on GitHub Pages + itch.io
  (progression rebalance, terminology fix, multi-touch fix, and the
  large-number display fix) — CHANGELOG.md is fully up to date, nothing
  from tonight is still sitting held-back.
- **A GitHub personal access token was briefly exposed in plaintext in
  git remote URLs earlier this session** — regenerated on GitHub's side
  immediately, remotes cleaned to plain HTTPS, git auth now goes through
  GitHub CLI's securely-stored OAuth token instead. Resolved, not an
  ongoing concern — noted here only so a future session doesn't
  rediscover this in old chat history and re-raise an already-closed
  issue.
- **Next intended step once Play Console access clears:** upload the
  Android build (bump its internal version code, rebuild via
  `bubblewrap build` or Android Studio, upload the `.aab` manually —
  this part is NOT automated by the GitHub Actions workflow, unlike
  Pages/itch.io) and go through the Play Store listing setup.

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
