// 作業日報アプリ：画面を端末に保存して、電波が弱くても開けるようにする
const CACHE = 'nippo-v13';
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

// 通知：合図が届いたら文面（title・body・open）をサーバーに取りに行って出す。押されたら open の画面を開く
const API = 'https://script.google.com/macros/s/AKfycbz3XtpAENLFsbaxg5d2NkTzvQRbgPChqxP7kFwWoaKdVQHPw2h0E89fyx4bvzGOTRgV-w/exec';
const ICON = './icon-192.png';
async function pushShow() {
  let list = [];
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (sub) {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch(API, {method: 'POST', body: JSON.stringify({fn: 'pushFetch', args: [sub.endpoint]}), signal: ctl.signal});
      clearTimeout(timer);
      const j = await r.json();
      if (j && j.ok && Array.isArray(j.result)) list = j.result;
    }
  } catch (e) {}
  if (!list.length) {
    // 文面が取れなかったとき：前の通知が出ていればそのまま、なければ決まり文句を出す
    const old = await self.registration.getNotifications();
    if (old.length) { const o = old[old.length - 1]; return self.registration.showNotification(o.title, {body: o.body, icon: ICON, badge: ICON, tag: o.tag, data: o.data, silent: true}); }
    list = [{title: '丸門アプリ', body: '新しいお知らせがあります', open: ''}];
  }
  for (const m of list) {
    const open = String(m.open || '');
    await self.registration.showNotification(String(m.title || '丸門アプリ'), {body: String(m.body || ''), icon: ICON, badge: ICON, tag: open || 'info', renotify: true, data: {open: open}});
  }
}
self.addEventListener('push', e => { e.waitUntil(pushShow()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const open = String((e.notification.data && e.notification.data.open) || '');
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    for (const c of cs) { if ('focus' in c) { if (open) c.postMessage({open: open}); return c.focus(); } }
    return self.clients.openWindow(open ? './?open=' + encodeURIComponent(open) : './');
  }));
});
