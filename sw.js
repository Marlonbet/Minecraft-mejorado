// Mini Minecraft v9 — service worker para modo offline.
// Solo archivos de texto de la app (index, css, js, manifest), con
// caché versionada: al publicar una versión nueva se cambia el nombre
// y la caché vieja se borra al activar el nuevo worker.
const CACHE = 'minimc-v9';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/main.js',
  './js/config.js',
  './js/textures.js',
  './js/world.js',
  './js/chunks.js',
  './js/player.js',
  './js/input.js',
  './js/hud.js',
  './js/raycast.js',
  './js/settings.js',
  './js/entities.js',
  './js/villagers.js',
  './js/minimap.js',
  './js/audio.js',
  './js/particles.js',
  './js/sky.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request))
  );
});
