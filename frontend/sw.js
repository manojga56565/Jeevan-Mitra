const CACHE_NAME = "jeevan-mitra-shell-v1";
const SHELL_FILES = [
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("jeevan-mitra-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never cache API responses, uploaded files, cross-origin resources or
  // authenticated/private application data.
  if (url.origin !== self.location.origin ||
      url.pathname.includes("/api/") ||
      url.pathname.includes("/uploads/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await caches.match("./index.html");
      return cached || Response.error();
    }));
    return;
  }

  if (SHELL_FILES.some(path => url.pathname.endsWith(path.replace("./", "")))) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});