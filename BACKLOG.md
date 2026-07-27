# Dungeon Clicker 9000 — Open Backlog

Open/unresolved items only — bugs to fix, reports to investigate, features
needing a design pass before implementation. Once an item ships, its entry
moves to [CHANGELOG.md](CHANGELOG.md) (which is the historical record of
everything already shipped/committed/released) and is deleted from here.

---

## Feedback batch (2026-07-25) — external playtester report

Sourced from a written feedback/design-suggestion report (not Henvacelos —
a different player/tester). Cross-checked against the codebase before
logging — some items are genuinely new, one overlaps a fix already
shipped, one may be a misunderstanding of an existing deterministic
mechanic rather than a bug.

20. **Dodge mechanic reported as inconsistent — likely a
    discoverability gap, not a broken mechanic.** Report: "no clear
    criteria... regardless of how fast the player clicks or how quick
    their reflexes are, they still take unavoidable damage."

    **Investigated, likely NOT a bug.** `bossCombat.js`'s dodge is
    fully deterministic, zero RNG: press Dodge (button or `D` key)
    while `bossAttackState === "windup"` (a 1.4s telegraph window,
    shrinking to as low as ~1.08s at max Void Risk) → always succeeds,
    no roll, no hitbox, no click-speed dependency at all. The player's
    framing ("fast clicking," "reflexes," "i-frames," "hitbox
    precision") reads like they may be modeling this as an action-game
    reflex/twitch mechanic, when it's actually a simple "press this
    specific button within a visible window" mechanic — a different
    mental model entirely. Possible real gap underneath the
    misunderstanding: is the telegraph (⚠️ pulsing icon) visually
    obvious enough, and is there anywhere in-game that explains "dodge
    is a deliberate button press, not a reflex/speed check"?

    **Confirmed NOT a bug (2026-07-26)** — user playtested directly:
    the warning triangle is clearly visible over the player sprite,
    and pressing Dodge on seeing it has never once missed. Mechanic
    works exactly as designed; no code change warranted. Possible
    explanation for the original report: see item 27 below (reporter
    may be running an autoclicker and not actually watching the
    screen when the telegraph appears, which would read as "random"
    unavoidable damage from their perspective). Low priority — a
    one-time tooltip/tutorial toast on a player's first boss fight
    would still be a cheap, low-risk clarity add whenever there's
    spare time, but not chasing this as a real bug.

22. **Soul Shards / Void Fragments have no sink once fully
    upgraded — confirmed real, genuinely new.** Report: "lack of
    utility or progression paths to spend high-tier resources."

    Confirmed: every `shardShop` tier (`prestige.js`) and every
    `voidShop` tier (`voidFragments.js`) is finite (`max: 1` to `10`
    depending on tier) — once maxed, both currencies have literally
    nothing left to spend on. This is a real, structural gap distinct
    from Void Fragments' original "Run Rules" design (a deliberately
    small, capped first pass), not a regression.

    Candidate directions per the report's own suggestions (permanent
    upgrades, cosmetics, map modifiers, exclusive content), not scoped
    or decided here — needs its own design pass, likely sizeable enough
    to warrant a doc similar to ITEMIZATION_REDESIGN.md rather than a
    single BACKLOG entry, given "map modifiers"/"exclusive content"
    implies new systems, not just new shop rows.

    See also item 26 below — a separate player report about prestige
    being gold-only may overlap with this same "nothing to spend it on"
    gap; needs verification which of the two it actually is.

    **Note (2026-07-26):** fully maxing both currencies this soon after
    launch suggests either heavy organic play or the suspected-
    autoclicker pace flagged in item 27. Still a real gap worth fixing
    either way, but calibrate any new tiers against normal play, not
    this player's pace alone.

    **✅ Progression-ceiling half already fixed (v1.9.0, 2026-07-26).**
    The original framing bundled two things together — "endgame
    difficulty has no ceiling" and "shard/fragment currencies have
    nothing left to buy." The difficulty-ceiling half (formerly items
    21/25 here) is now fixed: monster scaling flattens past floor 150
    instead of compounding `1.8^tier` forever, and Soul Shards became
    the actual long-term scaling engine via milestone-stepped
    doublings instead of a flat linear multiplier — see CHANGELOG.md
    1.9.0. What's still open is specifically the *shop content*
    gap — shardShop/voidShop tiers are still finite lists with nothing
    new past max level. That's the remaining scope of this item: new
    shard/fragment sinks (permanent upgrades, cosmetics, map modifiers,
    exclusive content — the report's own suggestions), still needing
    its own design pass, now sequenced against a corrected curve
    instead of a broken one.

23. **Procedural "Abyss Mode" / online multiplayer — long-term,
    out of scope for now.** Report frames this explicitly as
    "after polishing the core game" / "long-term vision," not an
    immediate ask.

    Two very different asks bundled together:
    - **Procedural/infinite endgame mode** — conceptually adjacent to
      the existing Daily Challenge Run (`js/challenge.js`,
      `js/prng.js`'s seeded PRNG already exists). Feasible within this
      project's existing architecture (no backend needed) — a real
      future roadmap candidate, not scoped further here.
    - **Online multiplayer** — a fundamentally different scale of
      work, same category of decision as cloud save (explicitly
      declined for now — would need a backend/auth system this project
      previously chose not to build).

    **Direction (2026-07-26): a leaderboard, not real-time
    multiplayer.** Real-time multiplayer needs infrastructure this
    project has already declined to build (same category as cloud
    save). A leaderboard is the pragmatic version of "compete against
    others" without that cost, and sidesteps the "floor reached vs.
    ascend count vs. never-ascending" apples-to-oranges scoring
    problem by reusing the **Daily Challenge Run's existing seeded/
    timed format** (`js/challenge.js`, `js/prng.js`) — every entrant
    plays the identical seed for the identical fixed window, so "floor
    reached" is already a fair, comparable number with zero new game-
    design work. A separate, bigger idea floated alongside this —
    prestige-gated "worlds"/floor-reset tiers — is a real structural
    redesign in its own right and should stay a distinct future item,
    not folded into the leaderboard scope.

    **Decided (2026-07-27) — this is a real, wanted feature, not just
    a long-term idea; and the platform question is settled: use
    Google Play Games Services (GPGS) leaderboards, not a custom
    backend.** Given the imminent Google Play Store launch, GPGS gives
    free, built-in leaderboard + achievement infrastructure with zero
    hosting/backend to build or maintain — submit a Daily Challenge
    score, Google renders the leaderboard UI, players sign in with
    their existing Google account (no new auth system needed). This is
    also standard practice across idle/clicker games on Play Store,
    not a novel choice.

    **Known limitation, accepted as the v1 scope:** GPGS accounts are
    tied to Google/Android sign-in — an itch.io/browser player has no
    path into that system, so this leaderboard is Play-Store-only by
    nature, not a shared cross-platform ranking. Itch.io players simply
    won't have a leaderboard for now; a separate lightweight
    web-only leaderboard (custom backend) is a distinct, optional
    future item if that audience later turns out to justify the extra
    infrastructure — not something to build alongside or block v1 on.

    Not yet implemented — needs the actual GPGS integration scoped
    (Play Console setup, sign-in flow, score-submission call site
    hooked into `js/challenge.js`'s existing result/scoring path).

---

## Feedback batch (2026-07-26) — second report, same external playtester

26. **Prestige system's reward is gold-only — player asking for
    other bonus types.** Report: "Maybe prestige system should give
    other bonuses not just gold, not sure how you pretend to develop
    it but you got [it]."

    Needs verification against current `prestige.js` before scoping
    (not yet checked) — the report reads as a general variety request
    rather than a specific mechanic complaint. Possibly overlaps with
    item 22 (Soul Shards/Void Fragments having no sink once maxed) if
    the actual gap is "nothing to spend prestige currency on other
    than flat multipliers" rather than "prestige itself only grants
    gold." Needs a design pass to confirm which of the two it actually
    is before scoping candidate directions.

    Not implemented, not scoped — flagged for the next design/backlog
    session.

    **Note (2026-07-26):** same reporter as item 22 — see item 27
    (suspected autoclicker). Doesn't invalidate the "prestige is
    gold-only" complaint, but worth confirming this player's play
    pattern before treating it as urgent relative to other items.

    Soul Shards' own progression-ceiling problem is separately fixed
    (v1.9.0 — see item 22's update above); this item is specifically
    about reward *variety*, not the shard curve itself, and remains
    open.

---

## Meta / process item (2026-07-26)

27. **Suspected autoclicker use by the reporter behind items
    20/22/26 — needs a policy decision, not a code fix.** This single
    player has, within about a month of launch: reached floor 200+
    multiple times, fully maxed both Soul Shards and Void Fragments
    shops, 100%-cleared the 80-entry Trophy Room, and separately
    bragged about running a 1ms autoclicker — while also reporting the
    dodge mechanic as "inconsistent" (item 20), which a real
    1ms-interval autoclicker would plausibly produce (rapid unattended
    clicking with no actual attention on the telegraph warning)
    without it being a mechanic bug.

    This isn't a bug report — it's a design-policy question: does an
    autoclicker count as acceptable idle-game play (the genre already
    embraces automation/passive progress in principle), or does it
    undermine specific systems that assume human-paced input (Boss
    Combat's dodge timing, which explicitly rewards attentive manual
    play)?

    **Policy decided (2026-07-27) — now that item 23's leaderboard is
    a confirmed, wanted feature (Google Play Games Services), not
    just a maybe: don't build custom anti-cheat, use GPGS's own
    tooling.** Genre precedent is directly applicable here, not
    something to re-derive: idle/clicker games as a category already
    treat automation as a first-class, expected feature (that's what
    "idle" means) — they don't fight autoclickers on core gameplay at
    all. What the genre *does* gate is leaderboard framing/tooling
    specifically, and the standard, low-effort answer is:
    - **Frame the leaderboard as bragging rights, not a ranked
      ladder** — same framing the existing Daily Challenge Run already
      uses ("no permanent rewards, score/bragging-rights only"). This
      alone defuses most of the pressure to build detection systems.
    - **Let GPGS's built-in score-integrity/moderation tools be the
      anti-cheat layer**, rather than writing custom click-timing
      heuristics. Google Play Console already supports flagging/
      resetting suspicious leaderboard scores if abuse ever becomes a
      real, measured problem — build nothing until that's actually
      needed.

    No custom code planned. Revisit only if GPGS's built-in tooling
    turns out to be insufficient once the leaderboard is live and
    abuse is actually observed, not preemptively.

    Separately, regardless of which branch applies: continue excluding
    this reporter's pace from calibrating balance numbers in items
    22/26 (already noted inline on those entries) — that's a
    data-interpretation practice, not a policy enforcement mechanism,
    and applies either way.

    Not implemented, not scoped — revisit only if/when item 23
    (leaderboard) moves from "future idea" to active scoping; no
    action needed before then.

---

## Content pipeline (2026-07-27) — feeds item 22, sourced for a regular post-launch update cadence

Context: preparing a Google Play Store launch in the next few days, and
deliberately wants a queue of small, real, shippable improvements to
release on an ongoing cadence afterward (so the player base sees regular
updates, not one big patch then silence). This item is that queue —
several distinct ideas proposed together, reviewed and sequenced, NOT
meant to ship all at once.

**Review verdict on the shard-shop upgrade batch:** the proposed
Economy/Combat/Progression/Convenience/Fun category split is a good
organizing structure — better than today's flat `shardShop` list. But
most of the individual upgrades (Merchant's Blessing, Battle Hardened,
Critical Training, Crushing Blows, Giant Slayer, Treasure Hunter, Lucky
Purse) are flat additive-percentage bonuses reusing existing
`getTotalMult()` keys — the same *shape* of bonus the v1.9.0 balance
pass just showed doesn't fix long-term progression on its own (more
additive headroom delays a wall, doesn't remove one). Not rejected —
they're fine, low-risk, easy content-volume filler for the shard shop —
but they should be understood and marketed internally as "more options,"
not as "the fix" for item 22's "shards feel pointless" complaint. Two
ideas in the batch are genuinely different in kind and are the real
priority:

- **Veteran Adventurer** (every 25 floors *ever* reached permanently
  raises the starting floor of all future runs by 1) is the strongest
  idea in the batch — a genre-standard "respects the player's
  time" mechanic that directly answers "give shards a reason to keep
  mattering" in a way a bigger number never does.

  **Decided (2026-07-27):** starting-floor bonus does NOT scale the
  existing flat `startGold`/"Head Start" shard tier (+200g flat would
  be meaningless at, say, floor 30's economy) — instead, Veteran
  Adventurer grants its own small, capped "catch-up" gold gift on run
  start, sized to roughly afford the cheapest unit at the player's
  actual starting floor's price level. Keeps Head Start simple
  (unchanged, still just +200g flat for early game) and keeps Veteran
  Adventurer's effect self-contained rather than depending on whether
  the player also bought unrelated shard tiers. Uncapped forever,
  same reasoning as monster-tier scaling being uncapped. Still needs:
  exact 25-floor interval confirmed as final, and confirmation this
  doesn't create any weirdness with Prestige's floor-reset-to-1 logic
  (should be a pure "the run now starts higher," nothing else changes).

- **Momentum** (temporary stacking damage buff, capped stacks) is a
  good real-time combat-feel addition, architecturally similar in kind
  to Boss Combat v1 (a new tick-loop system, not a shop row).

  **Decided (2026-07-27), revised from the original pitch after
  thinking through boss-fight pacing:** the original framing (10s
  decay timer running from the very first kill) doesn't actually work
  — a player realistically can't land 50 kills inside a rolling 10s
  window once boss fights (with their own multi-second cadence) are
  in the mix, so the buff would almost never reach its stated cap in
  practice. Revised mechanic: **stacks build purely per-kill with no
  timer running at all until 50 stacks (max) is reached** — climbing
  from 0→50 is never at risk of decaying mid-climb. Only once at cap
  does a 10s countdown start; landing another kill before it expires
  refreshes the window (staying at cap indefinitely during a fast
  clear); if 10s passes with no kill, **all 50 stacks drop to 0 at
  once** (not a gradual per-stack decay — simpler to understand and
  matches how the pre-cap phase already has no partial-decay concept).
  Purely kill-based, no interaction with Boss Combat's dodge/HP system
  (confirmed: getting hit does not reset stacks). Math unchanged from
  the original pitch: +0.5%/stack × 50 stacks = +25% damage at cap.
  Should still be built and playtested in isolation before any
  shard-shop upgrade extends its cap/decay-window further.

**Full proposed upgrade list, categorized, not yet built (any of these
are fair game as small individual patches post-launch):**
- *Economy:* Merchant's Blessing (shop prices -2%/level, max 10),
  Lucky Purse (+500 starting gold/level, max 10), Treasure Hunter
  (+10% boss gold/level, max 10).
- *Combat:* Battle Hardened (+5% passive DPS/level, max 20), Critical
  Training (+1% crit chance/level, max 10), Crushing Blows (+20% crit
  damage/level, max 10), Giant Slayer (+2% boss damage/level, max 15).
- *Progression:* Veteran Adventurer (see above — priority), Efficient
  Ascension (+5% Soul Shards earned per Prestige/level, max 20),
  Ancient Knowledge (+1% Hero XP or similar per completed Prestige —
  placeholder pending whatever future Hero system exists to feed).
- *Equipment:* Treasure Sense (+5% equipment drop chance/level, max
  10), Blacksmith's Favor (cheaper equipment-related costs, max 10) —
  needs to be checked against whatever ITEMIZATION_REDESIGN.md lands on
  before finalizing, since that doc may add its own drop-rate levers.
- *Offline:* Time Compression (offline combat *speed*, not just
  *duration* — a genuinely different axis from the existing
  `offlineCap`/`offlineMastery` shard tiers), Auto Commander
  (auto-buys the cheapest affordable unit while offline).
- *Fun:* Monster Hunter (+5% Trophy Room discovery chance/level, or
  rare-monster-appearance-rate framing — zero balance risk, purely
  makes the Trophy Room feel more alive).

**Separate, structurally different idea: Soul Shard Milestones (spend-
based, not earn-based).** Distinct from — and complementary to —
v1.9.0's earned-shard milestone-doubling fix (which keys off
`totalShardsEarned`). This one keys off `state.shardsSpent` (already
tracked) and unlocks account-wide milestones at spend thresholds, so
shards feel valuable even after every current shop tier is maxed out.
Genuinely good direction — spend-gated unlocks create a reason to
actually spend rather than hoard, which an earn-based multiplier alone
doesn't do.

**Two example rewards fixed (2026-07-27) — the "100 spent" and "750
spent" rows referenced systems that already exist under a different
unlock condition, which would have double-gated them confusingly:**
- **"Unlock Void Fragments" (100 spent) → replaced with "Unlock a 4th
  Prestige shard-shop category."** Since Void Fragments are already
  unlocked by `prestigeCount >= 5`, this milestone instead reveals the
  *Progression* category from the new shard-shop upgrade batch above
  (Veteran Adventurer, Efficient Ascension) — hitting 100 spent shards
  now means genuinely new shop content appears, not a duplicate unlock
  of something already gated another way.
- **"Unlock Masteries" (750 spent) → replaced with "Unlock Mastery
  Overdrive."** Masteries already exist and are always available
  (`units.js`'s `MASTERY_MILESTONES` caps visibly at level 50/"Aura").
  This milestone instead raises that soft ceiling — a new 5th
  "Ascended" mastery tier unlockable past level 100 — giving veteran
  players still dumping gold into Mastery at endgame a reason to keep
  going instead of the sink going stale after Aura.

**Ancient Forge — shaped (2026-07-27).** Confirmed scope: **disenchant**
an owned item (Bag or equipped) into 1-2 "Essence" matching its rarity
tier, then spend Essence to **reroll one existing affix on a piece the
player already has equipped** — a straight stat replacement, not an
addition on top and not a merge of two separate items into a new one.
Deliberately ruled out "combine two items' affixes into a new custom
item" as too large/risky a system (combinatorial balance surface,
risks obsoleting the point of finding new drops) — reroll-in-place
keeps the power ceiling exactly where Itemization already defines it,
while still giving duplicate/unwanted drops real purpose. Needs its
own scope pass (essence costs, whether reroll can target a *specific*
affix slot or is fully random) once Itemization's final item/affix
list exists to reroll against.

**Hero Passives — confirmed (2026-07-27) as the same *shape* as
existing Void Fragment run-modifiers/Soul Shard shop tiers** — a new
pool of small permanent account-wide bonuses (flat DPS%, gold%, and at
least one QoL-flavored option — e.g. potions last longer, units
slightly cheaper), not a new mechanic to invent from scratch. Easiest
of the milestone rewards to design since it reuses an established
pattern rather than needing new systems.

**Still needing their own scope before being locked into the milestone
table:** "Relics" (boss-drop cosmetic/power item — needs its own
scope), "Mythic Bosses" and "Endless Challenges" (both genuinely new
endgame content, likely overlapping with item 23's procedural-endgame
idea).

**Sequencing relative to other open work:** this whole item stays behind
ITEMIZATION_REDESIGN.md's own sequencing (v1.9.0's curve fix has now
shipped and is live — see CHANGELOG.md — so that dependency is
cleared; itemization can move forward whenever picked up next) and
behind Veteran Adventurer/Momentum's own scoping passes. Individual small,
low-risk items from the categorized list above (Monster Hunter, Auto
Commander, Time Compression) can ship independently and out of order
whenever a quick regular-cadence patch is wanted — they don't depend on
anything else in this list landing first.

Not implemented, not fully scoped — logged as a working queue for
post-Play-Store-launch regular updates, per explicit request. Revisit
piece by piece rather than all at once.

**Gear Loadouts explicitly deferred (2026-07-27).** ROADMAP.md's
"Gear Loadouts" entry (Inventory/Bag system Part 2 — named loadouts
that swap all 3 equipped slots at once) is fully designed and
technically unblocked already (Part 1, the Bag itself, shipped in
v1.7.0), but confirmed not worth building yet at today's ~19-item
count — swapping between so few possible loadouts by hand isn't a
real problem to solve. Explicitly parked until after the Itemization
Overhaul ships and there's enough gear (6 slots, 100 items) that
loadout-swapping actually saves meaningful time.
