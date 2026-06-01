# Workflow — Dungeon Clicker 9000

## Two remotes, two purposes

| Remote | Repo | Visibility | Use for |
|--------|------|------------|---------|
| `dev` | dungeon-clicker-9000-dev | 🔒 Private | Daily saves, work in progress |
| `origin` | dungeon-clicker-9000 | 🌍 Public | Releases only — triggers itch.io deploy |

---

## Day to day — push to dev (safe, private)

```
git push dev main
```

Use this anytime. Nobody sees it. Good habit after every session.

---

## Ready to release — push to origin (public)

```
git push origin main
```

⚠️ This is the publish button. It will:
- Make your code visible to everyone
- Trigger CI/CD and auto-deploy to itch.io
- Show up in your public GitHub history

Only do this when you are happy for the world to see it.

---

## Quick reminder

- `dev` = **save button** — use freely
- `origin` = **publish button** — use when ready to ship
