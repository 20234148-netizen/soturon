// QiitaCache Service Worker v1.0
// Offline-first PWA with Workbox-like strategies

const CACHE_NAME = 'qiitacache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// =====================================================
// INSTALL — Pre-cache static assets
// =====================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Take control immediately
      return self.skipWaiting();
    })
  );
});

// =====================================================
// ACTIVATE — Clean up old caches
// =====================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// =====================================================
// FETCH — Intercept requests
// =====================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Qiita API requests — Network first, no cache
  if (url.hostname === 'qiita.com' && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets — Cache first
  if (url.hostname === self.location.hostname || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: network with fallback
  event.respondWith(networkWithFallback(request));
});

// =====================================================
// STRATEGIES
// =====================================================

// Network First: Try network, fallback to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', message: 'ネットワークに接続できません' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache First: Try cache, fallback to network + update cache
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('オフラインです', { status: 503 });
  }
}

// Network with fallback to cache
async function networkWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return the main app shell for navigation requests
    if (request.mode === 'navigate') {
      const appShell = await caches.match('/index.html');
      if (appShell) return appShell;
    }
    return new Response('オフラインです', { status: 503 });
  }
}

// =====================================================
// BACKGROUND SYNC
// =====================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
  if (event.tag === 'sync-articles') {
    event.waitUntil(scheduleArticleCache());
  }
});

async function syncPendingActions() {
  // Notify all clients to sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_PENDING_ACTIONS' });
  });
}

async function scheduleArticleCache() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SCHEDULED_CACHE_REFRESH' });
  });
}

// =====================================================
// PUSH NOTIFICATIONS (Optional)
// =====================================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || '新しい記事が公開されました',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: 'qiita-notification',
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '記事を開く' },
      { action: 'dismiss', title: '閉じる' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'QiitaCache', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        const client = clients.find(c => c.url === url && 'focus' in c);
        if (client) return client.focus();
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
    );
  }
});

// =====================================================
// MESSAGE HANDLER (from main thread)
// =====================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_ARTICLE') {
    const { url } = event.data;
    event.waitUntil(
      caches.open('qiitacache-articles').then(cache => cache.add(url))
    );
  }
});
