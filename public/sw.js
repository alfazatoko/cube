const CACHE_NAME = "kasir-cube-v1.1.0";
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json", "/logo.png"];

// 1. Install: langsung skipWaiting agar SW baru segera aktif
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn("SW precache skip:", url, err);
        }
      }
    })
  );
});

// 2. Activate: hapus cache lama, langsung claim semua tab
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 3. Fetch: Network-first strategy, fallback ke cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  if (event.request.url.includes("firestore.googleapis.com")) return;
  if (event.request.url.includes("firebaseio.com")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// 4. Message: terima perintah SKIP_WAITING dari halaman utama
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
