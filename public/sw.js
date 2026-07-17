// Minimal offline shell for Nourish.
// Static assets: cache-first (they're content-hashed). HTML: network-first.
// /api/* is never cached — analysis always needs the network.
const CACHE = 'nourish-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return

  const isShell = event.request.mode === 'navigate' || url.pathname.endsWith('.html')

  const fromNetwork = () =>
    fetch(event.request).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put(event.request, copy))
      return res
    })

  event.respondWith(
    isShell
      ? fromNetwork().catch(() => caches.match(event.request).then((hit) => hit || caches.match('/')))
      : caches.match(event.request).then((hit) => hit || fromNetwork()),
  )
})
