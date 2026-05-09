# Open Items — Needed From Danny (the human)

This file is for blockers that require human action — credentials, account setup, decisions Claude can't make on its own. Append-only. Claude logs new items here when blocked; Danny reads + resolves when checking in.

---

## Active blockers

### 1. `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing from `.env.local`
- The current `.env.local` only has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- To wire up Supabase Auth (magic link) for students + org admins, the browser needs the anon key.
- **Action:** Supabase dashboard → Settings → API → copy `anon` `public` key → add as `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` to `.env.local`. Also add it to Vercel env vars (Production + Preview + Development).
- **Also:** add `NEXT_PUBLIC_SUPABASE_URL` (same value as existing `SUPABASE_URL`) to Vercel env vars. Already mirrored locally on Day 1.
- **Status:** unblocked when both NEXT_PUBLIC_* keys are in `.env.local` and Vercel env vars

### 2. Supabase Auth — enable magic link
- Supabase dashboard → Authentication → Providers → Email → enable "Confirm email" if you want it strict, or leave off for invite-only.
- Supabase dashboard → Authentication → URL Configuration → Site URL = `https://mentalvelocitysystem.com` (and `http://localhost:3000` for dev).
- **Status:** awaiting setup

### 3. Domain DNS — mentalvelocitysystem.com
- Domain is purchased but not pointed at Vercel.
- **Action:** Vercel project → Settings → Domains → add `mentalvelocitysystem.com` and `www.mentalvelocitysystem.com`. Vercel will give you DNS records (A or CNAME). Add those at the registrar.
- **When:** Day 8 (marketing page launch). Don't block dev work on this.
- **Status:** awaiting setup

### 4. Resend account + API key
- Will be needed Day 7 (email automation).
- **Action:** sign up at resend.com → verify a sending domain (probably `mentalvelocitysystem.com` once DNS is wired) → create API key → add `RESEND_API_KEY=...` and `RESEND_FROM_EMAIL=...` to `.env.local` and Vercel.
- **Status:** awaiting setup

### 5. Designate super_admin accounts
- After auth refactor, manually run:
  ```sql
  update profiles set role = 'super_admin'
   where id = (select id from auth.users where email = 'dannygreer@gmail.com');
  -- and same for the doctor's email
  ```
- **Status:** do after Day 1 acceptance, before Day 3.

---

## Resolved
*(move items here once handled — don't delete, keeps an audit trail)*
