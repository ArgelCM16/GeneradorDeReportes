// Google Drive.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// INTEGRACIÓN CON GOOGLE DRIVE
// ============================================================================
//
// Esto permite guardar/abrir el proyecto (el mismo JSON de saveJSON/loadJSON)
// directamente en Google Drive, sin pasar por descargar/subir un archivo a mano.
//
// Es gratis: la Drive API no cobra por este volumen de uso, y usando el scope
// "drive.file" (solo da acceso a los archivos que esta app crea) tampoco se
// necesita pasar la revisión de seguridad de Google.
//
// CONFIGURACIÓN (una sola vez, gratis):
//   1. Entra a https://console.cloud.google.com/ y crea un proyecto (o usa uno existente).
//   2. Ve a "APIs y servicios" > "Biblioteca", busca "Google Drive API" y presiona "Habilitar".
//   3. Ve a "APIs y servicios" > "Pantalla de consentimiento OAuth":
//        - Tipo de usuario: Externo
//        - Mientras la deje en modo "Prueba" (Testing) no se requiere revisión de Google
//          (gratis, hasta 100 usuarios de prueba; agrega ahí tu propio correo).
//   4. Ve a "Credenciales" > "Crear credenciales" > "ID de cliente de OAuth":
//        - Tipo de aplicación: "Aplicación web"
//        - En "Orígenes de JavaScript autorizados" agrega la URL exacta donde sirvas
//          esta app (ej. http://localhost:5500 o tu dominio de GitHub Pages).
//          OJO: abrir index.html con doble clic (file://) NO funciona, debe
//          servirse por http/https.
//   5. Copia el "Client ID" generado (termina en .apps.googleusercontent.com) y
//      pégalo aquí abajo en GOOGLE_DRIVE_CLIENT_ID.
// ============================================================================

const GOOGLE_DRIVE_CLIENT_ID = '311190778728-siidm158khvmo8vfqp1h8nnm5ub4gmvj.apps.googleusercontent.com';
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let googleAccessToken = null;
let googleTokenClient = null;
let driveCurrentFileId = null; // id del archivo activo en Drive (si ya se cargó/guardó uno)
let driveCurrentFileName = null; // nombre del archivo activo, para sugerirlo en el siguiente guardado

function isGoogleDriveConfigured() {
    return !!GOOGLE_DRIVE_CLIENT_ID;
}

function showGoogleDriveSetupHelp() {
    alert(
        'Cómo activar Google Drive (gratis):\n\n' +
        '1. Crea un proyecto en https://console.cloud.google.com/\n' +
        '2. Habilita "Google Drive API" en la Biblioteca de APIs.\n' +
        '3. Configura la Pantalla de consentimiento OAuth (tipo Externo, modo Prueba).\n' +
        '4. Crea credenciales > ID de cliente de OAuth > Aplicación web, y agrega\n' +
        '   la URL donde abres esta app como Origen de JavaScript autorizado.\n' +
        '5. Copia el Client ID y pégalo en la constante GOOGLE_DRIVE_CLIENT_ID\n' +
        '   dentro de JS/drive.js.\n\n' +
        'El detalle completo de estos pasos está en un comentario justo arriba\n' +
        'de esa constante, en el código fuente.'
    );
}

function ensureGoogleTokenClient() {
    if (googleTokenClient) return googleTokenClient;

    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        alert('No se pudo cargar el servicio de Google. Verifica tu conexión a internet y recarga la página.');
        return null;
    }

    googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_DRIVE_CLIENT_ID,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: '' // se asigna en cada solicitud, ver connectGoogleDrive()
    });
    return googleTokenClient;
}

