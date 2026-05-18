// Service Worker for Al-Radhi Exchange App
// Version: 3.0 - Enhanced stability and error handling

const CACHE_NAME = 'alradhi-v3';

// 🔸 الملفات الأساسية للتخزين المؤقت
const PRECACHE_URLS = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/manifest.json',
];

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

// 🔸 معالجة الطلبات مع استراتيجية Network First مع Cache Fallback
self.addEventListener('fetch', (event) => {
  // 🔸 تجاهل الطلبات غير GET
  if (event.request.method !== 'GET') return;
  
  // 🔸 تجاهل طلبات API و WebSocket
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.protocol === 'ws:' || url.protocol === 'wss:') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 🔸 تخزين الردود الناجحة مؤقتًا
        if (response.ok && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {
              // تجاهل أخطاء التخزين المؤقت
            });
          });
        }
        return response;
      })
      .catch(() => {
        // 🔸 في حالة فشل الشبكة، حاول الكاش
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 🔸 إذا لم يوجد في الكاش، أعد رد خطأ
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
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
});
