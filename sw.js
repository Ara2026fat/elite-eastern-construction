/* ═══════════════════════════════════════════════════════════════
   EEC — عامل الخدمة
   الوسيط يقف أمام العقار حيث الشبكة ضعيفة أو معدومة. البيانات
   أصلًا في جهازه، فالناقص هو التطبيق نفسه لا بياناته.

   الاستراتيجية: الشبكة أولًا، والذاكرة عند تعذّرها.
   وهذا مقصود: تحديث يُرفع من الجوال يجب أن يصل فورًا، ولا يبقى
   المكتب على نسخة قديمة لا يعرف كيف يتخلّص منها.
   ═══════════════════════════════════════════════════════════════ */
var CACHE = 'eec-v1';

self.addEventListener('install', function (e) {
  self.skipWaiting();                       /* النسخة الجديدة لا تنتظر إغلاق التبويبات */
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(['./', './index.html']).catch(function () { /* أول تحميل قد يفشل، ولا بأس */ });
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);   /* لا تتراكم النسخ القديمة */
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* لا نتدخّل في طلبات خارجية */

  e.respondWith(
    fetch(req).then(function (res) {
      /* نسخة صالحة تُحفظ للمرة القادمة التي تنقطع فيها الشبكة */
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        /* تنقّل داخل التطبيق بلا شبكة: أعِد الصفحة نفسها */
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});

/* منفذ هروب: الصفحة تطلب مسح الذاكرة إن علق المكتب على نسخة */
self.addEventListener('message', function (e) {
  if (e.data === 'eec:flush') {
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.registration.unregister();
    }).then(function () {
      if (e.source && e.source.postMessage) e.source.postMessage('eec:flushed');
    });
  }
});
