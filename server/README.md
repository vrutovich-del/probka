# Cap Garage server

A Cloudflare Worker: Hono for the routes, Drizzle over D1 for the catalogue, R2 for the photos.
Phase 2 gives the app accounts, sync between a phone and the server, and friends. The app itself keeps
working without any of it — a build with no `VITE_API_URL` is the offline, account-less Phase 1 app.

Today the Worker answers one route, `GET /api/health`. Tables arrive with accounts in item 2.

```
src/index.ts      the Worker: CORS, routes, health
src/db/schema.ts  the tables, as Drizzle sees them (empty until item 2)
migrations/       SQL written by drizzle-kit, applied by wrangler
wrangler.toml     bindings: D1 as DB, R2 as PHOTOS
```

## What already exists

Live at **https://cap-garage.v-rutovich.workers.dev**, in the account `v.rutovich@gmail.com`
(`98904ece681dccf28dac6394ef45088d`), on the free plan. The D1 database `cap-garage` and the R2 bucket
`cap-garage-photos` were created on 20 September 2026 with the two commands below, and the database's
id is in `wrangler.toml`. That id is not a secret — it names a database inside the account — so it
belongs in git, unlike the API token `wrangler login` keeps on the machine.

Starting over in another account takes:

```bash
npm install
npx wrangler login
npx wrangler d1 create cap-garage               # paste the printed id into wrangler.toml
npx wrangler r2 bucket create cap-garage-photos # R2 has to be switched on in the dashboard first,
                                                # or every R2 call fails with code 10042
```

## Working on it

```bash
npm run dev            # http://localhost:8787, with a local D1 and a local R2 under .wrangler/
npm run typecheck      # regenerates the binding types, then tsc
npm run db:generate    # schema.ts -> the next migration in migrations/
npm run db:apply:local # run the migrations against the local database
```

`npm run dev` passes `ENVIRONMENT=development`, which is the only thing that lets
`http://localhost:5173` and `:4173` through CORS. A deployed Worker reads `production` from
`wrangler.toml` and answers nothing but `https://vrutovich-del.github.io`.

The binding types (`worker-configuration.d.ts`) are generated, not written, and stay out of git:
`npm run types`, or any `npm run typecheck`, rebuilds them from `wrangler.toml`.

## Deploying

By hand, from this machine, never from GitHub Actions — a Cloudflare token in a public repository's
CI is a key to the children's photos.

```bash
npm run db:apply:remote   # first, so the schema is never behind the code
npm run deploy
```

`wrangler deploy` prints the address. Check it:

```bash
curl https://cap-garage.v-rutovich.workers.dev/api/health
```

A healthy answer is `200` with `{"ok":true,…}`; `db.migrations` is how many migrations that database
has (0 until item 2). Anything broken answers `503` and names what failed. Live logs:
`npx wrangler tail`.

Then tell the app where the server is — a repository variable named `API_URL`, which the Pages
workflow passes to the build as `VITE_API_URL`:

```bash
gh variable set API_URL --body https://cap-garage.v-rutovich.workers.dev
```

(or repository **Settings → Secrets and variables → Actions → Variables**; no trailing slash). The
next push to `main` builds the app against it, and deleting the variable puts the app back to Phase 1
behaviour on the build after that. The address is public — it ends up in the published JavaScript
either way — which is why it is a variable and not a secret, and why every route that touches data
checks a token instead of trusting the caller.

## Free-tier room

Workers 100k requests a day, D1 5 GB with 5M rows read and 100k written a day, R2 10 GB and 1M writes
a month. A circle of ten children with a few hundred caps each is far inside all of it — see
`../DECISIONS.md` for why this replaced a rented VM.
