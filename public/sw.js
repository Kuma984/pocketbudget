// Cache the shell only. API writes/reads belong to app sync, never fake JSON from HTML.
const PREFIX = `pocketbudget-shell:${self.registration.scope}:`;
const CACHE = `${PREFIX}v1`;
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./js/config.js",
  "./js/api.js",
  "./js/db.js",
  "./js/sync.js",
  "./js/app.js",
  "./js/modules/dashboard.js",
  "./js/modules/transactions.js",
  "./js/modules/budget.js",
  "./js/modules/simulation.js",
  "./js/modules/wishlist.js",
  "./js/modules/chat.js",
  "./js/domain/finance.js"
];
const ASSET_URLS = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const apiPath = new URL('./api/', self.registration.scope).pathname;
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith(apiPath)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match('./index.html'))));
    return;
  }
  if (ASSET_URLS.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(hit => hit || fetch(request)));
  }
});
// B03: bump cache version/update ASSETS after changing modules; never clear IndexedDB here.
