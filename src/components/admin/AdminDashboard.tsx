'use client';

import { useState } from 'react';
import ResponsesTab from './ResponsesTab';
import ScenarioBuilderTab from './ScenarioBuilderTab';
import ResponseTaggingTab from './ResponseTaggingTab';
import SummaryTab from './SummaryTab';
import type {
  ResponseWideRow,
  ResponseLongRow,
  ResponseTag,
  Scenario,
  ScenarioListItem,
} from '@/types';

type Tab = 'responses' | 'scenario' | 'tagging' | 'summary';

const TABS: { id: Tab; label: string }[] = [
  { id: 'responses', label: 'Responses' },
  { id: 'scenario', label: 'Scenario Builder' },
  { id: 'tagging', label: 'Response Tagging' },
  { id: 'summary', label: 'Summary' },
];

interface AdminDashboardProps {
  responsesWide: ResponseWideRow[];
  responsesLong: ResponseLongRow[];
  scenario: Scenario | null;
  responseTags: ResponseTag[];
  scenarios: ScenarioListItem[];
}

export default function AdminDashboard({
  responsesWide,
  responsesLong,
  scenario,
  responseTags,
  scenarios,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<Tab>('responses');

  return (
    <div>
      <nav className="flex border-b border-zinc-200 bg-white">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-zinc-900 border-b-2 border-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="bg-white border border-zinc-200 rounded-b-xl overflow-hidden">
        {tab === 'responses' && (
          <ResponsesTab responses={responsesWide} />
        )}
        {tab === 'scenario' && (
          <ScenarioBuilderTab scenario={scenario} scenarios={scenarios} />
        )}
        {tab === 'tagging' && (
          <ResponseTaggingTab scenario={scenario} tags={responseTags} />
        )}
        {tab === 'summary' && (
          <SummaryTab
            responsesLong={responsesLong}
            responsesWide={responsesWide}
          />
        )}
      </div>
    </div>
  );
}
