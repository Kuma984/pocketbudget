// Cache the shell only. API writes/reads belong to app sync, never fake JSON from HTML.
const PREFIX = `pocketbudget-shell:${self.registration.scope}:`;
const CACHE = `${PREFIX}v20`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/member-c.css",
  "./css/remixicon.css",
  "./css/remixicon.woff2",
  "./css/remixicon.woff",
  "./css/remixicon.ttf",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./img/cat-meme.jpg",
  "./js/config.js",
  "./js/api.js",
  "./js/db.js",
  "./js/sync.js",
  "./js/app.js",
  "./js/tesseract.min.js",
  "./js/modules/dashboard.js",
  "./js/modules/transactions.js",
  "./js/modules/budget.js",
  "./js/modules/simulation.js",
  "./js/modules/wishlist.js",
  "./js/modules/chat.js",
  "./js/modules/c-draft.js",
  "./js/modules/c-context.js",
  "./js/modules/c-tools.js",
  "./js/modules/system.js",
  "./js/domain/finance.js"
];

// Clean path set for fast lookup regardless of query parameters (e.g. ?v=17)
const CLEAN_ASSET_PATHS = new Set(
  ASSETS.map(path => {
    const u = new URL(path, self.registration.scope);
    return u.pathname;
  })
);

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        ASSETS.map(asset => cache.add(asset).catch(err => console.warn(`Cache add failed: ${asset}`, err)))
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const apiPath = new URL('./api/', self.registration.scope).pathname;

  // Don't intercept non-GET or API calls
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith(apiPath)) {
    return;
  }

  // Navigation requests: Network-first with Cache fallback to ./index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', clone));
          return response;
        })
        .catch(() => caches.open(CACHE).then(cache => cache.match('./index.html') || cache.match('./')))
    );
    return;
  }

  // Static assets: Network-first, cache fallback when offline.
  // Trước đây là cache-first + ignoreSearch: nếu sw.js không đổi tên cache thì trình duyệt đã mở bản cũ
  // tiếp tục nhận CSS/JS cũ dù server đã có file mới và index.html đã đổi ?v=. Network-first vẫn giữ
  // app shell offline nhưng không giữ CSS/JS lỗi thời khi máy chủ truy cập được.
  if (CLEAN_ASSET_PATHS.has(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(url.pathname, clone));
          }
          return response;
        })
        .catch(() => caches.open(CACHE).then(async cache =>
          (await cache.match(request, { ignoreSearch: true })) || cache.match(url.pathname)))
    );
  }
});
