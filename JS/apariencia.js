// Modo oscuro y app instalable (PWA).
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// MODO OSCURO (solo la interfaz; las hojas del documento siguen blancas)
// ==========================================

function getColorScheme() {
    const value = localStorage.getItem('colorScheme');
    return value === 'dark' || value === 'light' ? value : 'auto';
}

function isDarkMode() {
    const scheme = getColorScheme();
    return scheme === 'dark' || (scheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function applyColorScheme() {
    const dark = isDarkMode();
    document.body.classList.toggle('theme-dark', dark);
    const icon = document.getElementById('color-scheme-icon');
    if (icon) icon.textContent = dark ? 'light_mode' : 'dark_mode';
    const btn = document.getElementById('color-scheme-btn');
    if (btn) btn.title = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b1120' : '#0f172a');
}

function toggleColorScheme() {
    localStorage.setItem('colorScheme', isDarkMode() ? 'light' : 'dark');
    applyColorScheme();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getColorScheme() === 'auto') applyColorScheme();
});

document.addEventListener('DOMContentLoaded', applyColorScheme);

// ==========================================
// APP INSTALABLE (PWA) Y SIN INTERNET
// ==========================================

let deferredInstallPrompt = null;

function registerServiceWorker() {
    // El service worker solo funciona sirviendo la página por http(s)
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('No se pudo registrar el service worker:', err));
}

window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const btn = document.getElementById('install-app-btn');
    if (btn) btn.style.display = '';
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const btn = document.getElementById('install-app-btn');
    if (btn) btn.style.display = 'none';
});

function installApp() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(() => {
        deferredInstallPrompt = null;
        const btn = document.getElementById('install-app-btn');
        if (btn) btn.style.display = 'none';
    });
}

window.addEventListener('load', registerServiceWorker);
