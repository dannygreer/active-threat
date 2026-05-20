'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerStudent, type SignupResult } from '@/actions/signup';
import { createClient } from '@/lib/supabase/client';

// Shared on the public /<slug> page. Two modes:
//   - "create": calls the registerStudent server action (service-role
//     account creation + auto-enroll + auto sign-in → /app).
//   - "signin": returning students on test day; signs in client-side and
//     routes to /app. Covers the case where they already registered earlier.
export default function SignupForm({
  slug,
  orgName,
}: {
  slug: string;
  orgName: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'signin'>('create');

  const [state, formAction, pending] = useActionState<
    SignupResult | null,
    FormData
  >(registerStudent, null);

  // Sign-in mode is fully client-side (no service role needed).
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signinErr, setSigninErr] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    setSigninErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setSigningIn(false);
      setSigninErr(error.message);
      return;
    }
    router.replace('/app');
    router.refresh();
  }

  const fieldCls =
    'w-full px-4 py-3 bg-zinc-900/70 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#4FA9F0]/40 disabled:opacity-60 mvs-body';
  const fieldStyle = { border: '1px solid rgba(1,111,212,0.30)' };
  const labelCls =
    'mvs-mono block text-[10px] uppercase tracking-[0.25em] text-zinc-400 mb-2';
  const btnCls =
    'group relative w-full px-6 py-3 mvs-mono text-sm uppercase tracking-[0.18em] text-[#4FA9F0] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const btnStyle = {
    background:
      'linear-gradient(180deg, rgba(1,111,212,0.06) 0%, rgba(1,111,212,0.20) 100%)',
    border: '1px solid rgba(1,111,212,0.55)',
  };

  return (
    <div className="w-full max-w-md">
      <div className="relative">
        <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#4FA9F0]" />
        <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#4FA9F0]" />
        <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#4FA9F0]" />
        <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#4FA9F0]" />

        <div
          className="relative bg-zinc-950/65 backdrop-blur-md mvs-mono"
          style={{
            border: '1px solid rgba(1,111,212,0.45)',
            boxShadow:
              'inset 0 0 30px rgba(1,111,212,0.06), 0 0 60px rgba(1,111,212,0.10)',
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              borderBottom: '1px solid rgba(1,111,212,0.35)',
              background:
                'linear-gradient(180deg, rgba(1,111,212,0.18) 0%, rgba(1,111,212,0.04) 100%)',
            }}
          >
            <h1 className="text-sm font-semibold text-[#4FA9F0] tracking-[0.28em] uppercase">
              {mode === 'create' ? 'STUDENT SIGNUP' : 'STUDENT SIGN-IN'}
            </h1>
            <span className="text-[10px] tracking-widest uppercase text-zinc-400">
              {orgName}
            </span>
          </div>

          <div className="p-6 sm:p-8 mvs-body">
            {mode === 'create' ? (
              <form action={formAction} className="space-y-5">
                <input type="hidden" name="slug" value={slug} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="first_name" className={labelCls}>
                      First name
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      autoComplete="given-name"
                      disabled={pending}
                      className={fieldCls}
                      style={fieldStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className={labelCls}>
                      Last name
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      autoComplete="family-name"
                      disabled={pending}
                      className={fieldCls}
                      style={fieldStyle}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className={labelCls}>
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    disabled={pending}
                    placeholder="you@example.com"
                    className={fieldCls}
                    style={fieldStyle}
                  />
                </div>

                <div>
                  <label htmlFor="password" className={labelCls}>
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={pending}
                    placeholder="At least 8 characters"
                    className={fieldCls}
                    style={fieldStyle}
                  />
                </div>

                {state?.error && (
                  <p className="text-sm text-red-400">{state.error}</p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className={btnCls}
                  style={btnStyle}
                >
                  <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4FA9F0]" />
                  <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4FA9F0]" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4FA9F0]" />
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4FA9F0]" />
                  <span className="relative inline-flex items-center justify-center gap-2">
                    {pending ? 'CREATING…' : 'CREATE ACCOUNT'}
                    {!pending && <span aria-hidden="true">›</span>}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-[#4FA9F0] transition-colors w-full text-center"
                >
                  already registered? sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div>
                  <label htmlFor="si_email" className={labelCls}>
                    Email
                  </label>
                  <input
                    id="si_email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={signingIn}
                    placeholder="you@example.com"
                    className={fieldCls}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="si_password" className={labelCls}>
                    Password
                  </label>
                  <input
                    id="si_password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={signingIn}
                    className={fieldCls}
                    style={fieldStyle}
                  />
                </div>

                {signinErr && (
                  <p className="text-sm text-red-400">{signinErr}</p>
                )}

                <button
                  type="submit"
                  disabled={signingIn || !email.trim() || !password}
                  className={btnCls}
                  style={btnStyle}
                >
                  <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#4FA9F0]" />
                  <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#4FA9F0]" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#4FA9F0]" />
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#4FA9F0]" />
                  <span className="relative inline-flex items-center justify-center gap-2">
                    {signingIn ? 'SIGNING IN…' : 'SIGN IN'}
                    {!signingIn && <span aria-hidden="true">›</span>}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className="mvs-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-[#4FA9F0] transition-colors w-full text-center"
                >
                  ← need an account? sign up
                </button>
              </form>
            )}
          </div>

          <div
            className="flex items-center justify-between px-5 py-2 mvs-mono text-[10px] uppercase tracking-widest text-zinc-500"
            style={{
              borderTop: '1px solid rgba(1,111,212,0.25)',
              background: 'rgba(1,111,212,0.04)',
            }}
          >
            <span>STUDENT ACCESS</span>
            <span>SYS.OK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
