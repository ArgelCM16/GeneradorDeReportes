// Respaldo (exportar / importar).
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// RESPALDO: exportar / importar toda la configuración (y el documento)
// Un solo .json para pasar todo a otra computadora o navegador.
// ============================================================================

// Todo lo que se guarda de configuración en el navegador
const BACKUP_KEYS = [
    'user_profile', 'header_fields', 'list_universities', 'list_subjects', 'list_profs',
    'subject_prof_map', 'list_classmates', 'selectedTheme', 'citationStyle',
    'autosaveEnabled', 'previewZoom', 'previewWidth', 'previewHidden', 'colorScheme', 'defaultDocumentFormat'
];

/**
 * Arma el respaldo. Los valores de configuración van tal cual están en el
 * navegador; el documento se toma de lo que hay en pantalla (así funciona
 * aunque el autoguardado esté desactivado).
 */
function buildBackupData(includeDocument = true) {
    const settings = {};
    BACKUP_KEYS.forEach(key => { settings[key] = localStorage.getItem(key); });
    return {
        app: 'generador-reportes-academicos',
        type: 'backup',
        version: '2.2',
        exportedAt: new Date().toISOString(),
        settings,
        document: includeDocument
            ? { documentName: getDocumentName(), reportData, headerData: getHeaderData(), documentFormat: getDocumentFormat() }
            : null
    };
}

