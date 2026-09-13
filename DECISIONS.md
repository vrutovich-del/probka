# Decisions

One line per technical decision and why. Newest at the bottom.

- Vite + React 18 + TypeScript strict — stack fixed by the project brief; React 18 per brief even though 19 is current.
- Plain CSS modules with design tokens as CSS variables, no UI kit — brief; tokens come from `design/…/Design System.dc.html`.
- vite-plugin-pwa for install and the offline shell (added in Phase 1 item 6) — brief.
- Dexie over IndexedDB for caps, photo blobs, badges, settings and the sync queue — brief; each table is added in the item that first needs it.
- @imgly/background-removal in a web worker for the cutout (added in item 2) — brief; it masks the original pixels instead of regenerating them. Its license is AGPL-3.0 (open question before item 2).
- `<input type="file" accept="image/*" capture="environment">` is the primary capture path, getUserMedia preview only behind a feature check — brief; most reliable on iOS Safari and Android Chrome PWAs.
- i18next with three JSON files generated from the strings table — brief.
- Phase 2 backend: Node 20, Fastify, PostgreSQL, Drizzle, Docker Compose on one Hetzner VM; Sign in with Apple/Google; guests stay local-only until linked — brief.
- react-router 7.18.3 in library mode — v8 requires React ≥19.2.7; 7.18.x is the newest line that supports React 18.
- A small `useT` hook over i18next instead of react-i18next — react-i18next is not on the approved library list.
- Flat translation keys (`keySeparator: false`) — the strings table has keys that are both a string and a prefix (`settings.delete` / `settings.delete.note`), which nested JSON cannot hold.
- TypeScript 7.0 for typechecking only; Vite transpiles — current stable; fall back to 6.0 if a tool needs the old compiler API.
- Two tsconfigs (app with DOM types, node for vite.config.ts), checked with `tsc -p` each — keeps browser code from seeing Node globals.
- Golos Text variable woff2 (weights 400–900), cyrillic and latin subsets only, self-hosted in `src/assets/fonts` — covers ru/en/uk in 60 KB; Vite hashes the files so the PWA precache can pick them up.
- Unnamed greys the prototype screens use (#565656, #232323, #2E2E2E …) are named by role in `tokens.css` — components never carry raw hex.
- Tab bar and rarity glyphs (⌂ ◎ ◈ ◉ ● ■ ▲ ◆ ★ ◌) are drawn as inline SVG — Golos Text has none of them, so fallback fonts would render them differently on iOS and Android.
- The app is a 390px column, #000 outside it, bg/base #0B0B0B inside, theme-color #0B0B0B — brief says centered on black; the token page defines the app ground.
- Settings live in a Dexie key/value table read before the first render — the chosen language shows immediately, with no flash of the wrong one.
- Git: the Claude Design handoff sits in `design/` as the root commit on `main`; each phase is a `phase-N` branch with one commit per item — every phase can be reviewed as a single diff.
- `scripts/strings-to-json.mjs` regenerates `en.json` from the design table with explicit rules for its shorthand rows, and checks `ru.json`/`uk.json` for missing keys, plural forms (via `Intl.PluralRules`) and placeholder drift — the table stays the source of truth for English, translations are hand-maintained.
- Language endonyms (English / Русский / Українська) are a code constant, not string keys — they read the same in every UI language, and a translator "translating" them would break the picker.
- The first-launch picker renders in a guess from `navigator.languages` and marks that row current; the pick still decides and is the only thing saved — the design's trilingual header needs a language to render in.
- ru/uk drafts use the formal вы/ви, following the design's own RU sample ("Найдите крышку и дайте ей дом") — switch to ты/ти is a global find-and-replace if the native review prefers it.
- Active tab = green + weight 600 + a 4px dot; the prototype changes color only, which the brief forbids as a sole cue.
- Tap targets: the tab bar's outer padding moved into the tab links (53px tall); back links get an invisible 48px hit area via `::after` — visuals stay pixel-identical to the prototype.
- `#root` is a flex column so a screen renders full-height with or without the tab shell — the first-launch picker sits outside the shell and must still center vertically.
