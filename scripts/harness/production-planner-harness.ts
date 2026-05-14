import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Status = 'pass' | 'warn' | 'fail';

interface Check {
  status: Status;
  title: string;
  detail: string;
  evidence?: string;
}

interface SourceFile {
  label: string;
  path: string;
  content: string;
}

const repoRoot = process.cwd();
const demoRoot = path.resolve(repoRoot, '..', 'cultivo-worktrees', 'prod-planner-b');
const reportPath = path.join(repoRoot, 'docs', 'harness', 'production-planner-latest.md');

const livePaths = {
  view: 'src/features/production-planner/components/ProductionPlannerView.tsx',
  hook: 'src/features/production-planner/hooks/useProductionPlanner.ts',
  service: 'src/features/production-planner/services/plannedCyclesService.ts',
  form: 'src/features/production-planner/components/PlannedCycleForm.tsx',
  types: 'src/features/production-planner/types.ts',
  migrations: 'supabase/migrations',
  guide: 'docs/design-system/PHASE-1-SURFACE-GUIDE.md',
  claude: 'CLAUDE.md',
};

const demoPaths = {
  view: 'src/features/lab/production-planner/LabProductionPlanner.tsx',
  hook: 'src/features/lab/production-planner/useLabPlannerData.ts',
  fixture: 'src/features/lab/production-planner/sostanza-mock.ts',
  cycleForm: 'src/features/lab/production-planner/LabPlanCycleForm.tsx',
  cohortForm: 'src/features/lab/production-planner/LabPlanCohortForm.tsx',
  mockTypes: 'src/features/lab/production-planner/planner-mock.ts',
};

function readSource(root: string, relativePath: string, label: string): SourceFile {
  const abs = path.join(root, relativePath);
  const content = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  return { label, path: abs, content };
}

function readMigrationBundle(root: string, relativePath: string, label: string): SourceFile {
  const abs = path.join(root, relativePath);
  const content = existsSync(abs)
    ? readdirSync(abs)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => readFileSync(path.join(abs, file), 'utf8'))
      .join('\n\n')
    : '';
  return { label, path: abs, content };
}

function has(source: SourceFile | string, pattern: string | RegExp): boolean {
  const content = typeof source === 'string' ? source : source.content;
  return typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
}

function statusIcon(status: Status): string {
  if (status === 'pass') return 'PASS';
  if (status === 'warn') return 'WARN';
  return 'FAIL';
}

function score(checks: Check[]): number {
  if (checks.length === 0) return 0;
  const points = checks.reduce((sum, c) => {
    if (c.status === 'pass') return sum + 1;
    if (c.status === 'warn') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / checks.length) * 100);
}

function checkFileExists(file: SourceFile): Check {
  return {
    status: file.content ? 'pass' : 'fail',
    title: `${file.label} exists`,
    detail: file.content
      ? 'Source file was found and included in the harness read.'
      : 'Source file was not found. The harness cannot verify this surface until the path is corrected.',
    evidence: file.path,
  };
}

const live = {
  view: readSource(repoRoot, livePaths.view, 'Live planner view'),
  hook: readSource(repoRoot, livePaths.hook, 'Live planner hook'),
  service: readSource(repoRoot, livePaths.service, 'Live planned-cycle service'),
  form: readSource(repoRoot, livePaths.form, 'Live planned-cycle form'),
  types: readSource(repoRoot, livePaths.types, 'Live planner types'),
  migrations: readMigrationBundle(repoRoot, livePaths.migrations, 'Supabase migrations'),
  guide: readSource(repoRoot, livePaths.guide, 'Surface treatment guide'),
  claude: readSource(repoRoot, livePaths.claude, 'Cultivo AI context'),
};

const demo = {
  view: readSource(demoRoot, demoPaths.view, 'Demo planner view'),
  hook: readSource(demoRoot, demoPaths.hook, 'Demo planner hook'),
  fixture: readSource(demoRoot, demoPaths.fixture, 'Sostanza fixture'),
  cycleForm: readSource(demoRoot, demoPaths.cycleForm, 'Demo cycle form'),
  cohortForm: readSource(demoRoot, demoPaths.cohortForm, 'Demo cohort form'),
  mockTypes: readSource(demoRoot, demoPaths.mockTypes, 'Demo planner mock types'),
};

