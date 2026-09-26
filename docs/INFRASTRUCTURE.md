# Bandwise infrastructure

This is the running record of everything Bandwise depends on: what exists today, where it is configured, and what changes on the way to a paid, public service. Update it whenever a resource, secret or setting changes. Never write secret values, token values or personal email addresses here, only names, IDs and where things live.

> **Status (2026-09-26, 22:30 UTC):** re-checked against the live Cloudflare account with a read-only API token (REST + GraphQL, plus read-only `SELECT`s against D1 for migration state and row counts), after the domain, sign-in, pilot and self-service landing-page releases were deployed (last deployment 22:24 UTC). The token's zone permissions cover only `eurognosi-remote.com`, so the settings of the new `bandwiseapp.com` zone were checked from outside (public DNS, HTTP and TLS probes) instead. Anything that could not be confirmed says so.

> [!IMPORTANT]
> **Bandwise AI is in `live` mode.** `PLATFORM_AI_MODE=live` on the Worker, so every approved teacher can mark work with Bandwise's own Gemini key, not just the named testers. The repo last recorded that key as **free-tier** (Google may use free-tier requests to improve its products). The privacy policy promises that, outside named testers, Bandwise AI runs on Google's **paid** service, and the landing page now invites anyone to create an account with AI marking included. Cloudflare cannot show which kind of key is set. Confirm in Google Cloud that the key's project has billing enabled, or set `PLATFORM_AI_MODE` back to `test`. No Bandwise AI calls have happened yet (`usage_events` is empty).

See [`SUBSCRIPTION_PLAN.md`](SUBSCRIPTION_PLAN.md) for the plan to turn this into a subscription product, and [`SIGN_IN_SETUP.md`](SIGN_IN_SETUP.md) for the domain and sign-in setup steps.

## At a glance

