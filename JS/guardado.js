// Referencias IEEE, guardado en el navegador y carga al iniciar.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Formatea una referencia según el estilo IEEE
 */
function formatIEEEReference(type, author, title, source, year, url) {
    let refText = "";
    
    if (type === 'book') {
        refText = `${escapeHtml(author)}, <em>${escapeHtml(title)}</em>. ${escapeHtml(source)}, ${escapeHtml(year)}.`;
    } else if (type === 'web') {
        refText = `${escapeHtml(author)}, "${escapeHtml(title)}," <em>${escapeHtml(source)}</em>, ${escapeHtml(year)}. [En línea]. Disponible: ${escapeHtml(url)}`;
    } else if (type === 'article') {
        refText = `${escapeHtml(author)}, "${escapeHtml(title)}," <em>${escapeHtml(source)}</em>, ${escapeHtml(year)}.`;
    }
    
    return refText;
}

/**
 * Guarda el estado actual (bloques del reporte) en LocalStorage.
 * Si el guardado falla (por ejemplo, por cuota excedida debido a imágenes
 * incrustadas), se avisa al usuario una sola vez por sesión en vez de
 * fallar en silencio.
 */
let autosaveQuotaWarningShown = false;

function saveToLocalStorage() {
    if (!isAutosaveEnabled()) {
        updateAutosaveUI();
        return;
    }
    try {
        localStorage.setItem('reportData', JSON.stringify(reportData));
        autosaveQuotaWarningShown = false;
    } catch (e) {
        console.error('Error al guardar en localStorage:', e);
        if (!autosaveQuotaWarningShown) {
            autosaveQuotaWarningShown = true;
            alert(
                'No se pudo guardar automáticamente el progreso (posiblemente por espacio ' +
                'insuficiente debido a imágenes incrustadas).\n\n' +
                'Usa "Guardar Proyecto" para exportar tu trabajo a un archivo JSON y evitar perderlo.'
            );
        }
    }
}

/**
 * Carga el estado guardado desde LocalStorage al iniciar la aplicación.
 */
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('reportData');
        if (saved) {
            // Una versión de prueba tenía bloques "cover" aparte; ahora la
            // portada es un modo del encabezado, así que se descartan.
            reportData = JSON.parse(saved).filter(b => b.type !== 'cover');
            render();
        }
    } catch (e) {
        console.error('Error al cargar desde localStorage:', e);
    }
}

// Autoguardado con "debounce": se dispara con cada edición real (a través de
// renderPreview) pero espera una pausa breve antes de escribir, para no
// serializar todo el reportData en cada pulsación de tecla.
let autosaveTimer = null;

function scheduleAutosave() {
    scheduleHistoryRecord();
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        saveToLocalStorage();
        updateAutosaveUI();
        scheduleLibrarySave();
    }, 500);
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

// Restaurar el progreso guardado al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
});
