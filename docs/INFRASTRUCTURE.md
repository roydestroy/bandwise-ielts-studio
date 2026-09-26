# Bandwise infrastructure

This is the running record of everything Bandwise depends on: what exists today, where it is configured, and what changes on the way to a paid, public service. Update it whenever a resource, secret or setting changes. Never write secret values here, only their names and where they live.

> **Status (2026-09-26):** this first version was written from the repository alone. The container that wrote it had no Cloudflare credentials, so the live account has **not** been inspected yet. Items marked **(verify)** are what the repo expects; confirm them against the dashboard or with the commands in [Capturing the live state](#capturing-the-live-state), then remove the marker.

See [`SUBSCRIPTION_PLAN.md`](SUBSCRIPTION_PLAN.md) for the plan to turn this into a subscription product.

## At a glance

```
                       ┌──────────────────────────── Cloudflare account ─────────────────────────────┐
 Teacher's browser ──▶ │ Zero Trust Access app ──▶ Worker "bandwise-ielts-studio"                    │
 bandwise.eurognosi-   │ (email allowlist,          vinext (Next.js App Router on Vite) + static assets │
 remote.com            │  signed JWT header)        ├── D1  "bandwise"          (binding DB)          │
                       │                            ├── R2  "bandwise-uploads"  (binding BUCKET)      │
                       │                            └── Workers Logs (observability)                  │
                       └──────────────────────────────────────┬───────────────────────────────────────┘
                                                              │ teacher's own API key (BYOK)
                                  OpenAI · Gemini · Claude · Qwen          Teacher's SMTP mailbox
GitHub repo roydestroy/bandwise-ielts-studio ──(Actions: typecheck, test, build, migrate, deploy)──▶ Worker
```

## Cloudflare

| Resource | Name / value | Defined in | Notes |
| --- | --- | --- | --- |
| Account | ID in GitHub secret `CLOUDFLARE_ACCOUNT_ID` | GitHub | Plan: **(verify)** Workers Free or Paid. |
| Worker | `bandwise-ielts-studio` (override: repo variable `CLOUDFLARE_WORKER_NAME`) | `wrangler.json` | Entry `vinext/server/app-router-entry`, `compatibility_date` 2026-05-22, `nodejs_compat`. `workers_dev` and preview URLs are **off**. |
| Custom domain | `bandwise.eurognosi-remote.com` | `wrangler.json` → `routes` | Zone `eurognosi-remote.com` must be on the same account **(verify)**. `wrangler deploy` manages the DNS record and certificate. |
| D1 database | `bandwise`, binding `DB` | `wrangler.json`; real ID from repo variable `CLOUDFLARE_D1_DATABASE_ID` | Migrations in `drizzle/` (0000–0003) are applied by `scripts/deploy.mjs`. Tables: `students`, `assessments`, `ai_connections`, `ai_preferences`, `email_settings`, all keyed by `owner` (the Access user ID). |
| R2 bucket | `bandwise-uploads`, binding `BUCKET` | `wrangler.json`; repo variable `CLOUDFLARE_R2_BUCKET_NAME` | Private. Keys: `<owner>/<assessmentId>/<uuid>` for uploads (rendered PDF pages nested under the PDF key) and `rubric/{writing,speaking}.{pdf,b64,txt}` for the cached official band descriptors (refreshed weekly). |
| R2 API token | Object Read only, scoped to the bucket | Dashboard → R2 → Manage API tokens | Optional. Lets the Worker hand AI providers 15-minute signed links. Stored as Worker secrets `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` **(verify whether configured)**. |
| Zero Trust Access application | Self-hosted app covering the full hostname | Dashboard → Zero Trust → Access → Applications | Policy: allow-list of teacher emails. Team domain and AUD tag are repo variables `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, baked into `wrangler.json` `vars` at deploy. Login methods **(verify)**: one-time PIN and/or Google. |
| Observability | Workers Logs enabled | `wrangler.json` → `observability` | |

### Worker secrets and variables

| Name | Kind | Set by | Purpose |
| --- | --- | --- | --- |
| `PROVIDER_ENCRYPTION_KEY` | Secret | `scripts/deploy.mjs` from GitHub secret | AES-GCM key for saved AI keys and SMTP passwords. Must never change; back it up offline. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Secret | `scripts/deploy.mjs` (only if the GitHub secrets exist) | Signed R2 links. |
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | Var | `scripts/configure-cloudflare.mjs` | JWT verification in `lib/access.ts`. |
| `R2_ACCOUNT_ID`, `R2_BUCKET_NAME` | Var | `scripts/configure-cloudflare.mjs` | Where signed links point. |
| `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_AUDIO_MODEL` | Secret/var | Not set by any script | An optional site-wide OpenAI key that every teacher falls back to (`lib/provider-store.ts`). This is the seed of the "platform key" in the subscription plan. **(verify: probably unset)** |

## GitHub

- Repository: `roydestroy/bandwise-ielts-studio` (private). Default branch `main`.
- Workflow `.github/workflows/cloudflare.yml` ("Check and deploy Bandwise"):
  - `check` on every push and PR: `npm ci`, `typecheck`, `test`, `build`.
  - `deploy` only on `main` and only when repo variable `CLOUDFLARE_DEPLOY_ENABLED == 'true'`: `config:cloudflare`, then `deploy` (build → D1 migrations → `wrangler deploy` → secrets).
- Secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts Edit, D1 Edit, Workers R2 Storage Edit, and for the custom domain Zone → Workers Routes Edit + Zone Read), `CLOUDFLARE_ACCOUNT_ID`, `PROVIDER_ENCRYPTION_KEY`, optional `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- Variables: `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_R2_BUCKET_NAME`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `CLOUDFLARE_WORKER_NAME` (optional), `CLOUDFLARE_DEPLOY_ENABLED`.

## Outside services

| Service | Used for | Who pays / owns the account |
| --- | --- | --- |
| OpenAI, Google Gemini, Anthropic Claude, Alibaba Qwen | Transcription, writing and speaking assessment | Each teacher, with their own key (BYOK). |
| Teacher's SMTP mailbox (Gmail, Outlook, …) | Emailed progress reports | Each teacher. |
| ielts.org CDN | Official band descriptor PDFs, fetched weekly into R2 | Public. |

There is currently **no** billing provider, transactional email service, analytics, error tracking or staging environment.

## Capturing the live state

Two ways to fill in the **(verify)** items.

**A. Let a Claude session inspect it (recommended).** Create a Cloudflare API token with read-only permissions (Account: Workers Scripts Read, D1 Read, Workers R2 Storage Read, Access: Apps and Policies Read, Account Settings Read; Zone: Zone Read, DNS Read, Workers Routes Read for `eurognosi-remote.com`). Add it to the Claude Code cloud environment's settings as the environment variable `CLOUDFLARE_API_TOKEN`, plus `CLOUDFLARE_ACCOUNT_ID`. Never paste it into a chat. A new session can then query the API and update this file.

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

In the dashboard, also note: Workers plan (Free / Paid), the Access application's policies and login methods, the DNS records on `eurognosi-remote.com`, and whether D1 Time Travel / R2 lifecycle rules are set.

## Changelog

- 2026-09-26 — First version, written from the repository. Live account not yet inspected.
