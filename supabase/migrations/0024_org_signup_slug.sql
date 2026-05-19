-- 0024_org_signup_slug.sql
-- Replaces the admin-preload + emailed /take/<token> flow with a shared,
-- per-org signup link. The facilitator sets a slug on the org (e.g. a
-- session date like "06052026"); students visit mentalvelocitysystem.com/<slug>
-- on test day and self-register an email + password.
--
-- Slug is globally unique (case-insensitive), nullable, and editable.
-- The signup page runs unauthenticated, so it cannot select from orgs
-- directly (RLS would hide every row from anon). Instead it calls the
-- security-definer org_by_signup_slug() RPC, which returns only the
-- non-sensitive fields the signup screen needs — never contact, deal,
-- notes, or status.

alter table public.orgs add column if not exists signup_slug text;

comment on column public.orgs.signup_slug is
  'Shared per-org signup path segment (mentalvelocitysystem.com/<signup_slug>). '
  'Globally unique case-insensitively, nullable, admin-editable. Changing it '
  'invalidates the previously shared URL.';

-- Case-insensitive global uniqueness; nullable so existing orgs are
-- unaffected until a facilitator assigns one.
create unique index if not exists orgs_signup_slug_uniq
  on public.orgs (lower(signup_slug))
  where signup_slug is not null;

-- Anon-safe resolver for the public signup page. SECURITY DEFINER so it
-- bypasses orgs RLS, but it hand-picks the column list so no sensitive
-- field can leak. Lookup is case-insensitive to match the unique index.
create or replace function public.org_by_signup_slug(p_slug text)
returns table (
  id uuid,
  name text,
  type text,
  session_phase smallint
)
language sql
security definer
set search_path = public
stable
as $$
  select o.id, o.name, o.type, o.session_phase
    from public.orgs o
   where o.signup_slug is not null
     and lower(o.signup_slug) = lower(p_slug)
   limit 1;
$$;

revoke all on function public.org_by_signup_slug(text) from public;
grant execute on function public.org_by_signup_slug(text) to anon, authenticated;
