'use client';

import { useActionState } from 'react';
import { adminLogin } from '@/actions/auth';

export default function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-zinc-700 mb-1">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          className="w-full px-4 py-3 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full px-4 py-3 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 bg-zinc-900 text-white rounded-lg font-medium text-lg transition-colors hover:bg-zinc-800 disabled:bg-zinc-400"
      >
        {pending ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