function connectGoogleDrive() {
    if (!isGoogleDriveConfigured()) {
        alert(
            'Google Drive no está configurado todavía.\n\n' +
            'Presiona el botón "?" junto a "Google Drive" para ver cómo activarlo (es gratis).'
        );
        return;
    }

    const tokenClient = ensureGoogleTokenClient();
    if (!tokenClient) return;

    tokenClient.callback = (response) => {
        if (response.error) {
            console.error('Error de autenticación con Google:', response);
            alert('No se pudo conectar con Google Drive: ' + response.error);
            return;
        }
        googleAccessToken = response.access_token;
        updateDriveUI(true);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function disconnectGoogleDrive() {
    if (googleAccessToken) {
        google.accounts.oauth2.revoke(googleAccessToken, () => {});
    }
    googleAccessToken = null;
    driveCurrentFileId = null;
    driveCurrentFileName = null;
    updateDriveUI(false);
}

function updateDriveUI(connected) {
    const statusEl = document.getElementById('drive-status');
    const connectBtn = document.getElementById('btn-drive-connect');
    const disconnectBtn = document.getElementById('btn-drive-disconnect');
    const saveBtn = document.getElementById('btn-drive-save');
    const openBtn = document.getElementById('btn-drive-open');

    if (statusEl) statusEl.textContent = connected ? 'Conectado a Google Drive' : 'No conectado';
    if (connectBtn) connectBtn.style.display = connected ? 'none' : 'flex';
    if (disconnectBtn) disconnectBtn.style.display = connected ? 'flex' : 'none';
    if (saveBtn) saveBtn.style.display = connected ? 'flex' : 'none';
    if (openBtn) openBtn.style.display = connected ? 'flex' : 'none';
}

/**
 * JSON del proyecto completo; lo usan tanto saveJSON() como Google Drive.
 */
function buildProjectJSON() {
    return JSON.stringify(buildProjectData(), null, 2);
}

/**
 * Guarda (o actualiza, si ya se abrió/guardó uno antes) el proyecto actual
 * como un archivo JSON en Google Drive, usando la API de subida multipart.
 */
async function saveProjectToDrive() {
    if (!googleAccessToken) {
        alert('Primero conéctate a Google Drive.');
        return;
    }

    const suggestedName = driveCurrentFileName || `${getSafeFileName()}.json`;

    let filename = prompt('¿Con qué nombre quieres guardar el archivo en Google Drive?', suggestedName);
    if (filename === null) return; // el usuario canceló

    filename = filename.trim();
    if (!filename) {
        alert('El nombre no puede estar vacío.');
        return;
    }
    if (!filename.toLowerCase().endsWith('.json')) {
        filename += '.json';
    }

    const jsonString = buildProjectJSON();
    const metadata = { name: filename, mimeType: 'application/json' };
    const boundary = 'reportes_academicos_boundary';
    const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${jsonString}\r\n` +
        `--${boundary}--`;

    const isUpdate = !!driveCurrentFileId;
    const url = isUpdate
        ? `https://www.googleapis.com/upload/drive/v3/files/${driveCurrentFileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

    try {
        const res = await fetch(url, {
            method: isUpdate ? 'PATCH' : 'POST',
            headers: {
                Authorization: `Bearer ${googleAccessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        driveCurrentFileId = data.id;
        driveCurrentFileName = filename;
        markDocumentSaved();
        alert(`Proyecto guardado en Google Drive como "${filename}".`);
    } catch (err) {
        console.error('Error al guardar en Drive:', err);
        alert('No se pudo guardar el proyecto en Google Drive. Intenta de nuevo.');
    }
}

/**
 * Lista los archivos JSON que esta app ha creado en Google Drive (el scope
 * drive.file limita la lista solo a esos archivos) y muestra un modal para elegir uno.
 */
async function openDriveFilePicker() {
    if (!googleAccessToken) {
        alert('Primero conéctate a Google Drive.');
        return;
    }

    try {
        const res = await fetch(
            "https://www.googleapis.com/drive/v3/files?q=" +
            encodeURIComponent("mimeType='application/json' and trashed=false") +
            "&fields=" + encodeURIComponent("files(id,name,modifiedTime)") +
            "&orderBy=modifiedTime desc&pageSize=50",
            { headers: { Authorization: `Bearer ${googleAccessToken}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderDriveFileModal(data.files || []);
    } catch (err) {
        console.error('Error al listar archivos de Drive:', err);
        alert('No se pudo obtener la lista de archivos de Google Drive.');
    }
}

function closeDriveModal() {
    const overlay = document.getElementById('drive-modal-overlay');
    if (overlay) overlay.remove();
}

function renderDriveFileModal(files) {
    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay';
    overlay.id = 'drive-modal-overlay';

    const itemsHtml = files.length
        ? files.map((f, i) => `
            <div class="drive-file-item" data-file-index="${i}">
                <span class="drive-file-name">${escapeHtml(f.name)}</span>
                <span class="drive-file-date">${escapeHtml(new Date(f.modifiedTime).toLocaleString())}</span>
            </div>
        `).join('')
        : '<p style="color:#777;">No hay proyectos guardados todavía en tu Google Drive.</p>';

    overlay.innerHTML = `
        <div class="university-modal">
            <h3>Abrir proyecto desde Google Drive</h3>
            <div class="drive-file-list">${itemsHtml}</div>
            <div class="university-modal-actions">
                <button type="button" class="action-btn" onclick="closeDriveModal()">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('.drive-file-item').forEach(item => {
        item.addEventListener('click', () => {
            const file = files[parseInt(item.dataset.fileIndex, 10)];
            closeDriveModal();
            loadProjectFromDrive(file.id, file.name);
        });
    });
}

/**
 * Descarga el contenido de un archivo de Drive y lo carga como proyecto activo,
 * igual que loadJSON() pero leyendo directamente desde Google Drive.
 */
async function loadProjectFromDrive(fileId, fileName) {
    if (reportData.length > 0) {
        const confirmLoad = window.confirm(
            '¿Estás seguro de cargar este proyecto desde Google Drive?\n\n' +
            'Se perderá el trabajo actual no guardado.'
        );
        if (!confirmLoad) return;
    }

    try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${googleAccessToken}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const projectData = await res.json();

        applyProjectData(projectData, fileName);
        driveCurrentFileId = fileId;
        driveCurrentFileName = fileName;
        alert(`Proyecto "${fileName}" cargado desde Google Drive.`);
    } catch (err) {
        console.error('Error al cargar desde Drive:', err);
        alert('No se pudo cargar el archivo desde Google Drive. Puede estar dañado o no ser un proyecto válido.');
    }
}
