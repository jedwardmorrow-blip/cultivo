import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Status = 'pass' | 'warn' | 'fail';

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
const runsDir = path.join(repoRoot, 'docs', 'harness', 'runs');
const runIndexPath = path.join(runsDir, 'index.json');
const comparePath = path.join(repoRoot, 'docs', 'harness', 'production-planner-compare-latest.md');

function statusRank(status: Status): number {
  if (status === 'fail') return 0;
  if (status === 'warn') return 1;
  return 2;
}

function statusLabel(status: Status): string {
  return status.toUpperCase();
}

if (!existsSync(runIndexPath)) {
  console.error(`No harness run index found at ${runIndexPath}. Run npm run harness:planner first.`);
  process.exit(1);
}

const runs = (JSON.parse(readFileSync(runIndexPath, 'utf8')) as HarnessRunIndexEntry[])
  .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));

if (runs.length < 2) {
  console.error('Need at least two harness runs to compare. Run npm run harness:planner at the start and end of a session.');
  process.exit(1);
}

const previous = runs[runs.length - 2];
const current = runs[runs.length - 1];

const previousByKey = new Map(previous.checks.map((check) => [`${check.group}::${check.title}`, check]));
const currentByKey = new Map(current.checks.map((check) => [`${check.group}::${check.title}`, check]));
const allKeys = Array.from(new Set([...previousByKey.keys(), ...currentByKey.keys()])).sort();

const improved: string[] = [];
const regressed: string[] = [];
const unchangedProblems: string[] = [];
const added: string[] = [];
const removed: string[] = [];

for (const key of allKeys) {
  const before = previousByKey.get(key);
  const after = currentByKey.get(key);
  if (!before && after) {
    added.push(`${after.group}: ${after.title} (${statusLabel(after.status)})`);
    continue;
  }
  if (before && !after) {
    removed.push(`${before.group}: ${before.title} (${statusLabel(before.status)})`);
    continue;
  }
  if (!before || !after) continue;

  const beforeRank = statusRank(before.status);
  const afterRank = statusRank(after.status);
  if (afterRank > beforeRank) {
    improved.push(`${after.group}: ${after.title} (${statusLabel(before.status)} -> ${statusLabel(after.status)})`);
  } else if (afterRank < beforeRank) {
    regressed.push(`${after.group}: ${after.title} (${statusLabel(before.status)} -> ${statusLabel(after.status)})`);
  } else if (after.status !== 'pass') {
    unchangedProblems.push(`${after.group}: ${after.title} (${statusLabel(after.status)})`);
  }
}

function renderList(items: string[], empty: string): string {
  if (items.length === 0) return `- ${empty}`;
  return items.map((item) => `- ${item}`).join('\n');
}

const report = [
  '# Production Planner Harness Compare',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Compared Runs',
  '',
  `Previous: ${previous.generatedAt} (${previous.score}%, ${previous.passCount} pass, ${previous.warnCount} warn, ${previous.failCount} fail)`,
  '',
  `Current: ${current.generatedAt} (${current.score}%, ${current.passCount} pass, ${current.warnCount} warn, ${current.failCount} fail)`,
  '',
  `Score delta: ${current.score - previous.score >= 0 ? '+' : ''}${current.score - previous.score}`,
  '',
  '## Improved',
  '',
  renderList(improved, 'No checks improved.'),
  '',
  '## Regressed',
  '',
  renderList(regressed, 'No checks regressed.'),
  '',
  '## Unchanged Warnings Or Failures',
  '',
  renderList(unchangedProblems, 'No unchanged warnings or failures.'),
  '',
  '## Added Checks',
  '',
  renderList(added, 'No checks were added.'),
  '',
  '## Removed Checks',
  '',
  renderList(removed, 'No checks were removed.'),
  '',
  '## Session-Close Prompt',
  '',
  'Use this block when closing planner sessions:',
  '',
  '```txt',
  'Harness score before:',
  'Harness score after:',
  'What improved:',
  'What regressed:',
  'False positives/noisy checks:',
  'Missed checks:',
  'Next harness improvement:',
  '```',
  '',
].join('\n');

writeFileSync(comparePath, report);

console.log(`Production Planner harness comparison complete.`);
console.log(`Report: ${comparePath}`);
console.log(`Score delta: ${current.score - previous.score >= 0 ? '+' : ''}${current.score - previous.score}`);
console.log(`${improved.length} improved, ${regressed.length} regressed, ${unchangedProblems.length} unchanged warnings/failures.`);
