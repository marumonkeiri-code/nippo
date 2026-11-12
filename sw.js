// 作業日報アプリ：画面を端末に保存して、電波が弱くても開けるようにする
const CACHE = 'nippo-v11';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // kintoneとのやり取りは保存しない
  // 新しい版があれば取りに行き、電波がなければ保存してある画面を出す
  e.respondWith(fetch(e.request, {cache: 'no-cache'}).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});

// チャット広場の通知：届いたら通知を出し、押されたらアプリのチャット広場を開く
self.addEventListener('push', e => {
  e.waitUntil(self.registration.showNotification('丸門アプリ', {
    body: 'チャット広場に新しい書き込みがあります', icon: './icon-192.png', badge: './icon-192.png', tag: 'chat', renotify: true, data: {open: 'chat'}
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.postMessage({open: 'chat'}); return c.focus(); } }
    return self.clients.openWindow('./?open=chat');
  }));
});
