const CACHE_NAME = "taharoot-v2-shell-v3";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/content.js",
  "./js/sfx.js",
  "./js/typewriter.js",
  "./js/app.js",
  "./icon.svg",
  "../assets/desk.jpg",
  "../assets/witnesses/witness1.jpg",
  "../assets/witnesses/witness2.jpg",
  "../assets/witnesses/witness3.jpg",
  "../assets/witnesses/witness4.jpg",
  "../assets/witnesses/witness5.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Let browser handle video byte-range streaming natively (crucial for iOS Safari).
  if (req.headers.has("range") || req.url.endsWith(".mp4")) return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first so GitHub Pages pushes take effect immediately, with offline cache fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});

