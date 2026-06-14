# Setup Guide: Google Sign-In & Vercel Deploy

A step-by-step walkthrough for two things people usually hit for the first time:
**(1)** wiring up "Continue with Google" and **(2)** deploying the web app to Vercel.

If a menu label below doesn't match exactly, the consoles get reorganized often — go by
the **goal** of each step, not the exact wording.

---

## Part 1 — Google Sign-In (Google OAuth + Supabase)

### How it works (the 10-second mental model)
When a user taps "Continue with Google":

```
Your app → Google (user logs in & consents) → Google redirects to Supabase's callback
         → Supabase creates the session → redirects back to your app's /auth/callback
         → your app sets the session cookie → dashboard
```

So there are **two different callback URLs**, and people mix them up:
- **Google → Supabase:** `https://<your-ref>.supabase.co/auth/v1/callback` (you give this to Google)
- **Supabase → your app:** `http://localhost:3000/auth/callback` (you allowlist this in Supabase)

### Step A — Copy Supabase's callback URL
1. Supabase dashboard → your project → **Authentication** (left sidebar) → **Providers** (a.k.a. "Sign In / Providers").
2. Find **Google** in the list and expand it.
3. Copy the **Callback URL (for OAuth)** it shows — looks like
   `https://abcd1234.supabase.co/auth/v1/callback`. Keep this handy for Step B.

### Step B — Create Google OAuth credentials
1. Go to **https://console.cloud.google.com** and sign in.
2. **Create a project:** top bar project dropdown → **New Project** → name it
   (e.g. "Calorie Tracker") → **Create** → then select that project.
3. **Configure the consent screen** (what users see when logging in):
   - Left menu → **APIs & Services → OAuth consent screen**
     (newer UI: **Google Auth Platform → Branding / Audience**).
   - **User type: External** → Create.
   - Fill in **App name**, **User support email**, and **Developer contact email**. Save.
   - **Scopes:** the defaults (`email`, `profile`, `openid`) are all you need — these are
     "non-sensitive", so **Google verification is NOT required**. Skip adding any scopes.
   - **Test users / Publishing:** while in **Testing** mode, only emails you add as
     "Test users" can sign in (add your own email). Or click **Publish app** to allow anyone
     (still no verification needed for the basic scopes above).
4. **Create the OAuth client:**
   - Left menu → **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
   - **Application type: Web application.**
   - **Name:** e.g. "Calorie Tracker Web".
   - **Authorized JavaScript origins** — add:
     - `http://localhost:3000`
     - `https://your-app.vercel.app` (add later, once you have the Vercel URL)
   - **Authorized redirect URIs** — add the **Supabase callback URL from Step A**:
     - `https://<your-ref>.supabase.co/auth/v1/callback`
     - ⚠️ This must match **exactly** (https, no trailing slash). This is the #1 cause of errors.
   - **Create** → a popup shows your **Client ID** and **Client Secret**. Copy both.

### Step C — Put the credentials into Supabase
1. Supabase → **Authentication → Providers → Google** → toggle **Enable**.
2. Paste the **Client ID** and **Client Secret** from Step B.
3. **Save.**

### Step D — Allowlist your app's redirect URL
1. Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (change to your prod URL when you deploy).
   - **Redirect URLs:** add both:
     - `http://localhost:3000/auth/callback`
     - `https://your-app.vercel.app/auth/callback` (after deploy)
2. Save. (Our code redirects to `${SITE_URL}/auth/callback`; Supabase only permits URLs on
   this allowlist.)

### Step E — Test
`npm run dev` → http://localhost:3000 → **Continue with Google** → pick your account →
you should land on the dashboard.

### Common errors & fixes
| Symptom | Fix |
|---|---|
| `redirect_uri_mismatch` | The **Authorized redirect URI** in Google must equal the Supabase callback URL exactly. |
| "Access blocked: app not verified" | Add your email under **Test users**, or **Publish** the consent screen. |
| Logs in but bounces to localhost in prod | Set Supabase **Site URL** + `NEXT_PUBLIC_SITE_URL` to your prod URL. |
| "Unsupported provider" | You didn't **Enable** Google in Supabase (Step C). |

> **Apple Sign-In** follows the same shape but requires a **paid Apple Developer account**
> ($99/yr) to create the Services ID and key. Skip it until you need the iOS app — email +
> Google are enough for now.

---

## Part 2 — Deploy to Vercel (free)

Vercel hosts the Next.js app. Because `@calorie/core` exports its TypeScript source, **no
special monorepo build config is needed** — just point Vercel at `apps/web`.

### Step A — Push your code to GitHub
1. Create an empty repo at **https://github.com/new** (no README/.gitignore — we already have them).
2. In the project folder, connect and push (replace the URL with yours):
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
   If git asks you to authenticate, the easiest path is **GitHub Desktop** or the
   `gh auth login` CLI — do this in your own terminal (it needs an interactive login).

### Step B — Import the project into Vercel
1. Go to **https://vercel.com** → **Sign Up** → **Continue with GitHub**.
2. **Add New… → Project** → find your repo → **Import**.
3. On the configure screen:
   - **Framework Preset:** Next.js (auto-detected ✓).
   - **Root Directory:** click **Edit** → choose **`apps/web`**. *(Critical for a monorepo.)*
     Vercel auto-enables "Include files outside the root directory", so `packages/core` is included.
   - **Build & Output Settings:** leave defaults (Build `next build`, Install `npm install`).
     No overrides needed.
   - **Environment Variables** — add these (same values as your `.env.local`):
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     - `NEXT_PUBLIC_SITE_URL` → set to `https://your-app.vercel.app` *(you can fill the real
       URL right after the first deploy — see Step C)*
     - *(Later phases:* `SUPABASE_SECRET_KEY`, `USDA_FDC_API_KEY`, `GEMINI_API_KEY`*)*
4. Click **Deploy** and wait ~1–2 minutes.

### Step C — Wire up the production URL
After the first deploy Vercel gives you a URL like `https://your-app.vercel.app`. Now:
1. **Vercel** → Project → **Settings → Environment Variables** → set
   `NEXT_PUBLIC_SITE_URL` to that exact URL → **redeploy** (Deployments → ⋯ → Redeploy).
2. **Supabase** → Authentication → **URL Configuration**:
   - Set **Site URL** to your Vercel URL.
   - Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**.
3. **Google Cloud** → Credentials → your OAuth client → add
   `https://your-app.vercel.app` to **Authorized JavaScript origins**.

### Step D — From now on
- **Every push to `main`** → automatic production deploy.
- **Every pull request** → its own preview URL.
- **Custom domain:** Project → **Settings → Domains** → add your domain and follow the DNS steps.

### Common errors & fixes
| Symptom | Fix |
|---|---|
| Build fails: "Module not found `@calorie/core`" | Root Directory must be `apps/web`, and "Include files outside root directory" must be on (default). |
| "Missing environment variable" at runtime | Add the `NEXT_PUBLIC_*` vars in Vercel **and redeploy** (env changes need a new build). |
| Google login works locally but not in prod | Update `NEXT_PUBLIC_SITE_URL`, Supabase Site URL + Redirect URLs, and Google origins (Step C). |
| Pushed but Vercel didn't build | Check the repo is connected under Project → Settings → Git. |
```
