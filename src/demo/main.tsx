import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Brand tokens + global styles. The demo build deliberately reuses the
// same brand-tokens.css contract as the Cult app so the Bureau dialect
// chrome reads identically across environments.
import '../brand-tokens.css';
import '../index.css';

import { DemoApp } from './DemoApp';

// Force ?demo=sostanza into the URL before the lab mounts. The lab's
// useLabPlannerData hook reads window.location.search at first render
// to pick the active fixture, so this rewrite must happen
// synchronously before createRoot runs. Future prospects: extend the
// fallback below to honor subdomain or build-time env flags
// (e.g. import.meta.env.VITE_DEMO_FIXTURE).
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (!params.get('demo')) {
    params.set('demo', 'sostanza');
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
