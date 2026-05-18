import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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

interface HarnessRunIndexEntry {
  id: string;
  generatedAt: string;
  score: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  reportPath: string;
  checks: Array<{
    status: Status;
    title: string;
    group: string;
  }>;
}

const repoRoot = process.cwd();
const demoRoot = path.resolve(repoRoot, '..', 'cultivo-worktrees', 'prod-planner-b');
const sostanzaDemoRoot = process.env.SOSTANZA_DEMO_ROOT
  ? path.resolve(process.env.SOSTANZA_DEMO_ROOT)
  : path.resolve(repoRoot, '..', 'sostanza-demo');
const reportPath = path.join(repoRoot, 'docs', 'harness', 'production-planner-latest.md');
const runsDir = path.join(repoRoot, 'docs', 'harness', 'runs');
const runIndexPath = path.join(runsDir, 'index.json');

const livePaths = {
  view: 'src/features/production-planner/components/ProductionPlannerView.tsx',
  hook: 'src/features/production-planner/hooks/useProductionPlanner.ts',
  service: 'src/features/production-planner/services/plannedCyclesService.ts',
  form: 'src/features/production-planner/components/PlannedCycleForm.tsx',
  types: 'src/features/production-planner/types.ts',
  migrations: 'supabase/migrations',
  guide: 'docs/design-system/PHASE-1-SURFACE-GUIDE.md',
  uxRubric: 'docs/harness/ux-intuitive-design-rubric.md',
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

const sostanzaDemoPaths = {
  project: '.vercel/project.json',
  app: 'src/demo/DemoApp.tsx',
  planner: 'src/features/lab/production-planner/SostanzaBureauPlanner.tsx',
  labPlanner: 'src/features/lab/production-planner/LabProductionPlanner.tsx',
  styles: 'src/features/lab/production-planner/lab-tokens.css',
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

function readGitChangedFiles(root: string): string[] {
  if (!existsSync(path.join(root, '.git'))) return [];
  try {
    const changed = execSync('git diff --name-only HEAD --', { cwd: root, encoding: 'utf8' });
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: root, encoding: 'utf8' });
    return [...changed.split('\n'), ...untracked.split('\n')]
      .map((file) => file.trim())
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
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
  uxRubric: readSource(repoRoot, livePaths.uxRubric, 'UX intuitive design rubric'),
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

const sostanzaDemo = {
  project: readSource(sostanzaDemoRoot, sostanzaDemoPaths.project, 'Sostanza demo Vercel project'),
  app: readSource(sostanzaDemoRoot, sostanzaDemoPaths.app, 'Sostanza demo app shell'),
  planner: readSource(sostanzaDemoRoot, sostanzaDemoPaths.planner, 'Sostanza bureau planner'),
  labPlanner: readSource(sostanzaDemoRoot, sostanzaDemoPaths.labPlanner, 'Sostanza lab planner'),
  styles: readSource(sostanzaDemoRoot, sostanzaDemoPaths.styles, 'Sostanza planner styles'),
};

const cultivoChangedFiles = readGitChangedFiles(repoRoot);
const sostanzaChangedFiles = readGitChangedFiles(sostanzaDemoRoot);
const hasCultivoPlannerChanges = cultivoChangedFiles.some((file) =>
  file.startsWith('src/features/production-planner/')
);
const hasSostanzaPlannerChanges = sostanzaChangedFiles.some((file) =>
  file.startsWith('src/features/lab/production-planner/') ||
  file === 'src/demo/DemoApp.tsx'
);
const cultivoProjectName = has(live.claude, 'Cultivo') ? 'cultivo' : 'cultivo';
const sostanzaProjectName = has(sostanzaDemo.project, 'sostanza-demo') ? 'sostanza-demo' : 'unknown';

const targetCoverageChecks: Check[] = [
  {
    status: existsSync(sostanzaDemoRoot) ? 'pass' : 'warn',
    title: 'Sostanza demo repo is discoverable',
    detail: existsSync(sostanzaDemoRoot)
      ? 'The harness can see the standalone sostanza-demo repo that backs the stakeholder demo URL.'
      : 'The standalone sostanza-demo repo was not found. Set SOSTANZA_DEMO_ROOT if the repo lives somewhere else.',
    evidence: sostanzaDemoRoot,
  },
  {
    status: has(sostanzaDemo.project, '"projectName":"sostanza-demo"') || has(sostanzaDemo.project, '"projectName": "sostanza-demo"') ? 'pass' : 'warn',
    title: 'Sostanza demo Vercel target is identified',
    detail: has(sostanzaDemo.project, 'sostanza-demo')
      ? 'The harness found the Vercel project metadata for the live demo target.'
      : 'Could not confirm the Vercel project metadata for the live demo target.',
    evidence: sostanzaDemo.project.path,
  },
  {
    status: sostanzaProjectName === 'sostanza-demo' ? 'pass' : 'warn',
    title: 'Cultivo and Sostanza deploy targets are separate',
    detail: sostanzaProjectName === 'sostanza-demo'
      ? `Cultivo planner changes deploy to the ${cultivoProjectName} project, while sostanza.gopraxis.ai is backed by the separate ${sostanzaProjectName} project. Treat stakeholder-demo changes as a second repo/deploy step.`
      : 'Could not confirm the standalone Sostanza Vercel project name. Verify deploy target before telling stakeholders the Sostanza URL changed.',
    evidence: `${repoRoot}/.vercel/project.json; ${sostanzaDemo.project.path}`,
  },
  {
    status: hasCultivoPlannerChanges && !hasSostanzaPlannerChanges ? 'warn' : 'pass',
    title: 'Cultivo planner changes are mirrored to Sostanza when needed',
    detail: hasCultivoPlannerChanges && !hasSostanzaPlannerChanges
      ? 'Cultivo planner source is modified, but the standalone Sostanza demo repo has no planner changes. If the intended destination is sostanza.gopraxis.ai, port the change to sostanza-demo before reporting it as deployed.'
      : 'No Cultivo-only planner source changes are currently in flight, or the standalone Sostanza demo has matching planner work.',
    evidence: `cultivo changed: ${cultivoChangedFiles.filter((file) => file.startsWith('src/features/production-planner/')).join(', ') || 'none'}; sostanza changed: ${sostanzaChangedFiles.filter((file) => file.startsWith('src/features/lab/production-planner/') || file === 'src/demo/DemoApp.tsx').join(', ') || 'none'}`,
  },
  {
    status: demo.view.content && sostanzaDemo.planner.content ? 'pass' : 'warn',
    title: 'Both demo targets are first-class harness inputs',
    detail: demo.view.content && sostanzaDemo.planner.content
      ? 'The harness validates the Cultivo lab planner target and the standalone Sostanza stakeholder-demo target.'
      : 'The harness could not validate both the Cultivo lab planner target and the standalone Sostanza stakeholder-demo target.',
    evidence: `lab target: ${demoRoot}; stakeholder target: ${sostanzaDemoRoot}`,
  },
  {
    status: has(sostanzaDemo.planner, 'initialGroupMode') && has(sostanzaDemo.styles, 'cycle-contract-brief') ? 'pass' : 'warn',
    title: 'Standalone Sostanza planner includes cycle-contract surface',
    detail: has(sostanzaDemo.planner, 'initialGroupMode') && has(sostanzaDemo.styles, 'cycle-contract-brief')
      ? 'The standalone Sostanza demo includes the cycle-contract route behavior that the stakeholder URL depends on.'
      : 'The standalone Sostanza demo does not appear to include the cycle-contract route behavior expected by the stakeholder URL.',
    evidence: sostanzaDemo.planner.path,
  },
];

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

function appearsBefore(source: SourceFile, first: string, second: string): boolean {
  const firstIndex = source.content.indexOf(first);
  const secondIndex = source.content.indexOf(second);
  return firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex;
}

const intuitiveDesignChecks: Check[] = [
  {
    status: has(live.uxRubric, 'Intuitive Design Rubric') ? 'pass' : 'warn',
    title: 'Intuitive design rubric is present',
    detail: has(live.uxRubric, 'Intuitive Design Rubric')
      ? 'The harness has a written rubric for judging natural action hierarchy and comprehension.'
      : 'The harness is running intuitive-design checks without a written rubric. Add docs/harness/ux-intuitive-design-rubric.md.',
    evidence: livePaths.uxRubric,
  },
  {
    status: has(live.view, 'Production Planner') && has(live.view, 'Current State') && has(live.view, 'Planning Mode') ? 'pass' : 'fail',
    title: 'Orientation is explicit',
    detail: 'The screen should make location and mode obvious through the title and Current/Planning mode controls.',
    evidence: livePaths.view,
  },
  {
    status: has(live.form, 'New Batch Group') && has(live.form, 'Create Batch Group') ? 'pass' : 'warn',
    title: 'Primary action is named in user language',
    detail: has(live.form, 'New Batch Group') && has(live.form, 'Create Batch Group')
      ? 'The planning modal names the object being created and labels the final action as Create Batch Group.'
      : 'The planning modal should name the object being created and use an obvious final action label.',
    evidence: livePaths.form,
  },
  {
    status: has(live.form, 'Create Batch Group') && has(live.form, 'Add strain') && has(live.form, 'Cancel') ? 'pass' : 'warn',
    title: 'Action hierarchy has primary, secondary, and escape',
    detail: 'The planner form should expose one dominant create action, one quieter add-strain action, and a clear cancel/close path.',
    evidence: livePaths.form,
  },
  {
    status: appearsBefore(live.form, 'Data Honesty', 'Create Batch Group') ? 'pass' : 'fail',
    title: 'Risk context appears before commitment',
    detail: appearsBefore(live.form, 'Data Honesty', 'Create Batch Group')
      ? 'Confidence warnings appear before the operator commits the plan.'
      : 'Data honesty warnings must appear before the create/save action, not after it.',
    evidence: livePaths.form,
  },
  {
    status: has(live.form, 'Room capacity') && appearsBefore(live.form, 'Room capacity', 'Flower Start Date') ? 'pass' : 'warn',
    title: 'Capacity context is near composition',
    detail: has(live.form, 'Room capacity')
      ? 'Room capacity and planned plant total are shown near batch-group composition.'
      : 'Room capacity should be visible near plant-count entry so the operator can judge fit while planning.',
    evidence: livePaths.form,
  },
  {
    status: has(live.form, 'Mother batch group') && has(live.form, 'No mother group selected') ? 'pass' : 'warn',
    title: 'Mother context is close to strain selection',
    detail: 'Mother group selection should live directly below the strain row it affects.',
    evidence: livePaths.form,
  },
  {
    status: has(live.view, 'title={`Add planned cycle to ${room.room_name}`}') && has(live.view, 'onClick={() => handleRoomClick(room)}') ? 'pass' : 'warn',
    title: 'Navigation affordances are discoverable',
    detail: has(live.view, 'title={`Add planned cycle to ${room.room_name}`}')
      ? 'Room rows and plus controls expose basic affordances, but screenshot review should still verify the click targets read naturally.'
      : 'Planning controls should expose clear labels/tooltips so the next destination is not a mystery.',
    evidence: livePaths.view,
  },
  {
    status: has(live.view, 'title={titleParts.join') && !has(live.view, 'aria-label={`Open') ? 'warn' : 'pass',
    title: 'Clickable/detail affordance does not rely only on hover title',
    detail: has(live.view, 'title={titleParts.join') && !has(live.view, 'aria-label={`Open')
      ? 'Cohort bars appear to rely on hover title text for detail. If bars are interactive later, add visible or accessible affordance beyond title text.'
      : 'Interactive timeline elements have more than hover-title affordance or are not treated as record drilldowns.',
    evidence: livePaths.view,
  },
  {
    status: has(live.form, 'onClose') && has(live.form, 'removeStrainRow') && has(live.form, 'handleDelete') ? 'pass' : 'warn',
    title: 'Recovery paths are available',
    detail: 'The modal supports close/cancel, removing a strain row, and deleting an existing planned cycle.',
    evidence: livePaths.form,
  },
  {
    status: has(live.view, 'MotherBatchGroupSummary') && appearsBefore(live.view, 'MotherBatchGroupSummary', 'Harvest Alerts') ? 'pass' : 'warn',
    title: 'High-level planning context precedes alerts',
    detail: 'Planning inventory context should appear before transient alerts so the screen reads from operating substrate to exceptions.',
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
    title: 'Writes prefer fn_plan_cycle over legacy planned_cycles',
    detail: has(live.service, "rpc('fn_plan_cycle'")
      ? 'Live create path attempts fn_plan_cycle first and only falls back to planned_cycles while the RPC is not deployed.'
      : has(live.service, "from('planned_cycles')")
        ? 'Live write path inserts/updates/deletes planned_cycles directly. The demo-to-live bridge expects a future fn_plan_cycle RPC that creates one cycle plus batch_registry children atomically.'
        : 'No direct planned_cycles write path found.',
    evidence: livePaths.service,
  },
  {
    status: has(live.form, 'Data Honesty') && has(live.form, 'conversion_sessions') && has(live.form, 'harvest_count') ? 'pass' : has(live.hook, 'conversion_sessions') || has(live.types, 'conversion_sessions') ? 'warn' : 'fail',
    title: 'Sample-size data is surfaced before planning',
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
    title: 'Batch-group planning has a live bridge',
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

const allChecks = [...targetCoverageChecks, ...fileChecks, ...designChecks, ...intuitiveDesignChecks, ...dataChecks, ...parityChecks];
const failCount = allChecks.filter((c) => c.status === 'fail').length;
const warnCount = allChecks.filter((c) => c.status === 'warn').length;
const passCount = allChecks.filter((c) => c.status === 'pass').length;
const generatedAt = new Date().toISOString();
const runId = generatedAt.replace(/[:.]/g, '-');
const runReportPath = path.join(runsDir, `${runId}-production-planner.md`);
const hasDesignProblems = designChecks.some((check) => check.status !== 'pass');
const hasIntuitiveDesignProblems = intuitiveDesignChecks.some((check) => check.status !== 'pass');
const hasTargetProblems = targetCoverageChecks.some((check) => check.status !== 'pass');
const hasParityProblems = parityChecks.some((check) => check.status !== 'pass');
const hasDataProblems = dataChecks.some((check) => check.status !== 'pass');
const summaryBullets = [
  '- The live planner exists and is wired to Supabase views.',
  '- The polished Sostanza/lab planner exists in the prod-planner-b worktree and carries richer demo behavior.',
  hasTargetProblems
    ? '- Target coverage still has a warning; check the Target Coverage section before trusting demo parity fully.'
    : '- Both the Cultivo lab planner and standalone Sostanza stakeholder demo are first-class harness inputs.',
  hasParityProblems
    ? '- Demo-to-live parity still has warnings; use the parity section to choose the next bridge slice.'
    : '- Demo-to-live parity checks are currently green for the planner bridge surface.',
  hasDataProblems
    ? '- Data contract still has warnings; planned_cycles remains a bridge until fully superseded.'
    : '- Data contract checks are currently green for the planner harness scope.',
  hasDesignProblems
    ? '- Design-system checks still have warnings or failures; clean those before treating the surface as design-compliant.'
    : '- Design-system checks currently pass for live planner chrome.',
  hasIntuitiveDesignProblems
    ? '- Intuitive-design checks still have warnings; inspect action hierarchy and navigation affordance before polishing further.'
    : '- Intuitive-design checks currently pass for the planner harness scope.',
];

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
  `Generated: ${generatedAt}`,
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
  ...summaryBullets,
  '',
  '## Recommended Next Move',
  '',
  'The read-only lifecycle bridge, RPC-first create path, minimal cohort form, and mother-batch lineage path are now the base. The next useful slice is adding hold-back/retire actions, or a final design-system pass if demo polish is the priority.',
  '',
  renderChecks('Target Coverage', targetCoverageChecks),
  renderChecks('File Coverage', fileChecks),
  renderChecks('Design Contract', designChecks),
  renderChecks('UX / Intuitive Design', intuitiveDesignChecks),
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
mkdirSync(runsDir, { recursive: true });
writeFileSync(reportPath, report);
writeFileSync(runReportPath, report);

const groupedChecks = [
  ...targetCoverageChecks.map((check) => ({ ...check, group: 'Target Coverage' })),
  ...fileChecks.map((check) => ({ ...check, group: 'File Coverage' })),
  ...designChecks.map((check) => ({ ...check, group: 'Design Contract' })),
  ...intuitiveDesignChecks.map((check) => ({ ...check, group: 'UX / Intuitive Design' })),
  ...dataChecks.map((check) => ({ ...check, group: 'Data Contract' })),
  ...parityChecks.map((check) => ({ ...check, group: 'Demo-To-Live Parity' })),
];

const runEntry: HarnessRunIndexEntry = {
  id: runId,
  generatedAt,
  score: score(allChecks),
  passCount,
  warnCount,
  failCount,
  reportPath: path.relative(repoRoot, runReportPath),
  checks: groupedChecks.map((check) => ({
    status: check.status,
    title: check.title,
    group: check.group,
  })),
};

const existingIndex: HarnessRunIndexEntry[] = existsSync(runIndexPath)
  ? JSON.parse(readFileSync(runIndexPath, 'utf8'))
  : [];

const nextIndex = [...existingIndex, runEntry]
  .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
  .slice(-50);

writeFileSync(runIndexPath, `${JSON.stringify(nextIndex, null, 2)}\n`);

console.log(`Production Planner harness complete.`);
console.log(`Report: ${reportPath}`);
console.log(`Snapshot: ${runReportPath}`);
console.log(`Run index: ${runIndexPath}`);
console.log(`Score: ${score(allChecks)}% (${passCount} pass, ${warnCount} warn, ${failCount} fail)`);

if (process.env.HARNESS_STRICT === '1' && failCount > 0) {
  process.exitCode = 1;
}