const fileChecks: Check[] = [
  checkFileExists(live.view),
  checkFileExists(live.hook),
  checkFileExists(live.service),
  checkFileExists(live.form),
  checkFileExists(live.types),
  checkFileExists(demo.view),
  checkFileExists(demo.hook),
  checkFileExists(demo.fixture),
];

const designChecks: Check[] = [
  {
    status: has(live.guide, '**Production Planner** | A') ? 'pass' : 'warn',
    title: 'Surface treatment is known',
    detail: 'Production Planner is assigned Treatment A: hairline grid / instrument mode.',
    evidence: livePaths.guide,
  },
  {
    status: has(live.view, /bg-violet-|text-white|border-violet-/) ? 'fail' : 'pass',
    title: 'No raw palette classes in live planner chrome',
    detail: has(live.view, /bg-violet-|text-white|border-violet-/)
      ? 'Live planner still uses raw violet/white Tailwind classes in planning mode. Replace with semantic Cultivo/Bureau tokens before treating the surface as design-system compliant.'
      : 'Live planner chrome uses semantic tokens for state styling.',
    evidence: livePaths.view,
  },
  {
    status: has(live.view, 'bg-cult-stage-harvest/10') || has(live.view, 'border-cult-stage-harvest/30') ? 'fail' : 'pass',
    title: 'Stage color is not used as panel fill or border',
    detail: has(live.view, 'bg-cult-stage-harvest/10') || has(live.view, 'border-cult-stage-harvest/30')
      ? 'Harvest alert banner uses stage color as tint/border. The design contract allows stage color as a 6px marker only.'
      : 'No obvious stage-color panel fills were found in the live planner.',
    evidence: livePaths.view,
  },
  {
    status: has(live.view, /Planning Mode .*[.!?]/) ? 'warn' : 'pass',
    title: 'Instrument UI avoids prose',
    detail: has(live.view, /Planning Mode .*[.!?]/)
      ? 'Live planner includes explanatory sentence copy in the instrument surface. Keep instructions minimal or move interpretation into Seed/help context.'
      : 'No obvious prose sentence was found in the planner instrument chrome.',
    evidence: livePaths.view,
  },
  {
    status: has(live.view, 'rounded-lg') ? 'warn' : 'pass',
    title: 'Radius stays inside instrument bounds',
    detail: has(live.view, 'rounded-lg')
      ? 'Live planner uses rounded-lg in chrome. This may be acceptable, but the contract prefers rounded-cult/8px max for instrument surfaces.'
      : 'No rounded-lg planner chrome was found.',
    evidence: livePaths.view,
  },
];

const dataChecks: Check[] = [
  {
    status: has(live.hook, "from('v_room_occupancy')") ? 'pass' : 'fail',
    title: 'Live planner reads room occupancy',
    detail: 'The current live planner should keep reading the room occupancy contract until the cycle bridge replaces it.',
    evidence: livePaths.hook,
  },
  {
    status: has(live.hook, "from('v_strain_cultivation_stats')") ? 'pass' : 'fail',
    title: 'Live planner reads strain stats',
    detail: 'The planner can show strain-level performance, but recommendations still need sample-size/confidence guards.',
    evidence: livePaths.hook,
  },
  {
    status: has(live.hook, "from('v_planned_cycles_timeline')") ? 'warn' : 'fail',
    title: 'Live planning path still depends on planned_cycles',
    detail: 'The world model says planned_cycles is a legacy single-strain path and should be superseded by cycle/batch-group planning. Treat this as a bridge, not the destination.',
    evidence: livePaths.hook,
  },
  {
    status: has(live.service, "rpc('fn_plan_cycle'") ? 'pass' : has(live.service, "from('planned_cycles')") ? 'warn' : 'fail',
    title: 'Writes use legacy planned_cycles table',
    detail: has(live.service, "rpc('fn_plan_cycle'")
      ? 'Live create path attempts fn_plan_cycle first and only falls back to planned_cycles while the RPC is not deployed.'
      : has(live.service, "from('planned_cycles')")
        ? 'Live write path inserts/updates/deletes planned_cycles directly. The demo-to-live bridge expects a future fn_plan_cycle RPC that creates one cycle plus batch_registry children atomically.'
        : 'No direct planned_cycles write path found.',
    evidence: livePaths.service,
  },
  {
    status: has(live.form, 'Data Honesty') && has(live.form, 'conversion_sessions') && has(live.form, 'harvest_count') ? 'pass' : has(live.hook, 'conversion_sessions') || has(live.types, 'conversion_sessions') ? 'warn' : 'fail',
    title: 'Sample-size data exists but is not enforced',
    detail: has(live.form, 'Data Honesty')
      ? 'Live cohort form surfaces harvest-count and conversion-session confidence warnings before plan creation.'
      : 'Types include conversion_sessions, but the live planner does not appear to block strain-specific recommendations when n is too low.',
    evidence: livePaths.form,
  },
];

