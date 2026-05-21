const CACHE_NAME = "storiq-location-seo-builder-v3";

const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest"];

const isSameOrigin = (url) => url.origin === self.location.origin;

const isStaticAsset = (pathname) =>
  pathname.startsWith("/assets/") ||
  pathname.startsWith("/brand/") ||
  pathname.startsWith("/media-library/") ||
  /\.(js|css|png|jpe?g|svg|webp|ico|woff2?|webmanifest)$/i.test(pathname);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (!isSameOrigin(url)) {
    return;
  }

  // Hashed Vite bundles and images: always network — never serve index.html for assets.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // SPA navigations: network first, offline fallback to cached shell.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html").then((cached) => cached || fetch(event.request))),
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
