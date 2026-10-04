// render(), editor de bloques, encabezado, materias y profesores, autoguardado del encabezado.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// FUNCIONES DE RENDERIZADO
// ============================================================================

/**
 * Renderiza todo el editor y la vista previa
 */
function render() {
    normalizeTextBlocks();
    placeTocAfterHeader();
    renderEditor();
    renderPreview();
	initializeDragAndDrop();
    // Agregar, mover, borrar o aplicar una plantilla es un paso propio para "Deshacer"
    if (undoHistory.current !== null) recordHistory();
}

/**
 * Renderiza solo el panel del editor (lado izquierdo)
 */
function renderEditor() {
    const editor = document.getElementById('editor-container');
    editor.innerHTML = "";

    if (reportData.length === 0) {
        editor.innerHTML = `
            <div class="welcome-message">
                <h2>¡Bienvenido!</h2>
                <p>Selecciona tu institución y comienza agregando bloques desde el menú lateral.</p>
            </div>`;
    }


    reportData.forEach((block, index) => {
        const div = document.createElement('div');
        div.className = 'block-card-container';
        
        // Herramientas de la tarjeta: subir, bajar, duplicar y eliminar
        const deleteBtn = buildBlockToolsHTML(block, index);
        let blockHTML = "";

        switch(block.type) {
            case 'header':
                blockHTML = renderHeaderEditor(block, deleteBtn);
                break;
            case 'toc':
                blockHTML = renderTocEditor(block, deleteBtn);
                break;
            case 'title':
                blockHTML = renderTitleEditor(block, deleteBtn);
                break;
            case 'subtitle':
                blockHTML = renderSubtitleEditor(block, deleteBtn);
                break;
            case 'text':
                blockHTML = renderTextEditor(block, deleteBtn);
                break;
            case 'code':
                blockHTML = renderCodeEditor(block, deleteBtn);
                break;
            case 'image':
                blockHTML = renderImageEditor(block, deleteBtn);
                break;
            case 'table':
                blockHTML = renderTableEditor(block, deleteBtn);
                break;
            case 'ref':
                blockHTML = renderRefEditor(block, deleteBtn);
                break;
            case 'ai':
                blockHTML = renderAIEditor(block, deleteBtn);
                break;
        }

        div.innerHTML = blockHTML;
        editor.appendChild(div);
    });
}

// ==========================================
// empiezan modificaciones Argel cano para el header (listas desplegables y botones de acción)
// ==========================================




// Función auxiliar para generar las opciones de los select desde localStorage
function generateSelectOptions(storageKey, selectedValue, placeholder = 'Seleccione...') {
    const list = getSimpleList(storageKey);
    let options = `<option value="">${escapeHtml(placeholder)}</option>`;
    list.forEach(item => {
        const isSelected = item === selectedValue ? 'selected' : '';
        options += `<option value="${escapeAttr(item)}" ${isSelected}>${escapeHtml(item)}</option>`;
    });
    return options;
}

