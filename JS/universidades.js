// Universidades y temas.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// GESTIÓN DE UNIVERSIDADES / TEMAS
// ============================================================================

// Universidades incluidas por defecto. 'generic' siempre existe como
// respaldo (no se puede eliminar) para cuando no se quiere usar el logo
// ni los colores de ninguna institución en particular.
const DEFAULT_UNIVERSITIES = [
    {
        id: 'generic', name: 'Genérica (sin institución)', builtin: true,
        color: { primary: '#374151', secondary: '#6b7280', accent: '#9ca3af' },
        logoLeft: '', logoRight: ''
    },
    {
        id: 'upy', name: 'UPY - Universidad Politécnica de Yucatán', builtin: true,
        color: { primary: '#5B1F8C', secondary: '#F5A623', accent: '#e3bef7' },
        logoLeft: 'https://yucnen.sep.gob.mx/assets/img/up-logo.webp',
        logoRight: 'https://static.wixstatic.com/media/e16f80_9c4ca79ed84340e0984c64712e35448c~mv2_d_3000_2100_s_2.png'
    },
    {
        id: 'tsw', name: 'TSW - Tecnológico de Software', builtin: true,
        color: { primary: '#2C2E5C', secondary: '#00B8E6', accent: '#00D4FF' },
        logoLeft: '', logoRight: ''
    },
    {
        id: 'upp', name: 'UPP - Universidad Privada de la Península', builtin: true,
        color: { primary: '#0047AB', secondary: '#E31E24', accent: '#79a6d4' },
        logoLeft: '', logoRight: ''
    }
];

/**
 * Obtiene la lista de universidades guardadas en LocalStorage.
 * La primera vez la inicializa con las universidades por defecto.
 */
function getUniversities() {
    let list = JSON.parse(localStorage.getItem('list_universities'));
    if (!list || !Array.isArray(list) || list.length === 0) {
        list = DEFAULT_UNIVERSITIES.map(u => ({ ...u, color: { ...u.color } }));
        saveUniversities(list);
    }
    return list;
}

/**
 * Guarda la lista de universidades. Devuelve false si el navegador se quedó
 * sin espacio (los logos son lo que más ocupa).
 */
function saveUniversities(list) {
    try {
        localStorage.setItem('list_universities', JSON.stringify(list));
        return true;
    } catch (e) {
        console.error('Error al guardar universidades:', e);
        alert(
            'No se pudo guardar: el navegador se quedó sin espacio.\n\n' +
            'Prueba con logos más pequeños o elimina universidades que ya no uses.'
        );
        return false;
    }
}

function getUniversityById(id) {
    return getUniversities().find(u => u.id === id);
}

/**
 * Nombre corto para insignias: "UPY - Universidad Politécnica..." -> "UPY".
 */
function getUniShortName(uni) {
    if (!uni) return '';
    if (uni.id === 'generic') return 'Genérica';
    const short = uni.name.split(' - ')[0].trim();
    return short.length > 16 ? short.slice(0, 15) + '…' : short;
}

/**
 * Repuebla el <select> de temas a partir de la lista de universidades.
 */
function renderThemeSelector() {
    const selector = document.getElementById('themeSelector');
    if (!selector) return;

    const universities = getUniversities();
    const current = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');

    selector.innerHTML = universities.map(u =>
        `<option value="${escapeAttr(u.id)}" ${u.id === current ? 'selected' : ''}>${escapeHtml(u.name)}</option>`
    ).join('');
}

/**
 * Cambia el tema visual de la aplicación: aplica el color y deja que el
 * logo correspondiente se resuelva en renderPreview() según la universidad.
 * @param {string} themeId - id de la universidad (ej. 'upy', 'generic', o un id personalizado)
 */
