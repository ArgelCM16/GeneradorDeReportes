/**
 * Service worker: hace que la app se pueda instalar y funcione sin internet.
 *
 * Solo guarda los archivos de la propia app (HTML, CSS, JS, íconos) y las
 * fuentes de Google. Nunca guarda datos del usuario (esos viven en el
 * localStorage del navegador) ni las llamadas a Google Drive.
 *
 * IMPORTANTE: VERSION debe ser el mismo número que el ?v= de index.html.
 * Al cambiarlo se descarga todo de nuevo y se borra la versión anterior.
 * Los archivos de JS/ y CSS/ se leen de index.html al instalar (no hay que
 * repetir aquí la lista).
 */
const VERSION = '2.5.2';
const CACHE_NAME = `reportes-${VERSION}`;

const APP_FILES = [
    './',
    'index.html',
    `CSS/style.css?v=${VERSION}`,
    `CSS/redesign.css?v=${VERSION}`,
    `CSS/legal.css?v=${VERSION}`,
    'terminos.html',
    'privacidad.html',
    'manifest.json',
    `ASSETS/favicon.png?v=${VERSION}`,
    'ASSETS/icon-192.png',
    'ASSETS/icon-512.png',
    'ASSETS/apple-touch-icon.png'
];

// Sitios externos que sí se guardan (fuentes e íconos)
const CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/**
 * Los <script src="JS/..."> y <link href="CSS/..."> de index.html.
 */
async function filesFromIndex() {
    try {
        const html = await (await fetch('index.html', { cache: 'no-store' })).text();
        return Array.from(html.matchAll(/(?:src|href)="((?:JS|CSS)\/[^"]+)"/g), m => m[1]);
    } catch (err) {
        return [];
    }
}

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const files = Array.from(new Set([...APP_FILES, ...(await filesFromIndex())]));
        // Uno por uno: si falta un archivo, los demás se guardan igual
        await Promise.all(files.map(url => cache.add(url).catch(() => {})));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key.startsWith('reportes-') && key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;
    // Lo demás (Google Drive, inicio de sesión, logos de otros sitios) va directo a internet
    if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request, event));
    }
});

/**
 * Páginas: primero internet (para tener siempre la versión nueva); sin
 * conexión, la copia guardada.
 */
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        return (await cache.match(request, { ignoreSearch: true }))
            || (await cache.match('index.html'))
            || Response.error();
    }
}

/**
 * Archivos: se responde al instante con la copia guardada y se actualiza en
 * segundo plano.
 */
async function staleWhileRevalidate(request, event) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const update = fetch(request)
        .then(response => {
            if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
            return response;
        })
        .catch(() => null);
    if (cached) {
        event.waitUntil(update);
        return cached;
    }
    return (await update) || Response.error();
}
