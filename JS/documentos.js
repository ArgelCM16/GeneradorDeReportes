// Mis documentos (IndexedDB).
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// MIS DOCUMENTOS (varios documentos guardados en el navegador)
// Se guardan en IndexedDB (no en localStorage, que solo tiene ~5 MB) y
// comprimidos con gzip cuando el navegador lo permite. Hay dos almacenes:
// 'meta' (nombre, fechas, tamaño, palabras... lo único que se lee para la
// lista) y 'data' (el documento completo, que solo se lee al abrirlo).
// El documento abierto sigue en localStorage como siempre; su id está en
// localStorage 'currentDocumentId'.
// ==========================================

const LIBRARY_DB_NAME = 'generador-reportes';
let libraryDbPromise = null;
let libraryUnavailable = false;
let librarySaveTimer = null;
let librarySaveQueue = Promise.resolve();
const libraryLastSaved = new Map(); // id -> JSON guardado (para no reescribir si no cambió)

function isLibraryAvailable() {
    return !libraryUnavailable && typeof indexedDB !== 'undefined';
}

/**
 * Con el autoguardado desactivado no se guarda nada solo en el navegador.
 */
function canKeepInLibrary() {
    return isAutosaveEnabled() && isLibraryAvailable();
}

function openLibraryDb() {
    if (!isLibraryAvailable()) return Promise.reject(new Error('Este navegador no permite guardar varios documentos.'));
    if (!libraryDbPromise) {
        libraryDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(LIBRARY_DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('data')) db.createObjectStore('data', { keyPath: 'id' });
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        }).catch(err => {
            libraryDbPromise = null;
            libraryUnavailable = true;
            throw err;
        });
    }
    return libraryDbPromise;
}

function idbRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Transacción: fn recibe los almacenes y solo debe hacer operaciones de IndexedDB.
 */
async function libraryTransaction(mode, fn) {
    const db = await openLibraryDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['meta', 'data'], mode);
        let result;
        Promise.resolve(fn(tx.objectStore('meta'), tx.objectStore('data'))).then(value => { result = value; }, reject);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Se canceló el guardado'));
    });
}

async function compressText(text) {
    if (typeof CompressionStream === 'undefined') return { encoding: 'none', payload: text, size: text.length };
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return { encoding: 'gzip', payload: buffer, size: buffer.byteLength };
}

async function decompressRecord(record) {
    if (record.encoding === 'gzip') {
        const stream = new Blob([record.payload]).stream().pipeThrough(new DecompressionStream('gzip'));
        return new Response(stream).text();
    }
    return record.payload;
}

function newDocumentId() {
    return 'doc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function getCurrentDocumentId() {
    return localStorage.getItem('currentDocumentId') || '';
}

function setCurrentDocumentId(id) {
    if (id) localStorage.setItem('currentDocumentId', id);
    else localStorage.removeItem('currentDocumentId');
}

function documentHasContent() {
    return reportData.length > 0 || !!getDocumentName();
}

/**
 * Todo lo que forma el documento (lo que se guarda en Mis documentos).
 */
function buildLibraryPayload() {
    return {
        version: '2.4',
        documentName: getDocumentName(),
        reportData,
        headerData: getHeaderData(),
        documentFormat: getDocumentFormat(),
        citationStyle: getCitationStyle(),
        theme: (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '')
    };
}

function scheduleLibrarySave() {
    if (!canKeepInLibrary()) return;
    clearTimeout(librarySaveTimer);
    librarySaveTimer = setTimeout(() => { saveCurrentDocumentToLibrary(); }, 1500);
}

/**
 * Guarda el documento abierto. La "foto" se toma en el momento de la llamada,
 * así que se puede llamar justo antes de cambiar de documento. Devuelve una
 * promesa con el id (o null si no se guardó).
 * @param {{ force?: boolean }} options - force: guardar aunque el autoguardado esté apagado
 */
