// Service Worker for Al-Radhi Exchange App
// Version: 6.0 - Enhanced offline support + network transition handling

const CACHE_NAME = 'alradhi-v6';

// 🔸 الملفات الأساسية للتخزين المسبق (App Shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// 🔸 صفحة Offline البديلة
const OFFLINE_FALLBACK = '/offline.html';

// 🔸 Timeout للطلبات الشبكية (3 ثواني للتنقل، 5 ثواني للموارد)
const NAVIGATION_TIMEOUT = 3000;
const RESOURCE_TIMEOUT = 5000;

// 🔸 إنشاء استجابة Timeout
function createTimeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Network timeout')), ms);
  });
}

// 🔸 تثبيت Service Worker مع تخزين مؤقت محسن
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // 🔸 تخزين الملفات واحدة تلو الأخرى لمنع فشل الكل
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err => {
              console.warn('Failed to cache:', url, err);
            })
          )
        );
      })
      // 🔸 إنشاء صفحة offline بديلة في الكاش
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => {
        const offlineHTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>الراضي - غير متصل</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; }
    .container { max-width: 400px; }
    .icon { width: 80px; height: 80px; margin: 0 auto 24px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; }
    h1 { font-size: 24px; margin-bottom: 12px; color: #0f172a; }
    p { font-size: 16px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
    button { background: #10b981; color: white; border: none; padding: 12px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; }
    button:active { background: #059669; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>غير متصل بالإنترنت</h1>
    <p>لا يوجد اتصال بالإنترنت حالياً. التطبيق يعمل بالوضع المحلي وبياناتك محفوظة بأمان.</p>
    <button onclick="window.location.reload()">إعادة المحاولة</button>
  </div>
</body>
</html>`;
        return cache.put(OFFLINE_FALLBACK, new Response(offlineHTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }));
      })
      .then(() => self.skipWaiting())
  );
});

// 🔸 تفعيل Service Worker مع تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
      .then(() => {
        // 🔸 إعلام جميع العملاء بتحديث Service Worker
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
          });
        });
      })
  );
});

// 🔸 استراتيجية التخزين المؤقت المحسنة
// - Navigation requests (HTML): Network First مع Timeout + Offline Fallback
// - Static assets (JS/CSS/images): Stale While Revalidate مع Timeout
// - API requests: لا يتم تخزينها مؤقتاً (البيانات محلية عبر Dexie)
self.addEventListener('fetch', (event) => {
  // 🔸 تجاهل الطلبات غير GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 🔸 تجاهل طلبات API و WebSocket
  if (url.pathname.startsWith('/api') || url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // 🔸 تجاهل طلبات chrome-extension وغيرها
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 🔸 طلبات التنقل (HTML pages) - Network First مع Timeout + Offline Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // 🔸 سباق بين الشبكة والـ timeout
      Promise.race([
        fetch(event.request)
          .then((response) => {
            // 🔸 تخزين الرد في الكاش
            if (response.ok) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
            return response;
          })
          .catch(() => {
            // 🔸 في حالة فشل الشبكة، حاول الكاش أولاً
            return caches.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // 🔸 إذا لم يوجد في الكاش، أظهر صفحة offline
              return caches.match(OFFLINE_FALLBACK);
            });
          }),
        // 🔸 Timeout لمنع الانتظار اللانهائي أثناء تغيير الشبكة
        createTimeoutPromise(NAVIGATION_TIMEOUT).catch(() => {
          // 🔸 عند انتهاء المهلة، حاول الكاش
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // 🔸 إذا لم يوجد في الكاش، ننتظر الشبكة أكثر
            return fetch(event.request).catch(() => {
              return caches.match(OFFLINE_FALLBACK);
            });
          });
        })
      ])
    );
    return;
  }

  // 🔸 الملفات الثابتة (JS/CSS/images/fonts) - Stale While Revalidate مع Timeout
  // نقدم الكاش فوراً ثم نحدّث في الخلفية
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 🔸 تحديث في الخلفية مع timeout
      const fetchPromise = Promise.race([
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse), // إذا فشلت الشبكة، لا مشكلة
        // 🔸 Timeout للموارد الثابتة
        createTimeoutPromise(RESOURCE_TIMEOUT).catch(() => cachedResponse)
      ]);

      // 🔸 أعد الكاش فوراً إذا موجود، وإلا انتظر الشبكة
      return cachedResponse || fetchPromise;
    })
  );
});

// 🔸 معالجة رسائل من العميل
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('Cache cleared:', CACHE_NAME);
    });
  }
  // 🔸 طلب تخزين ملفات إضافية (يستخدم بعد تحميل التطبيق)
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME).then((cache) => {
      Promise.allSettled(
        urls.map(url => cache.add(url).catch(() => {}))
      );
    });
  }
});
