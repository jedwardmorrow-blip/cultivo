import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './lib/components';
import { errorService } from './services/error.service';
import { registerServiceWorker } from './lib/registerSW';
import './index.css';

import { BrowserRouter } from 'react-router-dom';

if (typeof window !== 'undefined') {
  window.__errorService = errorService;

  // Auto-reload on stale chunk failures (e.g., after a new deployment)
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (msg.includes('dynamically imported module') || msg.includes('Failed to fetch') || msg.includes('ChunkLoadError')) {
      const key = 'chunk-reload-ts';
      const last = sessionStorage.getItem(key);
      const now = Date.now();
      if (!last || now - Number(last) > 10000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </BrowserRouter>
  </StrictMode>
);

// Register service worker for offline support (production only)
registerServiceWorker();