function saveCurrentDocumentToLibrary(options = {}) {
    clearTimeout(librarySaveTimer);
    if (!isLibraryAvailable() || (!options.force && !isAutosaveEnabled())) return Promise.resolve(null);
    if (!documentHasContent()) return Promise.resolve(null);

    let id = getCurrentDocumentId();
    if (!id) {
        id = newDocumentId();
        setCurrentDocumentId(id);
    }
    const payload = buildLibraryPayload();
    const json = JSON.stringify(payload);
    const firstText = reportData.filter(b => b.type === 'text').map(b => richHtmlToPlainText(getRichHtml(b))).join(' ').replace(/\s+/g, ' ').trim();
    const info = {
        name: payload.documentName || DEFAULT_DOCUMENT_NAME,
        words: countDocumentWords(),
        pages: document.querySelectorAll('#preview-container .preview-page').length || 1,
        blocks: reportData.length,
        theme: payload.theme,
        summary: firstText.slice(0, 140)
    };

    const task = async () => {
        if (libraryLastSaved.get(id) === json) return id;
        // Primera vez en esta sesión: si lo guardado es igual, no se toca (ni su fecha)
        if (!libraryLastSaved.has(id)) {
            const stored = await loadLibraryRecord(id).catch(() => null);
            if (stored && stored.json === json) {
                libraryLastSaved.set(id, json);
                return id;
            }
        }
        const compressed = await compressText(json);
        const now = Date.now();
        await libraryTransaction('readwrite', async (meta, data) => {
            const previous = await idbRequest(meta.get(id));
            meta.put({ id, ...info, createdAt: previous ? previous.createdAt : now, updatedAt: now, size: compressed.size, rawSize: json.length });
            data.put({ id, encoding: compressed.encoding, payload: compressed.payload });
        });
        libraryLastSaved.set(id, json);
        return id;
    };
    const run = librarySaveQueue.then(task, task);
    librarySaveQueue = run.catch(err => { console.error('No se pudo guardar en Mis documentos:', err); });
    return run.catch(() => null);
}

/**
 * Antes de abrir o empezar otro documento: guarda el actual y le da un id
 * nuevo al que sigue.
 */
function startNewLibraryDocument() {
    if (canKeepInLibrary()) saveCurrentDocumentToLibrary();
    clearTimeout(librarySaveTimer);
    setCurrentDocumentId(newDocumentId());
    driveCurrentFileId = null;
    driveCurrentFileName = null;
}

async function loadLibraryRecord(id) {
    const record = await libraryTransaction('readonly', (meta, data) => idbRequest(data.get(id)));
    if (!record) return null;
    const json = await decompressRecord(record);
    return { json, data: JSON.parse(json) };
}

/**
 * Lista (solo los datos de 'meta'), del más reciente al más antiguo.
 */
async function listLibraryDocuments() {
    if (!isLibraryAvailable()) return [];
    const docs = await libraryTransaction('readonly', meta => idbRequest(meta.getAll()));
    return (docs || []).sort((a, b) => b.updatedAt - a.updatedAt);
}

function resetUndoHistory() {
    clearTimeout(undoHistory.timer);
    undoHistory.timer = null;
    undoHistory.past = [];
    undoHistory.future = [];
    undoHistory.current = captureDocumentState();
    updateUndoButtons();
}

/**
 * Pone en pantalla un documento de Mis documentos.
 */
function applyLibraryDocument(id, data) {
    clearTimeout(librarySaveTimer);
    setCurrentDocumentId(id);
    reportData = Array.isArray(data.reportData) ? data.reportData : [];
    setHeaderData(data.headerData || null);
    if (data.citationStyle === 'apa' || data.citationStyle === 'ieee') localStorage.setItem('citationStyle', data.citationStyle);
    setDocumentFormat(data.documentFormat || getDefaultDocumentFormat(), false);
    if (data.theme && getUniversityById(data.theme)) {
        renderThemeSelector();
        changeTheme(data.theme);
    }
    setDocumentName(data.documentName || '');
    driveCurrentFileId = null;
    driveCurrentFileName = null;
    render();
    saveToLocalStorage();
    markDocumentSaved();
    resetUndoHistory();
    libraryLastSaved.set(id, JSON.stringify(buildLibraryPayload()));
    const editor = document.getElementById('editor-container');
    if (editor) editor.scrollTop = 0;
}

