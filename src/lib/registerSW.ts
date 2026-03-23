/**
 * Service Worker Registration
 *
 * Registers the service worker in production builds only.
 * In development, the SW is skipped to avoid caching dev assets.
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Only register in production (Vite sets import.meta.env.PROD)
  if (!import.meta.env.PROD) {
    console.log('[SW] Skipping registration in development mode');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            // New version available — the user will get it on next navigation.
            // We could prompt for a reload here, but for a grow-room app
            // a silent update is less disruptive.
            console.log('[SW] New version activated — will take effect on next load');
          }
        });
      });

      console.log('[SW] Registered with scope:', registration.scope);
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  });
}

/**
 * Unregister the service worker — useful for debugging
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  await registration.unregister();
  console.log('[SW] Unregistered');
}
