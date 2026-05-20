import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

type BrowserStatus = 'PASS' | 'WARN' | 'FAIL';

interface BrowserCheck {
  status: BrowserStatus;
  name: string;
  detail: string;
}

interface BrowserReport {
  generated: string;
  url: string;
  targetRoot: string;
  results: BrowserCheck[];
  consoleEvents: Array<{ type: string; text: string }>;
}

const repoRoot = process.cwd();
const sostanzaDemoRoot = process.env.SOSTANZA_DEMO_ROOT
  ? path.resolve(process.env.SOSTANZA_DEMO_ROOT)
  : path.resolve(repoRoot, '..', 'sostanza-demo');
const port = Number(process.env.SOSTANZA_BROWSER_PORT ?? 5177);
const baseUrl = process.env.SOSTANZA_BROWSER_URL ?? `http://127.0.0.1:${port}/?demo=sostanza#`;
const reportPath = path.join(repoRoot, 'docs', 'harness', 'browser', 'sostanza-plan-cycle-browser-report.json');

const results: BrowserCheck[] = [];
const consoleEvents: BrowserReport['consoleEvents'] = [];

function record(status: BrowserStatus, name: string, detail = '') {
  results.push({ status, name, detail });
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

async function waitForServer(url: string, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startServerIfNeeded(): Promise<ChildProcessWithoutNullStreams | null> {
  if (process.env.SOSTANZA_BROWSER_URL) {
    await waitForServer(baseUrl);
    return null;
  }
  if (!existsSync(path.join(sostanzaDemoRoot, 'package.json'))) {
    throw new Error(`Sostanza demo package.json not found at ${sostanzaDemoRoot}`);
  }
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: sostanzaDemoRoot,
    env: process.env,
    stdio: 'pipe',
  });
  child.stdout.on('data', () => undefined);
  child.stderr.on('data', () => undefined);
  await waitForServer(baseUrl);
  return child;
}

function attachConsole(page: Page) {
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    consoleEvents.push({ type, text });
  });
  page.on('pageerror', (error) => {
    consoleEvents.push({ type: 'pageerror', text: error.message });
  });
}

async function openPlanner(page: Page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);
}

async function openGapPlan(page: Page) {
  await openPlanner(page);
  await page.locator('button.flower-gap-card').filter({ hasText: /FLW-06/i }).first().click({ force: true });
  await page.locator('.plan-form[role="dialog"]').waitFor({ timeout: 8_000 });
}

async function forceCloneShortfall(page: Page) {
  await page.locator('.cohort-strain-cuts-input').first().fill('999');
  await page.waitForTimeout(500);
}

async function resolveWithOutsideClones(page: Page) {
  await page.locator('.mother-coverage-action-row').first()
    .locator('button', { hasText: /Use outside clones/i })
    .click();
  await page.waitForTimeout(500);
}

async function resolveWithMomCuts(page: Page) {
  await page.locator('.mother-coverage-action-row').first()
    .locator('button')
    .filter({ hasText: /Reduce to \d+ mom cuts/i })
    .click();
  await page.waitForTimeout(500);
}

