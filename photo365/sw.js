// Service worker: makes Photo365 installable, works offline for pages you've
// already seen, and receives photos shared from the phone's share sheet.
var VERSION = 'p365-v5';
var SHELL = ['./', 'index.html', 'add.html', 'app.js', 'admin.js', 'common.js', 'config.js', 'p365.css', '../assets/site.css',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== 'p365-img' && k !== 'p365-share'; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);

  // Share target: Android "Share → Photo365"
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async function () {
      var form = await req.formData(), f = form.get('photo');
      if (f && f.size) {
        var c = await caches.open('p365-share');
        await c.put(new URL('shared-photo', self.registration.scope).href,
          new Response(f, { headers: { 'content-type': f.type || 'image/jpeg', 'x-name': f.name || 'shared.jpg' } }));
      }
      return Response.redirect(new URL('add.html?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;

  // Photos: cache first (they never change at a given URL)
  if (url.hostname === 'res.cloudinary.com') {
    e.respondWith(caches.open('p365-img').then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; });
      });
    }));
    return;
  }

  // Own pages and data: network first, cached copy when offline
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok && !url.pathname.endsWith('entries.json')) {
        var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
    }));
  }
});
