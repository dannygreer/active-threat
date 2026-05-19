import { requireSuperAdmin } from '@/lib/auth';
import {
  getScenarioById,
  listAssessmentsByCodes,
  loadMcQuestionsForAdmin,
  getResponsesByCodes,
  countResponsesByCodes,
  type PhaseAssessmentRow,
} from '@/lib/db';
import { loadPhase3Snapshot } from '@/lib/dashboard';
import { PHASE_META } from '@/lib/phases';
import AdminHeader from '@/components/admin/AdminHeader';
import ScenarioBuilderTab from '@/components/admin/ScenarioBuilderTab';
import McMarkersTab from '@/components/admin/McMarkersTab';
import CertificationCharts from '@/components/admin/charts/CertificationCharts';
import PhaseSubNav from '@/components/admin/PhaseSubNav';
import PhaseThreeResponses from '@/components/admin/PhaseThreeResponses';

export const dynamic = 'force-dynamic';

interface PageProps {
  // Next 16 — searchParams is a Promise. (`assessment` param dropped:
  // Phase 3 is one assessment now, no sub-tab to select.)
  searchParams: Promise<{ view?: string }>;
}

export default async function AdminPhase3Page({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const { view: rawView } = await searchParams;
  const view = rawView === 'responses' ? 'responses' : 'editor';

  const meta = PHASE_META.phase_3;
  // Editor view needs assessments list + cert chart data.
  // Responses view needs the response payload.
  // Both views need the badge count.
  const [assessments, snapshot, responses, responsesCount] = await Promise.all([
    listAssessmentsByCodes(meta.assessmentCodes),
    view === 'editor' ? loadPhase3Snapshot() : Promise.resolve(null),
    view === 'responses'
      ? getResponsesByCodes(meta.assessmentCodes, 'post')
      : Promise.resolve([]),
    view === 'responses'
      ? Promise.resolve(0)
      : countResponsesByCodes(meta.assessmentCodes, 'post'),
  ]);
  const badgeCount = view === 'responses' ? responses.length : responsesCount;

  const active: PhaseAssessmentRow | null = assessments[0] ?? null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminHeader
        title={meta.label}
        subtitle={meta.description}
        activeRoute="/mvs/admin/phase-3"
      />
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <PhaseSubNav
          basePath="/mvs/admin/phase-3"
          active={view}
          responsesCount={badgeCount}
          editorLabel="Outcomes + Editor"
        />

        {assessments.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No Phase 3 assessments configured.
          </p>
        ) : view === 'responses' ? (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <PhaseThreeResponses responses={responses} />
          </div>
        ) : (
          <>
            <section className="bg-white border border-zinc-200 rounded-xl p-4">
              <h2 className="mvs-mono text-xs font-semibold uppercase tracking-[0.22em] text-zinc-900 mb-3">
                Certification Outcomes
              </h2>
              <CertificationCharts certification={snapshot?.certification ?? []} />
            </section>
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              {active ? <AssessmentEditor row={active} /> : null}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

async function AssessmentEditor({ row }: { row: PhaseAssessmentRow }) {
  if (row.kind === 'multi_choice') {
    const questions = await loadMcQuestionsForAdmin(row.id);
    return (
      <McMarkersTab
        assessments={[{ id: row.id, code: row.code, name: row.name }]}
        questions={questions}
        activeAssessmentId={row.id}
      />
    );
  }
  // kind === 'scenario'
  if (!row.scenario_fk) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Assessment {row.code} has no linked scenario.
      </div>
    );
  }
  const scenario = await getScenarioById(row.scenario_fk);
  const list = scenario
    ? [
        {
          id: scenario.dbId,
          scenario_id: scenario.scenarioId,
          version: scenario.version,
          title: scenario.title,
          is_active: true,
        },
      ]
    : [];
  return <ScenarioBuilderTab scenario={scenario} scenarios={list} hideTimer />;
}