async function runCheck(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    record('PASS', name, detail ?? '');
  } catch (error) {
    record('FAIL', name, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  let server: ChildProcessWithoutNullStreams | null = null;
  let browser: Browser | null = null;

  try {
    server = await startServerIfNeeded();
    browser = await chromium.launch({ headless: true });

    await runCheck('Sostanza stakeholder demo opens with planner actions', async () => {
      const page = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(page);
      await openPlanner(page);
      const topActionCount = await page.locator('button.plan-cycle-solid').count();
      const gapCardCount = await page.locator('button.flower-gap-card').count();
      if (topActionCount < 1) throw new Error('Top Plan a Cycle button was not found.');
      if (gapCardCount < 1) throw new Error('Flower gap Plan a Cycle cards were not found.');
      await page.close();
      return `${topActionCount} top action, ${gapCardCount} gap cards`;
    });

    await runCheck('Recommended multi-strain mix opens ready to create', async () => {
      const page = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(page);
      await openGapPlan(page);
      const recommendation = normalizeText(await page.locator('.plan-form-recommendation').innerText());
      const rows = await page.locator('.cohort-strain-row').count();
      const expandedRows = await page.locator('.cohort-strain-row.is-expanded').count();
      const guidance = normalizeText(await page.locator('#plan-form-finalize-guidance').innerText());
      const primary = page.locator('.plan-form button.plan-form-btn.primary').first();
      if (!/5-strain mix/i.test(recommendation) || !/FLW-06 capacity plan/i.test(recommendation)) {
        throw new Error(`Recommended mix copy missing: ${recommendation}`);
      }
      if (rows !== 5) throw new Error(`Expected 5 recommended strain rows for FLW-06, got ${rows}.`);
      if (expandedRows !== 0) throw new Error(`Recommended mix should open collapsed, got ${expandedRows} expanded rows.`);
      if (await primary.isDisabled()) throw new Error('Recommended multi-strain plan opened with create disabled.');
      if (!/Ready to create batch group/i.test(guidance)) throw new Error(`Unexpected ready guidance: ${guidance}`);
      await page.close();
      return recommendation;
    });

    await runCheck('Clone shortfall warns without blocking create', async () => {
      const page = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(page);
      await openGapPlan(page);
      await forceCloneShortfall(page);
      const primary = page.locator('.plan-form button.plan-form-btn.primary').first();
      const disabled = await primary.isDisabled();
      const buttonText = normalizeText(await primary.innerText());
      const guidance = normalizeText(await page.locator('#plan-form-finalize-guidance').innerText());
      const resolveText = normalizeText(await page.locator('.mother-coverage-resolve').innerText());
      if (disabled) throw new Error('Create button was disabled for uncovered clone cuts.');
      if (!/Create With Source Warning/i.test(buttonText)) throw new Error(`Unexpected create button text: ${buttonText}`);
      if (!/clone cuts are still open/i.test(guidance) || !/resolve source coverage above/i.test(guidance)) {
        throw new Error(`Source warning guidance missing: ${guidance}`);
      }
      if (!/Use outside clones/i.test(resolveText) || !/Reduce to \d+ mom cuts/i.test(resolveText) || !/Pick moms/i.test(resolveText)) {
        throw new Error(`Recovery actions missing: ${resolveText}`);
      }
      await page.close();
      return `${buttonText} · ${guidance}`;
    });

    await runCheck('Clone recovery enables create', async () => {
      const page = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(page);
      await openGapPlan(page);
      await forceCloneShortfall(page);
      await resolveWithMomCuts(page);
      const primary = page.locator('.plan-form button.plan-form-btn.primary').first();
      const guidance = normalizeText(await page.locator('#plan-form-finalize-guidance').innerText());
      if (await primary.isDisabled()) throw new Error('Create button stayed disabled after reducing to mom cuts.');
      if (!/Ready to create batch group/i.test(guidance)) throw new Error(`Unexpected guidance: ${guidance}`);
      await page.close();
      return guidance;
    });

    await runCheck('Veg overload is a soft warning with auto recovery', async () => {
      const page = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(page);
      await openGapPlan(page);
      await page.locator('#plan-form-veg-room-select').selectOption('r-veg-01');
      await page.waitForTimeout(500);
      const primary = page.locator('.plan-form button.plan-form-btn.primary').first();
      const warning = normalizeText(await page.locator('.veg-capacity-warning').innerText());
      if (await primary.isDisabled()) throw new Error('Create button was disabled for veg capacity warning.');
      if (!/VEG-01 peaks 976\/840/i.test(warning)) throw new Error(`Unexpected veg warning: ${warning}`);
      await page.locator('.veg-capacity-warning button', { hasText: /Use Auto/i }).click();
      await page.waitForTimeout(500);
      if (await page.locator('.veg-capacity-warning').count() !== 0) {
        throw new Error('Use Auto did not clear veg capacity warning.');
      }
      await page.close();
      return warning;
    });

    await runCheck('Flower capacity block has guided recovery actions', async () => {
      const page = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(page);
      await openGapPlan(page);
      await page.locator('#plan-form-room-select').selectOption('r-flw-01');
      await page.waitForTimeout(700);
      const primary = page.locator('.plan-form button.plan-form-btn.primary').first();
      const warning = normalizeText(await page.locator('.flower-capacity-warning').innerText());
      if (!(await primary.isDisabled())) throw new Error('Create button was enabled for flower over-capacity.');
      if (!/FLW-01 holds 252 plants; this plan has 420/i.test(warning)) throw new Error(`Unexpected flower warning: ${warning}`);
      if (!/Reduce to 252 plants/i.test(warning) || !/Use FLW-06/i.test(warning)) {
        throw new Error(`Flower recovery actions missing: ${warning}`);
      }
      await page.close();
      return warning;
    });

    await runCheck('Flower capacity recovery paths clear the block', async () => {
      const page = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(page);
      await openGapPlan(page);
      await page.locator('#plan-form-room-select').selectOption('r-flw-01');
      await page.waitForTimeout(700);
      await page.locator('.flower-capacity-warning button', { hasText: /Reduce to 252 plants/i }).click();
      await page.waitForTimeout(700);
      const plantTotal = (await page.locator('.cohort-strain-plants').evaluateAll((inputs) => (
        inputs.reduce((sum, input) => sum + Number((input as HTMLInputElement).value || 0), 0)
      )));
      if (plantTotal !== 252) throw new Error(`Expected plant target total 252, got ${plantTotal}.`);
      if (await page.locator('.flower-capacity-warning').count() !== 0) {
        throw new Error('Reduce-to-cap did not clear flower capacity warning.');
      }
      await page.close();

      const second = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(second);
      await openGapPlan(second);
      await second.locator('#plan-form-room-select').selectOption('r-flw-01');
      await second.waitForTimeout(700);
      await second.locator('.flower-capacity-warning button', { hasText: /Use FLW/i }).first().click();
      await second.waitForTimeout(700);
      const guidance = normalizeText(await second.locator('#plan-form-finalize-guidance').innerText());
      if (!/Ready to create batch group/i.test(guidance)) throw new Error(`Use-room recovery did not restore readiness: ${guidance}`);
      await second.close();
      return 'Reduce-to-cap and use-room recovery both cleared the flower capacity block.';
    });

    await runCheck('Finalize shows fixed confirmation banner', async () => {
      const page = await browser!.newPage({ viewport: { width: 1440, height: 1100 } });
      attachConsole(page);
      await openGapPlan(page);
      await page.locator('.plan-form button.plan-form-btn.primary').first().click();
      await page.locator('.plan-form[role="dialog"]').waitFor({ state: 'detached' });
      await page.locator('.finalize-banner').waitFor({ timeout: 5_000 });
      const banner = normalizeText(await page.locator('.finalize-banner').innerText());
      const box = await page.locator('.finalize-banner').boundingBox();
      if (!/FINALIZED/i.test(banner)) throw new Error(`Finalize banner missing success text: ${banner}`);
      if (!box || box.y > 8) throw new Error(`Finalize banner was not fixed near the viewport top: ${JSON.stringify(box)}`);
      await page.locator('.finalize-banner .banner-x').click({ force: true });
      await page.waitForTimeout(250);
      if (await page.locator('.finalize-banner').count() !== 0) throw new Error('Finalize banner did not dismiss.');
      await page.close();
      return banner;
    });

    await runCheck('Mobile warning layouts stay inside viewport', async () => {
      const page = await browser!.newPage({ viewport: { width: 390, height: 900 } });
      attachConsole(page);
      await openGapPlan(page);
      await page.locator('#plan-form-room-select').selectOption('r-flw-01');
      await page.waitForTimeout(700);
      const box = await page.locator('.flower-capacity-warning').boundingBox();
      if (!box) throw new Error('Flower capacity warning was not visible on mobile.');
      if (box.width > 390) throw new Error(`Mobile warning exceeds viewport width: ${JSON.stringify(box)}`);
      await page.close();
      return `warning width ${Math.round(box.width)}px inside 390px viewport`;
    });

    const errorEvents = consoleEvents.filter((event) => event.type === 'error' || event.type === 'pageerror');
    if (errorEvents.length > 0) {
      record('FAIL', 'No browser console errors', errorEvents.map((event) => `${event.type}: ${event.text}`).join('\n'));
    } else {
      record('PASS', 'No browser console errors', '');
    }
  } finally {
    await browser?.close().catch(() => undefined);
    if (server) {
      server.kill('SIGTERM');
    }
  }

  const report: BrowserReport = {
    generated: new Date().toISOString(),
    url: baseUrl,
    targetRoot: sostanzaDemoRoot,
    results,
    consoleEvents,
  };
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const passCount = results.filter((result) => result.status === 'PASS').length;
  const warnCount = results.filter((result) => result.status === 'WARN').length;
  const failCount = results.filter((result) => result.status === 'FAIL').length;
  console.log(`Sostanza Plan a Cycle browser harness complete.`);
  console.log(`Report: ${reportPath}`);
  console.log(`Results: ${passCount} pass, ${warnCount} warn, ${failCount} fail`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  record('FAIL', 'Browser harness crashed', error instanceof Error ? error.stack ?? error.message : String(error));
  const report: BrowserReport = {
    generated: new Date().toISOString(),
    url: baseUrl,
    targetRoot: sostanzaDemoRoot,
    results,
    consoleEvents,
  };
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(error);
  process.exit(1);
});
