# Patreon Post Templates

Reusable structure for the two recurring Patreon post types, so future
posts stay consistent in voice/format without re-deriving it each time.
This file holds structure only — actual drafted post content should be
written to a separate gitignored file, posted, then deleted (see
DEV_TESTING.md-style workflow: this repo doesn't keep posted drafts
around after they've served their purpose).

## Voice/tone baseline (both post types)
- Casual-friendly, first person, exclamation points used sparingly but
  present ("Let's get into it.")
- Emoji section headers (one emoji per `###`), consistent per-topic:
  🐛 fixes, 🔍 clarifications, 🎒 inventory, ⚔️ combat/items, 💾 saves,
  🔭 what's next, 🙏 thanks.
- Bold the feature name on first mention in a bullet, plain text after.
- Closing line is always some variant of "More updates soon — happy
  grinding! ⚔️✨"

## Template A — Patch/Changelog post (public, every real release)

```markdown
## ⚔️ Dungeon Clicker 9000 — <theme/title> (v<version>)

Hey everyone! <1-2 sentence hook tying this release together>

### 🐛 What Got Fixed / ⭐ What's New
<bullets, one feature per line, bold the name, one sentence of player-facing impact each>

### 🔍 What Turned Out to Be Working As Intended  (omit section if N/A)
<only include if this release resolved a player report that wasn't a real bug>

---

### 🔭 What's Next
<1 short paragraph, high-level only, no numbers/specifics — teaser not a commitment>

---

🙏 **Thank You** (or **Special Thanks** if crediting a specific reporter)
<if a specific player's feedback drove this release, name them here>

More updates soon — happy grinding! ⚔️✨
```

Source of truth for what to summarize: CHANGELOG.md's most recent
version entry + BACKLOG.md's matching "SHIPPED" write-up. Translate
implementation details (function names, file paths) into player-facing
outcomes — nothing technical belongs in this post.

## Template B — Roadmap/direction post (Patreon-supporters-only)

**Why supporter-only, not public:** protects against publicly
committing to unbuilt/unscoped features before the design is validated
by actually building it. See ROADMAP.md's "Planned — future major
patch" section for what's fair game to preview this way.

**Lighter-touch rule:** name the *pillars* (e.g. "a real inventory,"
"a bigger item system"), never the *exact numbers* from a design doc
(not "6 slots," not "100 items," not internal codenames like "Path of
the Reaper" pre-launch). Numbers are a promise; direction is not.

```markdown
## 🔭 Dungeon Clicker 9000 — Where This Is Headed (Supporter Preview)

Hey everyone — <framing: this is direction, not a dated commitment>.

### <emoji> <Pillar 1 name>
<1-2 sentences: the player-facing problem today, the direction (not the spec) of the fix>

### <emoji> <Pillar 2 name>
<same shape>

### <emoji> <Pillar 3 name, optional>
<same shape>

---

<explicit "not set in stone" disclaimer paragraph>

Thanks for backing this — more soon. ⚔️✨
```

Source of truth for pillars: ROADMAP.md's "Planned — future major
patch" section — translate each linked design doc's *purpose*, not its
specifics, into a pillar.

## Workflow

1. Draft the actual post content in a new gitignored file (e.g.
   `PATREON_UPDATE_DRAFT.md`, `PATREON_ROADMAP_DRAFT.md` — both already
   in `.gitignore`, use those same filenames so nothing new needs
   ignoring).
2. Review, edit, post it on Patreon.
3. Delete the draft file once posted — this template is what persists,
   not the one-off content.
