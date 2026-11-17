// =============================================================
// sw.js — "service worker": guarda o jogo no celular para abrir
// rápido e funcionar SEM INTERNET depois da primeira vez.
// Ao lançar uma versão nova, aumente o número em VERSAO.
// =============================================================
const VERSAO = 'nemesis-v1';
const ARQUIVOS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'src/audio.js',
  'src/bosses.js',
  'src/bosses2.js',
  'src/cine_story.js',
  'src/cinematic.js',
  'src/combat.js',
  'src/enemies.js',
  'src/graphics.js',
  'src/levelBuilder.js',
  'src/main.js',
  'src/menus.js',
  'src/models.js',
  'src/monsters.js',
  'src/phases.js',
  'src/player.js',
  'src/powers.js',
  'src/rig.js',
  'src/story.js',
  'src/touch.js',
  'src/ui.js',
  'src/utils.js',
  'assets/Barbarian.js',
  'assets/Knight.js',
  'assets/Rogue_Hooded.js',
  'assets/Skeleton_Rogue.js',
  'assets/Skeleton_Warrior.js',
  'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/utils/SkeletonUtils.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// primeiro tenta o que está guardado; se não tiver, busca na internet e guarda
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('cdn.jsdelivr.net'))) {
      const copy = res.clone(); caches.open(VERSAO).then(c => c.put(e.request, copy));
    }
    return res;
  })));
});
