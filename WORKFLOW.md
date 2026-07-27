# Workflow — Dungeon Clicker 9000

Rewritten 2026-07-28 — the release process changed significantly that
session (see ROADMAP.md's "Current status" section and CHANGELOG.md
1.9.0/1.9.1 for the full story). The old "push origin = auto-publish to
itch.io on every push" model is gone.

## One remote in active use: `origin`

| Remote | Repo | Visibility | Use for |
|--------|------|------------|---------|
| `origin` | dungeon-clicker-9000 | 🌍 Public | All commits — safe by default now, see below |
| `dev` | dungeon-clicker-9000-dev | 🔒 Private | Still exists, not used this session — historical/optional |

**Pushing commits to `origin main` no longer deploys anything by
itself.** `.github/workflows/deploy.yml` only runs tests on a plain
push — GitHub Pages and itch.io stay untouched. This means ordinary
`git push origin main` is now a safe, low-stakes action (commit and
back up your work), not a publish button.

## Three distinct actions, three different effects

1. **`git push origin main`** — safe. Runs tests only. Nothing goes
   public. Use freely, same as the old `dev` push used to be.
2. **Manually trigger the workflow** (GitHub → Actions tab → "CI/CD —
   Test, Preview & Release" → "Run workflow") — deploys the current
   `main` to a separate `.../preview/` subpath on GitHub Pages only.
   Safe to run anytime for testing (e.g. the Android/Bubblewrap app
   pointed at this URL) — does not touch itch.io or the real site.
3. **Push a version tag** (`git tag vX.Y.Z && git push origin vX.Y.Z`)
   — the one real "release to the world" action. Deploys to the real
   GitHub Pages site **and** itch.io simultaneously. Only do this when
   ready to ship.

## Releasing a new version, step by step

1. Commit and push work to `origin main` as normal (safe, no deploy).
2. Bump `package.json`'s `"version"` and `js/version.js`'s
   `GAME_VERSION` to match; add a dated CHANGELOG.md entry.
3. `git tag -a vX.Y.Z -m "..."` then `git push origin vX.Y.Z`.
4. Confirm both `deploy-release` (GitHub Pages) and `deploy-itch`
   succeeded — `gh run list --workflow=deploy.yml --limit 1`. If
   GitHub Pages fails with an "environment protection rules" error,
   see ROADMAP.md's note on the `github-pages` environment's tag
   policy — that was a one-time setting fixed on 2026-07-28, shouldn't
   recur, but check there first if it ever does.

## Quick reminder

- Plain push to `origin main` = **safe, no deploy** (commit/backup only).
- Manual workflow trigger = **preview only**, for testing (Android app,
  etc.), never touches the real site or itch.io.
- Version tag push = **the real publish button** — GitHub Pages +
  itch.io go live together, in one action.
