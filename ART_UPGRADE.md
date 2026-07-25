# Real Artwork Pass — Design Doc (draft, 2026-07-24)

Status: **DESIGN ONLY — not approved, not scheduled.** Logged from a
player observation (Henvacelos: the Skeleton monster's 🦴 icon reads
less "skeleton" than the Lich King boss's 💀) that surfaced a real
ceiling in the current emoji-icon system, not a request for this
specific swap — the swap itself was declined (both icons stay as-is;
Skeleton = "a bone-person," Lich King = "the bone-king").

## Why this is a real question, not just a nice-to-have

Every visual identity in the game today — monsters, tier variants,
equipment, heroes — is a single emoji character rendered via
`innerHTML`/`textContent`. That's worked well as a placeholder through
19 items, 10 base monsters × 8 tiers, and 8 heroes, but it has a hard
ceiling: emoji are a fixed, shared vocabulary nobody controls the
exact rendering of (they differ slightly per OS/browser/font), and
there's no way to make one mean something more specific than its
existing everyday meaning — you can't make 💀 mean "regal undead
sorcerer" instead of "skull," you just borrow the closest existing
emoji and hope the reading lands, which is exactly what happened here.

## Current technical footprint (confirmed, not estimated)

Every icon in the codebase is a plain string property on a data array,
rendered identically everywhere:

- `js/monsters.js` — `monsters` array, `icon: "🦴"` etc. (10 base
  entries). Rendered in `loadMonster()`: `emojiEl.innerHTML =
  <span class="tier-icon ...">${base.icon}</span>`.
- `js/equipment.js` — `equipment` array, `icon: "🗡️"` etc. (19 items).
  Rendered via `${item.icon}` string interpolation in `renderEquipment()`
  / `renderInventory()`.
- `js/heroes.js` — `heroes` array, `icon: "🏹"` etc. (8 heroes).
- `js/trophies.js` — reuses `monsters.js`'s icons for the Trophy Room
  gallery (no separate icon set to update).

This uniformity is good news for a future swap: there is exactly one
place per system (monster/item/hero) holding the icon value, and
exactly one rendering call site pulling it — no duplicated icon logic
to hunt down.

## What "real artwork" would actually require

Confirming your instinct: yes, technically just PNG (or SVG) files and
a rendering change from `<span>{emoji}</span>` to `<img src="...">` /
a CSS `background-image`. The cost isn't code — it's everything upstream
of the code:

1. **Scope decision: monsters only, or monsters + gear + heroes?**
   Doing only monsters risks a jarring "half real-art, half emoji" look
   (a painted Lich King boss next to an emoji sword icon in the loot
   modal). Recommend scoping this as monsters-first (10 base creatures,
   the highest-visibility content) with gear/heroes as an explicit,
   separately-approved follow-on — not because they don't matter, but
   because 10 assets is a boundable first pass and ~37 (10 monsters +
   19 items + 8 heroes) is not.

2. **Tiered variants.** Today's `TIER_PREFIXES` system (Feral/Acid/
   Shadow/Frozen/Infernal/Voidtouched/Ascendant, `js/monsters.js`)
   recolors the base emoji in place via a CSS filter + colored ring
   (`.tier-icon` rules in `index.html`) rather than needing 8 separate
   emoji per creature. The same trick works on real art — a CSS
   `filter: hue-rotate(...)` + border ring over a single base PNG per
   monster, not 80 hand-made tier variants. This keeps the asset count
   at 10 images, not 80, regardless of the art-sourcing method chosen.

3. **Asset sourcing options** (not decided here — needs your call):
   - **AI-generated art** (e.g. via an image model) — fastest, cheapest,
     but needs a consistent style prompt/seed across all 10 so they
     read as one game's art, not 10 unrelated images. Also worth
     checking itch.io's and Patreon's current policies on AI-generated
     game assets before committing, since platform stances on this
     shift periodically.
   - **Commissioned art** (a freelance illustrator) — most consistent
     quality/style, real cost and lead time, and ongoing cost if the
     game keeps adding creatures later.
   - **Stock/licensed asset packs** (e.g. itch.io's own asset marketplace,
     which sells exactly this kind of RPG monster sprite pack) — fast,
     often cheap or free for indie use, but style has to be picked to
     match rather than custom-defined, and license terms need checking
     (attribution requirements, commercial-use terms for a Patreon-
     monetized game).

4. **Format/size**: whatever's chosen, keep assets small (this is a
   no-build-step static site — large images directly increase page
   load, unlike code which is already tiny). Recommend capping at
   something like 128×128 or 256×256 PNG/WebP per creature, matching
   how compact the rest of the site is.

## Suggested technical plan (once art exists)

1. Add an `assets/monsters/` (or similar) folder alongside `js/`.
2. Add an optional `image` field to each `monsters.js` entry — keep
   `icon` (emoji) as a fallback so nothing breaks if an asset is
   missing for a given creature mid-rollout (partial art pass, e.g.
   ship 3 monsters' art now, rest later, without a broken half-state).
3. `loadMonster()`'s render call switches to: if `image` present, render
   an `<img>` (or CSS background) with the existing `.tier-icon` class
   for the recolor/ring treatment; else fall back to today's emoji
   `<span>`.
4. No save-format impact at all — icons/images are purely derived
   from floor/item id, never stored in a save the way `BACKLOG.md`'s
   SAVESTATE SAFETY rule would care about.

## Open questions before this becomes buildable

1. Scope: monsters-only first pass, or a specific short list including
   a couple of heroes/items too?
2. Sourcing method (AI-generated / commissioned / licensed pack) —
   biggest cost/time/consistency tradeoff, needs your decision.
3. Budget/timeline, if commissioning or buying a licensed pack — this
   doc doesn't assume a cost, since that depends entirely on #2.

**Not scheduled. Revisit when there's a concrete answer to the above,
or when the Post-launch/Itemization/Inventory work has more runway.**
