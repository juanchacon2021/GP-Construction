/* Cache básico para acelerar cargas repetidas.
   Nota: requiere servir el sitio por http(s) o localhost. */

const CACHE_VERSION = 'gp-construction-v3-2026-05-06';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const MAX_RUNTIME_ENTRIES = 120;
const MAX_IMAGE_ENTRIES = 90;

const CORE_ASSETS = [
	'./',
	'./index.html',
	'./about.html',
	'./services.html',
	'./residential.html',
	'./contact.html',
	'./galeria-arqui.html',
	'./galeria-plano.html',
	'./galeria-render.html',

	'./style.css',
	'./style-about.css',
	'./style-services.css',
	'./style-residential.css',
	'./style-contact.css',
	'./style-gallery.css',
	'./style-arqui.css',

	'./gotop.js',
	'./hero-video.js',
	'./lazy-videos.js',
	'./sw-register.js',

	'./assets/img/logo.png',
	'./assets/img/logoblanco.png',
	'./assets/img/logonegro.png',
	'./assets/img/icon/ico.png',

	'./assets/opt/img/logo.webp',
	'./assets/opt/img/logoblanco.webp',
	'./assets/opt/img/logonegro.webp',
	'./assets/opt/img/prueba.webp',
	'./assets/opt/img/icon/fb.webp',
	'./assets/opt/img/icon/ig.webp',
	'./assets/opt/img/icon/x.webp',
	'./assets/opt/img/icon/vision.webp',
	'./assets/opt/img/icon/mision.webp',
	'./assets/opt/img/icon/office.webp',
	'./assets/opt/img/icon/email.webp',
	'./assets/opt/img/icon/tlf.webp',

	'./assets/font/meltow.ttf',
	'./assets/font/devant.ttf',
	'./assets/font/vancouver.ttf',
	'./assets/font/eastmanmedium.otf'
];

async function trimCache(cacheName, maxEntries) {
	try {
		const cache = await caches.open(cacheName);
		const keys = await cache.keys();
		if (keys.length <= maxEntries) return;
		// Borrar los más antiguos (orden de inserción).
		const toDelete = keys.slice(0, keys.length - maxEntries);
		await Promise.all(toDelete.map((req) => cache.delete(req)));
	} catch {
		// silencioso
	}
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CORE_CACHE).then((cache) => {
			return cache.addAll(CORE_ASSETS);
		})
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CORE_CACHE && key !== RUNTIME_CACHE)
					.map((key) => caches.delete(key))
			)
		)
	);
	self.clients.claim();
});

async function networkFirst(request) {
	const cache = await caches.open(RUNTIME_CACHE);
	try {
		const response = await fetch(request);
		cache.put(request, response.clone());
		trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
		return response;
	} catch {
		const cached = await cache.match(request);
		return cached || caches.match(request);
	}
}

async function cacheFirst(request) {
	const cache = await caches.open(RUNTIME_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	cache.put(request, response.clone());
	trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
	return response;
}

async function staleWhileRevalidate(request) {
	const cache = await caches.open(RUNTIME_CACHE);
	const cached = await cache.match(request);
	const fetchPromise = fetch(request)
		.then((response) => {
			cache.put(request, response.clone());
			trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
			return response;
		})
		.catch(() => undefined);

	return cached || (await fetchPromise) || fetch(request);
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Evitar cachear videos (pueden ser muy pesados).
	if (request.destination === 'video') {
		return;
	}

	// Navegaciones HTML: preferir red para contenido fresco.
	if (request.mode === 'navigate' || request.destination === 'document') {
		event.respondWith(networkFirst(request));
		return;
	}

	// Imágenes: cache-first (gran impacto en galerías).
	if (request.destination === 'image') {
		event.respondWith(
			(async () => {
				const res = await cacheFirst(request);
				trimCache(RUNTIME_CACHE, MAX_IMAGE_ENTRIES);
				return res;
			})()
		);
		return;
	}

	// CSS/JS/Fuentes: stale-while-revalidate.
	if (
		request.destination === 'style' ||
		request.destination === 'script' ||
		request.destination === 'font'
	) {
		event.respondWith(staleWhileRevalidate(request));
		return;
	}

	// Otros: dejar pasar.
});
