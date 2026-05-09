import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Brand tokens + global styles. The demo build deliberately reuses the
// same brand-tokens.css contract as the Cult app so the Bureau dialect
// chrome reads identically across environments.
import '../brand-tokens.css';
import '../index.css';

import { DemoApp } from './DemoApp';

// Default the demo build to ?mock=1 (multi-strain realistic Cultivo
// shape). The lab's useLabPlannerData hook reads window.location.search
// at first render to pick the active fixture, so this rewrite must
// happen synchronously before createRoot runs.
//
// History: the demo build originally defaulted to ?demo=sostanza (Pink
// Kush monoculture), but Pink Kush single-strain is the outlier, not
// the cultivator norm. Multi-strain cohorts (4-26 strains per flower
// room sharing a flip date) are what every realistic cultivation
// environment looks like (see business_context row
// cultivo_cycle_cohort_data_model). Defaulting to ?mock=1 makes the
// deployed demo a robust representation of the live Cultivo experience.
//
// The Sostanza fixture remains accessible via ?demo=sostanza for the
// Pink Kush conversion artifact (session 467) and any prospect-specific
// review where monoculture is the relevant pitch.
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const hasFixtureFlag = params.get('demo') || params.get('mock');
  if (!hasFixtureFlag) {
    params.set('mock', '1');
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${params.toString()}${window.location.hash}`
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>
);
