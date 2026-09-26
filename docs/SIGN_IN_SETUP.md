# Moving to bandwiseapp.com and turning on sign-in

Bandwise is moving from `bandwise.eurognosi-remote.com` to **`bandwiseapp.com`**, and from Cloudflare Access to its own sign-in: **Continue with Google**, or an **emailed 6-digit code**. Anyone can create an account, but new accounts wait for an admin's approval before they can use the studio.

Once the domain release is deployed:
- The Worker answers on `bandwiseapp.com`, `www.bandwiseapp.com` and the old address.
- Every hostname except `bandwiseapp.com` redirects there with the same path (`lib/canonical-host.ts`), so old links and logos in reports already sent keep working.
- Sign-in stays off until `BETTER_AUTH_SECRET` is set.

Never paste secrets into chat or commit them. Do the steps in this order.

## 1. Let the deploy use the new domain

The GitHub secret `CLOUDFLARE_API_TOKEN` must be allowed to manage the new zone, or the deploy will fail when it adds the custom domain.
1. In the Cloudflare dashboard, open **My Profile → API Tokens** and edit the token used by GitHub.
2. Under **Zone Resources**, include **`bandwiseapp.com`** as well as `eurognosi-remote.com`.
3. Make sure the zone permissions include **Zone → Workers Routes → Edit** and **Zone → Zone → Read**.

## 2. Recommended settings on the new zone

In the dashboard, open **`bandwiseapp.com`**:
- **SSL/TLS → Edge Certificates:** turn on **Always Use HTTPS** and set **Minimum TLS Version** to **TLS 1.2**.
- **SSL/TLS → Overview:** **Full (strict)**. The Worker is the origin, so this is safe.

## 3. A contact address: hello@bandwiseapp.com

The landing page, privacy policy and terms now show `hello@bandwiseapp.com`. Set it up to forward to your inbox:
1. Open **`bandwiseapp.com` → Email → Email Routing** and click **Enable**. Let Cloudflare add its MX and SPF records.
2. **Routing rules → Create address:** `hello` → *Send to an email* → your Gmail address. Verify the destination when Cloudflare emails you.

## 4. A secret for sign-in sessions

Generate a random key:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Add it to GitHub under **Settings → Secrets and variables → Actions → Secrets** as `BETTER_AUTH_SECRET`. Changing it later signs everyone out, but loses no data.

## 5. Google sign-in

1. **Verify the domain.** In [Google Search Console](https://search.google.com/search-console), use the Google account that owns the Cloud project. Click **Add property → Domain**, enter `bandwiseapp.com`, then choose **Verify automatically with Cloudflare** (or add the TXT record under **DNS → Records** yourself).
2. In [Google Cloud Console](https://console.cloud.google.com/), go to **Google Auth Platform → Branding** (the OAuth consent screen):
   - App name: **Bandwise**, with your support email.
   - App home page: `https://bandwiseapp.com`
   - Privacy policy: `https://bandwiseapp.com/privacy`
   - Terms of service: `https://bandwiseapp.com/terms`
   - Authorised domains: **`bandwiseapp.com`**. Remove `eurognosi-remote.com` if you added it.
   - Scopes: only `openid`, `email` and `profile`. These are non-sensitive, so Google needs no security review.
   - App logo: upload `public/logo/bandwise-logo-google-120.png` (120×120, full square). Google shows the logo only after its brand review, which needs the verified domain, home page and privacy policy above.
   - **Audience:** publishing status **In production**. In "Testing", only listed test users can sign in.
3. **Clients → Create client → Web application** (or edit the one you made):
   - Authorised JavaScript origin: `https://bandwiseapp.com`
   - Authorised redirect URI: `https://bandwiseapp.com/auth/callback/google`
4. In GitHub, add the client ID as **variable** `GOOGLE_CLIENT_ID` and the client secret as **secret** `GOOGLE_CLIENT_SECRET`.

## 6. Email for sign-in codes (Cloudflare Email Service)

1. Go to **Compute → Email Service → Email Sending → Onboard Domain** and pick **`bandwiseapp.com`**. Cloudflare adds the sending records (SPF, DKIM and DMARC, plus bounce MX on a `cf-bounce` subdomain).
   - Email Routing from step 3 also uses SPF on the root domain. Afterwards, check that `bandwiseapp.com` has **one** SPF record (`v=spf1 …`) containing both Cloudflare entries, not two separate SPF records.
2. Add the GitHub **variable** `EMAIL_FROM` = `no-reply@bandwiseapp.com`. Emails show "Bandwise" as the sender name.
3. **While Workers Paid is off:** Cloudflare only delivers to addresses verified in your account (the Email Routing destinations). Google sign-in works for everyone regardless. With Workers Paid, codes reach any address (3,000 emails a month included, then $0.35 per 1,000).

## 7. Who approves new accounts

Add the GitHub **variable** `ADMIN_EMAILS`: the comma-separated sign-in emails that may approve accounts at `/app/admin`. Use the email you'll sign in with, which is also the one you use with Cloudflare Access today.

## 8. Deploy and switch over

1. **Link your existing workspace.** Before or after this release, open `https://bandwise.eurognosi-remote.com/app` once and sign in through Cloudflare Access with each existing teacher's email. The Worker records which email owns which workspace (on the old address it does this just before redirecting). Signing in on `bandwiseapp.com` with the same email then lands in the existing workspace with all its data.
2. **Deploy:** merge the pull request, or run **Actions → Check and deploy Bandwise → Run workflow**. Check that `https://bandwiseapp.com/login` shows "Continue with Google" and the email option.
3. **Sign in** at `https://bandwiseapp.com/login` and confirm you see your students. Then open `/app/admin`.
4. **Remove Cloudflare Access:** in **Zero Trust → Access → Applications**, delete the `bandwise` application. The old address now only redirects, and the studio checks sign-in itself.

## If something goes wrong

- **Google says "redirect_uri_mismatch":** the redirect URI in step 5.3 must be exactly `https://bandwiseapp.com/auth/callback/google`.
- **You land in an empty workspace:** you signed in before your email was linked. While Access still exists, open `https://bandwise.eurognosi-remote.com/app` and sign in through Access with the same email. Your account moves to your existing workspace automatically, as long as the new one is still empty. Then reload `bandwiseapp.com/app`.
- **No sign-in code arrives:** check `EMAIL_FROM` and the Email Service onboarding. Without Workers Paid, the address must be a verified Email Routing destination.
