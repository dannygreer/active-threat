@AGENTS.md

# MVS — Working Agreement (read every session)

You are working on the Mental Velocity System (MVS) LMS. This started as an "active threat initial assessment" prototype and is being expanded into a full LMS for Dr. Kevin Scully's training course.

Read these in order before any work:
1. `AGENTS.md` (Next.js 16 quirks)
2. This file
3. `docs/MVS_Project_Plan.md` (full project plan)
4. `docs/needs_doctor.md` (open content gaps from the client)
5. `docs/needs_human.md` (your blockers — append, don't read for instructions)

## Doctrine — non-negotiable
- This is **not** a quiz engine. It is an **event-based decision capture system**.
- Every answer selection writes one row to `responses_long`. Immediately. Idempotently.
- Reaction time is **client-side**, captured from the moment the answer screen mounts to the moment of click. The existing implementation in `src/components/quiz/ScenarioScreen.tsx` (`AnswerScreen` using `startTimeRef = useRef(Date.now())`) is the canonical pattern. Reuse it. Do not derive RT from server timestamps.
- No back buttons. No progress bars that imply "go faster." No guidance signals in UI.
- Schema must support branching (it already does — `next_screen_id` on `screen_options`).
- Validation: the system must reconstruct a path like `S1_START > A2_CONFIRM_1 > A3_CONFIRM_2 > A4_CONFIRM_3 > S5_CONVERGENCE > S6_FINAL_PRESSURE` with timing per step. The active-threat seed already exercises this.

## Stack — do not deviate without asking
- Next.js 16.2.2 (App Router) — read `node_modules/next/dist/docs/` before assuming APIs match older versions
- React 19.2.4
- Tailwind 4
- TypeScript
- Supabase (postgres + we are adding Auth + RLS)
- Resend (transactional email — to be added)
- Vercel (hosting + Cron)
- **npm**, not pnpm. Lockfile is `package-lock.json`.

No Drizzle, no Prisma, no Clerk, no Auth.js, no other ORMs, no other auth providers, no other email providers, no other UI libraries. Use Supabase migrations + the `@supabase/supabase-js` client.

## What's already built (do not rebuild — extend)
- `src/components/quiz/Quiz.tsx` + `ScenarioScreen.tsx` — the assessment runner. Doctrine-correct: client-side RT, event-based, branching, timer, timeout handling. Reuse this for new assessment types.
- `src/lib/db.ts` — Supabase data access layer. Server-only (service role). Will be augmented (not replaced) with role-aware queries.
- `src/lib/session.ts` — current custom-auth session. Will be replaced by Supabase Auth as part of the auth migration.
- `supabase/setup.sql` (legacy `quiz_results` — leave alone), `supabase/migration.sql` (the doctrine-aligned tables — extend, don't rewrite), `supabase/seed.sql` (the active-threat scenario — keep).
- Admin dashboard at `/mvs/admin` with tabs: Summary, Responses, ScenarioBuilder, ResponseTagging, plus CSV export at `/api/admin/export-csv`.
- Existing tables: `quiz_results` (legacy), `scenarios`, `scenario_screens`, `screen_options`, `response_tags`, `responses_long`, `responses_wide`. The `response_category` taxonomy is already defined as `controlled | acceptable | premature | unsafe`.
- `next.config.ts` redirects `/admin*` and `/active-threat/admin*` → `/mvs/admin*`.

## What needs to be added (the LMS expansion)
- `orgs` (multi-tenancy: hospitals, police depts, etc.)
- `profiles` linked to `auth.users` with role enum (`super_admin | org_admin | student`)
- `enrollments` (assigns a student to a phase × assessment)
- `assessments` parent table to support both scenario-style (existing model) and 50-question multi-choice (new) under one umbrella
- `mc_questions` + `mc_options` for the 50-question Test Bank
- Supabase Auth (magic link) replacing custom username/password admin
- RLS policies for all three roles
- Email automation via Resend
- Marketing landing page
- Org admin dashboard
- CRM-lite fields on `orgs`

## House rules
- Server Components by default. Client Components only when interactivity demands it (assessment runner, admin dashboards with state).
- All multi-tenant access enforced via RLS, not in app code, after the auth refactor.
- Every PR/commit touching the DB includes the migration file.
- No commerce code. No payment libraries. Invoice off-platform.
- When you don't have content the doctor needs to provide, do **not** invent it. Add the item to `docs/needs_doctor.md` and seed with `[NEEDS_DOCTOR]` placeholder.
- Migrations are **additive**. Never modify `migration.sql`, `setup.sql`, or `seed.sql` — those are already applied to production. Add new files numbered `0002_*.sql`, `0003_*.sql`, etc.

## Roles (after auth refactor)
- `super_admin` (Danny + the doctor): everything, all orgs
- `org_admin`: their org's roster + aggregate scores only
- `student`: own enrollments + own response data only

## Working style — autonomous mode

You are running with `--dangerously-skip-permissions`. The human is not watching. Do not stop to ask for confirmation. Use your judgement and keep moving.

The only things that should ever stop you:
1. You need a secret/credential not in `.env.local` or `.env.example`.
2. You need content the doctor hasn't provided (test answers, scenario text, etc.).
3. You've debugged the same failure 3+ times and you're going in circles.

When any of those happen: append the blocker to `docs/needs_human.md` (include what you tried, what you need, what you're doing instead), then **skip that work item and continue with the next one**. Do not halt the session.

### Required conventions for autonomous runs
- **`worklog.md`** at repo root. Append a dated entry after every meaningful chunk: what you did, what passed, what failed, what's next. The human reads this when they check in.
- **`docs/needs_human.md`** for blockers (see above). Append, never overwrite.
- **Git commits as checkpoints.** Commit every working chunk with conventional commits (`feat:`, `fix:`, `chore:`, `docs:`). Push at the end of every "day" of work, on a feature branch unless told otherwise.
- **Verify your own work.** For anything non-trivial (new migration, RLS policy, the assessment runner, CSV export, auth flow), launch a subagent via the Task tool to independently review. Don't mark a task done until verification passes.
- **Run tests/builds yourself.** Don't just write code — run `npm run build`, watch for errors, then commit. If something fails, debug. If you can't fix in 3 attempts, log to `needs_human.md` and move on.
- **Read the plan, but execute one day at a time.** Don't try to do all 14 days in one run. Plan a 2-3 hour chunk, execute it, write to worklog, then either continue with the next chunk or stop cleanly.

### Stopping cleanly
When you finish a chunk, hit a wall, or judge it's a good stopping point:
1. Write a `worklog.md` entry summarizing the session.
2. Make sure the build is green (`npm run build`).
3. Commit + push.
4. Print a short summary to chat: "Stopping. Did X, Y, Z. Blocked on A (logged in needs_human.md). Next session: B."
