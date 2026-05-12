// Pitch-deck-print view. Strips operational chrome and renders only the
// four effectiveness charts (Path Divergence, First-RT Delta, Marker
// Reduction, Certification) in a 2×2 grid optimized for screenshot or
// browser-print. Reuses the same data loader so numbers stay in sync.
import { requireSuperAdmin } from '@/lib/auth';
import { loadDashboardSnapshot } from '@/lib/dashboard';
import PitchDeckClient from '@/components/admin/PitchDeckClient';

export const dynamic = 'force-dynamic';

export default async function PitchDeckPage() {
  await requireSuperAdmin();
  const snapshot = await loadDashboardSnapshot();
  return <PitchDeckClient snapshot={snapshot} />;
}
