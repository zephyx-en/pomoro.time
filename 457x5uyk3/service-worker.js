const CACHE_NAME = 'meditation-timer-offline-v2';
const PAGE_URL = new URL('index.html', self.registration.scope).href;
const LEGAL_URL = new URL('legal.html', self.registration.scope).href;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll([PAGE_URL, LEGAL_URL]))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => {
                    const cachedPage = await caches.match(request);
                    if (cachedPage) return cachedPage;
                    const fallbackUrl = new URL(request.url).pathname.endsWith('/legal.html')
                        ? LEGAL_URL
                        : PAGE_URL;
                    return caches.match(fallbackUrl);
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => cached || fetch(request).catch(() => caches.match(PAGE_URL)))
    );
});