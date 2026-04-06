const CACHE_NAME = 'study-manager-v3'; // 버전을 올려 브라우저 캐시 갱신을 유도합니다.
const urlsToCache = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  // 새로운 서비스 워커가 설치될 때 이전 캐시를 무시하고 즉시 활성화되도록 설정
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  // 이전 버전의 캐시 삭제
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시 반환, 없으면 네트워크 요청
        return response || fetch(event.request);
      }).catch(() => {
        // 네트워크 연결이 없고 캐시에도 없을 때의 처리
      })
  );
});