// Nombre del documento, autoguardado y "Nuevo".
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// DOCUMENTO: NOMBRE, AUTOGUARDADO Y NUEVO DOCUMENTO
// ============================================================================

const DEFAULT_DOCUMENT_NAME = 'Reporte sin título';

// Con el autoguardado apagado, el encabezado y el nombre viven solo en memoria
// (y en el documento), no en el almacenamiento del navegador.
let headerDataMemory = null;
let documentNameMemory = '';
let savedDocumentSnapshot = null;

function isAutosaveEnabled() {
    return localStorage.getItem('autosaveEnabled') !== '0';
}

/**
 * Datos del encabezado. Con autoguardado se leen del navegador (como siempre);
 * sin él, de la memoria.
 */
function getHeaderData() {
    if (isAutosaveEnabled()) {
        try {
            return JSON.parse(localStorage.getItem('global_header_data'));
        } catch (e) {
            return null;
        }
    }
    return headerDataMemory ? { ...headerDataMemory } : null;
}

function setHeaderData(data) {
    headerDataMemory = data ? { ...data } : null;
    if (!isAutosaveEnabled()) return;
    if (data) localStorage.setItem('global_header_data', JSON.stringify(data));
    else localStorage.removeItem('global_header_data');
}

// ---------- Nombre del documento ----------

function getDocumentName() {
    return (documentNameMemory || '').trim();
}

/**
 * El nombre se usa para los archivos (PDF, TXT, JSON y Drive) y como título de
 * la pestaña; el navegador usa ese título como nombre del PDF al imprimir.
 */
function setDocumentName(name) {
    documentNameMemory = (name || '').slice(0, 120);
    if (isAutosaveEnabled()) localStorage.setItem('documentName', documentNameMemory);

    const input = document.getElementById('document-name');
    if (input && input.value !== documentNameMemory) input.value = documentNameMemory;
    document.title = getDocumentName() || DEFAULT_DOCUMENT_NAME;
    updateAutosaveUI();
    scheduleLibrarySave();
}

/**
 * Nombre del documento sin caracteres que no se permiten en archivos.
 */
function getSafeFileName() {
    const clean = (getDocumentName() || DEFAULT_DOCUMENT_NAME)
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    return clean || DEFAULT_DOCUMENT_NAME;
}

// ---------- Cambios sin guardar ----------

function getDocumentSnapshot() {
    return JSON.stringify({ reportData, header: getHeaderData(), name: getDocumentName(), format: getDocumentFormat() });
}

function markDocumentSaved() {
    savedDocumentSnapshot = getDocumentSnapshot();
    updateAutosaveUI();
}

function hasUnsavedChanges() {
    return !isAutosaveEnabled() && savedDocumentSnapshot !== null && getDocumentSnapshot() !== savedDocumentSnapshot;
}

// ---------- Interruptor de autoguardado ----------

function toggleAutosave() {
    setAutosaveEnabled(!isAutosaveEnabled());
}

function setAutosaveEnabled(enabled) {
    if (enabled) {
        localStorage.setItem('autosaveEnabled', '1');
        // Guardar de inmediato lo que haya en pantalla
        setHeaderData(headerDataMemory);
        localStorage.setItem('documentName', documentNameMemory);
        localStorage.setItem('documentFormat', JSON.stringify(getDocumentFormat()));
        saveToLocalStorage();
        saveCurrentDocumentToLibrary();
    } else {
        // Lo último guardado pasa a memoria y desde aquí ya no se escribe
        try {
            headerDataMemory = JSON.parse(localStorage.getItem('global_header_data'));
        } catch (e) {
            headerDataMemory = null;
        }
        localStorage.setItem('autosaveEnabled', '0');
        markDocumentSaved();
    }
    renderPreview();
    updateAutosaveUI();
}

function updateAutosaveUI() {
    const pill = document.getElementById('autosave-toggle');
    if (!pill) return;
    const on = isAutosaveEnabled();
    const dirty = hasUnsavedChanges();

    pill.classList.toggle('is-off', !on);
    pill.classList.toggle('is-dirty', dirty);
    pill.textContent = on
        ? 'Guardado automáticamente'
        : (dirty ? 'Cambios sin guardar' : 'Autoguardado desactivado');
    pill.title = on
        ? 'Clic para desactivar el autoguardado'
        : 'Clic para activar el autoguardado (tus cambios se guardan en este navegador)';
    pill.setAttribute('aria-pressed', on ? 'true' : 'false');
}

// ---------- Nuevo documento ----------

function newDocument() {
    // Con autoguardado, el documento actual se queda en "Mis documentos": no se pierde nada
    const keepsCopy = canKeepInLibrary() && documentHasContent();
    if (!keepsCopy) {
        const message = '¿Borrar todo el documento y empezar uno nuevo?\n\n' +
            'Se borran todos los bloques, los datos del encabezado y el nombre del documento.\n' +
            'Tus universidades, materias y profesores se conservan.' +
            (hasUnsavedChanges() ? '\n\n⚠️ Tienes cambios sin guardar.' : '');
        if (documentHasContent() && !confirm(message)) return;
    }
    startNewLibraryDocument();

    reportData = [];
    setHeaderData(null);
    setDocumentName('');
    setDocumentFormat(getDefaultDocumentFormat(), false);
    driveCurrentFileId = null;
    driveCurrentFileName = null;
    render();
    saveToLocalStorage();
    markDocumentSaved();
    resetUndoHistory();
    if (keepsCopy) showToast('El documento anterior quedó guardado en Mis documentos');

    const editor = document.getElementById('editor-container');
    if (editor) editor.scrollTop = 0;
    const input = document.getElementById('document-name');
    if (input) input.focus();
}

// ---------- Inicio ----------

document.addEventListener('DOMContentLoaded', function() {
    try {
        headerDataMemory = JSON.parse(localStorage.getItem('global_header_data'));
    } catch (e) {
        headerDataMemory = null;
    }
    setDocumentName(localStorage.getItem('documentName') || '');
    let storedFormat = null;
    try { storedFormat = JSON.parse(localStorage.getItem('documentFormat')); } catch (e) { storedFormat = null; }
    // Se vuelve a paginar: el documento ya se dibujó con el formato predeterminado
    setDocumentFormat(storedFormat || getDefaultDocumentFormat(), reportData.length > 0);
    markDocumentSaved();
});

// Sin autoguardado, avisar antes de cerrar si hay cambios sin guardar
window.addEventListener('beforeunload', event => {
    if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '';
    }
});
