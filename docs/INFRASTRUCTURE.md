# Bandwise infrastructure

This is the running record of everything Bandwise depends on: what exists today, where it is configured, and what changes on the way to a paid, public service. Update it whenever a resource, secret or setting changes. Never write secret values, token values or personal email addresses here, only names, IDs and where things live.

> **Status (2026-09-26):** checked against the live Cloudflare account with a read-only API token (REST + GraphQL, plus read-only `SELECT`s against D1 for migration state and row counts). Every former **(verify)** item now has a real value or says "not configured".

> [!WARNING]
> **The Workers Paid subscription is set to cancel on 2026-10-01** (`cancel_at_period_end: true`, created 2026-09-25). If nothing changes, the account drops to Workers Free that day: 10 ms CPU per request, 7-day (not 30-day) D1 Time Travel, lower D1/Workers limits. The Worker has **no** R2 signed-link secrets, so the "Worker exceeded resource limits" problem from README step 5 will come back on large uploads. Either undo the cancellation in Dashboard → Billing → Subscriptions, or add the R2 API token secrets before that date.

See [`SUBSCRIPTION_PLAN.md`](SUBSCRIPTION_PLAN.md) for the plan to turn this into a subscription product.

## At a glance

```
                        ┌───────────────────────────── Cloudflare account (Workers Paid, cancels 2026-10-01) ───────────────────────────┐
 Teacher's browser ───▶ │ Zone eurognosi-remote.com (Free plan, SSL Full)                                                              │
 bandwise.eurognosi-    │   └─ Access app "bandwise" ──▶ Worker "bandwise-ielts-studio" (custom domain, workers.dev off)               │
 remote.com             │      team bandwise.cloudflareaccess.com   vinext (Next.js App Router on Vite) + static assets              │
                        │      policy "Teachers" (4 emails)         ├── D1 "bandwise"          (binding DB, EEUR)                     │
                        │      OTP or Cloudflare login, 24h         ├── R2 "bandwise-uploads"  (binding BUCKET, EEUR, private)        │
                        │                                           └── Workers Logs (100% sampled, persisted; traces off)            │
                        │                                                                                                              │
                        │ Unrelated to Bandwise, same account: Worker "classroom-files-cleanup" (cron) + R2 "class-files",             │
                        │ 4 Pages projects, 6 Cloudflare Tunnels, Web Analytics site for the zone                                      │
                        └──────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                                                               │ teacher's own API key (BYOK)
                                  OpenAI · Gemini · Claude · Qwen                         Teacher's SMTP mailbox
GitHub repo roydestroy/bandwise-ielts-studio ──(Actions: typecheck, test, build, migrate, deploy)──▶ Worker
```

## Cloudflare account

