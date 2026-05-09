# Day 1 Prompt — paste this into Claude Code (cwd = repo root)

You're working on the Mental Velocity System (MVS) LMS. The repo already has a working Active Threat assessment that is **doctrine-correct** — you are extending it into a multi-org LMS, not rebuilding it.

Read these in order before any code:
1. `AGENTS.md` (Next.js 16 quirks)
2. `CLAUDE.md` (working agreement, doctrine, autonomous-mode rules)
3. `docs/MVS_Project_Plan.md` (full project plan)
4. `docs/needs_doctor.md` (open content gaps from the client)
5. `docs/needs_human.md` (your blockers — append, don't read for instructions; Danny resolves them)

You are running with `--dangerously-skip-permissions`. The human is not watching. **Plan to work autonomously for 2-3 hours.** Follow the autonomous-mode rules in CLAUDE.md: don't stop to confirm, log blockers to `docs/needs_human.md`, append progress to `worklog.md`, commit at every working chunk on a feature branch.

## Your scope today: Day 1 of the plan — Wire up Supabase Auth

This is a **delicate refactor**: the existing `/mvs/admin` works on custom username/password auth (`src/lib/session.ts`, `src/actions/auth.ts`). It's serving real data. We're replacing it with Supabase Auth (magic link) without breaking it.

### Phase A — Verify foundation (~15 min)
1. Run `npm install`. Confirm clean install.
2. Run `npm run build`. Confirm it currently builds.
3. Create a feature branch: `git checkout -b feat/supabase-auth`.
4. Verify env: `.env.local` should have `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
   - **It probably does NOT have `NEXT_PUBLIC_SUPABASE_ANON_KEY`** — log that to `docs/needs_human.md` immediately. Continue with the work that doesn't need it (you can write the code; just won't be able to fully test without the key).

### Phase B — Schema additions (~30 min)
1. Create `supabase/migrations/0002_orgs_and_auth.sql` with the `orgs` and `profiles` tables exactly as specified in `docs/MVS_Project_Plan.md` §2.1. Include indexes.
2. Apply to Supabase via `npx supabase db push` (or via SQL editor if CLI auth has issues). If `supabase link` isn't done, log to `docs/needs_human.md` and use SQL editor as fallback.
3. Add a trigger on `auth.users` insert that auto-creates a `profiles` row with default role `student`.

### Phase C — Supabase clients (~30 min)
1. `npm install @supabase/ssr`.
2. Create `src/lib/supabase/server.ts` (server component + server action client, cookie-based session).
3. Create `src/lib/supabase/client.ts` (browser client).
4. Create `src/lib/supabase/middleware.ts` for session refresh in middleware.
5. Use the **Next 16 App Router pattern** — read `node_modules/@supabase/ssr/dist/main/index.d.ts` and the README to confirm the latest API. Don't assume from training data.

### Phase D — Login flow (~45 min)
1. Create `src/app/auth/login/page.tsx` — a magic-link form (email input + "Send link" button + "Check your email" success state).
2. Create `src/app/auth/callback/route.ts` — handles the magic-link callback, exchanges code for session, redirects by role.
3. Add `src/middleware.ts` to refresh sessions on every request.
4. Update `src/app/mvs/admin/login/page.tsx` to redirect to `/auth/login` (preserve the URL for bookmarks).
5. **Do not delete `src/lib/session.ts` or `src/actions/auth.ts` yet** — the `/mvs/admin` route still depends on them. We'll cut over the admin in Day 2 once Supabase Auth is verified working.

### Phase E — Smoke test (~30 min)
1. `npm run dev`.
2. Navigate to `/auth/login`. Submit your own email.
3. If you have the anon key: receive the magic link, click, land somewhere sensible.
4. If you don't have the anon key yet: confirm the form renders without errors and the server action would-have-worked (check server logs for the actual Supabase error — should be a clear "anon key missing" not a code bug).
5. Confirm `/mvs/admin` still works with the old username/password.
6. `npm run build` — must still pass.

### Phase F — Verify with subagent (~15 min)
Launch a Task to a subagent with this brief:
> Independently review the Supabase Auth wiring on branch `feat/supabase-auth`. Specifically check: (a) is the SSR client pattern correct for Next.js 16, not Next.js 14? (b) does middleware refresh sessions on every request? (c) do server actions get a fresh server client (not a stale module-scoped one)? (d) is there any way for an unauthenticated user to reach `/mvs/admin`? Report findings.

Address whatever it flags before stopping.

### Phase G — Stop cleanly
1. Append a `worklog.md` entry with what you did, what passed, what's blocked.
2. Commit: `feat: wire Supabase SSR auth alongside legacy admin auth`
3. Push the branch.
4. Print a short chat summary:
   - What's working
   - What's blocked (and where logged)
   - What Day 2 will do (RLS migration + cut over /mvs/admin)

**Do NOT** start Day 2 today. RLS is its own session because mistakes there can lock you out of your own data. Stop after Day 1 acceptance.

## Day 1 acceptance criteria
- `feat/supabase-auth` branch pushed to GitHub
- `npm run build` passes
- `0002_orgs_and_auth.sql` applied (or fallback logged)
- `/auth/login` form renders and submits
- `/mvs/admin` STILL works with the old password (no regression)
- `worklog.md` updated
- Subagent verification logged

Go.
