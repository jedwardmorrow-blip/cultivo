import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './lib/components';
import { errorService } from './services/error.service';
import './index.css';

import { BrowserRouter } from 'react-router-dom';

if (typeof window !== 'undefined') {
  window.__errorService = errorService;
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