async function openLibraryDocument(id) {
    if (id === getCurrentDocumentId()) {
        closeLibraryModal();
        return;
    }
    if (hasUnsavedChanges() && !confirm('Tienes cambios sin guardar en este documento (el autoguardado está desactivado). ¿Abrir otro de todos modos?')) return;
    await saveCurrentDocumentToLibrary();
    const record = await loadLibraryRecord(id);
    if (!record) {
        alert('No se encontró ese documento.');
        return;
    }
    applyLibraryDocument(id, record.data);
    closeLibraryModal();
    if (isMobileLayout()) setMobileView('editor');
}

async function duplicateLibraryDocument(id) {
    await saveCurrentDocumentToLibrary();
    const [record, docs] = await Promise.all([loadLibraryRecord(id), listLibraryDocuments()]);
    if (!record) return null;
    const original = docs.find(d => d.id === id) || {};
    const copyData = { ...record.data, documentName: `${record.data.documentName || DEFAULT_DOCUMENT_NAME} (copia)` };
    const json = JSON.stringify(copyData);
    const compressed = await compressText(json);
    const newId = newDocumentId();
    const now = Date.now();
    await libraryTransaction('readwrite', (meta, data) => {
        meta.put({ ...original, id: newId, name: copyData.documentName, createdAt: now, updatedAt: now, size: compressed.size, rawSize: json.length });
        data.put({ id: newId, encoding: compressed.encoding, payload: compressed.payload });
    });
    return newId;
}

async function renameLibraryDocument(id, newName) {
    const name = String(newName || '').trim().slice(0, 120);
    if (id === getCurrentDocumentId()) {
        setDocumentName(name);
        await saveCurrentDocumentToLibrary();
        return;
    }
    const record = await loadLibraryRecord(id);
    if (!record) return;
    const json = JSON.stringify({ ...record.data, documentName: name });
    const compressed = await compressText(json);
    await libraryTransaction('readwrite', async (meta, data) => {
        const info = await idbRequest(meta.get(id));
        meta.put({ ...info, name: name || DEFAULT_DOCUMENT_NAME, updatedAt: Date.now(), size: compressed.size, rawSize: json.length });
        data.put({ id, encoding: compressed.encoding, payload: compressed.payload });
    });
}

async function deleteLibraryDocument(id) {
    await libraryTransaction('readwrite', (meta, data) => {
        meta.delete(id);
        data.delete(id);
    });
    libraryLastSaved.delete(id);
    if (id === getCurrentDocumentId()) {
        // Se borró el que estaba abierto: queda un documento nuevo en blanco
        clearTimeout(librarySaveTimer);
        setCurrentDocumentId(newDocumentId());
        reportData = [];
        setHeaderData(null);
        setDocumentName('');
        setDocumentFormat(getDefaultDocumentFormat(), false);
        render();
        saveToLocalStorage();
        markDocumentSaved();
        resetUndoHistory();
    }
}

/**
 * El documento como proyecto .json (con la configuración de este navegador).
 */
