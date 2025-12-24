const CACHE_NAME = 'dvteam-v101-SUPER-UPDATE'; // Ganti nama agar browser download ulang
const ASSETS = [
    './',
    'index.html',
    'dashboard.html',
    'list.html',
    'network.html',
    'style.css',
    'script.js',
    'icon.png'
];

// 1. Install & Paksa Aktif
self.addEventListener('install', event => {
    self.skipWaiting(); // Paksa SW baru langsung aktif
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

// 2. Hapus Cache Lama (Pembersihan Total)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('Menghapus cache lama:', key);
                    return caches.delete(key);
                }
            })
        ))
    );
    self.clients.claim(); // Ambil alih kontrol halaman segera
});

// 3. Strategi: Network First (Coba Internet Dulu, Baru Cache)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Jika berhasil ambil dari internet, simpan copy barunya ke cache
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request)) // Kalau offline, baru pakai cache
    );
});
