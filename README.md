# Bandwise · IELTS Teaching Studio

A standalone teacher workspace for IELTS writing and speaking practice. Manage the source in GitHub and deploy it to **Cloudflare Workers**. The database and uploads live in your Cloudflare account. No ChatGPT Sites account is needed to run it.

This copy starts empty. It contains no test students, assessments, uploads, provider keys or credentials from the earlier hosted site.

## What is included

- Student records, writing/speaking submissions, rubric-based AI estimates and teacher feedback.
- OpenAI, Gemini, Claude and Qwen provider connections. Each teacher saves their own API keys in the app; keys are encrypted before storage.
- Automatic browser-side conversion of essay and prompt PDFs into page images for Qwen, including scanned PDFs (20 PDF pages per request).
- Teacher confirmation of OCR text, printable practice reports and progress tracking.
- Verified Cloudflare Access sign-in, D1 database migrations, private R2 uploads, and a GitHub Actions check/deployment workflow.

## First deployment from GitHub

You need a Cloudflare account with Workers, D1, R2 and Zero Trust Access enabled. Cloudflare and model providers apply their own usage limits and charges. This is a Workers application, not a static Pages upload.

### 1. Create empty storage

In the Cloudflare dashboard:

1. Create a **D1** database named `bandwise`. Copy its database ID (`wrangler d1 create bandwise` also works and prints it directly).
2. Create a private **R2** bucket named `bandwise-uploads`. Leave public access disabled (`wrangler r2 bucket create bandwise-uploads`).
3. Note your Cloudflare **account ID** (`wrangler whoami`). By default the app hostname is `bandwise-ielts-studio.YOUR-SUBDOMAIN.workers.dev`.

The deployment workflow creates the tables by applying the checked-in SQL migrations. Do not import the old site's data.

#### Optional: use a custom domain instead of `workers.dev`

If the domain is already an active zone on the same Cloudflare account, you can serve the app from it directly instead of the `workers.dev` subdomain. In `wrangler.json`, set `workers_dev` to `false` and add a `routes` entry:

```json
"workers_dev": false,
"routes": [{"pattern": "bandwise.yourdomain.com", "custom_domain": true}]
```

