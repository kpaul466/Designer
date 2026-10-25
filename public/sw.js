const CACHE_NAME = 'powerline-designer-v4';
const APP_SCOPE = new URL(self.registration.scope);
const APP_ENTRY = new URL('./', APP_SCOPE).href;
const MANIFEST_URL = new URL('manifest.webmanifest', APP_SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const response = await fetch(APP_ENTRY);
      if (!response.ok) throw new Error(`Unable to cache app shell: ${response.status}`);
      const html = await response.clone().text();
      await cache.put(APP_ENTRY, response);

      const assetPaths = [
        ...Array.from(html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g), (match) => match[1]),
        'manifest.webmanifest',
        'powerline-icon.svg',
      ];
      const scriptQueue = assetPaths
        .filter((path) => path.endsWith('.js'))
        .map((path) => new URL(path, APP_SCOPE));
      await cache.addAll(assetPaths.map((path) => new URL(path, APP_SCOPE).href));

      const cachedScripts = new Set();
      while (scriptQueue.length > 0) {
        const scriptUrl = scriptQueue.pop();
        if (
          !scriptUrl ||
          scriptUrl.origin !== APP_SCOPE.origin ||
          !scriptUrl.pathname.startsWith(APP_SCOPE.pathname) ||
          cachedScripts.has(scriptUrl.href)
        ) {
          continue;
        }

        cachedScripts.add(scriptUrl.href);
        const scriptResponse = await cache.match(scriptUrl.href) || await fetch(scriptUrl.href);
        if (!scriptResponse.ok) throw new Error(`Unable to cache app script: ${scriptUrl.href}`);
        await cache.put(scriptUrl.href, scriptResponse.clone());
        const scriptText = await scriptResponse.text();
        for (const match of scriptText.matchAll(/(?:from|import)\s*(?:\(\s*)?["']([^"']+\.js(?:\?[^"']*)?)["']/g)) {
          scriptQueue.push(new URL(match[1], scriptUrl));
        }
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('powerline-designer-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({ type: 'SW_ACTIVATED', cacheName: CACHE_NAME });
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(APP_SCOPE.pathname)
  ) {
    return;
  }

  // version.json must NEVER be cached by SW so clients detect new updates in real time
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => Response.error())
    );
    return;
  }

  // The 34 MB West Bengal place dataset gets stale-while-revalidate: repeat
  // sessions load instantly from the cache (and work offline) while a
  // background refresh keeps it current. Network-first would re-download the
  // whole asset on every session start.
  if (/westbengal_geo_data/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok) void cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);
        if (cached) {
          void refresh;
          return cached;
        }
        const fresh = await refresh;
        return fresh || Response.error();
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      // Network-first so a newly deployed build (and search/API fixes) reach
      // every machine. Fall back to the cached shell when offline.
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          void cache.put(request, response.clone());
        }
        return response;
      } catch {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const appEntry = await cache.match(APP_ENTRY);
          if (appEntry) return appEntry;
        }
        return Response.error();
      }
    })()
  );
});
