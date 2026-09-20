// Guarda o app no celular para ele abrir mesmo sem internet (só com o Wi-Fi da igreja).
// Busca a versão nova quando tem internet; sem internet usa a cópia guardada.
const CACHE = 'bible-controle-v3';
const ARQUIVOS = ['/controle/', '/controle/app.js', '/controle/icones.js', '/controle/controle.css', '/controle/manifest.webmanifest',
  '/controle/bible_acf.js', '/controle/rascunho.js',
  '/icon.png', '/icon-512.png', '/logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(r => r || (req.mode === 'navigate' ? caches.match('/controle/') : Response.error())))
  );
});
