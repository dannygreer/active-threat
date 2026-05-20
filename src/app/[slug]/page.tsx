import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeSignupSlug } from '@/lib/signupSlug';
import SignupForm from '@/components/SignupForm';

// Public, unauthenticated per-org signup page. Lives at the app root so a
// facilitator can hand out a clean mentalvelocitysystem.com/<slug>. Static
// route segments in src/app win over this dynamic one, and the reserved
// list in normalizeSignupSlug prevents an admin from ever assigning a slug
// that shadows a real route.
export const dynamic = 'force-dynamic';

export default async function SignupSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const check = normalizeSignupSlug(slug);
  if (!check.ok || !check.slug) notFound();

  // Unauthenticated read: orgs RLS hides every row from anon, so resolve via
  // the security-definer RPC (migration 0024) which exposes only safe fields.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('org_by_signup_slug', {
    p_slug: check.slug,
  });

  const org = Array.isArray(data) ? data[0] : data;
  if (error || !org) notFound();

  return (
    <div className="relative min-h-screen flex flex-col bg-zinc-950 text-zinc-100 mvs-body overflow-hidden">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,#0e1422_0%,#050810_60%,#000_100%)] pointer-events-none"
        aria-hidden="true"
      />
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-10 pt-[30px] pb-5 flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <Image
            src="/mvs-logo.png"
            alt="MVS — Mental Velocity System"
            width={329}
            height={32}
            priority
            className="h-8 w-auto group-hover:opacity-90 transition-opacity"
          />
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <SignupForm slug={check.slug} orgName={org.name as string} />
          <p className="mvs-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500 text-center mt-6">
            CREATE YOUR ACCOUNT TO BEGIN THE ASSESSMENT
          </p>
        </div>
      </main>
    </div>
  );
}