async function downloadLibraryDocument(id) {
    let data;
    if (id === getCurrentDocumentId()) {
        data = buildProjectData();
    } else {
        const record = await loadLibraryRecord(id);
        if (!record) return;
        data = { ...buildProjectData(), ...record.data, version: '2.1', timestamp: new Date().toISOString() };
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(data.documentName || DEFAULT_DOCUMENT_NAME).replace(/[\\/:*?"<>|]+/g, '-').trim() || DEFAULT_DOCUMENT_NAME}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * Para el respaldo: todos los documentos (sin comprimir, legibles).
 */
async function exportLibraryDocuments() {
    const docs = await listLibraryDocuments();
    const result = [];
    for (const info of docs) {
        const record = await loadLibraryRecord(info.id);
        if (record) result.push({ meta: info, data: record.data });
    }
    return result;
}

/**
 * Del respaldo: agrega (o reemplaza, si es el mismo id) cada documento.
 */
async function importLibraryDocuments(list) {
    let count = 0;
    for (const item of list) {
        if (!item || !item.data || !Array.isArray(item.data.reportData)) continue;
        const id = (item.meta && typeof item.meta.id === 'string' && item.meta.id) || newDocumentId();
        if (id === getCurrentDocumentId()) continue; // el abierto manda
        const json = JSON.stringify(item.data);
        const compressed = await compressText(json);
        const now = Date.now();
        const meta = item.meta || {};
        await libraryTransaction('readwrite', (metaStore, dataStore) => {
            metaStore.put({
                id, name: item.data.documentName || DEFAULT_DOCUMENT_NAME,
                words: Number(meta.words) || 0, pages: Number(meta.pages) || 1, blocks: item.data.reportData.length,
                theme: item.data.theme || '', summary: String(meta.summary || ''),
                createdAt: Number(meta.createdAt) || now, updatedAt: Number(meta.updatedAt) || now,
                size: compressed.size, rawSize: json.length
            });
            dataStore.put({ id, encoding: compressed.encoding, payload: compressed.payload });
        });
        count++;
    }
    return count;
}

function formatBytes(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'hace un momento';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days} días`;
    return new Date(timestamp).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function closeLibraryModal() {
    const overlay = document.getElementById('library-modal-overlay');
    if (overlay) overlay.remove();
}

/**
 * Ventana "Mis documentos".
 */
async function openLibraryModal() {
    closeLibraryModal();
    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay';
    overlay.id = 'library-modal-overlay';
    overlay.innerHTML = `<div class="university-modal library-modal"><h3>📚 Mis documentos</h3><p class="settings-hint">Cargando...</p></div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeLibraryModal(); });
    document.body.appendChild(overlay);

    if (!isLibraryAvailable()) {
        overlay.querySelector('.library-modal').innerHTML = `
            <h3>📚 Mis documentos</h3>
            <p class="settings-hint">Este navegador no permite guardar varios documentos (por ejemplo, en una ventana privada). Usa <strong>Guardar Proyecto</strong> para guardar cada documento como archivo.</p>
            <div class="university-modal-actions"><button type="button" class="action-btn save-btn" onclick="closeLibraryModal()">Cerrar</button></div>`;
        return;
    }

    // Que el navegador no borre los documentos si se queda sin espacio
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

    await saveCurrentDocumentToLibrary();
    let docs = [];
    try {
        docs = await listLibraryDocuments();
    } catch (err) {
        console.error(err);
    }
    let usage = '';
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            if (estimate.usage) usage = formatBytes(estimate.usage);
        }
    } catch (e) { /* sin estimación */ }
    if (!document.getElementById('library-modal-overlay')) return;

    const currentId = getCurrentDocumentId();
    const total = docs.reduce((sum, d) => sum + (d.size || 0), 0);
    const modal = overlay.querySelector('.library-modal');
    const drawList = filter => {
        const q = (filter || '').trim().toLowerCase();
        const visible = docs.filter(d => !q || (d.name || '').toLowerCase().includes(q) || (d.summary || '').toLowerCase().includes(q));
        const list = modal.querySelector('.library-list');
        if (!docs.length) {
            list.innerHTML = '<li class="library-empty">Todavía no tienes documentos guardados. Lo que escribas se guardará aquí solo.</li>';
            return;
        }
        if (!visible.length) {
            list.innerHTML = '<li class="library-empty">Ningún documento coincide con la búsqueda.</li>';
            return;
        }
        list.innerHTML = visible.map(d => `
            <li class="library-item${d.id === currentId ? ' is-current' : ''}" data-id="${escapeAttr(d.id)}">
                <span class="library-icon material-symbols-outlined">description</span>
                <div class="library-info">
                    <div class="library-name">${escapeHtml(d.name || DEFAULT_DOCUMENT_NAME)}${d.id === currentId ? '<span class="library-badge">Abierto</span>' : ''}</div>
                    <div class="library-meta">Editado ${escapeHtml(formatRelativeTime(d.updatedAt))} · ${d.pages || 1} ${d.pages === 1 ? 'página' : 'páginas'} · ${(d.words || 0).toLocaleString('es-MX')} ${d.words === 1 ? 'palabra' : 'palabras'} · ${formatBytes(d.size)}</div>
                    ${d.summary ? `<div class="library-summary">${escapeHtml(d.summary)}</div>` : ''}
                </div>
                <div class="library-actions">
                    ${d.id === currentId ? '' : '<button type="button" class="action-btn save-btn" data-action="open">Abrir</button>'}
                    <button type="button" class="icon-btn" data-action="rename" title="Cambiar nombre"><span class="material-symbols-outlined">edit</span></button>
                    <button type="button" class="icon-btn" data-action="duplicate" title="Duplicar"><span class="material-symbols-outlined">content_copy</span></button>
                    <button type="button" class="icon-btn" data-action="download" title="Descargar como proyecto (.json)"><span class="material-symbols-outlined">download</span></button>
                    <button type="button" class="icon-btn library-delete" data-action="delete" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </li>`).join('');
    };

    modal.innerHTML = `
        <h3>📚 Mis documentos</h3>
        <p class="settings-hint">Tus documentos se guardan solos en este navegador (comprimidos, para que ocupen poco). ${docs.length ? `${docs.length} ${docs.length === 1 ? 'documento' : 'documentos'} · ${formatBytes(total)}${usage ? ` (el sitio usa ${usage} en total)` : ''}.` : ''}</p>
        ${isAutosaveEnabled() ? '' : `<p class="library-warning">El autoguardado está desactivado: este documento no se guarda solo. <button type="button" class="link-btn" data-action="save-now">Guardar ahora en Mis documentos</button></p>`}
        <div class="library-toolbar">
            <input type="search" class="library-search" placeholder="Buscar por nombre o contenido..." aria-label="Buscar documentos">
            <button type="button" class="action-btn save-btn" data-action="new">➕ Nuevo documento</button>
        </div>
        <ul class="library-list"></ul>
        <div class="university-modal-actions">
            <button type="button" class="action-btn" data-action="close">Cerrar</button>
        </div>`;
    drawList('');

    modal.querySelector('.library-search').addEventListener('input', e => drawList(e.target.value));
    modal.addEventListener('click', async e => {
        const button = e.target.closest('[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const item = button.closest('.library-item');
        const id = item ? item.dataset.id : null;
        const doc = docs.find(d => d.id === id);
        try {
            if (action === 'close') closeLibraryModal();
            else if (action === 'new') { closeLibraryModal(); newDocument(); }
            else if (action === 'save-now') { await saveCurrentDocumentToLibrary({ force: true }); openLibraryModal(); }
            else if (action === 'open') await openLibraryDocument(id);
            else if (action === 'duplicate') { await duplicateLibraryDocument(id); openLibraryModal(); }
            else if (action === 'download') await downloadLibraryDocument(id);
            else if (action === 'rename') {
                const name = prompt('Nuevo nombre del documento:', doc ? doc.name : '');
                if (name === null) return;
                await renameLibraryDocument(id, name);
                openLibraryModal();
            } else if (action === 'delete') {
                if (!confirm(`¿Eliminar "${doc ? doc.name : 'este documento'}"? No se puede deshacer.`)) return;
                await deleteLibraryDocument(id);
                openLibraryModal();
            }
        } catch (err) {
            console.error(err);
            alert('No se pudo completar la acción: ' + err.message);
        }
    });
}

/**
 * Aviso breve abajo de la pantalla.
 */
function showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'app-toast';
        toast.setAttribute('role', 'status');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
}

// Al iniciar, el documento abierto queda registrado en Mis documentos
document.addEventListener('DOMContentLoaded', () => {
    if (!getCurrentDocumentId()) setCurrentDocumentId(newDocumentId());
    setTimeout(() => { if (canKeepInLibrary()) saveCurrentDocumentToLibrary(); }, 1200);
});

// Al cambiar de pestaña o cerrar, se guarda lo pendiente
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && librarySaveTimer && canKeepInLibrary()) saveCurrentDocumentToLibrary();
});
