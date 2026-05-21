/**
 * Teardown-only service worker — replaces broken cached versions (v1/v2).
 * Clears all caches, unregisters itself, and does NOT intercept fetches.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister()),
  );
});
