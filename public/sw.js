const CACHE_NAME = 'powerline-designer-v2';
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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('powerline-designer-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
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

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const networkRequest = fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached || (request.mode === 'navigate' ? cache.match(APP_ENTRY) : undefined));

      return cached || (await networkRequest) || Response.error();
    })()
  );
});
