/* Simple scoped SW for LandenLifts */
const CACHE = "landenlifts-v1";
const ASSETS = [
    "/landenapps/landenlifts/",
    "/landenapps/landenlifts/manifest.webmanifest"
    // NOTE: you can add specific built assets later once you confirm exact filenames
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // only handle requests inside LandenLifts scope
    if (!url.pathname.startsWith("/landenapps/landenlifts/")) return;

    // network-first for API calls (don’t cache Supabase requests)
    if (url.hostname.includes("supabase") || url.pathname.includes("/rest/")) {
        return;
    }

    // cache-first for static stuff
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((res) => {
                const copy = res.clone();
                caches.open(CACHE).then((cache) => cache.put(event.request, copy));
                return res;
            });
        })
    );
});