async function exportBackup(includeDocument = true, includeLibrary = false) {
    const backup = buildBackupData(includeDocument);
    if (includeLibrary) {
        await saveCurrentDocumentToLibrary();
        backup.library = await exportLibraryDocuments();
    }
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const today = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Respaldo Generador de Reportes ${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function isBackupData(data) {
    return !!data && data.type === 'backup' && data.settings && typeof data.settings === 'object';
}

/**
 * Resumen legible de lo que trae un respaldo (para confirmar antes de importar).
 */
function describeBackup(data) {
    const parse = key => {
        try { return JSON.parse(data.settings[key]); } catch (e) { return null; }
    };
    const count = key => {
        const list = parse(key);
        return Array.isArray(list) ? list.length : 0;
    };
    const profile = parse('user_profile') || {};
    const doc = data.document;
    const lines = [
        `• Perfil: ${profile.fullName || '(sin nombre)'}${profile.studentId ? ` — ${profile.studentId}` : ''}`,
        `• Universidades: ${count('list_universities')}`,
        `• Materias: ${count('list_subjects')} · Profesores: ${count('list_profs')}`,
        `• Compañeros: ${count('list_classmates')}`,
        `• Configuración del encabezado y preferencias`
    ];
    if (doc && Array.isArray(doc.reportData)) {
        lines.push(`• Documento: "${doc.documentName || DEFAULT_DOCUMENT_NAME}" (${doc.reportData.length} bloques)`);
    }
    if (Array.isArray(data.library) && data.library.length) {
        lines.push(`• Mis documentos: ${data.library.length}`);
    }
    return lines.join('\n');
}

/**
 * Restaura un respaldo: reemplaza la configuración (y el documento, si lo trae).
 */
function importBackupData(data) {
    if (!isBackupData(data)) throw new Error('El archivo no es un respaldo del Generador de Reportes.');

    BACKUP_KEYS.forEach(key => {
        if (!(key in data.settings)) return;
        const value = data.settings[key];
        if (value === null || value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, String(value));
    });

    const doc = data.document;
    if (doc && Array.isArray(doc.reportData)) {
        startNewLibraryDocument();
        reportData = doc.reportData;
        setHeaderData(doc.headerData || null);
        setDocumentName(doc.documentName || '');
        setDocumentFormat(doc.documentFormat || getDefaultDocumentFormat(), false);
        driveCurrentFileId = null;
        driveCurrentFileName = null;
    }

    // Aplicar lo restaurado en pantalla
    renderThemeSelector();
    changeTheme((localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, ''));
    const width = parseFloat(localStorage.getItem('previewWidth'));
    setPreviewWidth(width || null, false);
    applyPreviewZoom();
    render();
    if (isAutosaveEnabled()) saveToLocalStorage();
    markDocumentSaved();
    updateAutosaveUI();
    if (doc && Array.isArray(doc.reportData)) resetUndoHistory();
    if (Array.isArray(data.library) && data.library.length) {
        importLibraryDocuments(data.library).catch(err => console.error('No se pudieron importar los documentos:', err));
    }
}

/**
 * Lee el archivo elegido, muestra el resumen y, si se confirma, lo importa.
 */
function importBackupFromFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        let data;
        try {
            data = JSON.parse(e.target.result);
        } catch (err) {
            alert('No se pudo leer el archivo: no es un JSON válido.');
            return;
        }

        if (!isBackupData(data)) {
            if (data && Array.isArray(data.reportData)) {
                alert('Este archivo es un proyecto, no un respaldo.\n\nPara abrirlo usa "Cargar Proyecto" en el menú lateral.');
            } else {
                alert('El archivo no es un respaldo del Generador de Reportes.');
            }
            return;
        }

        const message = 'Se va a restaurar este respaldo:\n\n' + describeBackup(data) +
            '\n\nReemplaza tu configuración actual' +
            (data.document ? ' y el documento abierto' : '') + '. ¿Continuar?';
        if (!confirm(message)) return;

        try {
            importBackupData(data);
            refreshSettingsModal();
            const status = document.getElementById('backup-message');
            if (status) status.textContent = '✓ Respaldo restaurado';
        } catch (err) {
            console.error('Error al importar respaldo:', err);
            alert('No se pudo restaurar el respaldo: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function renderBackupTab(content) {
    const subjects = getSimpleList('list_subjects').length;
    const profs = getSimpleList('list_profs').length;
    const classmates = getClassmates().length;
    const universities = getUniversities().length;
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

    content.innerHTML = `
        <div class="backup-section">
            <h4>⬇️ Exportar respaldo</h4>
            <p class="settings-hint">Descarga un archivo <strong>.json</strong> con todo lo que tienes guardado en este navegador, para pasarlo a otra computadora o no perderlo:</p>
            <ul class="backup-list">
                <li>Tu perfil (nombre, matrícula, escuela, carrera, grupo y periodo)</li>
                <li>Qué datos salen en el encabezado y cómo se llaman</li>
                <li>${plural(universities, 'universidad', 'universidades')} (con sus colores y logos)</li>
                <li>${plural(subjects, 'materia', 'materias')} y ${plural(profs, 'profesor', 'profesores')} (con sus vínculos)</li>
                <li>${plural(classmates, 'compañero', 'compañeros')}</li>
                <li>Tus preferencias (tema, formato de citas, autoguardado, zoom...)</li>
            </ul>
            <label class="backup-check">
                <input type="checkbox" id="backup-include-document" checked>
                <span>Incluir también el documento actual ("${escapeHtml(getDocumentName() || DEFAULT_DOCUMENT_NAME)}")</span>
            </label>
            <label class="backup-check" id="backup-library-row" style="display: none;">
                <input type="checkbox" id="backup-include-library" checked>
                <span id="backup-library-label">Incluir todos mis documentos</span>
            </label>
            <button type="button" class="action-btn save-btn" id="backup-export">⬇️ Descargar respaldo (.json)</button>
        </div>

        <div class="backup-section">
            <h4>⬆️ Importar respaldo</h4>
            <p class="settings-hint">Carga un respaldo descargado antes. Antes de restaurarlo verás un resumen de lo que trae. <strong>Reemplaza tu configuración actual.</strong></p>
            <button type="button" class="action-btn" id="backup-import">⬆️ Cargar respaldo...</button>
            <input type="file" id="backup-file" accept=".json,application/json" style="display: none;" onchange="importBackupFromFile(this)">
            <p id="backup-message" class="settings-success"></p>
        </div>`;

    // Cuántos documentos hay en "Mis documentos"
    listLibraryDocuments().then(docs => {
        if (!docs.length) return;
        content.querySelector('#backup-library-row').style.display = '';
        content.querySelector('#backup-library-label').textContent = `Incluir todos mis documentos (${docs.length})`;
    }).catch(() => {});

    content.querySelector('#backup-export').addEventListener('click', async () => {
        const libraryRow = content.querySelector('#backup-library-row');
        const withLibrary = libraryRow.style.display !== 'none' && content.querySelector('#backup-include-library').checked;
        await exportBackup(content.querySelector('#backup-include-document').checked, withLibrary);
        content.querySelector('#backup-message').textContent = '✓ Respaldo descargado';
    });
    content.querySelector('#backup-import').addEventListener('click', () => {
        content.querySelector('#backup-file').click();
    });
}
