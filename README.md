# Cap Garage

A bottle-cap collection for one young collector. Photograph a cap you found, the phone cuts the background
away on its own, and the cap lands in the garage as a 3D object on a pedestal.

Mobile only, offline-first, no accounts and no network in Phase 1: everything lives in the phone's own
storage. Three languages — Russian, English, Ukrainian. Built from a Claude Design prototype kept in
[`design/`](design/) for reference.

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

## How it is put together

- **Vite + React 18 + TypeScript (strict)**, plain CSS modules over the design tokens in
  [`src/styles/tokens.css`](src/styles/tokens.css). No UI kit.
- **Cutout** — [`src/cutout/`](src/cutout/): a Web Worker runs `@imgly/background-removal` (AGPL-3.0) and asks
  it for the mask only, then writes that mask into the alpha channel of the photo. The RGB pixels of the
  original are never altered, and the untouched original is kept alongside the cutout.
- **Storage** — Dexie over IndexedDB: caps, photos, tiles, settings.
- **Model files** are served from this site's own origin, so the app never calls another company's servers at
  runtime. The first cutout downloads ~56 MB (phones without WebGPU) or ~111 MB (with it), once.

Every technical decision and its reason is in [DECISIONS.md](DECISIONS.md).

## Deploying

A push to `main` builds the site and publishes it to GitHub Pages
([`.github/workflows/pages.yml`](.github/workflows/pages.yml)). The workflow mirrors the model files itself,
so nothing heavy is in git history.

## Licence

The app's own code has no licence yet. `@imgly/background-removal` is AGPL-3.0: publishing this app means its
source must stay available, which it is. Golos Text is under the SIL Open Font License
([`src/assets/fonts/OFL.txt`](src/assets/fonts/OFL.txt)).