`wrangler deploy` then creates the DNS record and SSL certificate automatically. The API token in step 3 below needs two extra permissions for this to succeed: **Zone → Workers Routes → Edit** and **Zone → Zone → Read**, scoped to that specific zone under **Zone Resources** (account-only permissions aren't enough for custom domains).

### 2. Set up teacher sign-in

In Cloudflare Zero Trust, create a **self-hosted Access application** for the full app hostname above (all paths). Allow only your chosen teacher email addresses. Email one-time PIN or an identity provider such as Google can be used. Do not add a Bypass or Everyone policy.

Copy the application's **Application Audience (AUD)** tag and your **team domain**, such as `your-team.cloudflareaccess.com`. You can configure the hostname before the Worker is published. If you use a custom domain instead of `workers.dev`, use that hostname here.

The app checks the JWT signature, issuer, audience and expiration itself. A forged identity header cannot sign someone in. Without working Access configuration, the app's APIs remain signed out. Every teacher has a separate workspace; this version does not introduce shared staff records.

**Managing who has access:** whoever controls this Cloudflare account controls sign-in — there is no in-app admin role or user management screen. To add or remove a teacher, edit the policy's **Include** rule (Zero Trust → Access → Applications → this application → its policy) and add or delete their email. Changes take effect immediately, without a redeploy. Removing a teacher's access does not delete their data; it stays in D1/R2 until you remove it separately.

References: [Protect Workers with Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) · [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)

### 3. Add GitHub repository settings

Open **Settings → Secrets and variables → Actions** in this GitHub repository.

Add these **repository secrets**:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | A token scoped to your Cloudflare account with Workers Scripts Edit, D1 Edit and Workers R2 Storage Edit. No GitHub token belongs here. |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID. |
| `PROVIDER_ENCRYPTION_KEY` | A random 32-byte key encoded as base64. Generate it with the command below. |

Generate the encryption key locally with Node.js, then paste the output into the GitHub secret:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Keep that encryption key unchanged across deployments and backed up privately. Replacing it makes previously saved provider connections unreadable; teachers would need to reconnect them. Never put API keys or this encryption key into source files or commits.

Add these **repository variables**:

| Variable | Value |
| --- | --- |
| `CLOUDFLARE_D1_DATABASE_ID` | The D1 database ID from step 1. |
| `CLOUDFLARE_R2_BUCKET_NAME` | `bandwise-uploads`, or the bucket name you created. |
| `ACCESS_TEAM_DOMAIN` | Your team domain, e.g. `your-team.cloudflareaccess.com`. |
| `ACCESS_AUD` | The Access application's AUD tag. |
| `CLOUDFLARE_WORKER_NAME` | Optional; defaults to `bandwise-ielts-studio`. Use the same name in your Access hostname. |
| `CLOUDFLARE_DEPLOY_ENABLED` | Set to `true` once the other settings are ready. |

### 4. Deploy

Open **Actions → Check and deploy Bandwise → Run workflow** on `main`.

The workflow installs dependencies, checks types, runs tests, builds, applies database migrations and deploys the Worker. It installs the encryption secret without printing it. The Worker URL appears in the deployment log. Visit that URL, sign in through Access, and connect your AI provider under **AI connection**.

Until `CLOUDFLARE_DEPLOY_ENABLED` is `true`, GitHub runs checks but skips deployment. After setup, pushes to `main` deploy automatically. Pull requests run checks only and never receive deployment credentials.

## Local development

Install Node.js 24 and run:

```sh
npm ci
npm run setup:local
npm run db:local
npm run dev
```

Use the local URL printed in the terminal. Local storage is separate from Cloudflare production. The setup command creates ignored `.dev.vars` settings and a development-only teacher identity. Production builds cannot use this local sign-in shortcut, even if a `LOCAL_DEV_EMAIL` variable is accidentally configured in Cloudflare.

Useful commands:

```sh
npm run typecheck
npm test
npm run build
```

For deployment from your computer, supply the same Cloudflare settings as environment variables, run `npm run config:cloudflare`, then `npm run deploy`. Deployment uses the build output at `dist/server/wrangler.json`. Do not run a static Pages deploy command.

## Editing and maintenance

- Main interface: `app/page.tsx` and `app/globals.css`.
- AI requests: `lib/assessment-ai.ts` and `lib/provider-adapters.ts`.
- Qwen PDF conversion: `lib/render-pdf.client.ts`. PDF.js assets are copied locally during build; no conversion service receives your files.
- Authentication: `app/access-auth.ts` and `lib/access.ts`.
- Storage schema: `db/schema.ts`; committed migrations: `drizzle/`.
- Cloudflare resources: `wrangler.json`; deployment: `.github/workflows/cloudflare.yml`.

Use a branch and pull request for changes. Migrations must be additive where possible; do not rewrite SQL files already applied to a live database. The existing application logic and AI models are preserved from the source version; model availability may vary by account and region.

To stop automated deployment, set `CLOUDFLARE_DEPLOY_ENABLED` to `false`. To roll back code, revert a commit and let the workflow deploy it, or use Cloudflare's deployment rollback controls. Code rollback does not undo database migrations. Back up D1 and R2 before future destructive schema changes.

## Privacy and scope

API keys are stored encrypted with AES-GCM and scoped to the signed-in teacher. Uploaded files are served through authenticated, owner-checked requests. Original uploads stay in R2; generated Qwen page images are temporary request data. No student data or credentials belong in this repository.

This is an independent IELTS practice tool. Estimates are not official IELTS scores, and teacher review remains necessary. Provider API charges are separate from chat subscriptions.

Third-party packages retain their licenses; the vendored shadcn stylesheet retains its accompanying license. This private repository does not grant a public redistribution license for the application.