function changeTheme(themeId) {
    const uni = getUniversityById(themeId) || getUniversityById('generic');

    document.body.setAttribute('data-theme', uni.id);
    localStorage.setItem('selectedTheme', uni.id);

    const c = uni.color || {};
    document.body.style.setProperty('--primary', c.primary || '#374151');
    document.body.style.setProperty('--secondary', c.secondary || '#6b7280');
    document.body.style.setProperty('--accent', c.accent || '#9ca3af');

    const selector = document.getElementById('themeSelector');
    if (selector) selector.value = uni.id;

    // Si el bloque de encabezado ya está en pantalla, actualizamos su campo de
    // institución en el sitio (sin reconstruir todo el editor, para no perder
    // datos sin guardar que el usuario esté escribiendo en ese momento).
    const instDisplay = document.getElementById('header-inst-display');
    if (instDisplay) instDisplay.value = uni.name;

    // Textos de la interfaz que muestran la institución actual
    const uniBadge = document.getElementById('header-uni-badge');
    if (uniBadge) uniBadge.textContent = getUniShortName(uni);
    const editorUniLabel = document.getElementById('editor-uni-label');
    if (editorUniLabel) editorUniLabel.textContent = uni.id === 'generic' ? '' : uni.name;

    renderPreview();
    console.log(`Tema cambiado a: ${uni.id}`);
}

/**
 * Carga el tema guardado al iniciar
 */
function loadSavedTheme() {
    renderThemeSelector();
    const savedTheme = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
    changeTheme(savedTheme);
}

// Cargar tema al iniciar
document.addEventListener('DOMContentLoaded', function() {
    loadSavedTheme();
});

// ==========================================
// MODAL PARA AÑADIR / EDITAR UNIVERSIDADES
// ==========================================

// Tamaño máximo (en píxeles, por lado) con el que se guardan los logos.
// En el documento se muestran a 80px de alto, así que 400px sobra para que
// se vean nítidos también al imprimir, y ocupan muy poco espacio.
const LOGO_MAX_SIZE = 400;

/**
 * Reduce una imagen a LOGO_MAX_SIZE px como máximo por lado. Devuelve un
 * data URL. Los PNG/GIF/WebP se guardan como PNG (conservan la transparencia)
 * y las fotos JPEG como JPEG. Los SVG se dejan igual porque ya son ligeros.
 */
