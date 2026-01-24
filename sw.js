const CACHE = 'dvteam-v30'; // VERSI DIPERBARUI (Wajib diganti setiap update kode)
const ASSETS = [
    './', 
    'index.html', 
    'dashboard.html', 
    'list.html', 
    'network.html', 
    'style.css', 
    'script.js', 
    'icon.png',
    'manifest.json'
];

// Install Service Worker & Cache Assets
self.addEventListener('install', e => {
    self.skipWaiting(); // Paksa SW baru segera aktif
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(ASSETS))
    );
});

// Activate & Hapus Cache Lama
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE) return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim(); // Segera ambil alih kontrol halaman
});

// Fetch Assets (Network First strategy untuk data penting, Cache First untuk aset statis)
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(res => {
            // Jika ada di cache, pakai itu. Tapi di background, coba update cache.
            return res || fetch(e.request).then(newRes => {
                return caches.open(CACHE).then(cache => {
                    cache.put(e.request, newRes.clone());
                    return newRes;
                });
            });
        })
    );
});
