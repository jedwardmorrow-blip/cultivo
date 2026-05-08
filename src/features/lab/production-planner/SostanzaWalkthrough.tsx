import { useEffect, useLayoutEffect, useState } from 'react';

/**
 * Four-step bureau-dialect onboarding overlay shown to first-time
 * Sostanza demo viewers. Walks the operator through the four primary
 * surfaces (masthead, KPI strip, SEED row, sector grid) in 30
 * seconds, then writes a localStorage flag so the overlay does not
 * re-appear on subsequent visits. Skip link dismisses immediately.
 *
 * Voice: bureau dialect, terse imperative phrases, comma-flowing
 * prose, no editorial periods. Aligns with the working-instrument
 * aesthetic already established across the artifact.
 *
 * Spotlight strategy: target's bounding rect is computed via
 * getBoundingClientRect on each step transition. A 2px gold dashed
 * outline is rendered around the target, plus a corner step
 * indicator. The card hovers next to the target when there is room
 * on the right, otherwise underneath. No backdrop dimming — the
 * working-instrument doctrine reads better with the chart fully
 * visible behind the overlay.
 */

const STORAGE_KEY = 'sostanza_walkthrough_seen_v1';

interface Step {
  /** Section heading rendered in mono caps above the body. */
  title: string;
  /** Prose body. Comma-flowing, no trailing period. */
  body: string;
  /** CSS selector for the surface this step highlights. */
  targetSelector: string;
}

const STEPS: Step[] = [
  {
    title: 'THE INSTRUMENT',
    body:
      "Sostanza's production planner, sized to your file 2 cadence, 18 batches across 11 rooms in a 4-room flower rotation, today centered with four weeks back and sixteen forward",
    targetSelector: '.serial-plate',
  },
  {
    title: 'AT-A-GLANCE METRICS',
    body:
      'Six instrument readings on the strip: harvest window, available for sale, unmatched demand, rooms ready, cycles planned, week status, clickable when actionable',
    targetSelector: '.kpi-strip',
  },
  {
    title: 'SYNTHESIZED OBSERVATIONS',
    body:
      'Live synthesis of what needs attention, stuck cohorts, cutback timing, scheduling collisions, each prompt carries a CTA that opens the right detail',
    targetSelector: '.seed-row',
  },
  {
    title: 'THE QUEUE',
    body:
      'Top to bottom, mother then clone then veg then four flower rooms then drying, trim, cure, pack, every batch flowing through 9 stages, faint dashed bars are committed cycles still upstream of their landing room',
    targetSelector: '.gantt-shell',
  },
  {
    title: 'BATCH DETAIL',
    body:
      'Click any bar to open its drawer, you get the 9-stage lifecycle progress, a plant attrition funnel reading 800 cuts to 360 harvested at your file 2 retention, strain stats with 22.4 kg per harvest at 800 g per square foot',
    targetSelector: '[data-batch-id="sb-297"]',
  },
  {
    title: 'QUEUE-AWARE PLANNING',
    body:
      'Click any flower room cap to open it, then click Plan a Cycle, the form pre-fills the flower-start date anchored to your predecessor harvest plus 3 day turnover, no manual calendar arithmetic',
    targetSelector: '[data-room-code="FLW-03"]',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function SostanzaWalkthrough() {
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });
  const [rect, setRect] = useState<Rect | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Recompute target rect on step change and on resize / scroll.
  useLayoutEffect(() => {
    if (dismissed) return;
    const compute = () => {
      const target = document.querySelector(step.targetSelector);
      if (!target) {
        setRect(null);
        return;
      }
      const r = target.getBoundingClientRect();
      setRect({
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, { passive: true });
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute);
    };
  }, [step.targetSelector, dismissed]);

  // Scroll target into view on step change.
  useEffect(() => {
    if (dismissed) return;
    const target = document.querySelector(step.targetSelector);
    if (target && 'scrollIntoView' in target) {
      (target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step.targetSelector, dismissed]);

  if (dismissed) return null;
  if (!rect) return null;

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
    setDismissed(true);
  };

  const next = () => {
    if (isLast) {
      dismiss();
      return;
    }
    setStepIndex((s) => s + 1);
  };

  // Card placement: pinned to a fixed anchor at the bottom-right of
  // the viewport so it does not move between steps and never covers
  // the surface being explained next. The spotlight does the "look
  // here" work; the card stays out of the way.
  return (
    <div className="sostanza-walkthrough" aria-live="polite">
      <div
        className="walkthrough-spotlight"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
        aria-hidden
      />
      <div className="walkthrough-card walkthrough-card-fixed" role="dialog" aria-labelledby="walkthrough-title">
        <div className="walkthrough-card-head">
          <span className="walkthrough-step cap mono">
            STEP {String(stepIndex + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
          <button
            type="button"
            className="walkthrough-skip cap mono"
            onClick={dismiss}
            aria-label="Skip walkthrough"
          >
            Skip
          </button>
        </div>
        <h2 id="walkthrough-title" className="walkthrough-title display">
          {step.title}
        </h2>
        <p className="walkthrough-body">{step.body}</p>
        <div className="walkthrough-actions">
          <button type="button" className="walkthrough-next cap mono" onClick={next}>
            {isLast ? 'Begin →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SostanzaWalkthrough;
