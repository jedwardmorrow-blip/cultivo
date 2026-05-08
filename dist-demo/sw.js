// CultOps Service Worker v1.0.0
// Provides: app shell caching, offline fallback for worker view, runtime caching for API calls

const CACHE_VERSION = 'cultops-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const WORKER_CACHE = `${CACHE_VERSION}-worker`;

// App shell — core assets that make the app load
const APP_SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/cult-logo-eye.png',
  '/cult-logo-white.png',
  '/icon-192x192.png',
];

// ── Install: pre-cache the app shell ────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_URLS);
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('cultops-') && name !== APP_SHELL_CACHE && name !== RUNTIME_CACHE && name !== WORKER_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ─
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase auth/realtime endpoints — never cache these
  if (url.hostname.includes('supabase.co') && (url.pathname.includes('/auth/') || url.pathname.includes('/realtime/'))) {
    return;
  }

  // Strategy: Supabase REST API calls → network-first with cache fallback
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/')) {
    event.respondWith(networkFirstWithCache(request, RUNTIME_CACHE));
    return;
  }

  // Strategy: Worker view route → cache-first for offline shell
  if (url.pathname.startsWith('/worker')) {
    event.respondWith(cacheFirstWithNetwork(request, WORKER_CACHE));
    return;
  }

  // Strategy: Static assets (JS, CSS, images) → cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(request, APP_SHELL_CACHE));
    return;
  }

  // Strategy: Navigation requests → network-first, fall back to cached index or offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        // For worker view, try the cached shell first, then offline page
        if (url.pathname.startsWith('/worker')) {
          return (await caches.match('/')) || (await caches.match('/offline.html'));
        }
        return (await caches.match('/')) || (await caches.match('/offline.html'));
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(networkFirstWithCache(request, RUNTIME_CACHE));
});

// ── Strategies ──────────────────────────────────────────

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // For navigation fallback, serve the cached index page
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'No cached data available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)(\?.*)?$/.test(pathname);
}

// ── Offline mutation queue (IndexedDB) ──────────────────
// Workers in grow rooms with spotty WiFi can complete tasks offline.
// Mutations are queued in IndexedDB and replayed when connectivity returns.

const QUEUE_DB = 'cultops-offline-queue';
const QUEUE_STORE = 'mutations';

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getQueuedMutations() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearQueuedMutation(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Background sync ─────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'cultops-sync-mutations') {
    event.waitUntil(replayQueuedMutations());
  }
});

async function replayQueuedMutations() {
  const mutations = await getQueuedMutations();
  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body,
      });
      if (response.ok || response.status < 500) {
        // Success or client error (4xx) — remove from queue either way
        await clearQueuedMutation(mutation.id);
      }
      // 5xx — leave in queue for next sync attempt
    } catch {
      // Still offline — stop trying, next sync event will retry
      break;
    }
  }

  // Notify any open clients that sync completed
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_COMPLETE', remaining: (await getQueuedMutations()).length });
  }
}

// ── Listen for messages from the app ────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'QUEUE_MUTATION') {
    event.waitUntil(
      (async () => {
        const db = await openQueueDB();
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        const store = tx.objectStore(QUEUE_STORE);
        store.add({
          url: event.data.url,
          method: event.data.method,
          headers: event.data.headers,
          body: event.data.body,
          timestamp: Date.now(),
        });
        // Try to register a background sync
        if (self.registration.sync) {
          await self.registration.sync.register('cultops-sync-mutations');
        }
      })()
    );
  }

  if (event.data?.type === 'GET_QUEUE_COUNT') {
    event.waitUntil(
      getQueuedMutations().then((mutations) => {
        event.source.postMessage({ type: 'QUEUE_COUNT', count: mutations.length });
      })
    );
  }
});
