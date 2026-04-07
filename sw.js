// sw.js

const CACHE_NAME = 'med-manager-cache-v2'; // 버전 업!
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/app.js',
  '/js/state.js',
  '/js/database.js',
  '/js/ui.js'
  // 만약 css/style.css 등 추가한 파일이 있다면 여기에 쉼표로 구분해서 넣어주세요.
];

// 1. 서비스 워커 설치 시 파일들 캐싱 (저장)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 2. 활성화 시 예전 버전의 캐시 데이터 삭제 (용량 확보)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 오프라인이거나 캐시된 파일이 있을 때 네트워크 대신 캐시에서 먼저 불러오기 (속도 최적화)
self.addEventListener('fetch', event => {
  // Firebase 통신이나 외부 API(Tesseract OCR 등)는 캐싱하지 않고 네트워크를 타게 둡니다.
  if (event.request.url.startsWith('http') && !event.request.url.includes('tesseract') && !event.request.url.includes('firestore')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response; // 캐시에 있으면 캐시 반환
          }
          return fetch(event.request); // 없으면 네트워크에 요청
        })
    );
  }
});
