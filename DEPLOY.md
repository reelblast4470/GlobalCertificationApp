# Deployment Guide

`npm run build` produces a **static folder** (`dist/`) — HTML, CSS, JS, a manifest and a service
worker. No backend, no database, no server process. That is why it can be hosted free anywhere
and moved to AWS in minutes.

## Pick a host

| Host | Free bandwidth | Custom domain | Notes |
|---|---|---|---|
| **Cloudflare Pages** ⭐ | **Unlimited** | Free | Best free tier + built-in DDoS. Recommended. |
| GitHub Pages | 100 GB/mo (soft) | Free | Simplest if the repo is already on GitHub. |
| Netlify | 100 GB/mo | Free | Overage bills the card on file — watch it. |
| Vercel | 100 GB/mo | Free | **Commercial use requires the $20/mo Pro plan.** |
| Azure Static Web Apps | 100 GB/mo | Free | Good if you're in the Microsoft stack. |

Avoid the "free Minecraft/VPS" hosts for this — they give you a game-server panel, not a web
server, and free tiers there are throttled or ad-supported. A static PWA needs none of that.

## Option A — Cloudflare Pages (recommended)

**Drag & drop, no Git needed:**
```bash
npm install
npm run build          # → dist/
```
Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** →
**Pages** → **Upload assets** → drop the `dist` folder. Done, live in ~30s.

**With Git (auto-deploy on every push):**
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `20`

`public/_headers` is picked up automatically — it ships the CSP and caching rules.

## Option B — GitHub Pages

The workflow is already written: `.github/workflows/deploy-pages.yml`.
Push to `main`, then **Settings → Pages → Source: GitHub Actions**.

⚠️ GitHub Pages ignores `_headers`. If you use it, set the security headers at your CDN instead
(or put Cloudflare in front — free, and it honours your DNS while adding HTTPS + DDoS).

⚠️ Base path: if the repo is *not* `username.github.io`, set `base: '/your-repo-name/'` in
`vite.config.ts` before building.

## Option C — Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```
or drag `dist/` onto [app.netlify.com/drop](https://app.netlify.com/drop).
`_headers` is supported. Do **not** enable Netlify Forms/Functions if you want to stay portable.

## Option D — Your own VPS (Nginx)

```bash
npm run build
rsync -av dist/ user@your-server:/var/www/exam-coach/
```
```nginx
server {
  listen 443 ssl http2;
  server_name yourdomain.com;
  root /var/www/exam-coach;
  index index.html;

  ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location = /sw.js { add_header Cache-Control "no-cache, no-store, must-revalidate"; }
  location = /index.html { add_header Cache-Control "no-cache"; }
}
```
Free TLS: `sudo certbot --nginx -d yourdomain.com`

## Migrating to AWS later

Because there is no backend and `base: './'` is already set, this is a file copy.

**S3 + CloudFront (recommended — cheap, global CDN):**
```bash
npm run build
aws s3 mb s3://exam-coach-app
aws s3 sync dist/ s3://exam-coach-app --delete
# CloudFront: create a distribution with an Origin Access Control on the bucket,
# default root object = index.html, then:
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```
Typical cost at student traffic: **under ₹100/month**.

**AWS Amplify (one-click, slightly pricier):**
Connect the repo → build `npm run build`, output `dist` → done.

**What would break portability:** using Netlify Forms, Vercel Edge Functions, Cloudflare
Pages Functions, or Amplify Auth. **This app uses none of them.** If you later add
accounts/sync, expose it as a plain REST API so the frontend stays a movable static bundle.

## After deploying — verify

1. Open the URL over **HTTPS** (required for the service worker and PWA install).
2. Android Chrome → ⋮ → **Install app**. iPhone Safari → Share → **Add to Home Screen**.
3. Turn on airplane mode, reopen the app → it must still load.
4. Check headers: `curl -I https://yourdomain.com` should show the CSP and `HSTS`.

## Security notes

- **No backend = no server to breach.** There is no login, no database, no upload endpoint.
- All student data stays **on the device** (IndexedDB for content, localStorage for progress).
  Nothing is transmitted anywhere, so there is no central store to leak.
- That also means **no cross-device sync** — progress lives in that one browser. Students should
  use ⚙️ Settings → **Export progress** regularly; clearing browser data wipes it.
- Never put an API key in this bundle — it is public JavaScript. If you add AI features later,
  call them through a small backend proxy, not from the client.
- The service worker only registers in **production builds** (`npm run build`), never in dev.