function getSimpleList(storageKey) {
    try {
        const list = JSON.parse(localStorage.getItem(storageKey));
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}


function renderHeaderEditor(block, deleteBtn) {
    const savedData = getHeaderData();
    
    let savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
        savedTheme = savedTheme.replace(/['"]+/g, '');
    }

    // La institución ya NO se elige manualmente aquí: siempre sigue a la
    // universidad seleccionada en "Tema" del menú lateral. Ahí (y solo ahí)
    // se puede añadir, editar o eliminar universidades.
    const currentUni = getUniversityById(savedTheme || 'generic') || getUniversityById('generic');
    const currentInstName = currentUni ? currentUni.name : '';

    // Los datos se guardan automáticamente con cada cambio (ver
    // persistHeaderFromDOM), así que el formulario siempre está editable.
    // Sin datos todavía (documento nuevo): se llenan con el perfil del usuario
    const d = savedData || getHeaderDefaultsFromProfile();

    const displayAddBtn = d.isTeam ? 'inline-block' : 'none';

    // Qué campos se muestran y cómo se llaman (Configuración → Encabezado)
    const fieldCfg = getHeaderFieldConfig();
    const fieldStyle = key => fieldCfg[key].show ? '' : ' style="display: none;"';
    const fieldLabel = key => escapeHtml(getHeaderFieldLabel(key, 'editor'));

    // Una fila por estudiante: nombre + matrícula
    const namesArray = (d.names && d.names.length > 0) ? d.names : [d.name || ''];
    const idsArray = d.studentIds || [];
    const membersHtml = namesArray
        .map((name, i) => buildMemberRowHTML(name, idsArray[i] || '', i, d.isTeam))
        .join('');

    // Compañeros guardados para elegir en tareas en equipo
    const classmates = getClassmates();
    const classmateOptions = classmates
        .map((c, i) => `<option value="${i}">${escapeHtml(c.name)}${c.studentId ? ` (${escapeHtml(c.studentId)})` : ''}</option>`)
        .join('');
    return `
        <div class="block-card header-card${d.coverMode ? ' is-cover-mode' : ''}" id="header-card-main" data-cover-mode="${d.coverMode ? '1' : '0'}">
            ${deleteBtn}
            
            <div style="margin-bottom: 15px;">
                <div class="header-card-top">
                    <span class="header-card-icon material-symbols-outlined">school</span>
                    <div class="header-card-heading">
                        <label class="header-card-title">Datos del Alumno / Equipo</label>
                        <p class="header-card-subtitle">Configuración de entrega académica y portada institucional</p>
                    </div>
                    <span class="header-uni-badge" id="header-uni-badge">${escapeHtml(getUniShortName(currentUni))}</span>
                </div>

                <span class="header-field-label" id="label-student-names">${d.isTeam ? 'Integrantes del equipo' : 'Nombre del alumno'}</span>
                <div id="team-members-container" class="grid-inputs" style="margin-bottom: 10px;">
                    ${membersHtml}
                </div>
                
                <div class="team-actions">
                    <button type="button" id="btn-add-member" class="action-btn" onclick="addTeamMember()" style="display: ${displayAddBtn};">
                        ➕ Añadir integrante
                    </button>
                    <select id="classmate-picker" class="classmate-picker" onchange="addClassmateToTeam(this)" title="Tus compañeros se administran en ⚙️ Configuración → Compañeros" style="display: ${d.isTeam && classmates.length ? '' : 'none'};">
                        <option value="">👥 Añadir compañero de la lista...</option>
                        ${classmateOptions}
                    </select>
                </div>
            </div>

            <!-- Cada campo lleva su etiqueta arriba, para saber qué es aunque ya esté lleno -->
            <div class="grid-inputs">
                <!-- Solo en modo portada -->
                <div class="header-field header-field-wide" id="header-task-field" style="${d.coverMode ? '' : 'display: none;'}">
                    <label for="header-task-name">Nombre de la tarea</label>
                    <input type="text" id="header-task-name" placeholder="Ej. Práctica 3: Redes Neuronales" value="${escapeAttr(d.taskName || '')}" oninput="renderPreviewSoon()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field" data-field="group"${fieldStyle('group')}>
                    <label for="header-group">${fieldLabel('group')}</label>
                    <input type="text" id="header-group" placeholder="Ej. IDY-7A" value="${escapeAttr(d.group || '')}" oninput="renderPreviewSoon()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field" data-field="subject"${fieldStyle('subject')}>
                    <label for="select-subject-main">${fieldLabel('subject')}</label>
                    <select id="select-subject-main" required onchange="onHeaderSubjectChange(this)" title="Las materias se administran en ⚙️ Configuración" style="width: 100%; box-sizing: border-box;">
                        ${generateSelectOptions('list_subjects', d.subject, 'Selecciona una materia...')}
                    </select>
                </div>

                <div class="header-field" data-field="prof"${fieldStyle('prof')}>
                    <label for="select-prof-main">${fieldLabel('prof')}</label>
                    <select id="select-prof-main" required onchange="renderPreview()" title="Los profesores se administran en ⚙️ Configuración" style="width: 100%; box-sizing: border-box;">
                        ${generateSelectOptions('list_profs', d.prof, 'Selecciona un profesor...')}
                    </select>
                </div>

                <div class="header-field" data-field="institution"${fieldStyle('institution')}>
                    <label for="header-inst-display">${fieldLabel('institution')}</label>
                    <input type="text" id="header-inst-display" value="${escapeAttr(currentInstName)}" disabled readonly title="La institución se define según el tema seleccionado en el menú lateral. Las universidades se administran en ⚙️ Configuración." style="width: 100%; box-sizing: border-box; background: #f0f0f0; cursor: not-allowed;">
                </div>

                <div class="header-field header-field-wide" data-field="career"${fieldStyle('career')}>
                    <label for="header-career">${fieldLabel('career')}</label>
                    <input type="text" id="header-career" placeholder="Ej. Ingeniería en Datos" value="${escapeAttr(d.career || '')}" oninput="renderPreviewSoon()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field" data-field="term"${fieldStyle('term')}>
                    <label for="header-term">${fieldLabel('term')}</label>
                    <input type="text" id="header-term" placeholder="Ej. 7" value="${escapeAttr(d.term || '')}" oninput="renderPreviewSoon()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field" data-field="date"${fieldStyle('date')}>
                    <label for="header-date">${fieldLabel('date')}</label>
                    <input type="date" id="header-date" value="${escapeAttr(d.date || '')}" oninput="renderPreviewSoon()" style="width: 100%; box-sizing: border-box;">
                </div>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0 15px 0;">

            <div class="card-actions" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                
                <div class="options-group" style="display: flex; gap: 20px; align-items: center;">
                    <div class="checkbox-container" style="display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" id="check-include-logo" name="check-include-logo" onchange="renderPreview()" ${d.includeLogo ? 'checked' : ''} style="margin: 0; width: 15px; height: 15px;">
                        <label for="check-include-logo" style="margin: 0; cursor: pointer; line-height: 1; font-size: 14px; padding-top: 1px;">Incluir logos oficiales</label>
                    </div>
                    <div class="checkbox-container" style="display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" id="check-is-team" onchange="toggleTeamMode(this)" ${d.isTeam ? 'checked' : ''} style="margin: 0; width: 15px; height: 15px;">
                        <label for="check-is-team" style="margin: 0; cursor: pointer; line-height: 1; font-size: 14px; padding-top: 1px;">Es tarea en equipo</label>
                    </div>
                </div>

                <div class="action-buttons-group" style="display: flex; gap: 10px; align-items: center;">
                    <span id="header-autosave-status" style="font-size: 12px; color: #888;">Se guarda automáticamente</span>
                    <div class="header-card-buttons">
                        <button type="button" class="action-btn" onclick="clearHeaderData()" title="Borrar todos los datos del encabezado">🧹 Limpiar formulario</button>
                        <button type="button" class="action-btn save-btn" id="btn-toggle-cover" onclick="toggleCoverMode()" title="Cambia el formato del encabezado a portada de hoja completa (y de regreso)"><span id="header-cover-btn-icon">${d.coverMode ? '↩' : '📄'}</span> <span id="header-cover-btn-label">${d.coverMode ? 'Volver a encabezado' : 'Hacer portada'}</span></button>
                    </div>
                </div>
                
            </div>
        </div>`;
}


// ==========================================
// NOTA: La institución ya no se gestiona con una lista propia (list_insts).
// Ahora siempre se deriva de la universidad seleccionada en "Tema" del menú
// lateral; para añadir, editar o eliminar instituciones usa los botones
// junto al selector de tema (ver openUniversityModal / deleteUniversityFromList).
// ==========================================

function removeTeamMember(buttonElement) {
    // 1. Encontrar el contenedor del input específico y eliminarlo
    const rowToRemove = buttonElement.closest('.member-row');
    if (rowToRemove) {
        rowToRemove.remove();
        
        // 2. Re-enumerar los placeholders para que tengan sentido
        updateMemberPlaceholders();
        
        // 3. Actualizar la vista previa si tienes esta función
        if (typeof renderPreview === 'function') {
            renderPreview();
        }
    }
}

function updateMemberPlaceholders() {
    const inputs = document.querySelectorAll('#team-members-container .student-name-input');
    inputs.forEach((input, index) => {
        // Cambia el placeholder respetando el nuevo orden
        input.placeholder = `Nombre del integrante ${index + 1}`;
    });
}

// Activa o desactiva el modo equipo
function toggleTeamMode(checkbox) {
    const isTeam = checkbox.checked;
    const addMemberBtn = document.getElementById('btn-add-member');
    const container = document.getElementById('team-members-container');
    const memberRows = container.querySelectorAll('.member-row');

    const namesLabel = document.getElementById('label-student-names');
    if (namesLabel) namesLabel.textContent = isTeam ? 'Integrantes del equipo' : 'Nombre del alumno';

    const picker = document.getElementById('classmate-picker');
    if (picker) picker.style.display = isTeam && getClassmates().length ? '' : 'none';

    if (isTeam) {
        // MODO EQUIPO: Mostrar botón de añadir
        addMemberBtn.style.display = 'inline-block';
        
        // Cambiar el placeholder del primer input
        if (memberRows.length > 0) {
            const firstInput = memberRows[0].querySelector('.student-name-input');
            if (firstInput) firstInput.placeholder = 'Nombre del integrante 1';
        }
    } else {
        // MODO INDIVIDUAL: Ocultar botón de añadir
        addMemberBtn.style.display = 'none';
        
        // Eliminar todos los integrantes excepto el primero
        for (let i = 1; i < memberRows.length; i++) {
            memberRows[i].remove();
        }
        
        // Formatear el primer input para que vuelva a ser individual
        if (memberRows.length > 0) {
            const firstInput = memberRows[0].querySelector('.student-name-input');
            if (firstInput) firstInput.placeholder = 'Nombre del Alumno';
            
            // Por seguridad, asegurarnos de que el primer input NO tenga botón de basura
            const firstDeleteBtn = memberRows[0].querySelector('.btn-remove-member');
            if (firstDeleteBtn) firstDeleteBtn.remove();
        }
    }
    
    // Actualizar la vista previa del documento
    if (typeof renderPreview === 'function') {
        renderPreview();
    }
}   

/**
 * HTML de la fila de un estudiante: nombre + matrícula (+ botón para quitarlo).
 */
function buildMemberRowHTML(name, studentId, index, isTeam) {
    const showId = isHeaderFieldShown('studentId');
    const placeholder = isTeam ? `Nombre del integrante ${index + 1}` : 'Nombre del Alumno';
    // La primera fila (tu nombre) no se elimina, solo se limpia; las demás se quitan
    const deleteBtn = (isTeam && index > 0)
        ? `<button type="button" class="icon-btn action-icon btn-remove-member" onclick="removeTeamMember(this)" title="Eliminar integrante">🗑️</button>`
        : (index === 0
            ? `<button type="button" class="icon-btn action-icon btn-clear-member" onclick="clearMemberRow(this)" title="Limpiar nombre y matrícula">🧹</button>`
            : '');
    return `
        <div class="input-with-action member-row" style="display: flex; width: 100%;">
            <input type="text" class="student-name-input" placeholder="${placeholder}" value="${escapeAttr(name || '')}" oninput="renderPreviewSoon()" style="flex: 1; min-width: 0; width: 100%; box-sizing: border-box;">
            <input type="text" class="student-id-input" placeholder="${escapeAttr(getHeaderFieldLabel('studentId', 'editor'))}" value="${escapeAttr(studentId || '')}" oninput="renderPreviewSoon()" title="${escapeAttr(getHeaderFieldLabel('studentId', 'editor'))}"${showId ? '' : ' style="display: none;"'}>
            ${deleteBtn}
        </div>`;
}

/**
 * Deja en blanco el nombre y la matrícula de una fila (sin quitarla).
 */
function clearMemberRow(button) {
    const row = button.closest('.member-row');
    if (!row) return;
    row.querySelectorAll('.student-name-input, .student-id-input').forEach(input => { input.value = ''; });
    row.querySelector('.student-name-input').focus();
    renderPreview();
}

// Añade una fila de integrante (vacía o con los datos de un compañero)
function addTeamMember(name = '', studentId = '') {
    const container = document.getElementById('team-members-container');
    const count = container.querySelectorAll('.member-row').length;
    container.insertAdjacentHTML('beforeend', buildMemberRowHTML(name, studentId, count, true));

    if (typeof renderPreview === 'function') {
        renderPreview();
    }
}

/**
 * Agrega al equipo al compañero elegido en la lista: llena la primera fila
 * vacía o crea una nueva.
 */
function addClassmateToTeam(select) {
    const classmate = getClassmates()[parseInt(select.value, 10)];
    select.value = '';
    if (!classmate) return;

    const rows = Array.from(document.querySelectorAll('#team-members-container .member-row'));
    const alreadyThere = rows.some(r => r.querySelector('.student-name-input').value.trim() === classmate.name);
    if (alreadyThere) return;

    const emptyRow = rows.find(r => !r.querySelector('.student-name-input').value.trim());
    if (emptyRow) {
        emptyRow.querySelector('.student-name-input').value = classmate.name;
        const idInput = emptyRow.querySelector('.student-id-input');
        if (idInput) idInput.value = classmate.studentId || '';
        renderPreview();
    } else {
        addTeamMember(classmate.name, classmate.studentId || '');
    }
}

// ==========================================
// LISTAS DE MATERIAS Y PROFESORES
// Se administran desde el panel de ⚙️ Configuración (ver openSettingsModal).
// ==========================================

// Relaciona cada lista con el <select> del encabezado y el campo guardado.
const SIMPLE_LISTS = {
    list_subjects: { selectId: 'select-subject-main', headerKey: 'subject', label: 'materia', plural: 'materias', placeholder: 'Selecciona una materia...' },
    list_profs:    { selectId: 'select-prof-main',    headerKey: 'prof',    label: 'profesor', plural: 'profesores', placeholder: 'Selecciona un profesor...' }
};

function saveSimpleList(storageKey, list) {
    localStorage.setItem(storageKey, JSON.stringify(list));
}

/**
 * Vuelve a generar las opciones del <select> del encabezado (si está en
 * pantalla) conservando la selección actual, o cambiándola a `selectValue`.
 */
function refreshHeaderSelect(storageKey, selectValue) {
    const cfg = SIMPLE_LISTS[storageKey];
    const selectEl = document.getElementById(cfg.selectId);
    if (!selectEl) return;

    const value = selectValue !== undefined ? selectValue : selectEl.value;
    selectEl.innerHTML = generateSelectOptions(storageKey, value, cfg.placeholder);
    renderPreview();
}

/**
 * Añade un elemento a una lista. Devuelve un mensaje de error o null si todo salió bien.
 */
function addListItem(storageKey, rawValue) {
    const value = (rawValue || '').trim();
    if (!value) return 'Escribe un nombre.';

    const list = getSimpleList(storageKey);
    if (list.includes(value)) return `"${value}" ya está en la lista.`;

    list.push(value);
    saveSimpleList(storageKey, list);
    refreshHeaderSelect(storageKey);
    return null;
}

function editListItem(storageKey, oldValue) {
    const cfg = SIMPLE_LISTS[storageKey];
    const newValue = prompt(`Editar ${cfg.label}:`, oldValue);
    if (newValue === null) return false;

    const trimmed = newValue.trim();
    if (!trimmed || trimmed === oldValue) return false;

    const list = getSimpleList(storageKey);
    if (list.includes(trimmed)) {
        alert(`"${trimmed}" ya está en la lista.`);
        return false;
    }

    const index = list.indexOf(oldValue);
    if (index === -1) return false;
    list[index] = trimmed;
    saveSimpleList(storageKey, list);
    renameInSubjectProfMap(storageKey, oldValue, trimmed);

    // Si el elemento editado estaba seleccionado en el encabezado, seguirlo.
    const selectEl = document.getElementById(cfg.selectId);
    const wasSelected = selectEl && selectEl.value === oldValue;
    syncGlobalHeaderData(cfg.headerKey, oldValue, trimmed);
    refreshHeaderSelect(storageKey, wasSelected ? trimmed : undefined);
    return true;
}

function deleteListItem(storageKey, value) {
    const cfg = SIMPLE_LISTS[storageKey];
    if (!confirm(`¿Eliminar "${value}" de la lista de ${cfg.plural}?`)) return false;

    saveSimpleList(storageKey, getSimpleList(storageKey).filter(item => item !== value));
    renameInSubjectProfMap(storageKey, value, null);

    const selectEl = document.getElementById(cfg.selectId);
    const wasSelected = selectEl && selectEl.value === value;
    syncGlobalHeaderData(cfg.headerKey, value, '');
    refreshHeaderSelect(storageKey, wasSelected ? '' : undefined);
    return true;
}

// ==========================================
// VÍNCULO MATERIA → PROFESOR
// Cada materia puede tener un profesor asignado; al elegir la materia en el
// encabezado, el profesor se selecciona solo. Se guarda como { materia: profesor }.
// ==========================================

function getSubjectProfMap() {
    try {
        const map = JSON.parse(localStorage.getItem('subject_prof_map'));
        return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    } catch (e) {
        return {};
    }
}

function saveSubjectProfMap(map) {
    localStorage.setItem('subject_prof_map', JSON.stringify(map));
}

function setSubjectProf(subject, prof) {
    const map = getSubjectProfMap();
    if (prof) map[subject] = prof;
    else delete map[subject];
    saveSubjectProfMap(map);

    // Si esa materia es la que está elegida en el encabezado, aplicar el cambio ya.
    const subjectSelect = document.getElementById('select-subject-main');
    const profSelect = document.getElementById('select-prof-main');
    if (subjectSelect && profSelect && subjectSelect.value === subject && prof) {
        profSelect.value = prof;
        renderPreview();
    }
}

/**
 * Mantiene el vínculo al renombrar (newValue) o eliminar (newValue = null)
 * una materia o un profesor.
 */
function renameInSubjectProfMap(storageKey, oldValue, newValue) {
    const map = getSubjectProfMap();

    if (storageKey === 'list_subjects') {
        if (!(oldValue in map)) return;
        if (newValue) map[newValue] = map[oldValue];
        delete map[oldValue];
    } else {
        Object.keys(map).forEach(subject => {
            if (map[subject] !== oldValue) return;
            if (newValue) map[subject] = newValue;
            else delete map[subject];
        });
    }
    saveSubjectProfMap(map);
}

/**
 * Al elegir una materia en el encabezado, selecciona su profesor vinculado.
 */
function onHeaderSubjectChange(subjectSelect) {
    const prof = getSubjectProfMap()[subjectSelect.value];
    const profSelect = document.getElementById('select-prof-main');
    if (prof && profSelect && getSimpleList('list_profs').includes(prof)) {
        profSelect.value = prof;
    }
    renderPreview();
}

// Función auxiliar para mantener sincronizado el encabezado guardado si cambias algo en las listas
function syncGlobalHeaderData(key, oldValue, newValue) {
    const savedData = getHeaderData();
    if (savedData && savedData[key] === oldValue) {
        setHeaderData({ ...savedData, [key]: newValue });
    }
}

// ==========================================
// FORMATO DE DATOS DEL ENCABEZADO
// ==========================================

/**
 * Nombre(s) del alumno según el encabezado guardado. En equipo devuelve todos
 * los integrantes separados por comas. Acepta el formato antiguo ({ name }).
 */
function getHeaderStudentName(headerData) {
    const h = headerData || {};
    const names = ((h.names && h.names.length) ? h.names : [h.name || ''])
        .map(n => (n || '').trim())
        .filter(Boolean);
    if (!names.length) return '';
    return h.isTeam ? names.join(', ') : names[0];
}

/**
 * Da formato al periodo sin repetir la palabra, según el tipo de periodo del
 * perfil (cuatrimestre, semestre o año escolar):
 * "7" -> "7° Semestre", "7mo" -> "7mo Semestre", "7mo Semestre" -> igual.
 */
function formatTerm(term) {
    const t = (term || '').trim();
    if (!t) return '';
    if (/cuatrimestre|semestre|año|ano escolar/i.test(t)) return t;
    const word = getPeriodWord();
    if (/^\d+$/.test(t)) return `${t}° ${word}`;
    return `${t} ${word}`;
}

// ==========================================
// AUTOGUARDADO Y LIMPIEZA DEL ENCABEZADO
// ==========================================

/**
 * Lee los datos del formulario del encabezado. Cada campo se busca por su id
 * (antes Grupo y Cuatrimestre se leían por posición, y cualquier campo nuevo
 * los desalineaba). La institución no se lee: sale del tema seleccionado.
 */
function readHeaderFromDOM(card) {
    const value = id => {
        const el = card.querySelector('#' + id);
        return el ? el.value : '';
    };
    const checked = id => {
        const el = card.querySelector('#' + id);
        return el ? el.checked : false;
    };

    return {
        names: Array.from(card.querySelectorAll('.student-name-input')).map(input => input.value),
        studentIds: Array.from(card.querySelectorAll('#team-members-container .member-row'))
            .map(row => { const idInput = row.querySelector('.student-id-input'); return idInput ? idInput.value : ''; }),
        isTeam: checked('check-is-team'),
        group: value('header-group'),
        subject: value('select-subject-main'),
        prof: value('select-prof-main'),
        career: value('header-career'),
        term: value('header-term'),
        date: value('header-date'),
        includeLogo: checked('check-include-logo'),
        coverMode: card.dataset.coverMode === '1',
        taskName: value('header-task-name')
    };
}

/**
 * Lee el formulario del encabezado y lo guarda en LocalStorage. Se llama
 * desde renderPreview(), que ya se dispara con cada cambio del formulario,
 * así que los datos quedan guardados sin necesidad de un botón.
 */
function persistHeaderFromDOM() {
    const card = document.getElementById('header-card-main');
    if (!card) return;

    const hDataToSave = readHeaderFromDOM(card);
    setHeaderData(hDataToSave);

    const status = document.getElementById('header-autosave-status');
    if (status) {
        const on = isAutosaveEnabled();
        status.textContent = on ? '✓ Guardado' : 'Sin autoguardado';
        status.classList.toggle('is-off', !on);
    }
}

function clearHeaderData() {
    if (!confirm("¿Limpiar todos los datos del encabezado?")) return;

    setHeaderData(null);

    // Re-renderizamos el bloque completo para que vuelva a un estado limpio
    // (en vez de limpiar campo por campo, lo cual no restablecía
    // correctamente los checkboxes ni la vista previa).
    render();
}

// ==========================================
// termina modificaciones Argel cano para el header (listas desplegables y botones de acción)
// ==========================================
