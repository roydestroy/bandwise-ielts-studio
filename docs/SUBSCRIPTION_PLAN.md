# Turning Bandwise into a subscription service

A working plan for making Bandwise a public, paid product: hosted AI instead of teachers' own API keys, a public landing page, self-service sign-up, and subscriptions. It is written against the code as of 2026-09-26. Tick items off and add decisions to the [decision log](#decision-log) as they are made. The current Cloudflare/GitHub setup is in [`INFRASTRUCTURE.md`](INFRASTRUCTURE.md).

## Where the app is today

| Area | Today | Why it blocks a paid product |
| --- | --- | --- |
| Sign-in | Cloudflare Access in front of the whole hostname, with a hand-maintained email allowlist (`app/access-auth.ts`, `lib/access.ts`). | Nobody can sign themselves up, and no page is public. Zero Trust is free for 50 users, then about **$7 per user per month**, which is more than a cheap plan would bring in. |
| AI | Each teacher pastes their own OpenAI / Gemini / Claude / Qwen key, which is stored encrypted (`lib/provider-store.ts`). There is already a site-wide `OPENAI_API_KEY` fallback. | Most teachers won't create an API account. There is no metering or per-user limit. |
| Pages | One client page, `app/page.tsx`, is the whole studio. | There is no landing page, pricing page or legal pages. |
| Data model | Every row is keyed by `owner` = the Access user ID. | There is no concept of an account, plan, seat or usage. |
| Billing, email, abuse protection | None. Reports go out through each teacher's own SMTP mailbox. | The service needs payments, receipts, sign-up email, bot protection and rate limits. |

Most of the app can stay as it is. Nearly everything is already keyed by `owner`, and the AI layer already supports several providers behind a single `generate()` function. The work is mostly new code around the existing studio, not a rewrite.

---

## 1. Hosted AI (no API key for the user)

### What the app needs from a model

- **Speaking:** listen to the raw recording (pronunciation is scored from the audio), up to about 14 minutes. Only models with native audio input can do this. Here that means Gemini, OpenAI audio models or Qwen Omni. Claude has no audio input in this integration.
- **Writing:** read photos or PDFs of handwriting (transcription), read the official band-descriptor PDF, and return strict JSON scores and feedback.
- **Cost:** low enough that a €10–15 plan still makes money.

### Price check (per 1M tokens, paid tier, checked 2026-09-26)