function shrinkLogoDataUrl(dataUrl, mimeType) {
    return new Promise(resolve => {
        if (mimeType === 'image/svg+xml') {
            resolve(dataUrl);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, LOGO_MAX_SIZE / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

            const isJpeg = mimeType === 'image/jpeg';
            const resized = isJpeg ? canvas.toDataURL('image/jpeg', 0.9) : canvas.toDataURL('image/png');

            // Si por algo la versión "reducida" pesa más, conservamos la original.
            resolve(resized.length < dataUrl.length ? resized : dataUrl);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

function previewLogoFile(input, previewId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        const img = document.getElementById(previewId);
        img.src = await shrinkLogoDataUrl(e.target.result, file.type);
        img.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

function closeUniversityModal() {
    const overlay = document.getElementById('university-modal-overlay');
    if (overlay) overlay.remove();
}

/**
 * Abre el modal para añadir una nueva universidad o editar una existente.
 * @param {string} [editId] - id de la universidad a editar; si se omite, se añade una nueva
 */
function openUniversityModal(editId) {
    let editing = null;

    if (editId) {
        editing = getUniversityById(editId);
        if (!editing) {
            alert('No se encontró la universidad a editar.');
            return;
        }
    }

    const c = (editing && editing.color) || { primary: '#374151', secondary: '#6b7280', accent: '#9ca3af' };
    const hasLeftLogo = !!(editing && editing.logoLeft);
    const hasRightLogo = !!(editing && editing.logoRight);

    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay';
    overlay.id = 'university-modal-overlay';

    overlay.innerHTML = `
        <div class="university-modal">
            <h3>${editing ? 'Editar universidad' : 'Añadir universidad'}</h3>

            <label>Nombre</label>
            <input type="text" id="uni-name-input" value="${escapeAttr(editing ? editing.name : '')}" placeholder="Ej. Universidad Autónoma de Yucatán">

            <label>Colores del tema</label>
            <div class="university-color-row">
                <div>
                    <input type="color" id="uni-color-primary" value="${c.primary}">
                    <div style="font-size:0.75em; margin-top:2px;">Primario</div>
                </div>
                <div>
                    <input type="color" id="uni-color-secondary" value="${c.secondary}">
                    <div style="font-size:0.75em; margin-top:2px;">Secundario</div>
                </div>
                <div>
                    <input type="color" id="uni-color-accent" value="${c.accent}">
                    <div style="font-size:0.75em; margin-top:2px;">Acento</div>
                </div>
            </div>

            <label>Logo izquierdo</label>
            <input type="file" id="uni-logo-left" accept="image/*">
            <img id="uni-logo-left-preview" class="university-logo-preview" src="${hasLeftLogo ? escapeAttr(editing.logoLeft) : ''}" style="${hasLeftLogo ? '' : 'display:none;'}">

            <label>Logo derecho</label>
            <input type="file" id="uni-logo-right" accept="image/*">
            <img id="uni-logo-right-preview" class="university-logo-preview" src="${hasRightLogo ? escapeAttr(editing.logoRight) : ''}" style="${hasRightLogo ? '' : 'display:none;'}">

            <div class="university-modal-actions">
                <button type="button" class="action-btn" onclick="closeUniversityModal()">Cancelar</button>
                <button type="button" class="action-btn save-btn" id="uni-save-btn">💾 Guardar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('uni-logo-left').addEventListener('change', function() {
        previewLogoFile(this, 'uni-logo-left-preview');
    });
    document.getElementById('uni-logo-right').addEventListener('change', function() {
        previewLogoFile(this, 'uni-logo-right-preview');
    });
    document.getElementById('uni-save-btn').addEventListener('click', function() {
        saveUniversityFromModal(editing ? editing.id : null);
    });
}

function saveUniversityFromModal(editingId) {
    const nameInput = document.getElementById('uni-name-input');
    const name = nameInput.value.trim();
    if (!name) {
        alert('Ingresa el nombre de la universidad.');
        return;
    }

    const color = {
        primary: document.getElementById('uni-color-primary').value,
        secondary: document.getElementById('uni-color-secondary').value,
        accent: document.getElementById('uni-color-accent').value
    };

    const leftPreview = document.getElementById('uni-logo-left-preview');
    const rightPreview = document.getElementById('uni-logo-right-preview');
    const hasLeftLogo = leftPreview.style.display !== 'none';
    const hasRightLogo = rightPreview.style.display !== 'none';

    let universities = getUniversities();
    let themeToApply;

    if (editingId) {
        const uni = universities.find(u => u.id === editingId);
        if (uni) {
            uni.name = name;
            uni.color = color;
            if (hasLeftLogo) uni.logoLeft = leftPreview.src;
            if (hasRightLogo) uni.logoRight = rightPreview.src;
        }
        themeToApply = editingId;
    } else {
        const id = 'uni_' + Date.now();
        universities.push({
            id,
            name,
            builtin: false,
            color,
            logoLeft: hasLeftLogo ? leftPreview.src : '',
            logoRight: hasRightLogo ? rightPreview.src : ''
        });
        themeToApply = id;
    }

    // Si no hubo espacio, dejamos el modal abierto para que se pueda corregir.
    if (!saveUniversities(universities)) return;
    closeUniversityModal();
    renderThemeSelector();
    changeTheme(themeToApply);
    refreshSettingsModal();
    if (onboardingState) renderOnboardingStep();
}

/**
 * Elimina una universidad de la lista.
 * La universidad 'generic' no se puede eliminar porque sirve de respaldo.
 * @param {string} uniId - id de la universidad a eliminar
 */
function deleteUniversityFromList(uniId) {
    const uni = getUniversityById(uniId);

    if (!uni) return;
    if (uni.id === 'generic') {
        alert('La universidad genérica no se puede eliminar.');
        return;
    }

    if (!confirm(`¿Eliminar la universidad "${uni.name}"? Esta acción no se puede deshacer.`)) return;

    const universities = getUniversities().filter(u => u.id !== uniId);
    saveUniversities(universities);
    renderThemeSelector();

    // Si era el tema activo, volvemos al genérico; si no, dejamos el actual.
    const current = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
    changeTheme(current === uniId ? 'generic' : current);
    refreshSettingsModal();
}
