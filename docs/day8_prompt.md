# Day 8 Prompt — paste this into Claude Code (cwd = repo root)

You're working on the Mental Velocity System (MVS) LMS. Days 1-7 shipped: full LMS rails (auth, RLS, orgs, students, both assessment runners, org admin portal, scoring view, email automation). Today (Day 8) is the **public face**: marketing landing page at `/`, move the existing quiz off `/`, leads capture, and DNS hookup for `mentalvelocitysystem.com`.

Read these in order before any code:
1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/MVS_Project_Plan.md` §2.2 ("Marketing landing page" block) and §2.3 #6 (brand assets — still NEEDS_DOCTOR but ship anyway with placeholder)
4. `worklog.md` — Days 1-7
5. `docs/needs_human.md` — items #2 (Supabase Auth Site URL config) and #3 (DNS) become unblockable today

You are running with `--dangerously-skip-permissions`. Plan to work autonomously for **3 hours**.

## Branch
Branch from `main` as `feat/marketing-and-domain`.

## Design direction — preserve aesthetic, reject density

The doctor approved a reference dashboard mockup. **Adopt the visual language; reject the layout density.** A marketing page is an outdoor billboard, not an operator console.

**Take from the reference:**
- Background: deep near-black with a subtle radial/grid texture and faint cyan glow (think `#0a0e1a → #101725` gradient, with a low-opacity radar-circle SVG behind the hero).
- Headlines: large, weighty, all-caps. Silver/metallic gradient on key headlines (e.g., `bg-gradient-to-b from-zinc-200 to-zinc-500 bg-clip-text text-transparent` is a fast Tailwind 4 approximation of the metallic look; refine if it reads cheap).
- Accent color: cyan (Tailwind `cyan-400` / `sky-400` is the right family).
- Body text: light gray (`zinc-300`).
- Typography: clean modern sans (Inter via `next/font/google` is fine — don't introduce a paid display font for v1 unless the doctor delivers one). Use uppercase + tracking-wide for badges/labels, regular case for body.
- Buttons: thin cyan border, transparent fill, hover fills cyan with dark text. Single primary CTA.
- A subtle "secure connection" / "online" green dot in the footer is on-brand.

**Reject from the reference:**
- Multi-card grids (Primary Access / Quick Access). The marketing page does NOT have 8 navigation cards.
- "Welcome back, Operator 27" header. Marketing page is for first-time visitors.
- Stats/dashboards on the homepage. We have a doctrine — measurement happens *inside*, not on the front door.
- Numeric tabs / nav with icon labels along the top. A marketing page has at most a logo + a "Sign in" link in the top-right.

**Section budget — five total, with breathing room:**
1. Hero (full viewport, very sparse — headline + subhead + 1-2 sentences + 1 CTA + tagline at bottom)
2. What it is (one column, ~600px max-width centered, 2-3 paragraphs)
3. Who it's for (three categories — hospitals, law enforcement, defense — minimal cards or just a row)
4. The doctor (two columns: photo placeholder + short bio)
5. Contact (centered form, ~520px max-width)

Then a thin footer. No more than 5 sections. Each section gets `py-24` minimum.

## Scope today

Five things, in this order:

1. Migration `0008_leads.sql` — leads table + RLS (anon insert, super_admin read).
2. Move existing quiz (currently at `/`) to a new route so we can put marketing at `/`.
3. Marketing landing page at `/`.
4. Contact form → leads table → super_admin sees inbound at `/mvs/admin/leads`. Optional bonus: Resend notification to super_admin on new lead.
5. Wire `mentalvelocitysystem.com` to Vercel + log DNS records to `needs_human.md`. Same sitting: Resend domain verification records.

### Phase A — Foundation (~10 min)
1. `git checkout main && git pull`. `git checkout -b feat/marketing-and-domain`.
2. `npm install` → `npm run build`.
3. Confirm `src/app/page.tsx` is currently the quiz title screen (it is per Day 0). Plan the move in Phase B.

### Phase B — Move existing quiz off `/` (~30 min)

The existing flow at `/` is the anonymous quiz — captures first/last name, runs the active-threat scenario, writes to `responses_long`. This is the legacy walk-in path. **Don't break it.**

Move it to `/take` (or `/quiz` — pick what reads cleanest):
1. Move `src/app/page.tsx` → `src/app/take/page.tsx` (or rename + update imports).
2. Update `next.config.ts` to add a redirect from `/` for any deep links — actually no, the new `/` IS the marketing page so no redirect needed; just confirm no other code paths assume the quiz lives at `/`.
3. Search for hardcoded `/` references that might be the quiz: `grep -r "href=\"/\"" src/`. Update any that should now point at `/take`.
4. Test: visit `/take` locally, confirm the quiz loads + completes + submits a row to `responses_long` with `enrollment_id IS NULL` (the legacy anonymous path is preserved).

### Phase C — Marketing page (~75 min)

Plain Tailwind 4. No new UI library. Single file at `src/app/page.tsx`.

**Hero (full viewport).** Layout:
- Top bar: MVS logo (use `/public/mvs-icon.png` — already in repo), small "Sign in" link top-right linking to `/auth/login`.
- Center-left: 3-line headline `MEASURE. / UNDERSTAND. / GOVERN.` (each on its own line, large `text-7xl md:text-8xl`, metallic silver gradient text).
- Below: cyan subhead `text-2xl tracking-wide` — `Governing decisions under pressure.`
- Below: 1-2 sentence description — keep terse. Suggested copy: *"A behavioral measurement system for the moments when timing, sequencing, and recovery decide outcomes."*
- Below: cyan-bordered CTA button `text-lg px-8 py-3 border border-cyan-400 hover:bg-cyan-400 hover:text-zinc-950 transition-colors` — text: `Request a briefing` (anchors to `#contact`).
- Absolute-positioned at bottom: italic uppercase tagline `BUILT FOR THOSE WHO DECIDE WHEN OTHERS CAN'T`.
- Background: deep gradient + low-opacity radar-circle SVG positioned right of center. Build the SVG inline (concentric circles with cyan stroke at 8% opacity) — don't add a dependency.

**What it is.** One column, `max-w-2xl mx-auto px-6`. Heading: small uppercase cyan label + `THIS IS NOT A QUIZ.` (matches doctrine doc tone). Body: 2-3 paragraphs. Suggested copy:

> *Most training measures whether you remember the right answer. The Mental Velocity System measures something else: how quickly your decision forms, what you stop noticing, and whether sequence breaks down under load.*
>
> *It's a pre/post measurement wrapped around an in-person training day. Every selection is captured as its own data point — reaction time, sequence, branching, recovery. The result is a behavioral map of how decisions actually form when pressure is real.*
>
> *Used by clinicians, law enforcement, and operational teams whose decisions cannot afford a second draft.*

**Who it's for.** Three columns: Hospitals, Law Enforcement, Defense. Each: a small SVG icon (build inline or use a sparse line drawing from `/public`), a label, one descriptive line. No scrolling marquees, no testimonials.

**The doctor.** Two columns. Left: photo placeholder (gray rectangle 320x400 with "Photo" label until doctor provides one — log to `needs_doctor.md` if not already there). Right: short bio. Suggested copy until doctor delivers his own:

> *Developed by Dr. Kevin Scully, founder of Human Performance Risk Control Infrastructure™. Dr. Scully designed the Mental Velocity System after [NEEDS_DOCTOR — career background, credentials, why this matters to him]. The system is the result of [NEEDS_DOCTOR — years of clinical/operational work].*

Mark `[NEEDS_DOCTOR]` placeholders inline so the page renders cleanly but the gaps are obvious. Update `docs/needs_doctor.md`.

**Contact.** Anchor `#contact`. Centered form, `max-w-lg`. Fields:
- Name (required)
- Email (required, basic format check)
- Organization (optional)
- Organization type (optional select: Hospital / Law Enforcement / Defense / Other)
- Message (textarea, optional)
- Submit button matching the CTA style.
- Below: small text `We'll respond within 2 business days.`
- Server action `submitLead(formData)` in `src/actions/leads.ts`:
  - Validate fields.
  - Insert into `leads` (anon insert allowed by RLS — see Phase D).
  - Optional: send Resend email to super_admin (Day 7 infrastructure exists). Subject: `New MVS lead: ${name} (${organization ?? 'no org'})`. Use the same `sendEmail()` helper.
  - Render success state (replace form with "Thanks. We'll be in touch."). Don't redirect.

**Footer.** Single thin row: copyright + legal links (use placeholders if doctor hasn't supplied terms/privacy) + a small green dot + `secure`. That's it.

**Accessibility:** every button/link has visible focus styling. Form fields have associated `<label>` elements. Color contrast on cyan text against near-black should pass WCAG AA — verify with a quick manual check (cyan-300 or cyan-200 if cyan-400 is too dim).

### Phase D — Leads table + admin view (~30 min)

`supabase/migrations/0008_leads.sql`:
```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  organization_type text check (organization_type in ('hospital','police','defense','other') or organization_type is null),
  message text,
  source text not null default 'marketing_form',
  status text not null default 'new' check (status in ('new','contacted','qualified','converted','dropped')),
  created_at timestamptz not null default now()
);
create index leads_status_created_idx on leads(status, created_at desc);
alter table leads enable row level security;
create policy "super_admin all on leads" on leads for all using (auth_role() = 'super_admin') with check (auth_role() = 'super_admin');
-- Anonymous form submissions: allow insert from anyone, including unauthenticated.
create policy "anon insert lead" on leads for insert with check (true);
-- No select for non-super_admins — anon should not be able to read inserted rows.
```

Apply via `npx supabase db push`.

Add 3 vitest cases in `tests/rls-day8.spec.ts`:
- anon (no JWT) can insert into leads ✓
- anon CANNOT select from leads ✗
- super_admin can select all leads ✓

`/mvs/admin/leads/page.tsx`:
- Server Component, `requireSuperAdmin()`.
- Table: name, email, organization, type, message (truncated), status (dropdown to update), created_at.
- Status update server action.
- Add a "Leads" link to the existing `AdminDashboard` nav.

### Phase E — DNS + Resend domain (~30 min)

This phase is mostly **logging instructions for Danny**, since he's the one with registrar access. Claude does the Vercel side.

1. Vercel CLI: `npx vercel domains add mentalvelocitysystem.com` and `npx vercel domains add www.mentalvelocitysystem.com`. Capture the DNS records Vercel returns.
2. Append to `docs/needs_human.md` under a fresh section "Day 8 — DNS records to add at registrar":
   - The exact records (apex A record + www CNAME) Vercel returned.
   - Resend's SPF, DKIM, DMARC records (look these up via the Resend dashboard or the API and include them).
   - Note: until DNS propagates (usually <1 hour, sometimes 48), `mentalvelocitysystem.com` won't resolve and Resend won't send from a custom domain.
3. Update Supabase Auth Site URL once DNS lands — also flag in `needs_human.md`. Already item #2 there from Day 1; add a bump.

If `vercel` CLI isn't authed in your shell, log to `needs_human.md` and skip — Danny can add via dashboard.

### Phase F — Subagent review (~15 min)

Launch a Task with this brief:

> Independently review the marketing page on branch `feat/marketing-and-domain`. Specifically check:
> 1. Is the existing legacy quiz at `/take` (or wherever moved) still functional? Anonymous walk-in path must keep working — `responses_long` row written, no enrollment_id required.
> 2. Does the contact form's server action sanitize inputs (no HTML injection in `message` field that could affect the admin view)? Does it rate-limit or have any abuse protection (multiple rapid submits from same IP)?
> 3. Does the `leads` "anon insert" RLS policy allow only INSERT, not SELECT? Verify the policies as written.
> 4. Does the marketing page achieve Lighthouse Performance ≥ 80 and Accessibility ≥ 90 on a desktop run? (Run `npx lighthouse http://localhost:3000 --quiet --chrome-flags="--headless" --only-categories=performance,accessibility` if available, or report inability and skip.)
> 5. Is the metallic silver text fallback acceptable on browsers without `bg-clip-text` support, or does it disappear?
> 6. Does the footer accidentally expose any internal admin links to anonymous visitors?
> Report findings with file:line references.

Address findings. #1 and #2 are real risks — fix immediately if flagged.

### Phase G — Stop cleanly (~15 min)

1. Append `worklog.md`: what shipped, what's still placeholder content (logos, photo, doctor bio), Vercel domain status, Lighthouse scores if measured.
2. Update `docs/needs_doctor.md` with sharper asks for: doctor's headshot (square, 800x800+), doctor's bio (200 words), final hero + about-section copy, brand assets (logo SVG, color hex codes, font choice if not Inter).
3. Update `docs/needs_human.md` with the DNS records to paste at the registrar.
4. `npm run build` — must pass.
5. Commit: `feat: marketing landing page + leads capture + Vercel domain wiring`.
6. Push.
7. Print chat summary: what's working, what's placeholder content, DNS status, what Day 9 will do (seed the 25 doctrine-locked scenarios — IF the doctor has delivered options/answers; otherwise skip and pull cohort prep forward).

**Do NOT** start Day 9.

## Day 8 acceptance criteria
- `0008_leads.sql` applied; 3 RLS tests green.
- `/` renders the marketing page; legacy quiz reachable at the new route; no broken internal links.
- Contact form submits a `leads` row; super_admin sees it at `/mvs/admin/leads`; status update works.
- Hero is sparse and brand-aligned; section count ≤ 5; `[NEEDS_DOCTOR]` placeholders are visible (not hidden).
- Vercel domain registered; DNS records logged in `needs_human.md` for Danny to add at the registrar.
- Subagent findings (especially #1, #2) addressed.
- `npm run build` passes; branch pushed.

## Things to watch
- **Don't break the legacy quiz.** Anonymous walk-in flow is real. After moving it, manually click through it once.
- **Anon RLS policies are tricky.** "anon insert lead" must NOT also let anon select. The split-policy pattern (insert one, select another) is correct.
- **Lighthouse on dark backgrounds.** Color contrast on cyan-on-dark fails WCAG AA at lower cyan shades. Use cyan-300+ for body-size cyan text or run a contrast check.
- **Don't add fonts that need a license.** Inter (Google Fonts) is fine. The doctor's "metallic" headline is achieved via Tailwind gradient on text, not a custom font.
- **Don't ship doctor placeholder bio as if it's final copy.** The `[NEEDS_DOCTOR]` markers should be visible to whoever previews the page, not hidden as comments. The doctor will see them and either provide copy or sign off as-is.

Go.
