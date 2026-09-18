// Service worker mínimo: existe para o Android instalar o controle como app.
// Não guarda nada em cache, porque o controle precisa falar com o PC em tempo real.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