```
                        ┌───────────────────────────── Cloudflare account (Workers Paid) ─────────────────────────────────────────────┐
 Teacher's browser ───▶ │ Zone bandwiseapp.com (Free, registered at Cloudflare)                                                        │
 https://bandwiseapp.com│   └─ Worker "bandwise-ielts-studio" (custom domains bandwiseapp.com + www; worker/index.ts)                  │
                        │        ├── public: / ("Create a free account"), /login, /privacy, /terms                                       │
                        │        ├── sign-in: Better Auth (Google or emailed code), admin approval, admins from ADMIN_EMAILS           │
                        │        ├── D1  "bandwise"         (binding DB, EEUR)       users, sessions, workspaces, studio data, usage    │
                        │        ├── R2  "bandwise-uploads" (binding BUCKET, EEUR)   uploads, report logos, rubric cache               │
                        │        ├── send_email "EMAIL"     (Email Service, no-reply@bandwiseapp.com)                                 │
                        │        └── Workers Logs (100% sampled, persisted; traces off)                                               │
                        │   Email Routing: hello@bandwiseapp.com → owner's inbox                                                       │
                        │ Zone eurognosi-remote.com: bandwise.eurognosi-remote.com → 301 to bandwiseapp.com (same Worker)              │
                        │                                                                                                              │
                        │ Unrelated to Bandwise, same account: Worker "classroom-files-cleanup" (cron) + R2 "class-files",             │
                        │ 4 Pages projects, 6 Cloudflare Tunnels, Web Analytics sites for both zones                                   │
                        └───────────────────────────────┬───────────────────────────────────────────────┬──────────────────────────────┘
                                                        │ Bandwise AI: platform Gemini key (live mode)   │ teacher's own key (BYOK)
                                                  Google Gemini                   OpenAI · Gemini · Claude · Qwen    Teacher's SMTP mailbox
Google OAuth client (Google Cloud) ◀── "Continue with Google"
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
| **Workers Paid** | $5/mo + usage | 2026-09-25 | Active, renews monthly. (It was set to cancel on 2026-10-01 when first checked; that cancellation has since been undone.) |
| Images Stream Basic | $0 (pay as you go) | 2026-09-25 | Active. Added alongside Workers Paid; no Images or Stream content exists. |
| R2 Paid | $0 base, pay as you go | 2026-07-01 | Active (10 GB-month free, then usage) |
| Teams Free Base (Zero Trust Free) | $0 | 2026-09-15 | Active, up to 50 seats. No longer used by Bandwise. |
| Cloudflare Free Plan | $0 | 2026-03-24 / 2026-09-26 | Both zones are on the Free plan |
| Registrar: `bandwiseapp.com` | Yearly | 2026-09-26 | Expires 2027-09-26, auto-renew on, transfer lock on, WHOIS privacy on |

## Bandwise resources

| Resource | Name / value | Defined in | Live state |
| --- | --- | --- | --- |
| Worker | `bandwise-ielts-studio` | `wrangler.json` | Created 2026-09-15. Entry `worker/index.ts` (wraps the vinext app and does the canonical redirect). Handlers: `fetch` only. `compatibility_date` 2026-05-22, flags `nodejs_compat`, usage model `standard`, no Smart Placement, has static assets. 128 versions so far; latest deployment 2026-09-26 22:24 UTC (the self-service landing page: a version upload followed by four secret updates). |
| Custom domains | **`bandwiseapp.com`** (canonical), `www.bandwiseapp.com`, `bandwise.eurognosi-remote.com` | `wrangler.json` → `routes` (first route = canonical, exported as `CANONICAL_HOST`) | All three enabled. Checked from outside: `www` and the old hostname answer 301 to `https://bandwiseapp.com` with the same path and query. No zone Workers routes. |
| workers.dev / preview URLs | Off | `wrangler.json` | Confirmed off. |
| Cron triggers | None | — | No schedules on this Worker. The rubric PDFs are refreshed lazily on the next assessment after 7 days (`lib/rubric-cache.ts`), not by a cron. |
| Observability | Workers Logs | `wrangler.json` → `observability` | Logs on, persisted, invocation logs on, head sampling 100%, query strings not redacted. Traces **off**. Logpush off. No tail consumers. |
| D1 database | `bandwise`, binding `DB` | `wrangler.json`; ID from repo variable `CLOUDFLARE_D1_DATABASE_ID` | See [D1](#d1). |
| R2 bucket | `bandwise-uploads`, binding `BUCKET` | `wrangler.json`; repo variable `CLOUDFLARE_R2_BUCKET_NAME` | See [R2](#r2). |
| Email sending | Binding `EMAIL` (`send_email`), sender `EMAIL_FROM` = `no-reply@bandwiseapp.com` | `scripts/configure-cloudflare.mjs` (added when `EMAIL_FROM` is set) | Sign-in codes and admin notifications. DNS for sending is in place (see [`bandwiseapp.com`](#zone-bandwiseappcom)). The Email Service API itself could not be read with this token. With Workers Paid on, codes can reach any address. |
| R2 API token (signed links) | Object Read only, scoped to the bucket | Dashboard → R2 → Manage API tokens | **Not configured on the Worker**: neither `R2_ACCESS_KEY_ID` nor `R2_SECRET_ACCESS_KEY` is set. Not urgent while Workers Paid is on (no 10 ms CPU limit). Whether an R2 token exists in the dashboard could not be checked. |
| Zero Trust Access | — | — | **No Access applications.** The `bandwise` app was deleted after the sign-in switch. See [Zero Trust](#zero-trust). |

### Worker bindings, secrets and variables

Live bindings on `bandwise-ielts-studio`:

| Name | Kind | Value / target | Set by | Purpose |
| --- | --- | --- | --- | --- |
| `DB` | D1 | `bandwise` (`b299c832-4f86-42c5-b940-4a71a7d1e921`) | `wrangler.json` | App data |
| `BUCKET` | R2 | `bandwise-uploads` | `wrangler.json` | Uploads, report logos, rubric cache |
| `EMAIL` | send_email | — | `scripts/configure-cloudflare.mjs` | Sign-in codes, admin emails |
| `PROVIDER_ENCRYPTION_KEY` | Secret | — | `scripts/deploy.mjs` | AES-GCM key for saved AI keys and SMTP passwords. Must never change; back it up offline. |
| `BETTER_AUTH_SECRET` | Secret | — | `scripts/deploy.mjs` | Signs sign-in sessions. Changing it signs everyone out. |
| `GOOGLE_CLIENT_SECRET` | Secret | — | `scripts/deploy.mjs` | Google sign-in |
| `PLATFORM_GEMINI_API_KEY` | Secret | — | `scripts/deploy.mjs` | Bandwise AI (see the note at the top) |
| `BETTER_AUTH_URL` | Var | `https://bandwiseapp.com` | `scripts/configure-cloudflare.mjs` (from the first custom domain) | Sign-in callbacks |
| `CANONICAL_HOST` | Var | `bandwiseapp.com` | `scripts/configure-cloudflare.mjs` | Redirect target (`lib/canonical-host.ts`) |
| `GOOGLE_CLIENT_ID` | Var | the OAuth client ID (public) | GitHub variable | Google sign-in |
| `ADMIN_EMAILS` | Var | 2 addresses (not recorded here) | GitHub variable | Who can open `/app/admin` and approve accounts |
| `EMAIL_FROM` | Var | `no-reply@bandwiseapp.com` | GitHub variable | Sender address |
| `PLATFORM_AI_MODE` | Var | **`live`** | GitHub variable | Bandwise AI for every approved teacher |
| `PLATFORM_AI_TEST_USERS` | Var | 1 address (not recorded here) | GitHub variable | Only matters in `test` mode |
| `ACCESS_TEAM_DOMAIN` | Var | `bandwise.cloudflareaccess.com` | `scripts/configure-cloudflare.mjs` | Fallback Access JWT check in `app/access-auth.ts` and `worker/index.ts`. Inert now that no Access app exists, but `scripts/deploy.mjs` still refuses to deploy without it. |
| `ACCESS_AUD` | Var | AUD tag of the deleted `bandwise` Access app (public) | `scripts/configure-cloudflare.mjs` | Same as above |
| `R2_ACCOUNT_ID` | Var | the account ID | `scripts/configure-cloudflare.mjs` | Where signed links would point |
| `R2_BUCKET_NAME` | Var | `bandwise-uploads` | `scripts/configure-cloudflare.mjs` | Where signed links would point |

Read by the code but **not set** (defaults apply):

| Name | Kind | Effect of being unset |
| --- | --- | --- |
| `PLATFORM_GEMINI_MODEL` | Var | `gemini-2.5-flash` |
| `PLATFORM_MONTHLY_CREDITS` | Var | 150 credits a month per workspace (unless an admin sets a per-teacher limit) |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Secret | No signed R2 links: the Worker reads and forwards file contents itself. |
| `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL` | Secret/var | No site-wide OpenAI fallback. |

### D1

| Item | Value |
| --- | --- |
| Name / ID | `bandwise` / `b299c832-4f86-42c5-b940-4a71a7d1e921` |
| Created | 2026-09-15 |
| Region | `EEUR` (Eastern Europe), primary served from the MXP colo. No jurisdiction set. Read replication disabled. |
| Size | 290,816 bytes (≈ 0.29 MB) |
| Tables | Studio: `students`, `assessments`, `ai_connections`, `ai_preferences`, `email_settings`, `branding`. Metering and pilot: `usage_events`, `pilot_feedback`. Accounts: `workspaces`, `memberships`, `access_identities`, `auth_user`, `auth_account`, `auth_session`, `auth_verification`, `auth_rate_limit`. Plus `d1_migrations` and the internal `_cf_KV` / `sqlite_sequence`. |
| Migrations applied | All nine in `drizzle/`, nothing pending: `0000`, `0001` (2026-09-15 07:57), `0002` (09-15 09:31), `0003` (09-25 12:28), `0004` (09-26 17:49), `0005` (18:00), `0006` (18:20), `0007` (18:56), `0008` (21:49). |
| Rows (2026-09-26 22:15 UTC) | students 1, assessments 10 (all Academic and reviewed; 6 carry teacher marks), ai_connections 2 (Gemini, Qwen), ai_preferences 1, email_settings 1, branding 1, **usage_events 0**, pilot_feedback 0, workspaces 1 (active, no custom credit limit), memberships 1 (owner), access_identities 1, auth_user 1 (signed in with Google), auth_session 1. **One** teacher in total. |
| Time Travel | Active, 30-day retention on Workers Paid. No other backup or export exists. |

### R2

| Bucket | Location | Jurisdiction | Public access | CORS | Lifecycle | Size (2026-09-26) |
| --- | --- | --- | --- | --- | --- | --- |
| `bandwise-uploads` | `EEUR` | default (not `eu`) | Private: r2.dev URL disabled, no custom domain. Report logos are served publicly **through the Worker** at `/brand/<id>`, not from R2 directly. | None | Default only (abort incomplete multipart uploads after 7 days) | 11 objects, ≈ 17.4 MB: 10 uploads under `<owner>/…`, 1 logo under `branding/`, no `rubric/` cache objects yet |
| `class-files` *(not Bandwise)* | `EEUR` | default | Private: r2.dev disabled, no custom domain | None | Default only | Empty |

Both: storage class Standard, no bucket locks, no Sippy migration. Event notifications could not be read with this token.

### Sign-in and access control

Bandwise now signs people in itself (`lib/auth.ts`, Better Auth): **Continue with Google** or an **emailed 6-digit code**. New accounts wait for approval by an admin (`ADMIN_EMAILS`) at `/app/admin`. Sign-in attempts are rate-limited per network address in D1 (`auth_rate_limit`). There is no Turnstile yet.

Checked from outside on 2026-09-26:

| URL | Result |
| --- | --- |
| `https://bandwiseapp.com/`, `/login` | 200 (public) |
| `/app`, `/app/admin` | 307 to `/login` |
| `/api/studio`, `/api/usage` | 401 |
| `/api/admin` | 403 |
| `http://bandwiseapp.com/…` | 301 to `https://` |

### Zero Trust

| Item | Value |
| --- | --- |
| Team domain | `bandwise.cloudflareaccess.com` (org still exists) |
| Applications | **None.** The `bandwise` app was deleted on 2026-09-26 as the last step of `SIGN_IN_SETUP.md`. |
| Policies | The reusable policy **"Teachers"** (Allow, 4 email rules) still exists but is attached to **0** apps. Safe to delete. |
| Login methods | One-time PIN and Cloudflare (no longer used by anything) |
| Users | 2 users still hold a seat (of 50 free). Seats can be removed under Zero Trust → Users. |

### Zone: `bandwiseapp.com`

Zone ID `21bc170791f3b2f6ee833871a44f3b2c`, **Free** plan, added 2026-09-26, registered at Cloudflare Registrar (see Subscriptions). The read-only token cannot read this zone's settings, so these come from public DNS and probes:

| Item | Value |
| --- | --- |
| Apex and `www` | Proxied (Cloudflare anycast addresses); served by the Worker as custom domains |
| HTTPS | `http://` redirects to `https://`, so **Always Use HTTPS is on** |
| Minimum TLS | TLS 1.0 and 1.1 are refused and TLS 1.2 works, so the minimum is **1.2** |
| SSL mode (Full / Full strict) | Not visible from outside; `SIGN_IN_SETUP.md` recommends Full (strict) |
| DNSSEC | **Not enabled** (no DS record at the registry) |
| Mail in (Email Routing) | MX `route1–3.mx.cloudflare.net`; `hello@bandwiseapp.com` forwards to the owner's inbox |
| Mail out (Email Service) | DKIM selectors `cf2024-1` and `cf-bounce` published; bounce subdomain `cf-bounce.bandwiseapp.com` with its own MX and SPF |
| SPF | One record on the apex: `v=spf1 include:_spf.mx.cloudflare.net ~all` (no duplicate) |
| DMARC | `v=DMARC1; p=reject;` (strict, no reporting address) |
| Other TXT | Google Search Console verification |
| Web Analytics | A site for this zone with automatic setup, created 2026-09-26 22:16 UTC. The beacon was not yet in the landing page's HTML when checked. |

### Zone: `eurognosi-remote.com`

Zone ID `8fbdbedfaf6175fb00a2a2f5ba1387ec`, **Free** plan, active since 2026-03-24. Registered at IONOS (nameservers moved to Cloudflare). For Bandwise it now only carries the redirecting old hostname.

| Setting | Value |
| --- | --- |
| SSL/TLS mode | **Full** (not Full strict). Universal SSL on, Let's Encrypt. |
| Always Use HTTPS | **Off** |
| Minimum TLS | **1.0** |
| TLS 1.3 / Automatic HTTPS Rewrites | On / On |
| Security level | Medium |
| DNSSEC | Disabled |
| WAF | Only managed rulesets (Cloudflare Managed Free, normalization, DDoS L7). No custom rules. |
| Rate-limiting rules | None |
| Page rules | None |
| Email Routing | Not configured (mail is IONOS) |

DNS records:

| Name | Type | Target | Proxied | Used by |
| --- | --- | --- | --- | --- |
| `bandwise` | AAAA | `100::` (Workers custom domain) | Yes | **Bandwise** (redirect only) |
| `@` | CNAME | `remotedesktop.pages.dev` | Yes | Pages project `remotedesktop` |
| `omr` | CNAME | `omr-grader-8ua.pages.dev` | Yes | Pages project `omr-grader` |
| `speaking` | CNAME | `ecpe-speaking-agent.pages.dev` | Yes | Pages project `ecpe-speaking-agent` |
| `erp`, `ads-mcp` | CNAME | tunnel `erp-web` | Yes | Cloudflare Tunnel (healthy) |
| `pc01`–`pc05` | CNAME | one tunnel each | Yes | Cloudflare Tunnels (all currently down) |
| `@` | MX ×2, TXT (SPF, Google site verification) | IONOS / Google | No | Email, Search Console |
| `_dmarc`, `autodiscover`, `_domainconnect` | CNAME | IONOS | No | Email |

### Other Cloudflare products

| Product | State |
| --- | --- |
| Turnstile | Not configured (no widgets) |
| Web Analytics | Two sites with automatic setup: `eurognosi-remote.com` and `bandwiseapp.com` |
| AI Gateway | Not configured |
| Queues | Not configured |
| Workers KV | Not configured |
| Workers Rate Limiting bindings | None (sign-in rate limiting is done in D1 by Better Auth) |
| Durable Objects, Workflows, Hyperdrive, Vectorize, Secrets Store | Not configured |
| Images, Stream | Subscribed ($0 pay-as-you-go) but empty |

## Resources the repo doesn't know about

All of these are on the same account but are not part of Bandwise. They matter because they share the account's plan, limits, billing and blast radius. Unchanged since the first check.

| Resource | What it is | Notes |
| --- | --- | --- |
| Worker `classroom-files-cleanup` | `scheduled` + `fetch` handlers, cron `0 4 * * *` (daily 04:00 UTC), compat date 2024-11-01. Bindings: R2 `class-files` (`CLASS_FILES`), secret `DAILY_WEBHOOK_HMAC`. | **On workers.dev with preview URLs enabled** (`classroom-files-cleanup.eurognosi-fni.workers.dev`, returns 404 at `/`). Deployed 2026-07-01. |
| R2 bucket `class-files` | Private, empty, EEUR | Used by the cleanup Worker |
| Pages `remotedesktop` | Apex `eurognosi-remote.com` | Last deploy 2026-09-21 |
| Pages `omr-grader` | `omr.eurognosi-remote.com` | Last deploy 2026-09-23 |
| Pages `ecpe-speaking-agent` | `speaking.eurognosi-remote.com` | Last deploy 2026-09-15 |
| Pages `classroom-meet` | `meet.eurognosi-fni.com` | That zone is **not** on this account; its DNS lives elsewhere. Last deploy 2026-07-15. |
| Tunnels `erp-web`, `pc01`–`pc05` | `erp-web` serves `erp.` and `ads-mcp.`; `pc01`–`pc05` are down | **None of these hostnames is behind Cloudflare Access** (there are no Access apps at all now). `erp.` is publicly reachable and relies on its own login page. Ingress is configured locally in `cloudflared`, not in the dashboard. |

## GitHub

- Repository: `roydestroy/bandwise-ielts-studio` (private). Default branch `main`.
- Workflow `.github/workflows/cloudflare.yml` ("Check and deploy Bandwise"):
  - `check` on every push and PR: `npm ci`, `typecheck`, `test`, `build`.
  - `deploy` only on `main` and only when repo variable `CLOUDFLARE_DEPLOY_ENABLED == 'true'`: `config:cloudflare`, then `deploy` (build → D1 migrations → `wrangler deploy` → secrets).
- Secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts Edit, D1 Edit, Workers R2 Storage Edit, and on **both** zones Workers Routes Edit + Zone Read), `CLOUDFLARE_ACCOUNT_ID`, `PROVIDER_ENCRYPTION_KEY`, `PLATFORM_GEMINI_API_KEY`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, optional `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- Variables: `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_R2_BUCKET_NAME`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `CLOUDFLARE_WORKER_NAME` (optional), `CLOUDFLARE_DEPLOY_ENABLED`, `PLATFORM_AI_MODE`, `PLATFORM_AI_TEST_USERS`, `PLATFORM_GEMINI_MODEL` (optional), `PLATFORM_MONTHLY_CREDITS` (optional), `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `EMAIL_FROM`.
- All live deployments are recorded as `source: wrangler` under the account owner (the metadata doesn't say whether they ran locally or from the workflow). The `bandwiseapp.com` custom domains exist, so whichever token deployed them can reach the new zone.

## Outside services

| Service | Used for | Who pays / owns the account |
| --- | --- | --- |
| Google Gemini (Bandwise AI) | Transcription and assessment for teachers on Bandwise AI | Bandwise, through `PLATFORM_GEMINI_API_KEY`. **Confirm the Google project has billing enabled** (see the note at the top). |
| Google Cloud (OAuth client) | "Continue with Google" | Bandwise. Redirect URI `https://bandwiseapp.com/auth/callback/google`. |
| Google Search Console | Domain verification for `bandwiseapp.com` and `eurognosi-remote.com` | Bandwise |
| OpenAI, Google Gemini, Anthropic Claude, Alibaba Qwen | Transcription and assessment with a teacher's own key (BYOK) | Each teacher. Live: one Gemini and one Qwen connection saved. |
| Teacher's SMTP mailbox (Gmail, Outlook, …) | Emailed progress reports | Each teacher. |
| ielts.org CDN | Official band descriptor PDFs, cached in R2 and refreshed lazily after 7 days | Public. |

There is still **no** billing provider, error tracking, AI Gateway, Turnstile or staging environment.

## Known risks and follow-ups

1. **Bandwise AI is `live` on a key the repo last described as free-tier.** Confirm billing on the Google project before any real student work goes through it, or switch back to `test`. Also set a budget alert in Google Cloud Billing.
2. **Only one copy of the data.** D1 Time Travel (30 days) is the only backup, and the database now also holds accounts and sessions. Consider a periodic `wrangler d1 export` to somewhere off-account.
3. **Leftover Access pieces.** The "Teachers" policy has no app, 2 Zero Trust seats are still held, and the Worker still accepts an Access JWT for the deleted app's AUD as a fallback (`app/access-auth.ts`, `worker/index.ts`). Nothing can mint new tokens for a deleted app, so this is inert, but `scripts/deploy.mjs` requires `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD`, so removing them needs a code change first.
4. **Public sign-up without bot protection.** The landing page now sends everyone to "Create a free account". Anyone can request an email code or create an account (admin approval still gates the studio and the AI credits). Better Auth's D1 rate limit is the only brake; add Turnstile before advertising.
5. **`bandwiseapp.com` has no DNSSEC.** It is one click in the dashboard (DNS → Settings) because the domain is registered at Cloudflare.
6. **`eurognosi-remote.com` TLS settings are weak** (SSL Full not strict, Always Use HTTPS off, minimum TLS 1.0). Bandwise now only redirects from there, but the Pages and tunnel hostnames share them.
7. **Non-Bandwise hostnames without Access:** `erp.` and `ads-mcp.` (tunnel) and the cleanup Worker on workers.dev are public. Not a Bandwise issue, but same account.
8. **Account-level 2FA enforcement is off** with a single member. Make sure the owner login has 2FA; it now controls a public product's domain, registrar and data.
9. Workers Logs keep full query strings (`redact_query_string: false`) and 100% of requests. Check that sign-in URLs (e.g. email-code or OAuth callbacks) don't carry anything sensitive in the query string, or turn redaction on.

## Capturing the live state

How this file was filled in, so it can be repeated:

**A. A Claude session with a read-only token (used on 2026-09-26).** Create a Cloudflare API token from the "Read all resources" template and add it to the Claude Code cloud environment as an API credential for `api.cloudflare.com`; the proxy injects the header, so nothing is pasted into chat. **Include all zones**: the token used on 2026-09-26 was created before `bandwiseapp.com` existed and could not read it. The session then calls `GET /accounts`, `/accounts/{id}/subscriptions`, `/registrar/domains`, `/workers/scripts/{name}/{settings,secrets,deployments,versions,schedules,subdomain}`, `/workers/domains`, `/d1/database/{id}` (plus read-only `SELECT`s for `d1_migrations` and row counts), `/r2/buckets/{name}/{cors,lifecycle,domains/*}`, the GraphQL `r2StorageAdaptiveGroups` dataset for bucket sizes, `/access/{organizations,apps,policies,identity_providers,users}`, `/rum/site_info/list`, and `/zones/{id}/{dns_records,settings/*,rulesets,dnssec,email/routing}`. Such a token can't list API tokens, so R2 tokens must be checked in the dashboard.

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
- 2026-09-26 — Metering release: migration `0004_stiff_doctor_spectrum` adds `usage_events` (one row per AI call, with tokens and estimated cost). The deploy workflow applies it automatically.
- 2026-09-26 — Platform-AI release: migration `0005` adds `usage_events.platform`. The deploy now passes `PLATFORM_GEMINI_API_KEY` (secret) and `PLATFORM_AI_MODE` / `PLATFORM_AI_TEST_USERS` / `PLATFORM_GEMINI_MODEL` (vars) to the Worker.
- 2026-09-26 — Access narrowed to `/app` and `/api`. Checked from outside: `/` returns 200 with all its assets, while `/app`, `/api/studio` and `/api/usage` redirect to the Access login.
- 2026-09-26 — Report-branding release: migration `0006` adds the `branding` table. Logos are stored in R2 under `branding/` and served publicly at `/brand/<id>`.
- 2026-09-26 — Sign-in release (Phase 3): migration `0007` adds the `auth_*` tables, `workspaces`, `memberships` and `access_identities`, and seeds an approved workspace for every existing data owner. New settings: secrets `BETTER_AUTH_SECRET` and `GOOGLE_CLIENT_SECRET`, variables `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS` and `EMAIL_FROM` (which also adds the `EMAIL` send_email binding). `BETTER_AUTH_URL` is derived from the custom domain. See `docs/SIGN_IN_SETUP.md`.
- 2026-09-26 — Domain release: `bandwiseapp.com` becomes the canonical address, and the old hostname and `www` redirect to it. The Worker entry is now `worker/index.ts`, which wraps the vinext app. The public contact address is `hello@bandwiseapp.com` (Cloudflare Email Routing). Sign-in, Google OAuth and Email Service are set up on the new domain (`docs/SIGN_IN_SETUP.md`). The GitHub deploy token needs the `bandwiseapp.com` zone added. Name check: no live BANDWISE trademark in the USPTO or EU records (one dead 2012 US mark in class 35). Bandwise LLC (US web agency) owns `bandwise.com`.
- 2026-09-26 — Pilot release: migration `0008` adds `workspaces.ai_credit_limit` and the `pilot_feedback` table. The deploy passes the optional `PLATFORM_MONTHLY_CREDITS` variable (default 150 credits a month per teacher on Bandwise AI).
- 2026-09-26 — Re-checked the live account after the domain, sign-in, pilot and self-service releases. Workers Paid no longer cancels. The Access app is deleted (policy and 2 seats left over). New: zone and registrar entry for `bandwiseapp.com`, Email Routing and Email Service DNS, `send_email` binding, sign-in secrets and variables, `PLATFORM_AI_MODE=live`, all nine migrations applied, Web Analytics site for the new zone. Flagged: confirm the Gemini key is on a billing-enabled project, no DNSSEC on `bandwiseapp.com`, no Turnstile. The read-only token cannot read the new zone, so its settings were checked from outside.
