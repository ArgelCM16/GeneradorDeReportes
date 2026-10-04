// Deshacer y rehacer.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// DESHACER / REHACER
// Se guarda una "foto" del documento (bloques, encabezado y nombre) cada vez
// que cambia, agrupando lo que se escribe seguido. Ctrl+Z / Ctrl+Y fuera de
// un campo de texto (dentro de un campo, el navegador deshace lo escrito).
// ==========================================

const HISTORY_LIMIT = 60;
// Las "fotos" incluyen las imágenes: se limita el total para no gastar demasiada memoria
const HISTORY_MAX_CHARS = 25000000;
const undoHistory = { past: [], future: [], current: null, timer: null, ignoreUntil: 0 };

function captureDocumentState() {
    return JSON.stringify({ r: reportData, h: getHeaderData(), n: getDocumentName(), f: getDocumentFormat() });
}

function scheduleHistoryRecord() {
    clearTimeout(undoHistory.timer);
    undoHistory.timer = setTimeout(recordHistory, 400);
}

function recordHistory() {
    clearTimeout(undoHistory.timer);
    undoHistory.timer = null;
    const state = captureDocumentState();
    if (Date.now() < undoHistory.ignoreUntil || undoHistory.current === null) {
        // Justo después de deshacer/rehacer (o al iniciar) solo se toma la referencia
        undoHistory.current = state;
        updateUndoButtons();
        return;
    }
    if (state === undoHistory.current) return;
    undoHistory.past.push(undoHistory.current);
    if (undoHistory.past.length > HISTORY_LIMIT) undoHistory.past.shift();
    let total = undoHistory.past.reduce((sum, snap) => sum + snap.length, 0);
    while (undoHistory.past.length > 1 && total > HISTORY_MAX_CHARS) total -= undoHistory.past.shift().length;
    undoHistory.current = state;
    undoHistory.future = [];
    updateUndoButtons();
}

function applyDocumentState(state) {
    const data = JSON.parse(state);
    undoHistory.ignoreUntil = Date.now() + 700;
    reportData = data.r || [];
    setHeaderData(data.h || null);
    setDocumentName(data.n || '');
    setDocumentFormat(data.f || null, false);
    render();
    undoHistory.current = state;
    updateUndoButtons();
}

function undo() {
    if (undoHistory.timer) recordHistory();
    if (!undoHistory.past.length) return;
    undoHistory.future.push(undoHistory.current);
    applyDocumentState(undoHistory.past.pop());
}

function redo() {
    if (undoHistory.timer) recordHistory();
    if (!undoHistory.future.length) return;
    undoHistory.past.push(undoHistory.current);
    applyDocumentState(undoHistory.future.pop());
}

function updateUndoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = !undoHistory.past.length;
    if (redoBtn) redoBtn.disabled = !undoHistory.future.length;
}

function isTextEditingTarget(el) {
    if (!el) return false;
    if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    return !['checkbox', 'radio', 'file', 'button', 'submit', 'color', 'range'].includes(el.type);
}

document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const isUndo = key === 'z' && !event.shiftKey;
    const isRedo = key === 'y' || (key === 'z' && event.shiftKey);
    if (!isUndo && !isRedo) return;
    if (isTextEditingTarget(document.activeElement)) return; // deshacer del propio campo
    if (document.querySelector('.university-modal-overlay')) return; // hay una ventana abierta
    event.preventDefault();
    if (isUndo) undo(); else redo();
});

document.addEventListener('DOMContentLoaded', () => {
    // La primera "foto" se toma cuando ya se cargó todo
    setTimeout(recordHistory, 0);
});