| Item | Value |
| --- | --- |
| Account | Default personal account name ("‹owner email›'s Account"), type `standard`, created 2026-03-24 |
| Account ID | `c9153feda8a1dbc28a70242bedcd7606` (also the GitHub secret `CLOUDFLARE_ACCOUNT_ID` and the Worker var `R2_ACCOUNT_ID`) |
| Members | 1 |
| Enforce 2FA for members | Off (account setting; the owner's own login may still use 2FA) |
| workers.dev subdomain | `eurognosi-fni.workers.dev` |
| Default usage model | `standard` |

### Subscriptions

| Subscription | Price | Since | State |
| --- | --- | --- | --- |
| **Workers Paid** | $5/mo + usage | 2026-09-25 | Active until 2026-10-01, **then cancels** (cancel at period end is on) |
| Images Stream Basic | $0 (pay as you go) | 2026-09-25 | Active. Added alongside Workers Paid; no Images or Stream content exists. |
| R2 Paid | $0 base, pay as you go | 2026-07-01 | Active (10 GB-month free, then usage) |
| Teams Free Base (Zero Trust Free) | $0 | 2026-09-15 | Active, up to 50 seats |
| Cloudflare Free Plan (zone `eurognosi-remote.com`) | $0 | 2026-03-24 | Active |

## Bandwise resources

| Resource | Name / value | Defined in | Live state (2026-09-26) |
| --- | --- | --- | --- |
| Worker | `bandwise-ielts-studio` | `wrangler.json` | Created 2026-09-15. Handlers: `fetch` only. `compatibility_date` 2026-05-22, flags `nodejs_compat`, usage model `standard`, no Smart Placement, has static assets. Deployed from wrangler. 61 versions so far; latest deployment 2026-09-25 17:25 UTC (each deploy is a version upload followed by a secret update). |
| Custom domain | `bandwise.eurognosi-remote.com` | `wrangler.json` → `routes` | Enabled, environment `production`, previews off. Zone `eurognosi-remote.com` is on this account. DNS: proxied `AAAA 100::` managed by Workers. No zone Workers routes. |
| workers.dev / preview URLs | Off | `wrangler.json` | Confirmed off. |
| Cron triggers | None | — | No schedules on this Worker. The rubric PDFs are refreshed lazily on the next assessment after 7 days (`lib/rubric-cache.ts`), not by a cron. |
| Observability | Workers Logs | `wrangler.json` → `observability` | Logs on, persisted, invocation logs on, head sampling 100%, query strings not redacted. Traces **off**. Logpush off. No tail consumers. |
| D1 database | `bandwise`, binding `DB` | `wrangler.json`; ID from repo variable `CLOUDFLARE_D1_DATABASE_ID` | See [D1](#d1). |
| R2 bucket | `bandwise-uploads`, binding `BUCKET` | `wrangler.json`; repo variable `CLOUDFLARE_R2_BUCKET_NAME` | See [R2](#r2). |
| R2 API token (signed links) | Object Read only, scoped to the bucket | Dashboard → R2 → Manage API tokens | **Not configured on the Worker**: neither `R2_ACCESS_KEY_ID` nor `R2_SECRET_ACCESS_KEY` is set. Whether an R2 token exists in the dashboard could not be checked (the read-only token can't list API tokens). |
| Zero Trust Access | App `bandwise` | Dashboard → Zero Trust → Access → Applications | See [Zero Trust Access](#zero-trust-access). |

### Worker bindings, secrets and variables

Live bindings on `bandwise-ielts-studio`:

| Name | Kind | Value / target | Set by | Purpose |
| --- | --- | --- | --- | --- |
| `DB` | D1 | `bandwise` (`b299c832-4f86-42c5-b940-4a71a7d1e921`) | `wrangler.json` | App data |
| `BUCKET` | R2 | `bandwise-uploads` | `wrangler.json` | Uploads, rubric cache |
| `PROVIDER_ENCRYPTION_KEY` | Secret | — | `scripts/deploy.mjs` from GitHub secret | AES-GCM key for saved AI keys and SMTP passwords. Must never change; back it up offline. |
| `ACCESS_TEAM_DOMAIN` | Var | `bandwise.cloudflareaccess.com` | `scripts/configure-cloudflare.mjs` | JWT verification in `lib/access.ts` |
| `ACCESS_AUD` | Var | AUD tag of the `bandwise` Access app (public, not secret) | `scripts/configure-cloudflare.mjs` | JWT verification |
| `R2_ACCOUNT_ID` | Var | the account ID | `scripts/configure-cloudflare.mjs` | Where signed links point |
| `R2_BUCKET_NAME` | Var | `bandwise-uploads` | `scripts/configure-cloudflare.mjs` | Where signed links point |

Expected by the code but **not set**:

| Name | Kind | Effect of being unset |
| --- | --- | --- |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Secret | No signed R2 links: the Worker reads and forwards file contents itself (CPU-heavy; a problem on Workers Free). |
| `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL` | Secret/var | No site-wide OpenAI fallback; every teacher must bring their own key. (This is the seed of the "platform key" in the subscription plan.) |

`PROVIDER_ENCRYPTION_KEY` is the only secret on the Worker.

### D1

| Item | Value |
| --- | --- |
| Name / ID | `bandwise` / `b299c832-4f86-42c5-b940-4a71a7d1e921` |
| Created | 2026-09-15 |
| Region | `EEUR` (Eastern Europe), primary served from the MXP colo. No jurisdiction set. Read replication disabled. |
| Size | 159,744 bytes (≈ 0.16 MB) |
| Tables | `students`, `assessments`, `ai_connections`, `ai_preferences`, `email_settings`, plus `d1_migrations` and the internal `_cf_KV` / `sqlite_sequence` |
| Migrations applied | All four in `drizzle/`: `0000_swift_sway` and `0001_empty_korath` (2026-09-15 07:57), `0002_slim_blazing_skull` (2026-09-15 09:31), `0003_aberrant_havok` (2026-09-25 12:28). Nothing pending. |
| Rows (2026-09-26) | students 1, assessments 10 (all Academic, all status "Reviewed"; 6 carry teacher marks), ai_connections 2 (Gemini, Qwen), ai_preferences 1, email_settings 1. **One** distinct `owner` across all tables. |
| Time Travel | Active (bookmarks available). Retention is 30 days on Workers Paid, **7 days after the plan drops to Free**. No other backup or export exists. |

### R2

| Bucket | Location | Jurisdiction | Public access | CORS | Lifecycle | Size (2026-09-26) |
| --- | --- | --- | --- | --- | --- | --- |
| `bandwise-uploads` | `EEUR` | default (not `eu`) | Private: r2.dev URL disabled, no custom domain | None | Default only (abort incomplete multipart uploads after 7 days) | 10 objects, ≈ 17.2 MB. All under `<owner>/…` upload keys; no `rubric/` cache objects yet. |
| `class-files` *(not Bandwise)* | `EEUR` | default | Private: r2.dev disabled, no custom domain | None | Default only | Empty |

Both: storage class Standard, no bucket locks, no Sippy migration. Event notifications could not be read with this token.

### Zero Trust Access

| Item | Value |
| --- | --- |
| Team domain | `bandwise.cloudflareaccess.com` (the org was first created as a random `*.cloudflareaccess.com` name, then renamed) |
| Applications | **1**: `bandwise`, self-hosted, public destination `bandwise.eurognosi-remote.com` (the **whole hostname, all paths**). **To change** once the landing-page release is deployed: protect only paths `app` and `api` (see [Public landing page](#public-landing-page)). Visible in the App Launcher. CORS preflight bypass off. |
| Policy | One reusable policy **"Teachers"**: Allow, include = 4 individual email rules. No groups, no exclude/require rules. |
| Login methods | All configured IdPs are allowed (no restriction on the app): **One-time PIN** and **Cloudflare** (sign in with a Cloudflare account). No Google or other social IdP. Not auto-redirected. |
| Session length | 24 h (application session) |
| Users | 4 emails allowed by policy; 2 users have signed in and hold a seat (of 50 free). |
| Other | `deny_unmatched_requests` off; no device enrollment, no Gateway policies in use. |

A request without a session is redirected (302) to the Access login page, confirmed from outside.

### Public landing page

Since the landing-page release, the Worker serves:

| Path | Who | What |
| --- | --- | --- |
| `/` | Everyone | Landing page (`app/page.tsx`), server-rendered |
| `/app` | Teachers, through Access | The studio (`app/app/page.tsx`), marked `noindex` |
| `/api/*` | Teachers, through Access | Studio data. Every route also checks the Access JWT itself, so a gap in the Access paths returns 401, not data. |

The Access app must cover `/app` **and** `/api`. Access adds the signed identity header only on protected paths, so if `/api` is left out the studio loads but cannot read any data. Order of changes: deploy the release first (until then `/app` doesn't exist), then edit the Access app's destinations.

### Zone and DNS: `eurognosi-remote.com`

Zone ID `8fbdbedfaf6175fb00a2a2f5ba1387ec`, **Free** plan, active since 2026-03-24. Registered at IONOS (nameservers moved to Cloudflare). This is the only zone on the account.

| Setting | Value |
| --- | --- |
| SSL/TLS mode | **Full** (not Full strict). Universal SSL on, Let's Encrypt. |
| Always Use HTTPS | **Off** |
| Minimum TLS | **1.0** |
| TLS 1.3 / Automatic HTTPS Rewrites | On / On |
| Security level | Medium |
| WAF | Only managed rulesets (Cloudflare Managed Free, normalization, DDoS L7). No custom rules. |
| Rate-limiting rules | None |
| Page rules | None |
| Email Routing | Not configured (mail is IONOS) |

DNS records:

| Name | Type | Target | Proxied | Used by |
| --- | --- | --- | --- | --- |
| `bandwise` | AAAA | `100::` (Workers custom domain) | Yes | **Bandwise** |
| `@` | CNAME | `remotedesktop.pages.dev` | Yes | Pages project `remotedesktop` |
| `omr` | CNAME | `omr-grader-8ua.pages.dev` | Yes | Pages project `omr-grader` |
| `speaking` | CNAME | `ecpe-speaking-agent.pages.dev` | Yes | Pages project `ecpe-speaking-agent` |
| `erp`, `ads-mcp` | CNAME | tunnel `erp-web` | Yes | Cloudflare Tunnel (healthy) |
| `pc01`–`pc05` | CNAME | one tunnel each | Yes | Cloudflare Tunnels (all currently down) |
| `@` | MX ×2, TXT (SPF) | IONOS | No | Email |
| `_dmarc`, `autodiscover`, `_domainconnect` | CNAME | IONOS | No | Email |

### Other Cloudflare products

| Product | State |
| --- | --- |
| Turnstile | Not configured (no widgets) |
| Web Analytics | One site for `eurognosi-remote.com` with automatic setup on. There is no Bandwise-specific site; whether the snippet reaches the Worker's pages is unconfirmed. |
| AI Gateway | Not configured |
| Queues | Not configured |
| Workers KV | Not configured |
| Durable Objects, Workflows, Hyperdrive, Vectorize | Not configured |
| Images, Stream | Subscribed ($0 pay-as-you-go) but empty |

## Resources the repo doesn't know about

All of these are on the same account but are not part of Bandwise. They matter because they share the account's plan, limits, billing and blast radius.

| Resource | What it is | Notes |
| --- | --- | --- |
| Worker `classroom-files-cleanup` | `scheduled` + `fetch` handlers, cron `0 4 * * *` (daily 04:00 UTC), compat date 2024-11-01. Bindings: R2 `class-files` (`CLASS_FILES`), secret `DAILY_WEBHOOK_HMAC`. | **On workers.dev with preview URLs enabled** (`classroom-files-cleanup.eurognosi-fni.workers.dev`, returns 404 at `/`). Deployed 2026-07-01. |
| R2 bucket `class-files` | Private, empty, EEUR | Used by the cleanup Worker |
| Pages `remotedesktop` | Apex `eurognosi-remote.com` | Last deploy 2026-09-21 |
| Pages `omr-grader` | `omr.eurognosi-remote.com` | Last deploy 2026-09-23 |
| Pages `ecpe-speaking-agent` | `speaking.eurognosi-remote.com` | Last deploy 2026-09-15 |
| Pages `classroom-meet` | `meet.eurognosi-fni.com` | That zone is **not** on this account; its DNS lives elsewhere. Last deploy 2026-07-15. |
| Tunnels `erp-web`, `pc01`–`pc05` | `erp-web` serves `erp.` and `ads-mcp.`; `pc01`–`pc05` are down | **None of these hostnames is behind Cloudflare Access** (the only Access app is Bandwise's). `erp.` is publicly reachable and relies on its own login page. Ingress is configured locally in `cloudflared`, not in the dashboard. |

## GitHub

- Repository: `roydestroy/bandwise-ielts-studio` (private). Default branch `main`.
- Workflow `.github/workflows/cloudflare.yml` ("Check and deploy Bandwise"):
  - `check` on every push and PR: `npm ci`, `typecheck`, `test`, `build`.
  - `deploy` only on `main` and only when repo variable `CLOUDFLARE_DEPLOY_ENABLED == 'true'`: `config:cloudflare`, then `deploy` (build → D1 migrations → `wrangler deploy` → secrets).
- Secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts Edit, D1 Edit, Workers R2 Storage Edit, and for the custom domain Zone → Workers Routes Edit + Zone Read), `CLOUDFLARE_ACCOUNT_ID`, `PROVIDER_ENCRYPTION_KEY`, optional `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- Variables: `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_R2_BUCKET_NAME`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `CLOUDFLARE_WORKER_NAME` (optional), `CLOUDFLARE_DEPLOY_ENABLED`.
- All live deployments are recorded as `source: wrangler` under the account owner (the metadata doesn't say whether they ran locally or from the workflow).

## Outside services

| Service | Used for | Who pays / owns the account |
| --- | --- | --- |
| OpenAI, Google Gemini, Anthropic Claude, Alibaba Qwen | Transcription, writing and speaking assessment | Each teacher, with their own key (BYOK). Live: one Gemini and one Qwen connection saved. |
| Teacher's SMTP mailbox (Gmail, Outlook, …) | Emailed progress reports | Each teacher. |
| ielts.org CDN | Official band descriptor PDFs, cached in R2 and refreshed lazily after 7 days | Public. |

There is currently **no** billing provider, transactional email service, error tracking, AI Gateway, Turnstile or staging environment.

## Known risks and follow-ups

1. **Workers Paid cancels on 2026-10-01** and no R2 signed-link secrets exist (see the warning at the top).
2. **Only one copy of the data.** D1 Time Travel is the only backup; it shrinks to 7 days on Free. Consider a periodic `wrangler d1 export` to somewhere off-account.
3. **Zone TLS settings are weak for a paid product:** SSL mode Full (not strict), Always Use HTTPS off, minimum TLS 1.0. Bandwise itself is served by a Worker (so the origin mode doesn't apply to it), but the Pages and tunnel hostnames share these settings.
4. **Non-Bandwise hostnames without Access:** `erp.` and `ads-mcp.` (tunnel) and the cleanup Worker on workers.dev are public. Not a Bandwise issue, but same account.
5. **Account-level 2FA enforcement is off** with a single member. Make sure the owner login has 2FA.
6. Workers Logs keep full query strings (`redact_query_string: false`). Fine today; revisit once there are public sign-up and billing URLs.

## Capturing the live state

How this file was filled in, so it can be repeated:

**A. A Claude session with a read-only token (used on 2026-09-26).** Create a Cloudflare API token from the "Read all resources" template and add it to the Claude Code cloud environment as an API credential for `api.cloudflare.com`; the proxy injects the header, so nothing is pasted into chat. The session then calls `GET /accounts`, `/accounts/{id}/subscriptions`, `/workers/scripts/{name}/{settings,secrets,deployments,versions,schedules,domains,subdomain}`, `/d1/database/{id}` (plus read-only `SELECT`s for `d1_migrations` and row counts), `/r2/buckets/{name}/{cors,lifecycle,domains/*}`, the GraphQL `r2StorageAdaptiveGroups` dataset for bucket sizes, `/access/{organizations,apps,policies,identity_providers,users}`, and `/zones/{id}/{dns_records,settings/*,rulesets}`. Such a token can't list API tokens, so R2 tokens must be checked in the dashboard.

**B. Run these yourself** with `npx wrangler login` and paste the (non-secret) output into this file:

```sh
npx wrangler whoami                       # account name, ID, token scopes
npx wrangler deployments list --name bandwise-ielts-studio
npx wrangler secret list --name bandwise-ielts-studio   # names only, never values
npx wrangler d1 list
npx wrangler d1 info bandwise
npx wrangler d1 migrations list DB --remote --config wrangler.json
npx wrangler r2 bucket list
```

## Changelog

- 2026-09-26 — Checked against the live account with a read-only API token. Replaced every "(verify)" with live values. Found: Workers Paid active but **cancelling 2026-10-01**; D1 and R2 in `EEUR` without EU jurisdiction; all 4 migrations applied; only `PROVIDER_ENCRYPTION_KEY` set (no R2 signed-link secrets, no platform OpenAI key); Access allows 4 emails via One-time PIN or Cloudflare login, 24 h sessions, whole hostname. Documented the resources the repo didn't know about (cleanup Worker and `class-files` bucket, 4 Pages projects, 6 tunnels, Web Analytics site) and added a risks section.
- 2026-09-26 — First version, written from the repository. Live account not yet inspected.
- 2026-09-26 — Landing-page release (on this branch, not yet deployed): `/` is a public landing page and the studio moved to `/app`. Added the path table and the Access change it needs.
