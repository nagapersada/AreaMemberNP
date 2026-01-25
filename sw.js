const CACHE = 'dvteam-v25'; // Ganti versi ini TERAKHIR kalinya
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

// Install & Cache Aset Statis (HTML, CSS, JS)
self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(ASSETS))
    );
});

// Hapus Cache Lama saat Update Versi
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
    self.clients.claim();
});

// STRATEGI FETCH BARU (SMART STRATEGY)
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // ATURAN 1: Jika request ke SUPABASE (Database), JANGAN gunakan Cache!
    // Langsung tembak ke internet (Network Only)
    if (url.hostname.includes('supabase.co')) {
        return; // Membiarkan browser menangani request secara normal (live)
    }

    // ATURAN 2: Jika request file Aset (HTML, CSS, JS), gunakan Cache First
    e.respondWith(
        caches.match(e.request).then(res => {
            // Jika ada di cache, pakai cache. Jika tidak, ambil dari internet lalu simpan.
            return res || fetch(e.request).then(newRes => {
                return caches.open(CACHE).then(cache => {
                    cache.put(e.request, newRes.clone());
                    return newRes;
                });
            });
        })
    );
});
