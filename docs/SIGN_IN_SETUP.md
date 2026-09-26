# Setting up Bandwise sign-in (Phase 3)

Bandwise is moving from Cloudflare Access to its own sign-in: **Continue with Google**, or an **emailed 6-digit code**. Anyone can create an account, but new accounts wait for an admin's approval before they can use the studio.

The code ships with this switched off. It turns on only when the settings below exist, so do these steps in any order. Never paste secrets into chat or commit them.

## 1. A secret for sign-in sessions

Generate a random key, the same way as `PROVIDER_ENCRYPTION_KEY`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Add it to GitHub under **Settings → Secrets and variables → Actions → Secrets** as `BETTER_AUTH_SECRET`. It signs session cookies. Changing it later signs everyone out, but loses no data.

## 2. Google sign-in

1. Open [Google Cloud Console](https://console.cloud.google.com/). Create a project called "Bandwise", or reuse the one that holds your Gemini key.
2. **APIs & Services → OAuth consent screen** (called "Google Auth Platform" in newer consoles):
   - User type: **External**.
   - App name **Bandwise**, with your support email.
   - App home page: `https://bandwise.eurognosi-remote.com`
   - Privacy policy: `https://bandwise.eurognosi-remote.com/privacy`
   - Terms of service: `https://bandwise.eurognosi-remote.com/terms`
   - Authorised domain: `eurognosi-remote.com`. Google may ask you to prove you own it in [Google Search Console](https://search.google.com/search-console). Add it as a Domain property and verify with the DNS TXT record Google gives you, in Cloudflare DNS.
   - Leave the app logo empty unless you need it: uploading one triggers Google's brand verification review.
   - Scopes: only the defaults (`openid`, `email`, `profile`). These are non-sensitive scopes, so Google needs no review.
   - Set the publishing status to **In production**. While it's in "Testing", only test users you list can sign in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorised JavaScript origin: `https://bandwise.eurognosi-remote.com`
   - Authorised redirect URI: `https://bandwise.eurognosi-remote.com/auth/callback/google`
4. Copy the client ID and secret into GitHub:
   - **Variable** `GOOGLE_CLIENT_ID`: the client ID. It isn't secret.
   - **Secret** `GOOGLE_CLIENT_SECRET`: the client secret.

## 3. Email for sign-in codes (Cloudflare Email Service)

1. In the Cloudflare dashboard, go to **Compute → Email Service → Email Sending → Onboard Domain** and pick `eurognosi-remote.com`. Cloudflare adds the DNS records itself (SPF, DKIM, DMARC, and bounce MX on a `cf-bounce` subdomain).
   - **If the domain already sends email** (Google Workspace, Microsoft 365, a newsletter tool…), check afterwards that it has only **one** SPF record for the root domain. The existing senders and Cloudflare must both be in it (`include:` entries), or those other emails may start landing in spam.
2. Add the GitHub **variable** `EMAIL_FROM` with the sender address on that domain, e.g. `no-reply@eurognosi-remote.com`. Emails show "Bandwise" as the sender name.
3. **While Workers Paid is off:** Cloudflare only delivers to addresses verified in your account. Verify each tester's address under **Email → Email Routing → Destination addresses**. Google sign-in works for everyone regardless. Once Workers Paid is on again, codes reach any address (3,000 emails a month included, then $0.35 per 1,000).

## 4. Who approves new accounts

Add the GitHub **variable** `ADMIN_EMAILS`: the comma-separated sign-in emails that may approve accounts at `/app/admin`. Your own email is enough.

## 5. Deploy, then switch Access off for the studio

1. Run the deploy (merge the pull request, or **Actions → Check and deploy Bandwise → Run workflow**).
2. **Before removing Access, sign in to the studio once more through Access** with each existing teacher account. That visit records which email owns which existing workspace. When the same person later signs in with Google or a code, they land in their existing workspace with all their students and assessments.
3. Open `https://bandwise.eurognosi-remote.com/login` and check that the sign-in page loads.
4. In Zero Trust → Access → Applications → `bandwise`, **delete the application**, or remove its `app` and `api` destinations. The studio now checks sign-in itself. Every page and API refuses requests without a valid session.
5. Sign in at `/login`. You'll be in your existing workspace. Open `/app/admin` to see and approve new sign-ups.

Until step 4, Cloudflare Access keeps working exactly as today.