| Model | Input | Output | Audio in? | Notes |
| --- | --- | --- | --- | --- |
| Gemini 3.7 / 3.8 Flash | $0.75 → **$1.50 from 2027-01-01** | $3.75 → **$7.50** | Yes (same price as text) | Current Flash. The introductory price ends 31 Dec 2026, so plan with the 2027 price. |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 | Yes | Cheapest capable option. Check its quality. |
| Gemini 2.5 Flash (the app's current default) | $0.30 ($1.00 audio) | $2.50 | Yes | Older, but cheap and proven in this app. |
| Gemini 3.1 Pro (preview) | $2.00 | $12.00 | Yes | Premium tier only. |
| Claude Haiku 4.5 | $1 | $5 | No | Writing only. |
| Claude Sonnet 5 | $2 | $10 | No | Writing only. Strong feedback prose. |
| OpenAI | — | — | Yes | The pricing page blocked automated reads. Check it by hand before relying on OpenAI as the fallback. |

Google's **free** Gemini tier uses your content to improve its products; the paid tier does not. Student work must only ever go through a paid (billing-enabled) key.

### Estimated cost per assessment

These are rough estimates from the prompts in `lib/assessment-ai.ts`: rubric PDF of about 5k tokens, output of about 2k tokens plus reasoning, and Gemini audio at about 32 tokens per second. The first engineering task (below) replaces them with real numbers.

| Job | Gemini Flash at 2027 prices | Gemini Flash-Lite | Claude Sonnet 5 (writing only) |
| --- | --- | --- | --- |
| Writing: transcribe and assess | ≈ $0.07 | ≈ $0.02 | ≈ $0.09 |
| Speaking: one part (about 2 min) | ≈ $0.07 | ≈ $0.02 | — |
| Speaking: full test (about 14 min) | ≈ $0.15 | ≈ $0.05 | — |

Output tokens are about 80% of the cost. Capping the model's reasoning budget ("thinking") is the biggest cost lever.

### Recommendation

1. **Make Gemini Flash the default house model for everything.** It covers audio, PDFs and images from one vendor, and the adapter already exists. Keep one other provider as an automatic **fallback** (OpenAI, already implemented) for outages.
2. **Before choosing, test accuracy against real marks.** The database already stores the AI estimate (`result`) next to the teacher's final marks (`teacher_result`) for every reviewed assessment. That is a ready-made test set. Rerun the same 30–50 reviewed essays and recordings through Flash, Flash-Lite and Sonnet, and compare the mean absolute band error for each criterion. Choose the cheapest model within about 0.5 band of the teacher. Bandwise is only worth paying for if its marks are close to a teacher's.
3. **Keep bring-your-own-key as an option** (a cheaper plan, or a setting on any plan). It costs nothing to keep, because the code already exists.
4. Send provider calls through **Cloudflare AI Gateway**. It adds logs, cost analytics, per-gateway rate limits and provider fallback with no new infrastructure. You only change the base URL in `lib/provider-adapters.ts`.

### Code changes

- [ ] **Record token usage.** Have `generate()` in `lib/provider-adapters.ts` return each provider's `usage` block. Write one row per AI call to a new `usage_events` table (owner, assessment, provider, model, input/output/audio tokens, estimated cost). Do this first, while the app is still BYOK, to get real cost figures.
- [ ] **Add a platform connection.** Extend the existing `OPENAI_API_KEY` fallback in `lib/provider-store.ts` into a proper `source:'platform'` connection: Worker secrets `PLATFORM_GEMINI_API_KEY` (and `PLATFORM_OPENAI_API_KEY` as the fallback) plus the model IDs as vars. On hosted plans, `selectedConnections()` returns the platform connection and skips the provider picker.
- [ ] **Simplify Settings.** For hosted-plan users, replace "Settings → AI connection" with an "AI usage" panel showing credits left and the reset date. Show the provider forms only on the BYOK plan.
- [ ] **Limit spend.** Set a per-request `maxOutputTokens` and thinking budget, and a monthly budget alert in Google Cloud and AI Gateway.

---

## 2. Subscription model

### Options considered

| Model | Pros | Cons |
| --- | --- | --- |
| Flat monthly price, unlimited | Simplest to sell | One heavy user can cost more than they pay, because AI cost grows with usage. |
| Pure pay-as-you-go credits | Cost always covered | Unpredictable revenue, and teachers dislike metering. |
| Per active student (e.g. €2 per student per month) | Matches how tutors charge their own students | Harder to explain, and usage per student varies a lot. |
| **Hybrid: monthly plan with a credit allowance, plus top-ups (recommended)** | Predictable price, costs capped, obvious upgrade path | You have to explain what a "credit" is. |

### Credits

- 1 credit = one writing assessment (transcription included) or one speaking part up to 5 minutes.
- 3 credits = a full speaking test (over 5 minutes of audio).
- Reading and Listening scores, progress reports, the band calculator and email reports **never** use credits. They cost nothing to run and make the product feel generous.
- Credits are reserved when an AI request starts and refunded automatically if it fails.

### Suggested launch plans (first draft; change them once real usage is logged)

EU prices shown to consumers include VAT. A merchant of record (see below) handles that.

| Plan | Price | Includes | Worst-case AI cost | Who it's for |
| --- | --- | --- | --- | --- |
| **Free trial** | €0, no card | 15 credits once, 5 students | ≈ €1 | Trying it out |
| **Tutor** | €15/mo or €150/yr | 120 credits/mo, 40 students | ≈ €7 | Private tutors |
| **Pro** | €39/mo or €390/yr | 400 credits/mo, unlimited students, priority model | ≈ €22 | Busy tutors, small groups |
| **School** | from €99/mo | 3 teacher seats, 1,200 pooled credits, extra seats €25 | ≈ €66 | Language schools |
| **Own key** | €7/mo | Unlimited, using the teacher's own AI key (today's behaviour) | €0 | Technical users |
| Top-up | €9 | +100 credits, valid 12 months | ≈ €6 | Anyone who runs out |

"Worst case" means a user spends every credit on the most expensive job, at 2027 Gemini Flash prices. Real users typically use 30–50% of their allowance. Revisit these numbers after the first month of `usage_events` data.

### Payments provider

Recommendation: **Stripe Managed Payments** (Stripe acts as the *merchant of record*). Stripe is the legal seller, so it charges, files and pays EU VAT and other countries' sales taxes, and handles fraud and disputes. Greek businesses are eligible, and SaaS/AI products qualify (tax code `txcd_10105002` "AIaaS – business use" or `txcd_10103001` "SaaS – business use"). Third-party comparisons put the fee at about 3.5%. Confirm it in the Stripe dashboard. Constraint: subscriptions must be created through **Stripe Checkout or Payment Links**, which is what we would use anyway.

Fallback: **Paddle** (also a merchant of record; about 5% + $0.50 per transaction). Plain Stripe Billing plus Stripe Tax is cheaper per transaction, but then *you* register for EU VAT OSS and file returns. That isn't worth it at this size.

