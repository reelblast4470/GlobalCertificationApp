# How to Run This Project

## Option 1 — Just look at it (no install)

The app is already running in this workspace. Use the **Live Preview** panel in the Arena UI,
or open the proxied URL:

```
https://5173-<sandbox-id>.e2b.app
```

⚠️ **Do not open `http://169.254.0.21:5173/`** — that is a link-local address that only exists
*inside* the sandbox container. It will never work from your browser. Vite prints it as
"Network" but it is not reachable from outside.

If the preview shows `error` or is blank:
1. Hard-refresh the preview frame (it may be holding an old cached response).
2. Make sure the URL ends with `/` and add `#/home` if the page is blank.
3. Check the dev server is alive: the preview panel is driven by the background process
   named **Exam Coach**.

## Option 2 — Run it on your own machine

You need **Node.js 18+** (this was built on Node 20).

```bash
# 1. copy the exam-coach/ folder to your machine, then:
cd exam-coach

# 2. install dependencies (~80 packages, ~20 seconds)
npm install

# 3. start the dev server
npm run dev
```

Vite prints something like:
```
➜  Local:   http://localhost:5173/
```
Open **http://localhost:5173/** in your browser. On your phone, use the printed
`Network:` address (e.g. `http://192.168.x.x:5173/`) while on the same Wi-Fi.

To let your phone reach the dev server you may need:
```bash
npm run dev -- --host
```

## Option 3 — Build and host it anywhere (recommended for phones)

This produces a **static folder** — no server, no Node, no database.

```bash
cd exam-coach
npm install
npm run build      # output in dist/  (~270 KB JS, ~85 KB gzipped)
npm run preview    # test the production build locally
```

Then drag `dist/` onto any of these — all free:
- **Netlify Drop** — app.netlify.com/drop
- **Vercel** — `npx vercel dist`
- **GitHub Pages** — push `dist/` to a `gh-pages` branch
- **Any USB stick / old laptop** — open `dist/index.html`

Because `base: './'` is set in `vite.config.ts`, it works from a sub-folder too
(e.g. `https://you.github.io/exam-coach/`).

## Install it on your phone (PWA)

1. Open the hosted URL in Chrome (Android) or Safari (iPhone).
2. Android: menu (⋮) → **Install app** / **Add to Home Screen**.
3. iPhone: Share → **Add to Home Screen**.

It then opens full-screen with no browser chrome and works **with no internet** —
the service worker caches the shell and all progress is stored on the device.

⚠️ The service worker only registers in **production builds** (`npm run build`),
not in `npm run dev`. That is deliberate, so dev always shows fresh code.

## Verify it works

```bash
npm run typecheck

# engine logic (66 assertions: ladder, scoring, mastery, importer, search…)
npx esbuild tests/engine.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/t.cjs && node /tmp/t.cjs

# full app mount in a headless DOM — walks every screen looking for crashes
npx esbuild tests/mount.test.tsx --bundle --platform=node --format=cjs --jsx=automatic --outfile=/tmp/m.cjs && node /tmp/m.cjs
```

## Where your notes go

The app ships with a **placeholder demo pack** so every screen has something to show.
Replace it two ways:

1. **In the app:** ☰ More → **Import Notes** → paste text/markdown → *Analyse & structure* → *Install pack*.
2. **As a file:** author a pack per `CONTENT-SCHEMA.md`, then ☰ More → **Import Notes** →
   *Edit JSON* → paste → *Install pack*.

Nothing is uploaded anywhere — packs live in IndexedDB, progress in localStorage.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Blank page on the preview URL | Append `#/home`; hard-refresh |
| `Blocked request … not allowed` | `allowedHosts: true` is already set in `vite.config.ts` — restart the dev server |
| Preview worked, then stopped | The dev server process may have ended; restart with `npm run dev` |
| `npm install` fails | Needs Node 18+; check with `node -v` |
| Progress disappeared | Settings → Export progress regularly; clearing browser data wipes local storage |
| Offline not working | You are on `npm run dev` — build for production to enable the service worker |
