const CACHE = 'dfg-v6';
const ASSETS = [
  '/dfg-finance1/daniel_finance_v6.html',
  '/dfg-finance1/manifest.json',
  '/dfg-finance1/icon-192.png',
  '/dfg-finance1/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if(e.request.url.includes('supabase.co') || e.request.url.includes('fonts.googleapis')) return;
  e.respondWith(
    fetch(e.request)
      .then(r=>{ if(r.ok&&e.request.method==='GET'){const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));} return r; })
      .catch(()=>caches.match(e.request))
  );
});