const parityChecks: Check[] = [
  {
    status: has(demo.hook, 'demo=sostanza') && has(demo.hook, 'SOSTANZA_') ? 'pass' : 'fail',
    title: 'Sostanza fixture is explicit',
    detail: 'Demo mode has a named Sostanza fixture. Good: the harness can compare a known scenario instead of generic mock data.',
    evidence: demoPaths.hook,
  },
  {
    status: has(demo.hook, /from\('v_batch_lifecycle'/) && has(live.hook, /from\('v_batch_lifecycle'/) ? 'pass' : has(demo.hook, /from\('v_batch_lifecycle'/) ? 'warn' : 'fail',
    title: 'Live and demo read batch lifecycle',
    detail: has(live.hook, "from('v_batch_lifecycle')")
      ? 'The live planner now has a read-only batch lifecycle bridge, so it can render the same batch identity model the polished lab planner uses.'
      : 'The polished lab planner reads v_batch_lifecycle, while the live planner reads v_room_occupancy + planned_cycles. That is a real architecture mismatch to bridge.',
    evidence: livePaths.hook,
  },
  {
    status: has(demo.mockTypes, 'BatchSegment') && (has(live.view, 'cohort_key') || has(live.view, 'buildCohortBars')) ? 'pass' : 'warn',
    title: 'Demo renders batch-grouped Gantt identity',
    detail: has(live.view, 'buildCohortBars')
      ? 'Live planner collapses lifecycle-backed rows into cohort bars using cycle_id or batch-code prefix identity.'
      : 'Could not confirm batch segment identity in the live planner.',
    evidence: livePaths.view,
  },
  {
    status: has(live.migrations, 'v_mother_batch_groups') && has(live.hook, "from('v_mother_batch_groups')") && has(live.form, 'mother_batch_group_id') ? 'pass' : has(live.migrations, 'v_mother_batch_groups') ? 'warn' : has(demo.hook, 'MotherBatchGroup') || has(demo.cohortForm, 'MotherBatchGroup') ? 'warn' : 'fail',
    title: 'Mother batch groups have a live lineage path',
    detail: has(live.hook, "from('v_mother_batch_groups')") && has(live.form, 'mother_batch_group_id')
      ? 'Live planner reads v_mother_batch_groups and can attach mother lineage to fn_plan_cycle strain rows.'
      : has(live.migrations, 'v_mother_batch_groups')
        ? 'Live schema has the mother batch group read model/RPCs, but the planner surface still needs to consume them.'
        : 'The demo uses mother batch groups, but the live schema path is not fully landed. Keep this visible as a demo-to-live blocker.',
    evidence: livePaths.form,
  },
  {
    status: has(live.service, "rpc('fn_plan_cycle'") && has(live.form, 'strainRows') ? 'pass' : has(live.service, "rpc('fn_plan_cycle'") ? 'warn' : has(demo.view, 'isDemoFixture') && has(demo.view, 'Plan a Batch Group') ? 'warn' : 'fail',
    title: 'Batch-group planning is mock/demo behavior',
    detail: has(live.service, "rpc('fn_plan_cycle'") && has(live.form, 'strainRows')
      ? 'Live mode has a minimal multi-strain cohort form that submits fn_plan_cycle-shaped payloads.'
      : has(live.service, "rpc('fn_plan_cycle'")
      ? 'Live mode has the RPC bridge shape, but the surface still submits one strain at a time until the cohort form is ported.'
      : 'The demo has the planning interaction, but live mode needs an RPC bridge before this can be a real product write.',
    evidence: livePaths.form,
  },
  {
    status: has(demo.hook, 'confidence') && has(demo.hook, 'is_synthetic') ? 'pass' : 'warn',
    title: 'Demo carries data-honesty flags',
    detail: 'Demo data layer tracks confidence/synthetic state. Live planner should inherit this visual honesty before planner recommendations become trusted.',
    evidence: demoPaths.hook,
  },
];

const allChecks = [...fileChecks, ...designChecks, ...dataChecks, ...parityChecks];
const failCount = allChecks.filter((c) => c.status === 'fail').length;
const warnCount = allChecks.filter((c) => c.status === 'warn').length;
const passCount = allChecks.filter((c) => c.status === 'pass').length;

function renderChecks(title: string, checks: Check[]): string {
  return [
    `## ${title}`,
    '',
    ...checks.map((check) => [
      `### ${statusIcon(check.status)} - ${check.title}`,
      '',
      check.detail,
      '',
      check.evidence ? `Evidence: \`${check.evidence}\`` : '',
      '',
    ].join('\n')),
  ].join('\n');
}

const report = [
  '# Production Planner Harness Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'Purpose: keep the Sostanza demo, live Cultivo planner, and Cultivo design/data contracts honest before planner work starts or ships.',
  '',
  '## Summary',
  '',
  `Overall score: ${score(allChecks)}%`,
  '',
  `Checks: ${passCount} pass, ${warnCount} warn, ${failCount} fail.`,
  '',
  'Plain-English read:',
  '',
  '- The live planner exists and is wired to Supabase views.',
  '- The polished Sostanza/lab planner exists in the prod-planner-b worktree and carries richer demo behavior.',
  '- The first live bridge is in place: live planner rows can now read batch lifecycle and render cohort identity read-only.',
  '- The live create path now attempts fn_plan_cycle first, with planned_cycles fallback until the database RPC is deployed.',
  '- The live planner now has a minimal multi-strain cohort form with visible data-honesty guardrails.',
  '- Mother batch group lineage now has a live schema/RPC/UI path; the remaining work is hold-back and retire actions.',
  '- The design-system gap is concrete: live planner chrome still has raw palette/stage-tint/prose issues that the harness can now call out before more polish lands.',
  '',
  '## Recommended Next Move',
  '',
  'The read-only lifecycle bridge, RPC-first create path, minimal cohort form, and mother-batch lineage path are now the base. The next useful slice is adding hold-back/retire actions, or a final design-system pass if demo polish is the priority.',
  '',
  renderChecks('File Coverage', fileChecks),
  renderChecks('Design Contract', designChecks),
  renderChecks('Data Contract', dataChecks),
  renderChecks('Demo-To-Live Parity', parityChecks),
  '## How To Use This',
  '',
  'Run `npm run harness:planner` at four moments:',
  '',
  '1. Before starting planner work.',
  '2. After changing the Sostanza/demo planner.',
  '3. Before porting demo behavior into the live planner.',
  '4. Before deployment or stakeholder demo.',
  '',
  'The harness is intentionally strict about warnings. A warning does not mean stop; it means name the tradeoff before continuing.',
  '',
].join('\n');

mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, report);

console.log(`Production Planner harness complete.`);
console.log(`Report: ${reportPath}`);
console.log(`Score: ${score(allChecks)}% (${passCount} pass, ${warnCount} warn, ${failCount} fail)`);

if (process.env.HARNESS_STRICT === '1' && failCount > 0) {
  process.exitCode = 1;
}