Prerequisite outside the code: a registered business (sole trader or company) and a bank account to open the Stripe account. Apply early, because the Managed Payments eligibility review takes time.

---

## 3. Public landing page and self-service sign-in

### Target URL layout

| Path | Who can see it | What it is |
| --- | --- | --- |
| `/` | Everyone | Landing page: what it does, screenshots, sample report, pricing summary, FAQ, "Start free". Server-rendered for SEO. |
| `/pricing`, `/terms`, `/privacy`, `/dpa` | Everyone | Plans and legal pages |
| `/login`, `/signup` | Everyone | Sign in with Google, or an emailed code/link |
| `/app` | Signed-in users | The current studio (today's `app/page.tsx`, moved) |
| `/app/billing` | Signed-in users | Plan, credits, invoices. "Manage subscription" opens the Stripe customer portal. |
| `/api/*` | Signed-in users (except webhooks) | Existing APIs, plus billing APIs |
| `/api/webhooks/stripe` | Stripe (signature-checked) | Subscription events |
| `/admin` | Only you (keep Cloudflare Access here) | Support tools: look up an account, grant credits |

### Fast interim step (no auth rewrite)

You can have a public landing page this week. Add `app/(marketing)/page.tsx` for `/`, move the studio to `/app`, then in Zero Trust change the Access application to protect only `bandwise.eurognosi-remote.com/app` and `/api` instead of the whole hostname. The landing page has a waitlist / "request access" form, and you add early users to the Access policy by hand, as you do now. This also works as a pilot with the first paying teachers (invoiced manually) while the rest is built.

### Permanent sign-in: app-level auth

Recommendation: **[Better Auth](https://www.better-auth.com)**. It is open-source, runs inside the Worker (it needs `nodejs_compat`, which the app already has), stores users and sessions in the existing D1 database through Drizzle, and supports Google sign-in plus email one-time codes or magic links. There are no per-user fees and all data stays on Cloudflare. It also has a Stripe plugin worth evaluating, but check that it works with Managed Payments before relying on it.
Alternative: Clerk, which is quicker to set up but hosted and charged per monthly active user above its free tier.

Changes:

- [ ] Replace `getTeacher()` in `app/access-auth.ts` with a session-based `getUser()` that returns the same shape. Every route already calls it, so the API routes barely change.
- [ ] **Add accounts ("workspaces").** Add a `workspaces` table (id, plan, Stripe customer ID, subscription status, period end, seat limit) and a `memberships` table (user ↔ workspace, role). Point the existing `owner` column at the **workspace ID** instead of the person. This is what makes School plans with shared students possible later.
- [ ] **Migrate existing teachers.** R2 keys and every row use the old Access `sub` as `owner`. Rather than rewriting data and moving files, create each existing teacher's workspace **with the old `sub` as its ID** and link their new login to it by email. Nothing in D1 or R2 has to move.
- [ ] Protect sign-up with Cloudflare Turnstile, require a verified email before the free credits are granted, and limit free trials by email domain and IP.
- [ ] Transactional email (login codes, "credits running low") through Cloudflare Email Service or Resend. Stripe sends receipts and invoices itself. Teacher-to-student progress reports can keep using the teacher's own SMTP mailbox.

---

## 4. Billing and quotas: code changes

- [ ] New tables (additive Drizzle migration): `workspaces`, `memberships`, auth tables, `credit_ledger` (workspace, delta, reason, assessment ID, created_at), `usage_events`.
- [ ] `POST /api/billing/checkout` creates a Stripe Checkout Session for a plan or top-up and redirects. `POST /api/billing/portal` opens the Stripe customer portal.
- [ ] `POST /api/webhooks/stripe`: check the signature (`stripe.webhooks.constructEventAsync` with `Stripe.createSubtleCryptoProvider()`, and `Stripe.createFetchHttpClient()` for the Workers runtime). Handle `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid` (grant the month's credits) and `invoice.payment_failed` (grace period, then read-only). Make handlers idempotent by storing processed event IDs.
- [ ] **Check credits in `app/api/studio/route.ts`** before `transcribe` / `assess`. Reserve credits in one conditional D1 statement (insert a negative ledger row only if the balance is enough), run the AI call, and insert a refund row on failure. Return HTTP 402 with a friendly "out of credits — top up or upgrade" message that the UI turns into an upgrade dialog.
- [ ] Enforce plan limits: student count on `create_student`, seats on membership invites.
- [ ] Rate limits: the Workers Rate Limiting binding per workspace (e.g. 10 AI requests per minute), on top of the credit check.
- [ ] Account lifecycle: data export (JSON plus files as a zip), account deletion (D1 rows and R2 prefix), and a read-only mode after cancellation (keep data 90 days, then delete).

---

## 5. Cloudflare infrastructure changes

| Change | Why |
| --- | --- |
| **Workers Paid plan** ($5/mo base) | The free plan's 10 ms CPU limit is already a known problem (README step 5). Paid also gives higher D1/R2 limits and 30-day D1 Time Travel for restores. |
| Narrow the **Access** application to `/admin` (after the auth switch) | Access would otherwise cost $7 per user above 50 users, and blocks the public pages. |
| **AI Gateway** `bandwise` | Logs, spend analytics, rate limits and provider fallback for the platform keys. |
| **Turnstile** widget | Bot protection on sign-up and login |
| **Rate Limiting** binding in `wrangler.json` | Per-workspace AI request limits |
| **Staging environment**: a Worker `bandwise-staging` with its own D1/R2 and Stripe *test mode*, deployed from PRs or a `staging` branch | Billing and auth changes must never be tested on production data |
| **EU data location**: for new resources use D1 location hint `weur` and R2 jurisdiction `eu` (existing ones can't be moved in place; check where they are) | GDPR, and schools will ask |
| **Cron Trigger** (daily) | Delete expired accounts, reconcile credits against Stripe, clean up orphaned files |
| **Web Analytics** on the landing page | Cookieless, so no cookie banner is needed for analytics |
| **New Worker secrets** | `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLATFORM_GEMINI_API_KEY`, `PLATFORM_OPENAI_API_KEY`, `TURNSTILE_SECRET_KEY`, email API key. Add them to `scripts/deploy.mjs` and the GitHub workflow the same way `PROVIDER_ENCRYPTION_KEY` is handled. |

Expected fixed monthly cost at launch: Workers Paid $5, plus D1/R2 well inside the included usage, plus about $0 for AI Gateway, Turnstile and Web Analytics. AI and payment fees grow with revenue.

---

## 6. Legal and trust (needed before taking money)

- **Business registration** in Greece, for Stripe and invoicing.
- **Terms of Service** and **Privacy Policy**. Also a **Data Processing Agreement**: teachers and schools are the *controllers* of their students' data and Bandwise is the *processor*. List the sub-processors: Cloudflare, Google (Gemini), OpenAI (fallback), Stripe, and the email provider.
- Many IELTS candidates are minors. Say so in the privacy policy, use only paid AI tiers that don't train on data, and document how long data is kept.
- **"IELTS" trademark:** it belongs to the British Council, IDP and Cambridge. Use the name only to describe what the product does, never in the logo or product name. Put a clear disclaimer in the footer ("not affiliated with or endorsed by…") and keep "estimates are not official scores" (the README already says this).
- **Official band descriptors:** the app downloads them from ielts.org and gives them to the AI. Keep linking to the official source rather than letting users download copies from Bandwise, and check ielts.org's terms of use.

---

## Roadmap

| Phase | Outcome | Main work |
| --- | --- | --- |
| **0. Decide and prepare** | Choices made, accounts applied for | Fill in `INFRASTRUCTURE.md` from the live account. Register the business, apply for Stripe Managed Payments. Choose plan prices. |
| **1. Public landing page** | `/` is public, the studio is at `/app` | Marketing pages, narrow the Access paths, waitlist form, Web Analytics. |
| **2. Hosted AI and metering** | Existing teachers work without their own keys, and real costs are known | `usage_events`, platform Gemini key via AI Gateway, OpenAI fallback, the accuracy test against teacher marks. |
| **3. Self-service accounts** | Anyone can sign up and get a free trial | Better Auth, workspaces, migration of existing teachers, Turnstile, transactional email, staging environment. |
| **4. Billing** | Users can pay and credits are enforced | Stripe Checkout, portal, webhooks, credit ledger, 402 upgrade dialog, billing page. |
| **5. Launch hardening** | Ready to advertise | Legal pages, account export and deletion, rate limits, monitoring and alerts, onboarding (sample student and essay), status and support email. |

## Decision log

| Date | Decision | Notes |
| --- | --- | --- |
| 2026-09-26 | Plan drafted | Nothing decided yet. The recommendations above are proposals. |

## Sources (checked 2026-09-26)

- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Claude API pricing: https://claude.com/pricing
- Stripe Managed Payments: https://docs.stripe.com/payments/managed-payments and eligibility: https://docs.stripe.com/payments/managed-payments/eligibility
- Stripe vs Paddle fees (third-party comparison): https://cut-the-saas.com/guides/stripe-vs-paddle
- Cloudflare Zero Trust pricing: https://www.cloudflare.com/plans/zero-trust-services/ (50 free users, about $7 per user per month after that, per https://zerometric.net/research/cloudflare-zero-trust-free-plan-limits-2026/)
- Better Auth on Workers: https://www.better-auth.com/docs/integrations/hono
