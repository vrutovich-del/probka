# Cap Garage

A bottle-cap collection for one young collector. Photograph a cap you found, the phone cuts the background
away on its own, and the cap lands in the garage as a 3D object on a pedestal.

Mobile only and offline-first: everything lives in the phone's own storage, and the server is a
background it can do without. Three languages — Russian, English, Ukrainian. Built from a Claude Design
prototype kept in [`design/`](design/) for reference.

**Live:** https://vrutovich-del.github.io/probka/

## Running it

```bash
npm install
npm run cutout-model   # once: mirrors the cutout model into public/cutout (~160 MB, not in git)
npm run dev            # http://localhost:5173, and the LAN address for a phone
```

The camera and the service worker need a secure context, so a phone on `http://192.168.x.x` can pick a photo
from the gallery but cannot open the camera. Use the published site, or `tailscale serve 5173` for an HTTPS
address on your own network.

Other scripts: `npm run build` (typecheck + production build), `npm run typecheck`, `npm run strings`
(regenerates the locale files from the design's strings table), `npm run preview`.

The service worker is off in dev. To try the offline behaviour, `npm run build && npm run preview`, load
http://localhost:4173, then stop the server and reload: the app, its fonts and its images come from the
precache. `scripts/make-icons.py` and `scripts/clean-badge-art.py` are one-off asset scripts, not part of
the build; they need Pillow and SciPy, which the app does not.

## How it is put together

- **Vite + React 18 + TypeScript (strict)**, plain CSS modules over the design tokens in
  [`src/styles/tokens.css`](src/styles/tokens.css). No UI kit.
- **Cutout** — [`src/cutout/`](src/cutout/): a Web Worker runs `@imgly/background-removal` (AGPL-3.0) and asks
  it for the mask only, then writes that mask into the alpha channel of the photo. The RGB pixels of the
  original are never altered, and the untouched original is kept alongside the cutout.
- **Storage** — Dexie over IndexedDB: caps, photos, tiles, settings.
- **Model files** are served from this site's own origin, so the app never calls another company's servers at
  runtime. The first cutout downloads ~56 MB (phones without WebGPU) or ~111 MB (with it), once.
- **Installable and offline** — `vite-plugin-pwa` precaches the shell (1.3 MB) and caches the model and the
  ONNX runtime the first time they are fetched, so a cap can be added, cut out and looked at with no network.
- **The server** — [`server/`](server/): a Cloudflare Worker (Hono, Drizzle over D1, photos in R2) that
  Phase 2 uses for accounts, sync and friends. The app is built against it only when `VITE_API_URL` is set;
  without it the app is the account-less, network-less one of Phase 1. See [`server/README.md`](server/README.md).

Every technical decision and its reason is in [DECISIONS.md](DECISIONS.md). [HANDOFF.md](HANDOFF.md) is the
brief for picking the work up in a fresh session: current state, what is left in Phase 1, open questions.

## Deploying

A push to `main` builds the site and publishes it to GitHub Pages
([`.github/workflows/pages.yml`](.github/workflows/pages.yml)). The workflow mirrors the model files itself,
so nothing heavy is in git history.

## Licence

The app's own code has no licence yet. `@imgly/background-removal` is AGPL-3.0: publishing this app means its
source must stay available, which it is. Golos Text is under the SIL Open Font License
([`src/assets/fonts/OFL.txt`](src/assets/fonts/OFL.txt)).
