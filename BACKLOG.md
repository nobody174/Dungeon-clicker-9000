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

21. **Difficulty curve has no ceiling or new content past floor
    200 — confirmed real, genuinely new.** Report: "very sharp spike
    in difficulty after floor 200... prevents smooth progression."

    Confirmed mathematically: `monsters.js`'s `getMonsterIdentity()`
    scales both monster stats AND player max HP by `1.8^tier`,
    completely uncapped — floor 200 is tier 19, i.e. `1.8^19` ≈
    156,000× base stats, with no new mechanic, unit, or upgrade tier
    introduced past whatever currently exists to keep pace.

    Candidate directions, not decided or scoped here:
    - Flatten the exponential curve at some point (e.g. switch from
      pure `1.8^tier` to a slower-growing function past a threshold
      tier) — purely a numbers change, no new content, but a real
      rebalance of every existing tier past that point.
    - Introduce new unit/weapon/upgrade tiers gated deep enough to
      keep pace with the curve instead of flattening it (keeps the
      "number goes up forever" idle-game feel, but is ongoing content
      work, not a one-time fix).
    - Some combination: flatten growth *and* add periodic new power
      tiers, so progression stays smooth without the curve needing to
      do all the work forever.

    See also item 25 below — the Trophy Room "stuck past floor 240"
    report is a direct downstream symptom of this same root cause
    (`TIER_PREFIXES` capping at 8 entries/tier 7+) and should be
    resolved as part of whatever fix lands here, not separately.

    **Note (2026-07-26):** this player is very likely the same
    reporter flagged in item 27 (suspected autoclicker use). Reaching
    floor 200+ multiple times and fully maxing Soul Shards/Void
    Fragments (item 22) this fast after launch is an extreme pace —
    doesn't invalidate that the difficulty-wall/no-endgame-sink gaps
    are real design issues worth fixing, but this player's specific
    pace shouldn't be treated as representative of normal play when
    picking numbers for the eventual rebalance.

    **Direction decided (2026-07-26) — fix the tier/floor ceiling
    first; item-slot expansion is a separate later patch, not a
    substitute.** Considered and rejected a "purchasable new equipment
    slots (Head/Legs/Amulet), gated behind shard/void/gold cost, that
    unlock new item drops once bought" idea as the primary fix for
    items 21/22/25/26 together. Pushback: that gives shards/fragments
    something to spend once (a real but one-time sink, addresses item
    22/26's "nothing to spend on" complaint) but doesn't touch the
    actual reported wall — #21 and #25 are about *floor/tier*
    progression flatlining past tier 8, and new item slots don't move
    that ceiling at all; a player would equip the new slots once and
    still be staring at the same "Ascendant" monster identity forever.
    New slots is the smaller, narrower idea; raising the tier cap (or
    flattening the growth curve) is what actually unblocks #21 *and*
    #25 *and* gives future itemization work somewhere new to matter.

    **Decided sequencing:** fix the tier/floor ceiling first (extend
    `TIER_PREFIXES` past 8 entries and/or flatten the `1.8^tier`
    curve past a threshold — the two candidate directions already
    listed above), *then* treat item-slot/rarity expansion (new
    equipment slots, a purchase-gated unlock system, new drop tables
    per slot) as a follow-on major content patch reusing the
    itemization redesign already scoped separately in
    ITEMIZATION_REDESIGN.md (6 slots, 5 rarities, 100 items — deferred
    as a "future major patch" when items 12/16 shipped). Not scrapping
    the slot-purchase idea, just sequencing it behind the ceiling fix
    so it lands as real new depth rather than a one-time sink bolted
    onto an unchanged ceiling.

    Needs a real design pass (numbers modeling against the existing
    curve) before any of these get scoped further.

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

    **Note (2026-07-26):** same caveat as item 21 — fully maxing both
    currencies this soon after launch suggests either heavy organic
    play or the suspected-autoclicker pace flagged in item 27. Still a
    real gap worth fixing either way, but calibrate any new tiers
    against normal play, not this player's pace alone.

    **Sequencing (2026-07-26):** see item 21's "Direction decided"
    note — new shard/fragment sinks (including any item-slot-purchase
    system) are sequenced *after* the tier/floor ceiling fix, as a
    follow-on itemization patch, not the primary answer to this gap.

23. **Procedural "Abyss Mode" / online multiplayer — long-term,
    out of scope for now.** Report frames this explicitly as
    "after polishing the core game" / "long-term vision," not an
    immediate ask.

    Two very different asks bundled together:
    - **Procedural/infinite endgame mode** — conceptually adjacent to
      the existing Daily Challenge Run (`js/challenge.js`,
      `js/prng.js`'s seeded PRNG already exists) and to item 21's
      difficulty-curve problem above (an "Abyss" mode is one possible
      answer to "what's the endgame loop," alongside just fixing the
      curve). Feasible within this project's existing architecture (no
      backend needed) — a real future roadmap candidate, not scoped
      further here.
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
    design work. Needs only: a lightweight backend/API to accept and
    rank score submissions (the one piece of new infrastructure this
    would require) plus a leaderboard UI. A separate, bigger idea
    floated alongside this — prestige-gated "worlds"/floor-reset tiers
    — is a real structural redesign in its own right and should stay a
    distinct future item, not folded into the leaderboard scope.

    Not implemented, not scoped — logged as a long-term idea per the
    report's own framing, not a near-term backlog item. Revisit only
    once nearer-term items (bug fixes, the #21/#22 endgame gaps) are
    further along.

---

## Feedback batch (2026-07-26) — second report, same external playtester

25. **Boss Trophy Room appears "stuck" past floor ~240 — confirmed
    real, same root cause as item 21.** Report: "the info says that
    they are at 1+, i have passed from 200 some times already... after
    240 it's like hitting a wall."

    Confirmed in code, not a bug — a direct consequence of a known
    tier-collapse scope cut: `monsters.js`'s `TIER_PREFIXES` has
    exactly 8 entries, and every tier from 7 upward
    (`Math.min(tier, TIER_PREFIXES.length - 1)`, `monsters.js:63`)
    collapses into the same "Ascendant" identity — tier 7 starts at
    floor 71, so every floor from 71 through 240+ (and beyond)
    presents as visually/mechanically identical monsters with no new
    trophy-gallery entries to unlock. The player is correctly reading
    the UI — the gallery genuinely has nothing left to show them past
    tier 7, not a display bug. This is the same underlying "no ceiling
    past floor 200" gap already logged as item 21 (difficulty curve),
    just observed through the Trophy Room instead of raw difficulty —
    both are downstream of `TIER_PREFIXES` being a deliberately
    bounded 8-entry list.

    Not a separate fix — should be resolved as part of whatever design
    pass addresses item 21 (extending `TIER_PREFIXES` past 8 entries,
    or introducing a different late-game identity system, would
    automatically unstick the Trophy Room too). Logged separately here
    only because it was reported as its own confusion point, distinct
    from the raw "difficulty spikes" framing of item 21.

    **Note (2026-07-26):** fully clearing all 80 trophy-gallery
    entries this soon — same reporter as items 21/22/26 — is the same
    "extreme pace" signal flagged in item 27 (suspected autoclicker).
    Doesn't change that the content wall is real, just a data point on
    how this particular player got there so fast.

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

    **Note (2026-07-26):** same reporter as items 21/22/25 — see item
    27 (suspected autoclicker). Doesn't invalidate the "prestige is
    gold-only" complaint, but worth confirming this player's play
    pattern before treating it as urgent relative to other items.

    **Sequencing (2026-07-26):** same as item 22 — any new prestige
    reward variety is sequenced after item 21's tier/floor ceiling
    fix, as part of the same follow-on itemization/rewards patch, not
    a standalone fix ahead of it.

---

## Meta / process item (2026-07-26)

27. **Suspected autoclicker use by the reporter behind items
    20/21/22/25/26 — needs a policy decision, not a code fix.** This
    single player has, within about a month of launch: reached
    floor 200+ multiple times, fully maxed both Soul Shards and Void
    Fragments shops (item 22), 100%-cleared the 80-entry Trophy Room
    (item 25), and separately bragged about running a 1ms autoclicker
    — while also reporting the dodge mechanic as "inconsistent" (item
    20), which a real 1ms-interval autoclicker would plausibly produce
    (rapid unattended clicking with no actual attention on the
    telegraph warning) without it being a mechanic bug.

    This isn't a bug report — it's a design-policy question: does an
    autoclicker count as acceptable idle-game play (the genre already
    embraces automation/passive progress in principle), or does it
    undermine specific systems that assume human-paced input (Boss
    Combat's dodge timing, which explicitly rewards attentive manual
    play)?

    **Policy decided (2026-07-26) — conditional on item 23
    (leaderboard).** No blanket stance either way; it depends entirely
    on whether a competitive/comparative feature exists:
    - **If no leaderboard ever ships** (single-player, solo-progress
      game as it stands today): autoclicker use is a non-issue — "play
      however you want" applies, since nothing compares one player's
      progress against another's. No code change needed under this
      branch.
    - **If item 23's leaderboard ships:** autoclicker use becomes a
      fairness question the moment scores are compared publicly, and
      would need an actual policy (client-side click-interval floor,
      required-manual-input framing for leaderboard eligibility only,
      or explicitly allowing it and accepting automated scores on the
      board) — but only decide this if/when item 23 is actually being
      built, not preemptively.

    Separately, regardless of which branch applies: continue excluding
    this reporter's pace from calibrating balance numbers in items
    21/22/26 (already noted inline on those entries) — that's a
    data-interpretation practice, not a policy enforcement mechanism,
    and applies either way.

    Not implemented, not scoped — revisit only if/when item 23
    (leaderboard) moves from "future idea" to active scoping; no
    action needed before then.
