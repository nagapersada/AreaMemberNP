{
type: "file",
fileName: "sw.js",
fullContent: `// UPDATE VERSION: v102 (Fix Macet)
const CACHE = 'dvteam-v102-fix-login';
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

self.addEventListener('install', e => {
    self.skipWaiting(); 
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(k => {
                if (k !== CACHE) {
                    return caches.delete(k);
                }
            })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request)
            .catch(() => caches.match(e.request))
    );
});`
}
