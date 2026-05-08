import { LabProductionPlanner } from '@/features/lab/production-planner';

/**
 * Standalone demo shell.
 *
 * Mounts only the LabProductionPlanner. No router, no auth provider,
 * no Supabase client init, no Cult top-nav — just the lab surface in
 * isolation. URL fixture-mode rewrite happens synchronously in
 * main.tsx before this component renders.
 *
 * Future prospect demos: add another fixture file (e.g.
 * aspire-mock.ts), wire the corresponding `demo=aspire` branch in
 * useLabPlannerData, and pick the demo at the entry point via a
 * subdomain check or URL flag. One demo build per prospect, one
 * Vercel deploy per prospect.
 */
export function DemoApp() {
  return (
    <div className="demo-shell">
      <LabProductionPlanner />
    </div>
  );
}

export default DemoApp;
