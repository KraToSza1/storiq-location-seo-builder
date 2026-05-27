/**
 * Teardown-only service worker — replaces legacy PWA workers that used navigation preload.
 * Disables preload, clears caches, then unregisters. Does not intercept fetches.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.disable();
        }
      } catch {
        /* ignore — not supported in all browsers */
      }
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
    })(),
  );
});
