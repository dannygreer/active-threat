'use client';

import { useState } from 'react';

interface TitleScreenProps {
  onContinue: (firstName: string, lastName: string) => void;
}

export default function TitleScreen({ onContinue }: TitleScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const canContinue = firstName.trim() !== '' && lastName.trim() !== '';

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-zinc-900">Active Threat Response</h1>
          <p className="text-zinc-600 text-lg">Training Assessment</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-zinc-700 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              placeholder="Enter your first name"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-zinc-700 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              placeholder="Enter your last name"
            />
          </div>
        </div>

        <button
          onClick={() => canContinue && onContinue(firstName.trim(), lastName.trim())}
          disabled={!canContinue}
          className="w-full py-3 bg-zinc-900 text-white rounded-lg font-medium text-lg transition-colors hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
