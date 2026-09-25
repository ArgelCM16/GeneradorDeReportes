// ============================================================================
// GENERADOR DE REPORTES ACADÉMICOS - Script Principal (VERSIÓN SEGURA)
// ============================================================================

// Estado global de la aplicación
let reportData = [];

// ============================================================================
// FUNCIONES DE SEGURIDAD (NUEVAS)
// ============================================================================

/**
 * Escapa caracteres HTML para atributos (previene XSS en value="...")
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado para atributos HTML
 */
function escapeAttr(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Escapa caracteres HTML para contenido (previene XSS en innerHTML)
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// FUNCIONES DE GESTIÓN DE BLOQUES
// ============================================================================

/**
 * Agrega un nuevo bloque al reporte
 * @param {string} type - Tipo de bloque: header, title, subtitle, text, code, image, ref
 */
function addBlock(type) {
    // Solo puede haber un índice: si ya existe, se muestra el que hay
    if (type === 'toc' && reportData.some(b => b.type === 'toc')) {
        render();
        const tocCard = document.querySelector('.toc-card');
        if (tocCard) tocCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const id = Date.now();
    let newBlock = { id, type, content: "" };
    
    // Inicialización específica según el tipo de bloque
    if (type === 'header') {
        newBlock.hData = { 
            name: '', 
            group: '', 
            subject: '', 
            prof: '', 
            inst: '', 
            term: '', 
            date: '' 
        };
    }
    
    if (type === 'image') {
        newBlock.caption = '';
    }
    
    if (type === 'ref') {
        newBlock.refType = 'web';
        newBlock.refData = { 
            author: '', 
            title: '', 
            source: '', 
            year: '', 
            url: '' 
        };
    }
    
    if (type === 'ai') {
        newBlock.aiUsed = 'no'; // Por defecto: NO usó IA
        newBlock.aiData = {
            name: '',
            aiTool: '',
            date: '',
            purpose: '',
            prompt: '',
            attachments: '',
            rawResponse: ''
        };
    }
    
    // Inicialización del bloque de tabla
    if (type === 'table') {
        newBlock.caption = ''; // Descripción de la tabla
        newBlock.columns = 3; // Número de columnas por defecto
        newBlock.tableData = [
            ['', '', ''], // Fila de encabezados
            ['', '', '']  // Primera fila de datos
        ];
    }
    
    reportData.push(newBlock);
    render();
}

/**
 * Elimina un bloque del reporte
 * @param {number} id - ID del bloque a eliminar
 */
function deleteBlock(id) {
    reportData = reportData.filter(block => block.id !== id);
    render();
}

// ============================================================================
// FUNCIONES DE ACTUALIZACIÓN DE CONTENIDO
// ============================================================================

/**
 * Actualiza el contenido de un bloque
 * @param {number} id - ID del bloque
 * @param {string} value - Nuevo valor del contenido
 */
function updateContent(id, value) {
    const block = reportData.find(b => b.id === id);
    if (block) {
        block.content = value;
        renderPreview();
    }
}

/**
 * Actualiza los datos del encabezado
 * @param {number} id - ID del bloque de encabezado
 * @param {string} field - Campo a actualizar
 * @param {string} value - Nuevo valor
 */
function updateHeader(id, field, value) {
    const block = reportData.find(b => b.id === id);
    if (block && block.hData) {
        block.hData[field] = value;
        renderPreview();
    }
}

/**
 * Actualiza el tipo de referencia
 * @param {number} id - ID del bloque de referencia
 * @param {string} type - Nuevo tipo (web, book, article)
 */
function updateRefType(id, type) {
    const block = reportData.find(b => b.id === id);
    if (block) {
        block.refType = type;
        render();
    }
}

/**
 * Actualiza un campo de la referencia
 * @param {number} id - ID del bloque de referencia
 * @param {string} field - Campo a actualizar
 * @param {string} value - Nuevo valor
 */
function updateRef(id, field, value) {
    const block = reportData.find(b => b.id === id);
    if (block) {
        if (!block.refData) {
            block.refData = { author: '', title: '', source: '', year: '', url: '' };
        }
        block.refData[field] = value;
        renderPreview();
    }
}

/**
 * Actualiza el pie de imagen
 * @param {number} id - ID del bloque de imagen
 * @param {string} value - Nuevo texto del pie de imagen
 */
function updateCaption(id, value) {
    const block = reportData.find(b => b.id === id);
    if (block) {
        block.caption = value;
        renderPreview();
    }
}

/**
 * Procesa la carga de una imagen
 * @param {number} id - ID del bloque de imagen
 * @param {HTMLInputElement} input - Input file que contiene la imagen
 */
function handleImage(id, input) {
    if (!input.files[0]) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const block = reportData.find(b => b.id === id);
        if (block) {
            block.content = e.target.result;
            renderPreview();
        }
    };
    reader.readAsDataURL(input.files[0]);
}

/**
 * Actualiza si se usó IA o no
 * @param {number} id - ID del bloque de IA
 * @param {string} value - 'yes' o 'no'
 */
function updateAIUsed(id, value) {
    const block = reportData.find(b => b.id === id);
    if (block) {
        block.aiUsed = value;
        render(); // Re-renderizar para mostrar/ocultar campos
    }
}

/**
 * Actualiza un campo del bloque de IA
 * @param {number} id - ID del bloque de IA
 * @param {string} field - Campo a actualizar
 * @param {string} value - Nuevo valor
 */
function updateAI(id, field, value) {
    const block = reportData.find(b => b.id === id);
    if (block) {
        if (!block.aiData) {
            block.aiData = {
                name: '',
                aiTool: '',
                date: '',
                purpose: '',
                prompt: '',
                attachments: '',
                rawResponse: ''
            };
        }
        block.aiData[field] = value;
        renderPreview();
    }
}

// ============================================================================
// FUNCIONES DE GESTIÓN DE TABLAS
// ============================================================================

/**
 * Actualiza el número de columnas de una tabla
 * @param {number} id - ID del bloque de tabla
 * @param {number} cols - Número de columnas (1-6)
 */
function updateTableColumns(id, cols) {
    const block = reportData.find(b => b.id === id);
    if (!block || block.type !== 'table') return;
    
    // Validar rango
    cols = Math.max(1, Math.min(6, parseInt(cols) || 3));
    block.columns = cols;
    
    // Ajustar datos existentes al nuevo número de columnas
    block.tableData = block.tableData.map(row => {
        if (row.length > cols) {
            // Recortar si hay más columnas
            return row.slice(0, cols);
        } else if (row.length < cols) {
            // Agregar celdas vacías si faltan
            return [...row, ...Array(cols - row.length).fill('')];
        }
        return row;
    });
    
    render();
}

/**
 * Actualiza el contenido de una celda de la tabla
 * @param {number} id - ID del bloque de tabla
 * @param {number} row - Índice de fila
 * @param {number} col - Índice de columna
 * @param {string} value - Nuevo valor
 */
function updateTableCell(id, row, col, value) {
    const block = reportData.find(b => b.id === id);
    if (!block || block.type !== 'table') return;
    
    if (block.tableData[row] && block.tableData[row][col] !== undefined) {
        block.tableData[row][col] = value;
        renderPreview();
    }
}

/**
 * Agrega una nueva fila a la tabla
 * @param {number} id - ID del bloque de tabla
 */
function addTableRow(id) {
    const block = reportData.find(b => b.id === id);
    if (!block || block.type !== 'table') return;
    
    // Crear nueva fila con celdas vacías
    const newRow = Array(block.columns).fill('');
    block.tableData.push(newRow);
    render();
}

/**
 * Elimina la última fila de la tabla
 * @param {number} id - ID del bloque de tabla
 */
function removeTableRow(id) {
    const block = reportData.find(b => b.id === id);
    if (!block || block.type !== 'table') return;
    
    // No permitir eliminar si solo queda la fila de encabezados
    if (block.tableData.length <= 1) {
        alert('La tabla debe tener al menos la fila de encabezados.');
        return;
    }
    
    block.tableData.pop();
    render();
}

/**
 * Actualiza la descripción/caption de la tabla
 * @param {number} id - ID del bloque de tabla
 * @param {string} value - Nueva descripción
 */
function updateTableCaption(id, value) {
    const block = reportData.find(b => b.id === id);
    if (block && block.type === 'table') {
        block.caption = value;
        renderPreview();
    }
}

// ============================================================================
// FUNCIONES DE RENDERIZADO
// ============================================================================

/**
 * Renderiza todo el editor y la vista previa
 */
function render() {
    placeTocAfterHeader();
    renderEditor();
    renderPreview();
	initializeDragAndDrop();
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


    reportData.forEach(block => {
        const div = document.createElement('div');
        div.className = 'block-card-container';
        
        const deleteBtn = `<button class="delete-btn" onclick="deleteBlock(${block.id})" title="Eliminar bloque">&times;</button>`;
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
    const d = savedData || { names: [], name: '', group: '', subject: '', prof: '', term: '', date: '', isTeam: false };

    const displayAddBtn = d.isTeam ? 'inline-block' : 'none';

    // Lógica para renderizar los inputs de nombres guardados
    let membersHtml = '';
    const namesArray = (d.names && d.names.length > 0) ? d.names : [d.name || ''];

    namesArray.forEach((name, i) => {
        let placeholderText = d.isTeam ? `Nombre del integrante ${i + 1}` : 'Nombre del Alumno';
        
        let deleteBtnElement = (d.isTeam && i > 0) ? 
            `<button type="button" class="icon-btn action-icon btn-remove-member" onclick="removeTeamMember(this)" title="Eliminar integrante">🗑️</button>` : '';

        // FORZAMOS EL TAMAÑO: display: flex y flex: 1 en el input
        membersHtml += `
            <div class="input-with-action member-row" style="display: flex; width: 100%;">
                <input type="text" class="student-name-input" placeholder="${placeholderText}" value="${escapeAttr(name)}" oninput="renderPreview()" style="flex: 1; min-width: 0; width: 100%; box-sizing: border-box;">
                ${deleteBtnElement}
            </div>
        `;
    });

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
                
                <button type="button" id="btn-add-member" class="action-btn" onclick="addTeamMember()" style="display: ${displayAddBtn};">
                    ➕ Añadir integrante
                </button>
            </div>

            <!-- Cada campo lleva su etiqueta arriba, para saber qué es aunque ya esté lleno -->
            <div class="grid-inputs">
                <!-- Solo en modo portada -->
                <div class="header-field header-field-wide" id="header-task-field" style="${d.coverMode ? '' : 'display: none;'}">
                    <label for="header-task-name">Nombre de la tarea</label>
                    <input type="text" id="header-task-name" placeholder="Ej. Práctica 3: Redes Neuronales" value="${escapeAttr(d.taskName || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field">
                    <label for="header-group">Grupo</label>
                    <input type="text" id="header-group" placeholder="Ej. IDY-7A" value="${escapeAttr(d.group || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field">
                    <label for="select-subject-main">Materia</label>
                    <select id="select-subject-main" required onchange="onHeaderSubjectChange(this)" title="Las materias se administran en ⚙️ Configuración" style="width: 100%; box-sizing: border-box;">
                        ${generateSelectOptions('list_subjects', d.subject, 'Selecciona una materia...')}
                    </select>
                </div>

                <div class="header-field">
                    <label for="select-prof-main">Profesor</label>
                    <select id="select-prof-main" required onchange="renderPreview()" title="Los profesores se administran en ⚙️ Configuración" style="width: 100%; box-sizing: border-box;">
                        ${generateSelectOptions('list_profs', d.prof, 'Selecciona un profesor...')}
                    </select>
                </div>

                <div class="header-field">
                    <label for="header-inst-display">Institución</label>
                    <input type="text" id="header-inst-display" value="${escapeAttr(currentInstName)}" disabled readonly title="La institución se define según el tema seleccionado en el menú lateral. Las universidades se administran en ⚙️ Configuración." style="width: 100%; box-sizing: border-box; background: #f0f0f0; cursor: not-allowed;">
                </div>

                <div class="header-field header-field-wide">
                    <label for="header-career">Carrera</label>
                    <input type="text" id="header-career" placeholder="Ej. Ingeniería en Datos" value="${escapeAttr(d.career || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field">
                    <label for="header-term">Cuatrimestre</label>
                    <input type="text" id="header-term" placeholder="Ej. 7" value="${escapeAttr(d.term || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field">
                    <label for="header-date">Fecha de entrega</label>
                    <input type="date" id="header-date" value="${escapeAttr(d.date || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
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

// Añade un nuevo input al contenedor
function addTeamMember() {
    const container = document.getElementById('team-members-container');
    const count = container.querySelectorAll('.student-name-input').length;
    
    // Crear el nuevo contenedor con formato
    const newMemberRow = document.createElement('div');
    newMemberRow.className = 'input-with-action member-row';
    newMemberRow.style.width = '100%';
    
    // Inyectar el input y su botón de eliminar
    newMemberRow.innerHTML = `
        <input type="text" class="student-name-input" placeholder="Nombre del integrante ${count + 1}" oninput="renderPreview()">
        <button type="button" class="icon-btn action-icon btn-remove-member" onclick="removeTeamMember(this)" title="Eliminar integrante">🗑️</button>
    `;
    
    container.appendChild(newMemberRow);
    
    if (typeof renderPreview === 'function') {
        renderPreview();
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
 * Da formato al cuatrimestre sin repetir la palabra:
 * "7" -> "7° Cuatrimestre", "7mo" -> "7mo Cuatrimestre",
 * "7mo Cuatrimestre" -> se deja igual.
 */
function formatTerm(term) {
    const t = (term || '').trim();
    if (!t) return '';
    if (/cuatrimestre/i.test(t)) return t;
    if (/^\d+$/.test(t)) return `${t}° Cuatrimestre`;
    return `${t} Cuatrimestre`;
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

// ==========================================
// PORTADA (modo del encabezado)
// El botón "Hacer portada" no agrega un bloque: cambia el formato del propio
// encabezado para que en el documento salga como portada de hoja completa.
// Lo único extra que se pide es el nombre de la tarea.
// ==========================================

function toggleCoverMode() {
    const card = document.getElementById('header-card-main');
    if (!card) return;
    card.dataset.coverMode = card.dataset.coverMode === '1' ? '0' : '1';
    updateCoverModeUI(card);
    renderPreview();

    if (card.dataset.coverMode === '1') {
        const taskInput = document.getElementById('header-task-name');
        if (taskInput) taskInput.focus();
    }
}

/**
 * Muestra u oculta el campo "Nombre de la tarea" y cambia el texto del botón.
 */
function updateCoverModeUI(card) {
    const isCover = card.dataset.coverMode === '1';
    const taskField = document.getElementById('header-task-field');
    if (taskField) taskField.style.display = isCover ? '' : 'none';
    const label = document.getElementById('header-cover-btn-label');
    if (label) label.textContent = isCover ? 'Volver a encabezado' : 'Hacer portada';
    const icon = document.getElementById('header-cover-btn-icon');
    if (icon) icon.textContent = isCover ? '↩' : '📄';
    card.classList.toggle('is-cover-mode', isCover);
}

/**
 * "2026-09-25" -> "25 de septiembre de 2026"
 */
function formatLongDate(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
        'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d} de ${months[m - 1]} de ${y}`;
}

/**
 * HTML de la portada en la vista previa, con todos los datos del encabezado.
 */
function renderCoverPreview(headerData, uni) {
    const h = headerData || {};
    const u = uni || {};

    const names = ((h.names && h.names.length) ? h.names : [h.name || ''])
        .map(n => (n || '').trim()).filter(Boolean);
    const emptyName = '<span class="p-cover-empty">[Nombre del alumno]</span>';
    const studentsHtml = h.isTeam
        ? `<div class="p-cover-row p-cover-students"><span>Integrantes:</span>${names.length ? names.map(n => `<div>${escapeHtml(n)}</div>`).join('') : `<div>${emptyName}</div>`}</div>`
        : `<div class="p-cover-row"><span>Alumno:</span> ${names.length ? escapeHtml(names[0]) : emptyName}</div>`;

    const row = (label, value) => value
        ? `<div class="p-cover-row"><span>${label}:</span> ${escapeHtml(value)}</div>` : '';

    const logos = (h.includeLogo && (u.logoLeft || u.logoRight)) ? `
        <div class="p-cover-logos">
            ${u.logoLeft ? `<img src="${escapeAttr(u.logoLeft)}" alt="Logo">` : '<span></span>'}
            ${u.logoRight ? `<img src="${escapeAttr(u.logoRight)}" alt="Logo">` : '<span></span>'}
        </div>` : '';

    const task = (h.taskName || '').trim();

    return `
        <div class="p-cover">
            ${logos}
            <div class="p-cover-uni">${escapeHtml(u.id === 'generic' ? '' : (u.name || ''))}</div>
            ${h.career ? `<div class="p-cover-career">${escapeHtml(h.career)}</div>` : ''}
            <div class="p-cover-title">${task ? escapeHtml(task) : '<span class="p-cover-empty">[Nombre de la tarea]</span>'}</div>
            <div class="p-cover-details">
                ${row('Materia', h.subject)}
                ${row('Profesor', h.prof)}
                ${studentsHtml}
                ${row('Grupo', h.group)}
                ${row('Cuatrimestre', formatTerm(h.term))}
            </div>
            <div class="p-cover-date">${escapeHtml(formatLongDate(h.date))}</div>
        </div>`;
}

// ==========================================
// FORMATO DE LAS REFERENCIAS (IEEE o APA 7)
// Es una sola opción para todo el documento; se elige desde la etiqueta
// de cualquier tarjeta de referencia y se guarda con el proyecto.
// ==========================================

function getCitationStyle() {
    return localStorage.getItem('citationStyle') === 'apa' ? 'apa' : 'ieee';
}

function setCitationStyle(style) {
    localStorage.setItem('citationStyle', style === 'apa' ? 'apa' : 'ieee');
    render();
}

/**
 * Referencia en formato APA 7. Con html = true devuelve HTML (cursivas),
 * con html = false devuelve texto plano (para el TXT).
 */
function formatAPAReference(type, author, title, source, year, url, html = true) {
    const esc = html ? escapeHtml : (t => t || '');
    const it = t => html ? `<em>${esc(t)}</em>` : esc(t);
    const a = (author || '').trim();
    const y = (year || '').trim() || 's.f.';
    const authorPart = a ? `${esc(a)}${/[.]$/.test(a) ? '' : '.'} ` : '';

    if (type === 'book') {
        return `${authorPart}(${esc(y)}). ${it(title)}. ${esc(source)}.`;
    }
    if (type === 'article') {
        return `${authorPart}(${esc(y)}). ${esc(title)}. ${it(source)}.`;
    }
    // Página web
    return `${authorPart}(${esc(y)}). ${it(title)}. ${esc(source)}.${url ? ' ' + esc(url) : ''}`;
}

// ==========================================
// ZOOM DE LA VISTA PREVIA (solo pantalla; no afecta la impresión)
// Las hojas son de tamaño real (8.5 in de ancho), así que por defecto se
// ajustan al ancho del panel ("fit"). Con − y + se pasa a un nivel fijo y
// con clic en el porcentaje se vuelve a ajustar al ancho.
// ==========================================

const PREVIEW_ZOOM_LEVELS = [0.25, 0.33, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5];
const PAGE_WIDTH_PX = 816; // 8.5 in a 96 dpi

function getPreviewZoom() {
    const stored = localStorage.getItem('previewZoom');
    const z = parseFloat(stored);
    return PREVIEW_ZOOM_LEVELS.includes(z) ? z : 'fit';
}

/**
 * Zoom con el que cabe una hoja completa a lo ancho del panel.
 */
function getFitZoom() {
    const scroller = document.querySelector('.preview-scroll');
    if (!scroller || !scroller.clientWidth) return 0.5;
    const style = getComputedStyle(scroller);
    const available = scroller.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return Math.max(0.2, Math.min(1.5, available / PAGE_WIDTH_PX));
}

function getEffectiveZoom() {
    const z = getPreviewZoom();
    return z === 'fit' ? getFitZoom() : z;
}

/**
 * @param {number|'fit'} zoom
 */
function setPreviewZoom(zoom) {
    const value = PREVIEW_ZOOM_LEVELS.includes(zoom) ? zoom : 'fit';
    localStorage.setItem('previewZoom', String(value));
    applyPreviewZoom();
}

function applyPreviewZoom() {
    const z = getEffectiveZoom();
    const preview = document.getElementById('preview-container');
    if (preview) preview.style.setProperty('--preview-zoom', z);
    const label = document.getElementById('preview-zoom-label');
    if (label) {
        label.textContent = `${Math.round(z * 100)}%`;
        label.title = getPreviewZoom() === 'fit' ? 'Ajustado al ancho' : 'Clic para ajustar al ancho';
    }
}

/**
 * Sube (+1) o baja (-1) un nivel de zoom a partir del zoom actual.
 */
function changePreviewZoom(direction) {
    const current = getEffectiveZoom();
    const levels = PREVIEW_ZOOM_LEVELS;
    let next;
    if (direction > 0) {
        next = levels.find(l => l > current + 0.001) || levels[levels.length - 1];
    } else {
        next = [...levels].reverse().find(l => l < current - 0.001) || levels[0];
    }
    setPreviewZoom(next);
}

document.addEventListener('DOMContentLoaded', applyPreviewZoom);
window.addEventListener('resize', () => {
    if (getPreviewZoom() === 'fit') applyPreviewZoom();
});

// ==========================================
// ANCHO DE LA VISTA PREVIA
// El divisor entre el editor y la vista previa se arrastra para cambiar su
// ancho (doble clic = tamaño normal). El botón de la barra de la vista previa
// la agranda de un clic. El ancho elegido se recuerda.
// ==========================================

const PREVIEW_MIN_WIDTH = 320;   // ancho mínimo de la vista previa
const EDITOR_MIN_WIDTH = 380;    // lo que siempre le queda al editor
const PREVIEW_EXPANDED_RATIO = 0.6;

function getPreviewWidthLimits() {
    const workspace = document.querySelector('.workspace');
    const total = workspace ? workspace.clientWidth : window.innerWidth;
    return { min: PREVIEW_MIN_WIDTH, max: Math.max(PREVIEW_MIN_WIDTH, total - EDITOR_MIN_WIDTH), total };
}

/**
 * Aplica un ancho (en px) a la vista previa, o `null` para volver al del CSS.
 * @param {number|null} width
 * @param {boolean} save - guardarlo para la próxima vez
 */
function setPreviewWidth(width, save = true) {
    const pane = document.getElementById('preview-pane');
    if (!pane) return;

    if (width === null) {
        pane.style.flex = '';
        if (save) localStorage.removeItem('previewWidth');
    } else {
        const { min, max } = getPreviewWidthLimits();
        const w = Math.round(Math.min(max, Math.max(min, width)));
        pane.style.flex = `0 0 ${w}px`;
        if (save) localStorage.setItem('previewWidth', String(w));
    }

    updatePreviewExpandButton();
    // Si el zoom está en "ajustar al ancho", la hoja se agranda con el panel
    if (getPreviewZoom() === 'fit') applyPreviewZoom();
}

function isPreviewExpanded() {
    const pane = document.getElementById('preview-pane');
    const { total } = getPreviewWidthLimits();
    return !!pane && pane.getBoundingClientRect().width >= total * (PREVIEW_EXPANDED_RATIO - 0.05);
}

function togglePreviewExpanded() {
    if (isPreviewExpanded()) {
        setPreviewWidth(null);
    } else {
        setPreviewWidth(getPreviewWidthLimits().total * PREVIEW_EXPANDED_RATIO);
    }
}

function updatePreviewExpandButton() {
    const expanded = isPreviewExpanded();
    const icon = document.getElementById('preview-expand-icon');
    if (icon) icon.textContent = expanded ? 'close_fullscreen' : 'open_in_full';
    const btn = document.getElementById('preview-expand-btn');
    if (btn) btn.title = expanded ? 'Tamaño normal' : 'Agrandar vista previa';
}

function initPaneResizer() {
    const resizer = document.getElementById('pane-resizer');
    const pane = document.getElementById('preview-pane');
    if (!resizer || !pane) return;

    // Ancho guardado de la vez anterior
    const saved = parseFloat(localStorage.getItem('previewWidth'));
    if (saved) setPreviewWidth(saved, false);
    else updatePreviewExpandButton();

    resizer.addEventListener('pointerdown', event => {
        event.preventDefault();
        try { resizer.setPointerCapture(event.pointerId); } catch (e) { /* sin captura también funciona */ }
        document.body.classList.add('is-resizing-panes');

        // La vista previa está a la derecha: su ancho = borde derecho - cursor
        const right = pane.getBoundingClientRect().right;
        const onMove = e => setPreviewWidth(right - e.clientX, false);
        const onUp = e => {
            try { resizer.releasePointerCapture(e.pointerId); } catch (err) { /* ya liberado */ }
            resizer.removeEventListener('pointermove', onMove);
            resizer.removeEventListener('pointerup', onUp);
            resizer.removeEventListener('pointercancel', onUp);
            document.body.classList.remove('is-resizing-panes');
            setPreviewWidth(pane.getBoundingClientRect().width); // guardar
        };
        resizer.addEventListener('pointermove', onMove);
        resizer.addEventListener('pointerup', onUp);
        resizer.addEventListener('pointercancel', onUp);
    });

    resizer.addEventListener('dblclick', () => setPreviewWidth(null));

    // Con teclado: flechas para ajustar de 40 en 40 px
    resizer.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const width = pane.getBoundingClientRect().width;
        setPreviewWidth(width + (event.key === 'ArrowLeft' ? 40 : -40));
    });

    // Si la ventana se achica, que el editor no quede aplastado
    window.addEventListener('resize', () => {
        const stored = parseFloat(localStorage.getItem('previewWidth'));
        if (stored) setPreviewWidth(stored, false);
        else updatePreviewExpandButton();
    });
}

document.addEventListener('DOMContentLoaded', initPaneResizer);

// ==========================================
// VISTA PREVIA EN PÁGINAS REALES
// El documento se reparte en hojas tamaño carta (8.5 x 11 in, márgenes de
// 2 cm) y se imprime exactamente así: lo que se ve es lo que sale en el PDF.
// Los párrafos, el código y las tablas largas se parten entre páginas; lo
// que no se puede partir (una imagen, un encabezado) pasa completo a la
// siguiente hoja.
// ==========================================

// Tamaño natural de las imágenes ya cargadas (src -> { w, h }). Sirve para
// que la imagen ocupe su alto real desde antes de terminar de cargar; si no,
// mide 0 al paginar, "cabe" en cualquier lado y luego desborda la hoja.
const previewImageSizes = new Map();
let repaginateTimer = null;

function paginatePreview(container, html) {
    // Al rearmar las hojas el panel se vacía un momento; guardamos la posición
    // de desplazamiento para que no brinque al inicio mientras se escribe.
    const scroller = container.closest('.preview-scroll');
    const scrollTop = scroller ? scroller.scrollTop : 0;
    const scrollLeft = scroller ? scroller.scrollLeft : 0;
    container.style.minHeight = container.offsetHeight + 'px';

    const source = document.createElement('div');
    source.innerHTML = html;
    container.innerHTML = '';

    // Imágenes: con tamaño conocido se les pone width/height (el navegador
    // reserva su alto); las nuevas se miden al cargar y se repagina una vez.
    const unknownImages = [];
    source.querySelectorAll('img').forEach(img => {
        const size = previewImageSizes.get(img.getAttribute('src'));
        if (size) {
            img.setAttribute('width', size.w);
            img.setAttribute('height', size.h);
        } else {
            unknownImages.push(img);
        }
    });

    let pageEl = null;
    let body = null;
    let pageNumber = 0;
    let forceNewPage = false;

    const startPage = (isCover = false) => {
        pageNumber++;
        pageEl = document.createElement('div');
        pageEl.className = 'preview-page' + (isCover ? ' is-cover-page' : '');
        pageEl.dataset.page = pageNumber;
        body = document.createElement('div');
        body.className = 'preview-page-body';
        pageEl.appendChild(body);
        if (!isCover) {
            const num = document.createElement('div');
            num.className = 'preview-page-number';
            num.textContent = pageNumber;
            pageEl.appendChild(num);
        }
        container.appendChild(pageEl);
        forceNewPage = false;
    };

    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    const isEmpty = () => body.childElementCount === 0;

    // Intenta poner en `parent` la mayor parte de `el` que quepa.
    // Devuelve: el mismo `el` si no cupo nada, el resto que falta, o null.
    const splitToFit = (el, parent) => {
        if (el.matches('p.p-text') && el.children.length === 0) return splitByTokens(el, parent, ' ', node => node);
        if (el.matches('pre')) return splitPre(el, parent);
        if (el.matches('.preview-table-container')) return splitTable(el, parent);
        if (el.dataset.split === 'children') return splitChildren(el, parent);
        return el;
    };

    // Parte un elemento de texto por palabras (o líneas), con búsqueda binaria.
    const splitByTokens = (el, parent, separator, getTextNode) => {
        const target = getTextNode(el);
        const tokens = target.textContent.split(separator);
        if (tokens.length < 2) return el;

        const build = count => {
            const clone = el.cloneNode(true);
            getTextNode(clone).textContent = tokens.slice(0, count).join(separator);
            return clone;
        };

        let low = 0;
        let high = tokens.length - 1;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const trial = build(mid);
            parent.appendChild(trial);
            const ok = fits();
            parent.removeChild(trial);
            if (ok) low = mid; else high = mid - 1;
        }
        if (low === 0) return el;

        const first = build(low);
        first.classList.add('p-split-start');
        parent.appendChild(first);

        const rest = el.cloneNode(true);
        getTextNode(rest).textContent = tokens.slice(low).join(separator);
        rest.classList.add('p-split-rest');
        return rest;
    };

    const splitPre = (el, parent) => {
        const inner = el.firstElementChild && el.firstElementChild.tagName === 'CODE';
        return splitByTokens(el, parent, '\n', node => inner ? node.firstElementChild : node);
    };

    // Tabla: se reparten las filas; el encabezado se repite y la descripción
    // va solo en la última parte.
    const splitTable = (el, parent) => {
        const rows = el.querySelectorAll('tbody tr');
        if (rows.length < 2) return el;

        const build = (start, end, withCaption) => {
            const clone = el.cloneNode(true);
            const cloneRows = clone.querySelectorAll('tbody tr');
            cloneRows.forEach((row, i) => { if (i < start || i >= end) row.remove(); });
            if (!withCaption) {
                const caption = clone.querySelector('.table-caption');
                if (caption) caption.remove();
            }
            return clone;
        };

        let low = 0;
        let high = rows.length - 1;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const trial = build(0, mid, false);
            parent.appendChild(trial);
            const ok = fits();
            parent.removeChild(trial);
            if (ok) low = mid; else high = mid - 1;
        }
        if (low === 0) return el;

        parent.appendChild(build(0, low, false));
        return build(low, rows.length, true);
    };

    // Contenedores (índice, declaración de IA): se reparten sus hijos.
    const splitChildren = (el, parent) => {
        const first = el.cloneNode(false);
        parent.appendChild(first);
        const kids = Array.from(el.children);
        let index = 0;
        let remainderChild = null;

        for (; index < kids.length; index++) {
            first.appendChild(kids[index]);
            if (fits()) continue;
            first.removeChild(kids[index]);
            const rest = splitToFit(kids[index], first);
            if (rest !== kids[index]) {
                remainderChild = rest;
                index++;
            }
            break;
        }

        if (first.children.length === 0) {
            parent.removeChild(first);
            return el;
        }
        if (index >= kids.length && !remainderChild) return null;

        const rest = el.cloneNode(false);
        if (remainderChild) rest.appendChild(remainderChild);
        kids.slice(index).forEach(kid => rest.appendChild(kid));
        return rest;
    };

    const place = el => {
        body.appendChild(el);
        if (fits()) return;
        body.removeChild(el);

        const rest = splitToFit(el, body);
        if (rest === el) {
            if (isEmpty()) {
                // No cabe ni en una hoja vacía y no se puede partir: se deja así.
                body.appendChild(el);
                return;
            }
            startPage();
            place(el);
            return;
        }
        if (rest) {
            startPage();
            place(rest);
        }
    };

    Array.from(source.children).forEach(el => {
        const isCover = el.classList.contains('p-cover');
        const pageBreak = el.dataset.pageBreak || '';
        const breakBefore = isCover || pageBreak === 'before' || pageBreak === 'both';
        const breakAfter = isCover || pageBreak === 'after' || pageBreak === 'both';

        if (!body || forceNewPage || (breakBefore && !isEmpty())) {
            startPage(isCover);
        } else if (isCover) {
            // La hoja actual está vacía: se vuelve la hoja de portada
            pageEl.classList.add('is-cover-page');
            const num = pageEl.querySelector('.preview-page-number');
            if (num) num.remove();
        }

        place(el);
        if (breakAfter) forceNewPage = true;
    });

    // Documento vacío: una hoja en blanco
    if (!body) startPage();

    container.style.minHeight = '';
    if (scroller) {
        scroller.scrollTop = scrollTop;
        scroller.scrollLeft = scrollLeft;
    }

    // Cuando terminen de cargar las imágenes nuevas, se guardan sus medidas
    // y se vuelve a paginar (la siguiente vez ya se conocen: no hay ciclo).
    unknownImages.forEach(img => {
        const remember = () => {
            if (!img.naturalWidth || !img.naturalHeight) return;
            previewImageSizes.set(img.getAttribute('src'), { w: img.naturalWidth, h: img.naturalHeight });
            clearTimeout(repaginateTimer);
            repaginateTimer = setTimeout(renderPreview, 30);
        };
        if (img.complete) remember();
        else img.addEventListener('load', remember, { once: true });
    });
}

// ==========================================
// ÍNDICE (tabla de contenido)
// Lista los títulos y subtítulos con el número de página donde quedaron.
// ==========================================

/**
 * El índice siempre va justo después del encabezado (o al inicio si no hay
 * encabezado), sin importar dónde se agregó o a dónde se arrastró.
 */
function placeTocAfterHeader() {
    const tocs = reportData.filter(b => b.type === 'toc');
    if (!tocs.length) return;
    const others = reportData.filter(b => b.type !== 'toc');
    const insertAt = others.findIndex(b => b.type === 'header') + 1; // 0 si no hay encabezado
    reportData = [...others.slice(0, insertAt), ...tocs, ...others.slice(insertAt)];
}

/**
 * Map id de bloque -> número de ancla, solo para títulos y subtítulos con texto.
 */
function getTocAnchors() {
    const anchors = new Map();
    reportData.forEach(block => {
        if ((block.type === 'title' || block.type === 'subtitle') && (block.content || '').trim()) {
            anchors.set(block.id, anchors.size + 1);
        }
    });
    return anchors;
}

function renderTocPreview(block, tocAnchors) {
    const entries = reportData
        .filter(b => tocAnchors.has(b.id))
        .map(b => `
            <div class="p-toc-entry ${b.type === 'title' ? 'p-toc-level-1' : 'p-toc-level-2'}" data-toc-ref="${tocAnchors.get(b.id)}">
                <span class="p-toc-text">${escapeHtml(b.content.trim())}</span>
                <span class="p-toc-dots"></span>
                <span class="p-toc-page"></span>
            </div>`)
        .join('');

    return `
        <div class="p-toc" data-page-break="after" data-split="children">
            <h2 class="p-toc-title">${escapeHtml((block.content || '').trim() || 'Índice')}</h2>
            ${entries || '<p class="p-toc-empty">Agrega bloques de Título o Subtítulo para que aparezcan aquí.</p>'}
        </div>`;
}

/**
 * Después de paginar: pone a cada entrada del índice la página de su título.
 */
function fillTocPageNumbers(container) {
    container.querySelectorAll('[data-toc-ref]').forEach(entry => {
        const target = container.querySelector(`[data-toc-anchor="${entry.dataset.tocRef}"]`);
        const page = target ? target.closest('.preview-page') : null;
        const number = entry.querySelector('.p-toc-page');
        if (number) number.textContent = page ? page.dataset.page : '';
    });
}

function renderTocEditor(block, deleteBtn) {
    const count = getTocAnchors().size;
    return `
        <div class="block-card toc-card">
            ${deleteBtn}
            <label>Índice</label>
            <p class="block-hint">Se arma solo con los bloques de Título y Subtítulo, con el número de página donde quedó cada uno. Siempre va después del encabezado (o en la hoja siguiente a la portada) y el contenido empieza en la hoja de después. ${count ? `Ahora tiene ${count} ${count === 1 ? 'entrada' : 'entradas'}.` : 'Todavía no hay títulos.'}</p>
            <span class="field-label">Título del índice</span>
            <input type="text" class="editor-input" value="${escapeAttr(block.content || '')}" placeholder="Índice" oninput="updateContent(${block.id}, this.value)">
        </div>`;
}

/**
 * Renderiza el editor de título (AHORA SEGURO)
 */
function renderTitleEditor(block, deleteBtn) {
    return `
        <div class="block-card title-card">
            ${deleteBtn}
            <label>Título principal</label>
            <span class="field-label">Título del reporte</span>
            <input type="text" class="editor-input" value="${escapeAttr(block.content)}" placeholder="Ej. Reporte de Práctica 1" oninput="updateContent(${block.id}, this.value)">
        </div>`;
}

/**
 * Renderiza el editor de subtítulo (AHORA SEGURO)
 */
function renderSubtitleEditor(block, deleteBtn) {
    return `
        <div class="block-card subtitle-card">
            ${deleteBtn}
            <label>Subtítulo</label>
            <span class="field-label">Texto del subtítulo</span>
            <input type="text" class="editor-input" value="${escapeAttr(block.content)}" placeholder="Ej. Introducción o Metodología" oninput="updateContent(${block.id}, this.value)">
        </div>`;
}

/**
 * Renderiza el editor de texto (AHORA SEGURO)
 */
function renderTextEditor(block, deleteBtn) {
    return `
        <div class="block-card text-card">
            ${deleteBtn}
            <label>Párrafo</label>
            <span class="field-label">Contenido del párrafo</span>
            <textarea class="editor-input" placeholder="Escribe tu texto aquí..." oninput="updateContent(${block.id}, this.value)">${escapeHtml(block.content)}</textarea>
        </div>`;
}

/**
 * Renderiza el editor de código (AHORA SEGURO)
 */
function renderCodeEditor(block, deleteBtn) {
    return `
        <div class="block-card code-card">
            ${deleteBtn}
            <label>Código</label>
            <span class="field-label">Código fuente</span>
            <textarea class="code-input" placeholder="Pega tu código aquí..." oninput="updateContent(${block.id}, this.value)">${escapeHtml(block.content)}</textarea>
        </div>`;
}

/**
 * Renderiza el editor de imagen (AHORA SEGURO)
 */
function renderImageEditor(block, deleteBtn) {
    return `
        <div class="block-card image-card">
            ${deleteBtn}
            <label>Imagen</label>
            <input type="file" accept="image/*" onchange="handleImage(${block.id}, this)" style="margin-top: 10px;">
            <input type="text" class="editor-input" placeholder="Descripción de la imagen" value="${escapeAttr(block.caption || '')}" oninput="updateCaption(${block.id}, this.value)">
            ${block.content ? `<img src="${escapeAttr(block.content)}" style="max-width: 100%; margin-top: 10px; border-radius: 4px;">` : ''}
        </div>`;
}

/**
 * Renderiza el editor de tabla con grid visual
 */
function renderTableEditor(block, deleteBtn) {
    const cols = block.columns || 3;
    const tableData = block.tableData || [['', '', ''], ['', '', '']];
    
    // Generar grid de inputs
    let gridHTML = '';
    for (let row = 0; row < tableData.length; row++) {
        for (let col = 0; col < cols; col++) {
            const value = tableData[row] && tableData[row][col] !== undefined ? tableData[row][col] : '';
            const placeholder = row === 0 ? `Encabezado ${col + 1}` : `Fila ${row}, Col ${col + 1}`;
            gridHTML += `<input 
                type="text" 
                ${row === 0 ? 'class="table-header-cell"' : ''}
                placeholder="${placeholder}" 
                value="${escapeAttr(value)}" 
                oninput="updateTableCell(${block.id}, ${row}, ${col}, this.value)"
            >`;
        }
    }
    
    return `
        <div class="block-card table-card">
            ${deleteBtn}
            <label>Tabla</label>
            
            <!-- Controles de la tabla -->
            <div class="table-controls">
                <label>Columnas:</label>
                <input 
                    type="number" 
                    min="1" 
                    max="6" 
                    value="${cols}" 
                    onchange="updateTableColumns(${block.id}, this.value)"
                >
                <button class="btn-add-row" onclick="addTableRow(${block.id})" title="Agregar fila">
                    ➕ Fila
                </button>
                <button class="btn-remove-row" onclick="removeTableRow(${block.id})" title="Eliminar última fila">
                    ➖ Fila
                </button>
            </div>
            
            <!-- Grid de la tabla -->
            <div class="table-grid" style="grid-template-columns: repeat(${cols}, 1fr);">
                ${gridHTML}
            </div>
            
            <!-- Descripción de la tabla -->
            <input 
                type="text" 
                class="editor-input" 
                placeholder="Descripción de la tabla" 
                value="${escapeAttr(block.caption || '')}" 
                oninput="updateTableCaption(${block.id}, this.value)"
            >
        </div>`;
}

/**
 * Renderiza el editor de referencia (AHORA SEGURO)
 */
function renderRefEditor(block, deleteBtn) {
    const r = block.refData || {};
    return `
        <div class="block-card ref-card">
            ${deleteBtn}
            <label>Referencia bibliográfica</label>
            <select class="block-tag citation-style-select" onchange="setCitationStyle(this.value)" title="Formato de todas las referencias del documento">
                <option value="ieee" ${getCitationStyle() === 'ieee' ? 'selected' : ''}>Formato IEEE</option>
                <option value="apa" ${getCitationStyle() === 'apa' ? 'selected' : ''}>Formato APA 7ma Ed.</option>
            </select>
            <select onchange="updateRefType(${block.id}, this.value)" style="margin-top: 10px; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                <option value="web" ${block.refType === 'web' ? 'selected' : ''}>Página Web</option>
                <option value="book" ${block.refType === 'book' ? 'selected' : ''}>Libro</option>
                <option value="article" ${block.refType === 'article' ? 'selected' : ''}>Artículo</option>
            </select>
            <input type="text" class="editor-input" placeholder="Autor(es)" value="${escapeAttr(r.author)}" oninput="updateRef(${block.id}, 'author', this.value)">
            <input type="text" class="editor-input" placeholder="Título" value="${escapeAttr(r.title)}" oninput="updateRef(${block.id}, 'title', this.value)">
            <input type="text" class="editor-input" placeholder="${block.refType === 'book' ? 'Editorial' : 'Fuente/Revista'}" value="${escapeAttr(r.source)}" oninput="updateRef(${block.id}, 'source', this.value)">
            <input type="text" class="editor-input" placeholder="Año" value="${escapeAttr(r.year)}" oninput="updateRef(${block.id}, 'year', this.value)">
            ${block.refType === 'web' ? `<input type="url" class="editor-input" placeholder="URL completa" value="${escapeAttr(r.url)}" oninput="updateRef(${block.id}, 'url', this.value)">` : ''}
        </div>`;
}

/**
 * Renderiza el editor de declaración de uso de IA
 */
function renderAIEditor(block, deleteBtn) {
    const ai = block.aiData || {};
    
    // Nombre del alumno del encabezado (se usa si no se escribe otro aquí)
    const studentName = getHeaderStudentName(getHeaderData());
    
    return `
        <div class="block-card ai-card">
            ${deleteBtn}
            <label>Declaración de uso de IA</label>

			<div style="margin-top: 15px;">
                <label>¿Utilizaste IA para este trabajo?</label>
                <div style="margin-top: 8px;">
                    <label style="margin-right: 20px; cursor: pointer;">
                        <input type="radio" name="aiUsed_${block.id}" value="no"
                            ${block.aiUsed === 'no' ? 'checked' : ''}
                            onchange="updateAIUsed(${block.id}, 'no')">
                        No
                    </label>
                    <label style="cursor: pointer;">
                        <input type="radio" name="aiUsed_${block.id}" value="yes"
                            ${block.aiUsed === 'yes' ? 'checked' : ''}
                            onchange="updateAIUsed(${block.id}, 'yes')">
                        Sí
                    </label>
                </div>
            </div>
            
            ${block.aiUsed === 'no' ? `
                <div style="margin-top: 15px; padding: 15px; background: #e8f8f5; border-radius: 5px;">
                    <p style="margin: 0 0 10px 0; font-size: 0.9em; color: #555;">
                        <strong>Nombre del estudiante que declara:</strong>
                    </p>
                    <input type="text" class="editor-input" placeholder="Nombre completo del estudiante"
                        value="${escapeAttr(ai.name)}"
                        oninput="updateAI(${block.id}, 'name', this.value)">
                </div>
            ` : ''}
            
            ${block.aiUsed === 'yes' ? `
                <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-radius: 5px;">
            
                    <p style="margin: 0 0 10px 0; font-size: 0.9em; color: #555;">
                        <strong>Completa los siguientes campos para cada uso de IA:</strong>
                    </p>
                    <input type="text" class="editor-input" placeholder="${studentName ? `Nombre del estudiante (por defecto: ${escapeAttr(studentName)})` : 'Nombre del estudiante'}" value="${escapeAttr(ai.name)}" oninput="updateAI(${block.id}, 'name', this.value)">
                    <input type="text" class="editor-input" placeholder="IA utilizada (ej. ChatGPT, Claude, Gemini)" value="${escapeAttr(ai.aiTool)}" oninput="updateAI(${block.id}, 'aiTool', this.value)">
                    <input type="date" class="editor-input" placeholder="Fecha de uso" value="${escapeAttr(ai.date)}" oninput="updateAI(${block.id}, 'date', this.value)">
                    <input type="text" class="editor-input" placeholder="Propósito (ej. depuración, investigación, redacción)" value="${escapeAttr(ai.purpose)}" oninput="updateAI(${block.id}, 'purpose', this.value)">
                    <textarea class="editor-input" placeholder="Prompt utilizado" oninput="updateAI(${block.id}, 'prompt', this.value)">${escapeHtml(ai.prompt)}</textarea>
                    <input type="text" class="editor-input" placeholder="Archivos adjuntos suministrados (ej. reporte.docx, libro.pdf, www.link.com)" value="${escapeAttr(ai.attachments)}" oninput="updateAI(${block.id}, 'attachments', this.value)">
                    <textarea class="editor-input" placeholder="Respuesta en crudo (raw response)" style="min-height: 120px;" oninput="updateAI(${block.id}, 'rawResponse', this.value)">${escapeHtml(ai.rawResponse)}</textarea>
                </div>
            ` : ''}
        </div>`;
}

/**
 * Renderiza solo la vista previa (lado derecho)
 */
function renderPreview() {
    // Autoguardado del encabezado: renderPreview se dispara con cada cambio
    // del formulario, así que aquí guardamos lo que haya en pantalla.
    persistHeaderFromDOM();

    const preview = document.getElementById('preview-container');
    let figureCounter = 0;
    let tableCounter = 0;
    let refCounter = 0;

    // 1. Obtener los datos del encabezado desde el LocalStorage
    const savedHeader = getHeaderData() || {};

    // Títulos y subtítulos que van en el índice (con un número de ancla)
    const tocAnchors = getTocAnchors();

    const previewHTML = reportData.map(block => {
        switch(block.type) {
            case 'toc':
                return renderTocPreview(block, tocAnchors);

            case 'title':
                return `<h1 class="p-title"${tocAnchors.has(block.id) ? ` data-toc-anchor="${tocAnchors.get(block.id)}"` : ''}>${escapeHtml(block.content)}</h1>`;
            
            case 'subtitle':
                return `<h2 class="p-subtitle"${tocAnchors.has(block.id) ? ` data-toc-anchor="${tocAnchors.get(block.id)}"` : ''}>${escapeHtml(block.content)}</h2>`;
            
            case 'text':
                return `<p class="p-text">${escapeHtml(block.content)}</p>`;
            
            case 'image':
                figureCounter++;
                return `
                    <div class="preview-image-container">
                        ${block.content ? `<img src="${escapeAttr(block.content)}" alt="Figura ${figureCounter}">` : '<div class="placeholder">Imagen no seleccionada</div>'}
                        <p class="figure-caption"><strong>Figura ${figureCounter}:</strong> <em>${escapeHtml(block.caption || '')}</em></p>
                    </div>`;
            
            case 'table':
                tableCounter++;
                if (!block.tableData || block.tableData.length === 0) return '';
                
                let tableHTML = '<table><thead><tr>';
                const headers = block.tableData[0] || [];
                headers.forEach(cell => {
                    tableHTML += `<th>${escapeHtml(cell)}</th>`;
                });
                tableHTML += '</tr></thead><tbody>';
                
                for (let i = 1; i < block.tableData.length; i++) {
                    tableHTML += '<tr>';
                    const row = block.tableData[i] || [];
                    row.forEach(cell => {
                        tableHTML += `<td>${escapeHtml(cell)}</td>`;
                    });
                    tableHTML += '</tr>';
                }
                
                tableHTML += '</tbody></table>';
                
                return `
                    <div class="preview-table-container">
                        ${tableHTML}
                        <p class="table-caption"><strong>Tabla ${tableCounter}:</strong> <em>${escapeHtml(block.caption || '')}</em></p>
                    </div>`;
            
            case 'code':
                return `<pre class="code-preview"><code>${escapeHtml(block.content)}</code></pre>`;
            
            
case 'header':
            // Por defecto, leemos de los datos guardados
            let liveData = { ...(getHeaderData() || {}) };
            
            // Aseguramos compatibilidad inicial si el objeto en localStorage usa el formato antiguo
            if (liveData.name && !liveData.names) {
                liveData.names = [liveData.name];
                liveData.isTeam = false;
            }

            // Si el editor está en pantalla, leemos directamente del formulario
            const headerCard = document.getElementById('header-card-main');
            if (headerCard) {
                liveData = readHeaderFromDOM(headerCard);
            }

            // LÓGICA DE TEMAS PARA LOGOS E INSTITUCIÓN: ambos se resuelven según la
            // universidad seleccionada en el selector de temas del nav (no son
            // editables desde el propio bloque de encabezado)
            const currentThemeId = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
            const currentUni = getUniversityById(currentThemeId) || getUniversityById('generic') || {};
            // Modo portada: el encabezado sale como portada de hoja completa
            if (liveData.coverMode) {
                return renderCoverPreview(liveData, currentUni);
            }

            const logoIzquierdo = currentUni.logoLeft || '';
            const logoDerecho = currentUni.logoRight || '';

            // Generar el HTML de los logos si el checkbox está marcado
            let logosHTML = '';
            if (liveData.includeLogo) {
                const leftLogoHTML = logoIzquierdo
                    ? `<img src="${escapeAttr(logoIzquierdo)}" alt="Logo Institución" style="height: 80px; max-width: 100px; object-fit: contain;">`
                    : `<div style="height: 80px; width: 100px;"></div>`;
                const rightLogoHTML = logoDerecho
                    ? `<img src="${escapeAttr(logoDerecho)}" alt="Logo Carrera" style="height: 80px; max-width: 100px; object-fit: contain;">`
                    : `<div style="height: 80px; width: 100px;"></div>`;

                logosHTML = `
                    <div class="header-logos" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        ${leftLogoHTML}
                        ${rightLogoHTML}
                    </div>
                `;
            }

            // NUEVA LÓGICA: Procesamos los nombres para mostrarlos correctamente en el documento final
            let nombresHtmlFinal = '';
            const listaNombres = liveData.names || [liveData.name || ''];

            if (liveData.isTeam) {
                // Filtramos entradas vacías y las unimos con comas.
                const nombresLimpios = listaNombres.filter(n => n.trim() !== '').map(n => escapeHtml(n)).join(', ');
                nombresHtmlFinal = `<strong>Integrantes:</strong> ${nombresLimpios || '<em>(Sin integrantes)</em>'}`;
            } else {
                nombresHtmlFinal = `<strong>Alumno:</strong> ${escapeHtml(listaNombres[0] || '')}`;
            }

            return `
                <div class="p-header">
                    ${logosHTML}
                    <p><strong>Institución:</strong> ${escapeHtml(currentUni.name || '')}</p>
                    ${liveData.career ? `<p><strong>Carrera:</strong> ${escapeHtml(liveData.career)}</p>` : ''}
                    <p><strong>Materia:</strong> ${escapeHtml(liveData.subject || '')} ${liveData.term ? `(${escapeHtml(formatTerm(liveData.term))})` : ''}</p>
                    <p><strong>Profesor:</strong> ${escapeHtml(liveData.prof || '')}</p>
                    <p>${nombresHtmlFinal} ${liveData.group ? `| <strong>Grupo:</strong> ${escapeHtml(liveData.group)}` : ''}</p>
                    <p><strong>Fecha:</strong> ${escapeHtml(liveData.date || '')}</p>
                    <hr>
                </div>`;

            case 'ref':
                if (!block.refData) return '';
                refCounter++;
                const { author, title, source, year, url } = block.refData;
                if (getCitationStyle() === 'apa') {
                    return `<div class="p-ref-apa">${formatAPAReference(block.refType, author, title, source, year, url)}</div>`;
                }
                let refText = formatIEEEReference(block.refType, author, title, source, year, url);
                return `
                    <div class="p-ref-ieee">
                        <div class="ref-num">[${refCounter}]</div>
                        <div class="ref-content">${refText}</div>
                    </div>`;
            
            case 'ai':
                if (!block.aiData) return '';
                const ai = block.aiData;
                
                // Nombre(s) del alumno tomados del encabezado
                const studentName = getHeaderStudentName(savedHeader) || '[Nombre del estudiante]';

                if (block.aiUsed === 'no') {
                    const declarantName = ai.name || studentName;
                
                    return `
                        <div class="p-ai-declaration">
                            <p class="p-text" style="text-align: justify;">
                                Yo, <strong>${escapeHtml(declarantName)}</strong>, declaro que <strong>NO</strong> he utilizado herramientas de Inteligencia Artificial para la elaboración de este trabajo académico.
                                Afirmo que cuento con evidencias físicas y/o digitales que demuestran mi autoría, incluyendo pero no limitándose a:
                                documentos manuscritos, materiales impresos con anotaciones o subrayado, historial de versiones de documentos electrónicos, o commits en repositorios de código.
                                <br><br>
                                Reconozco y acepto que el profesor se reserva el derecho de solicitar dichas evidencias en cualquier momento,
                                especialmente cuando existan sospechas o se detecten conductas que atenten contra la integridad académica,
                                tales como plagio o uso no reportado de herramientas de IA.
                            </p>
                        </div>`;
                } else {
                    return `
                        <div class="p-ai-declaration" data-split="children">
                            <div style="margin: 20px 0;" data-split="children">
                                <p style="margin: 5px 0;"><strong>Nombre del estudiante:</strong> ${escapeHtml(ai.name || studentName)}</p>
                                <p style="margin: 5px 0;"><strong>IA utilizada:</strong> ${escapeHtml(ai.aiTool)}</p>
                                <p style="margin: 5px 0;"><strong>Fecha de uso:</strong> ${escapeHtml(ai.date)}</p>
                                <p style="margin: 5px 0;"><strong>Propósito:</strong> ${escapeHtml(ai.purpose)}</p>
                                
                                <p style="margin: 15px 0 5px 0;"><strong>Prompt utilizado:</strong></p>
                                <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 0.9em;">${escapeHtml(ai.prompt)}</pre>
                                
                                ${ai.attachments ? `<p style="margin: 10px 0 5px 0;"><strong>Archivos suministrados:</strong> ${escapeHtml(ai.attachments)}</p>` : ''}
                                
                                <p style="margin: 15px 0 5px 0;"><strong>Respuesta en crudo (raw):</strong></p>
                                <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 0.85em;">${escapeHtml(ai.rawResponse)}</pre>
                            </div>
                        </div>`;
                }
            
            default:
                return "";
        }
    }).join('');

    // Se arma en hojas tamaño carta, igual que como se imprimirá
    paginatePreview(preview, previewHTML);
    fillTocPageNumbers(preview);

    scheduleAutosave();
}

// ============================================================================
// FUNCIONES DE EXPORTACIÓN
// ============================================================================

/**
 * Exporta el reporte como archivo de texto plano
 */
function exportTXT() {
    let textContent = "";
    let figureCount = 0;
    let tableCount = 0;
    let refCount = 0;

    textContent += "=".repeat(60) + "\n";
    textContent += "REPORTE ACADÉMICO - EXPORTACIÓN TXT\n";
    textContent += "=".repeat(60) + "\n\n";

    // 1. Obtener los datos del encabezado desde el LocalStorage
    const savedHeader = getHeaderData() || {};

    reportData.forEach(block => {
        switch(block.type) {
            case 'header': {
                // La institución se deriva del tema/universidad seleccionado, no de savedHeader
                const exportThemeId = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
                const exportUni = getUniversityById(exportThemeId) || getUniversityById('generic') || {};
                const namesForExport = (savedHeader.names && savedHeader.names.length > 0) ? savedHeader.names : [savedHeader.name || ''];
                const alumnoLabel = savedHeader.isTeam
                    ? namesForExport.filter(n => n.trim() !== '').join(', ')
                    : (namesForExport[0] || '');

                if (savedHeader.coverMode) {
                    textContent += `PORTADA\n`;
                    textContent += `-`.repeat(40) + "\n";
                    if (exportUni.id && exportUni.id !== 'generic') textContent += `${exportUni.name}\n`;
                    if (savedHeader.career) textContent += `${savedHeader.career}\n`;
                    textContent += `\n${(savedHeader.taskName || '').trim() || '[Nombre de la tarea]'}\n\n`;
                    if (savedHeader.subject) textContent += `Materia: ${savedHeader.subject}\n`;
                    if (savedHeader.prof) textContent += `Profesor: ${savedHeader.prof}\n`;
                    textContent += `${savedHeader.isTeam ? 'Integrantes' : 'Alumno'}: ${alumnoLabel || 'N/A'}\n`;
                    if (savedHeader.group) textContent += `Grupo: ${savedHeader.group}\n`;
                    if (savedHeader.term) textContent += `Cuatrimestre: ${formatTerm(savedHeader.term)}\n`;
                    if (savedHeader.date) textContent += `${formatLongDate(savedHeader.date)}\n`;
                    textContent += `\n`;
                    break;
                }

                textContent += `DATOS DEL ESTUDIANTE\n`;
                textContent += `-`.repeat(40) + "\n";
                textContent += `Institución: ${exportUni.name || 'N/A'}\n`;
                if (savedHeader.career) textContent += `Carrera: ${savedHeader.career}\n`;
                textContent += `Materia: ${savedHeader.subject || 'N/A'} (${formatTerm(savedHeader.term) || 'N/A'})\n`;
                textContent += `Profesor: ${savedHeader.prof || 'N/A'}\n`;
                textContent += `Alumno: ${alumnoLabel || 'N/A'} | Grupo: ${savedHeader.group || 'N/A'}\n`;
                textContent += `Fecha: ${savedHeader.date || 'N/A'}\n`;
                textContent += `\n`;
                break;
            }
            
            case 'toc': {
                textContent += `${((block.content || '').trim() || 'Índice').toUpperCase()}\n`;
                textContent += `-`.repeat(40) + "\n";
                reportData.forEach(b => {
                    if ((b.type === 'title' || b.type === 'subtitle') && (b.content || '').trim()) {
                        textContent += `${b.type === 'subtitle' ? '    ' : ''}${b.content.trim()}\n`;
                    }
                });
                textContent += `\n`;
                break;
            }

            case 'title':
                textContent += `\n${"=".repeat(60)}\n`;
                textContent += `${block.content.toUpperCase()}\n`;
                textContent += `${"=".repeat(60)}\n\n`;
                break;
            
            case 'subtitle':
                textContent += `\n${"-".repeat(40)}\n`;
                textContent += `${block.content}\n`;
                textContent += `${"-".repeat(40)}\n\n`;
                break;
            
            case 'text':
                textContent += `${block.content}\n\n`;
                break;
            
            case 'code':
                textContent += `\n[INICIO DE CÓDIGO]\n`;
                textContent += `${"-".repeat(40)}\n`;
                textContent += `${block.content}\n`;
                textContent += `${"-".repeat(40)}\n`;
                textContent += `[FIN DE CÓDIGO]\n\n`;
                break;
            
            case 'image':
                figureCount++;
                textContent += `\n[FIGURA ${figureCount}]\n`;
                textContent += `Descripción: ${block.caption || 'Sin descripción'}\n`;
                textContent += `(La imagen no puede ser exportada a formato TXT)\n\n`;
                break;
            
            case 'table':
                tableCount++;
                textContent += `\n[TABLA ${tableCount}]\n`;
                textContent += `${"-".repeat(60)}\n`;
                
                if (block.tableData && block.tableData.length > 0) {
                    const cols = block.columns || block.tableData[0].length;
                    const colWidths = [];
                    const MAX_COL_WIDTH = 30;
                
                    for (let col = 0; col < cols; col++) {
                        let maxWidth = 10;
                        for (let row = 0; row < block.tableData.length; row++) {
                            const cellContent = String(block.tableData[row][col] || '');
                            maxWidth = Math.max(maxWidth, Math.min(cellContent.length, MAX_COL_WIDTH));
                        }
                        colWidths.push(maxWidth);
                    }
                
                    const wrapText = (text, width) => {
                        const lines = [];
                        const str = String(text || '');
                        for (let i = 0; i < str.length; i += width) {
                            lines.push(str.substring(i, i + width));
                        }
                        return lines.length > 0 ? lines : [''];
                    };
                
                    const pad = (str, width) => {
                        return str + ' '.repeat(Math.max(0, width - str.length));
                    };
                
                    for (let row = 0; row < block.tableData.length; row++) {
                        const cellLines = [];
                        let maxLinesInRow = 1;
                
                        for (let col = 0; col < cols; col++) {
                            const wrapped = wrapText(block.tableData[row][col], colWidths[col]);
                            cellLines.push(wrapped);
                            maxLinesInRow = Math.max(maxLinesInRow, wrapped.length);
                        }
                
                        for (let l = 0; l < maxLinesInRow; l++) {
                            let line = '| ';
                            for (let col = 0; col < cols; col++) {
                                const content = cellLines[col][l] || '';
                                line += pad(content, colWidths[col]) + ' | ';
                            }
                            textContent += line + '\n';
                        }

                        let separator = '+-';
                        for (let col = 0; col < cols; col++) {
                            separator += '-'.repeat(colWidths[col]) + '-+-';
                        }
                        textContent += separator + '\n';
                    }
                }
                
                textContent += `${"-".repeat(60)}\n`;
                textContent += `Descripción: ${block.caption || 'Sin descripción'}\n\n`;
                break;
            
            case 'ref':
                if (block.refData) {
                    refCount++;
                    const { author, title, source, year, url } = block.refData;
                    if (getCitationStyle() === 'apa') {
                        textContent += `\n${formatAPAReference(block.refType, author, title, source, year, url, false)}\n`;
                        break;
                    }
                    textContent += `\n[${refCount}] `;
                    
                    if (block.refType === 'book') {
                        textContent += `${author}, "${title}". ${source}, ${year}.`;
                    } else if (block.refType === 'web') {
                        textContent += `${author}, "${title}", ${source}, ${year}. [En línea]. Disponible: ${url}`;
                    } else {
                        textContent += `${author}, "${title}", ${source}, ${year}.`;
                    }
                    textContent += `\n`;
                }
                break;
            
            case 'ai':
                if (block.aiData) {
                    const ai = block.aiData;
                    // Nombre(s) del alumno tomados del encabezado
                    const studentName = getHeaderStudentName(savedHeader) || '[Nombre del estudiante]';
                    
                    textContent += `\n${"=".repeat(60)}\n`;
                    textContent += `DECLARACIÓN DE USO DE INTELIGENCIA ARTIFICIAL\n`;
                    textContent += `${"=".repeat(60)}\n\n`;
                    
                    if (block.aiUsed === 'no') {
                        const declarantName = ai.name || studentName;
                        textContent += `Yo, ${declarantName}, declaro que NO he utilizado herramientas de\n`;
                        textContent += `Inteligencia Artificial para la elaboración de este trabajo académico.\n\n`;
                        textContent += `Afirmo que cuento con evidencias físicas y/o digitales que demuestran\n`;
                        textContent += `mi autoría, incluyendo: documentos manuscritos, materiales impresos con\n`;
                        textContent += `anotaciones o subrayado, historial de versiones de documentos electrónicos,\n`;
                        textContent += `o commits en repositorios de código.\n\n`;
                        textContent += `Reconozco que el profesor se reserva el derecho de solicitar dichas\n`;
                        textContent += `evidencias cuando existan sospechas o se detecten conductas que atenten\n`;
                        textContent += `contra la integridad académica.\n\n`;
                    } else {
                        textContent += `Estudiante: ${ai.name || studentName}\n`;
                        textContent += `IA utilizada: ${ai.aiTool}\n`;
                        textContent += `Fecha: ${ai.date}\n`;
                        textContent += `Propósito: ${ai.purpose}\n\n`;
                        textContent += `Prompt utilizado:\n`;
                        textContent += `${"-".repeat(40)}\n`;
                        textContent += `${ai.prompt}\n`;
                        textContent += `${"-".repeat(40)}\n\n`;
                        if (ai.attachments) {
                            textContent += `Archivos suministrados: ${ai.attachments}\n\n`;
                        }
                        textContent += `Respuesta en crudo:\n`;
                        textContent += `${"-".repeat(40)}\n`;
                        textContent += `${ai.rawResponse}\n`;
                        textContent += `${"-".repeat(40)}\n\n`;
                    }
                }
                break;
        }
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${getSafeFileName()}.txt`;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
}
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
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        saveToLocalStorage();
        updateAutosaveUI();
    }, 500);
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

// Restaurar el progreso guardado al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
});

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

// ==========================================
// PANEL DE CONFIGURACIÓN
// Un solo lugar para añadir, editar y eliminar universidades, materias y
// profesores (antes eran botones sueltos junto a cada campo).
// ==========================================

let settingsActiveTab = 'universities';

function openSettingsModal(tab) {
    if (tab) settingsActiveTab = tab;
    closeSettingsModal();

    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay';
    overlay.id = 'settings-modal-overlay';
    overlay.innerHTML = `
        <div class="university-modal settings-modal">
            <h3>⚙️ Configuración</h3>
            <div class="settings-tabs">
                <button type="button" data-tab="universities">Universidades</button>
                <button type="button" data-tab="list_subjects">Materias</button>
                <button type="button" data-tab="list_profs">Profesores</button>
            </div>
            <div id="settings-tab-content"></div>
            <div class="university-modal-actions">
                <button type="button" class="action-btn" onclick="closeSettingsModal()">Cerrar</button>
            </div>
        </div>
    `;

    // Cerrar al hacer clic fuera del cuadro
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeSettingsModal();
    });
    overlay.querySelectorAll('.settings-tabs button').forEach(btn => {
        btn.addEventListener('click', () => {
            settingsActiveTab = btn.dataset.tab;
            refreshSettingsModal();
        });
    });

    document.body.appendChild(overlay);
    refreshSettingsModal();
}

function closeSettingsModal() {
    const overlay = document.getElementById('settings-modal-overlay');
    if (overlay) overlay.remove();
}

/**
 * Vuelve a dibujar el contenido de la pestaña activa (si el panel está abierto).
 */
function refreshSettingsModal() {
    const overlay = document.getElementById('settings-modal-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('.settings-tabs button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === settingsActiveTab);
    });

    const content = overlay.querySelector('#settings-tab-content');
    if (settingsActiveTab === 'universities') {
        renderUniversitiesTab(content);
    } else {
        renderSimpleListTab(content, settingsActiveTab);
    }
}

function renderUniversitiesTab(content) {
    const universities = getUniversities();
    const current = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');

    content.innerHTML = `
        <button type="button" class="action-btn save-btn settings-add-btn" id="settings-add-uni">➕ Añadir universidad</button>
        <ul class="settings-list">
            ${universities.map(u => `
                <li data-id="${escapeAttr(u.id)}">
                    <span class="settings-color-dot" style="background: ${escapeAttr((u.color && u.color.primary) || '#374151')};"></span>
                    <span class="settings-item-name">${escapeHtml(u.name)}${u.id === current ? ' <em>(en uso)</em>' : ''}</span>
                    <button type="button" class="icon-btn" data-action="edit" title="Editar">✏️</button>
                    ${u.id === 'generic' ? '' : '<button type="button" class="icon-btn" data-action="delete" title="Eliminar">🗑️</button>'}
                </li>
            `).join('')}
        </ul>
    `;

    content.querySelector('#settings-add-uni').addEventListener('click', () => openUniversityModal());
    content.querySelectorAll('.settings-list li').forEach(li => {
        const id = li.dataset.id;
        li.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'edit') openUniversityModal(id);
                else deleteUniversityFromList(id);
            });
        });
    });
}

function renderSimpleListTab(content, storageKey) {
    const cfg = SIMPLE_LISTS[storageKey];
    const list = getSimpleList(storageKey);

    // En la pestaña de materias, cada una puede vincularse a un profesor.
    const isSubjects = storageKey === 'list_subjects';
    const profs = getSimpleList('list_profs');
    const profMap = getSubjectProfMap();
    const profSelectHtml = (selected, attrs) => `
        <select class="settings-prof-select" ${attrs} title="Profesor que imparte esta materia">
            <option value="">Sin profesor</option>
            ${profs.map(p => `<option value="${escapeAttr(p)}" ${p === selected ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
        </select>`;

    content.innerHTML = `
        <div class="settings-add-row">
            <input type="text" id="settings-new-item" placeholder="${isSubjects ? 'Nueva materia' : 'Nombre del profesor'}">
            ${isSubjects ? profSelectHtml('', 'id="settings-new-prof"') : ''}
            <button type="button" class="action-btn save-btn" id="settings-add-item">➕ Añadir</button>
        </div>
        ${isSubjects && !profs.length ? '<p class="settings-hint">Añade profesores en su pestaña para poder vincularlos a cada materia.</p>' : ''}
        <p id="settings-error" class="settings-error"></p>
        ${list.length ? `
            <ul class="settings-list">
                ${list.map((item, i) => `
                    <li data-index="${i}">
                        <span class="settings-item-name">${escapeHtml(item)}</span>
                        ${isSubjects ? profSelectHtml(profMap[item] || '', 'data-action="link"') : ''}
                        <button type="button" class="icon-btn" data-action="edit" title="Editar">✏️</button>
                        <button type="button" class="icon-btn" data-action="delete" title="Eliminar">🗑️</button>
                    </li>
                `).join('')}
            </ul>
        ` : `<p class="settings-empty">Todavía no has añadido ${escapeHtml(cfg.plural)}.</p>`}
    `;

    const input = content.querySelector('#settings-new-item');
    const add = () => {
        const error = addListItem(storageKey, input.value);
        if (error) {
            content.querySelector('#settings-error').textContent = error;
            return;
        }
        const newProf = content.querySelector('#settings-new-prof');
        if (newProf && newProf.value) setSubjectProf(input.value.trim(), newProf.value);
        refreshSettingsModal();
        const newInput = document.getElementById('settings-new-item');
        if (newInput) newInput.focus();
    };
    content.querySelector('#settings-add-item').addEventListener('click', add);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') add();
    });

    content.querySelectorAll('.settings-list li').forEach(li => {
        const item = list[parseInt(li.dataset.index, 10)];
        const linkSelect = li.querySelector('select[data-action="link"]');
        if (linkSelect) {
            linkSelect.addEventListener('change', () => setSubjectProf(item, linkSelect.value));
        }
        li.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const changed = btn.dataset.action === 'edit'
                    ? editListItem(storageKey, item)
                    : deleteListItem(storageKey, item);
                if (changed) refreshSettingsModal();
            });
        });
    });
}

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
    return JSON.stringify({ reportData, header: getHeaderData(), name: getDocumentName() });
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
        saveToLocalStorage();
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
    const message = '¿Borrar todo el documento y empezar uno nuevo?\n\n' +
        'Se borran todos los bloques, los datos del encabezado y el nombre del documento.\n' +
        'Tus universidades, materias y profesores se conservan.' +
        (hasUnsavedChanges() ? '\n\n⚠️ Tienes cambios sin guardar.' : '');
    if (!confirm(message)) return;

    reportData = [];
    setHeaderData(null);
    setDocumentName('');
    driveCurrentFileId = null;
    driveCurrentFileName = null;
    render();
    saveToLocalStorage();
    markDocumentSaved();

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
    markDocumentSaved();
});

// Sin autoguardado, avisar antes de cerrar si hay cambios sin guardar
window.addEventListener('beforeunload', event => {
    if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '';
    }
});

// ============================================================================
// GUARDAR Y CARGAR PROYECTO (JSON)
// ============================================================================

/**
 * Guarda el proyecto completo como archivo JSON
 * Permite al usuario descargar su trabajo y continuarlo después
 */
function saveJSON() {
    try {
        // Convertir el proyecto completo a JSON con formato legible
        const jsonString = buildProjectJSON();

        // Crear Blob
        const blob = new Blob([jsonString], { type: 'application/json' });

        // El archivo se llama como el documento
        const filename = `${getSafeFileName()}.json`;

        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        // Simular click para descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Liberar memoria
        URL.revokeObjectURL(link.href);

        markDocumentSaved();
        console.log('Proyecto guardado:', filename);
        alert('Proyecto guardado exitosamente como ' + filename);

    } catch (error) {
        console.error('Error al guardar proyecto:', error);
        alert('Error al guardar el proyecto. Por favor intenta de nuevo.');
    }
}

/**
 * Reúne todo lo que forma un proyecto: los bloques, el tema, los datos del
 * encabezado y la configuración (universidades, materias, profesores y el
 * vínculo materia → profesor). Así el proyecto se puede abrir en otra
 * computadora o navegador sin perder nada.
 */
function buildProjectData() {
    let headerData = null;
    try {
        headerData = getHeaderData();
    } catch (e) {
        headerData = null;
    }

    return {
        version: '2.1',
        timestamp: new Date().toISOString(),
        theme: document.body.getAttribute('data-theme') || 'generic',
        documentName: getDocumentName(),
        reportData: reportData,
        headerData: headerData,
        citationStyle: getCitationStyle(),
        settings: {
            universities: getUniversities(),
            subjects: getSimpleList('list_subjects'),
            profs: getSimpleList('list_profs'),
            subjectProfMap: getSubjectProfMap()
        }
    };
}

/**
 * Integra la configuración de un proyecto con la de este navegador sin borrar
 * nada: añade las universidades, materias, profesores y vínculos que falten.
 * Si algo ya existe aquí, se conserva la versión local.
 */
function mergeProjectSettings(settings) {
    if (!settings || typeof settings !== 'object') return;

    if (Array.isArray(settings.universities)) {
        const universities = getUniversities();
        settings.universities.forEach(u => {
            if (u && u.id && u.name && !universities.some(local => local.id === u.id)) {
                universities.push(u);
            }
        });
        saveUniversities(universities);
    }

    [['list_subjects', settings.subjects], ['list_profs', settings.profs]].forEach(([key, incoming]) => {
        if (!Array.isArray(incoming)) return;
        const list = getSimpleList(key);
        incoming.forEach(item => {
            if (typeof item === 'string' && item.trim() && !list.includes(item)) list.push(item);
        });
        saveSimpleList(key, list);
    });

    if (settings.subjectProfMap && typeof settings.subjectProfMap === 'object') {
        const map = getSubjectProfMap();
        Object.entries(settings.subjectProfMap).forEach(([subject, prof]) => {
            if (!(subject in map) && typeof prof === 'string') map[subject] = prof;
        });
        saveSubjectProfMap(map);
    }
}

/**
 * Aplica un proyecto ya leído (de un archivo o de Google Drive).
 * Los proyectos antiguos (sin headerData/settings) siguen funcionando igual.
 */
function applyProjectData(projectData, fallbackName = '') {
    if (!projectData.reportData || !Array.isArray(projectData.reportData)) {
        throw new Error('Formato de archivo inválido');
    }

    // Primero la configuración: el tema del proyecto puede ser una
    // universidad personalizada que todavía no existe en este navegador.
    mergeProjectSettings(projectData.settings);

    if (projectData.headerData && typeof projectData.headerData === 'object') {
        setHeaderData(projectData.headerData);
    }

    if (projectData.citationStyle === 'apa' || projectData.citationStyle === 'ieee') {
        localStorage.setItem('citationStyle', projectData.citationStyle);
    }

    reportData = projectData.reportData;

    renderThemeSelector();
    if (projectData.theme) {
        changeTheme(projectData.theme);
    }

    setDocumentName(projectData.documentName || fallbackName.replace(/\.json$/i, ''));
    render();
    markDocumentSaved();
}

/**
 * Carga un proyecto desde un archivo JSON
 * @param {HTMLInputElement} input - Input file que contiene el JSON
 */
function loadJSON(input) {
    const file = input.files[0];

    if (!file) {
        return;
    }

    // Verificar que sea un archivo JSON
    if (!file.name.endsWith('.json')) {
        alert('Por favor selecciona un archivo JSON válido.');
        input.value = ''; // Limpiar input
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            // Parsear JSON
            const projectData = JSON.parse(e.target.result);

            // Validar estructura básica
            if (!projectData.reportData || !Array.isArray(projectData.reportData)) {
                throw new Error('Formato de archivo inválido');
            }

            // Confirmar carga (advertir que se perderá el trabajo actual)
            const hasCurrentData = reportData.length > 0;
            if (hasCurrentData) {
                const confirm = window.confirm(
                    '¿Estás seguro de cargar este proyecto?\n\n' +
                    'Se perderá el trabajo actual no guardado.\n\n' +
                    'Recomendación: Guarda tu proyecto actual antes de continuar.'
                );

                if (!confirm) {
                    input.value = ''; // Limpiar input
                    return;
                }
            }

            // Cargar bloques, encabezado, configuración y tema
            applyProjectData(projectData, file.name);

            // Limpiar input para permitir cargar el mismo archivo de nuevo
            input.value = '';

            console.log('Proyecto cargado exitosamente');
            console.log('- Versión:', projectData.version);
            console.log('- Fecha guardado:', projectData.timestamp);
            console.log('- Bloques cargados:', reportData.length);

            alert(
                'Proyecto cargado exitosamente\n\n' +
                `Bloques: ${reportData.length}\n` +
                `Tema: ${projectData.theme || 'generic'}`
            );

        } catch (error) {
            console.error('Error al cargar proyecto:', error);
            alert(
                'Error al cargar el proyecto\n\n' +
                'El archivo puede estar corrupto o tener un formato incorrecto.\n\n' +
                'Error: ' + error.message
            );
            input.value = ''; // Limpiar input
        }
    };

    reader.onerror = function() {
        alert('Error al leer el archivo. Por favor intenta de nuevo.');
        input.value = ''; // Limpiar input
    };

    // Leer archivo como texto
    reader.readAsText(file);
}

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
        '   dentro de JS/script.js.\n\n' +
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

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
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

// ============================================================================
// DRAG & DROP - REORDENAR BLOQUES
// ============================================================================

let draggedElement = null;
let draggedIndex = null;

function initializeDragAndDrop() {
    const containers = document.querySelectorAll('.block-card-container');

    containers.forEach((container, index) => {
        container.setAttribute('draggable', 'true');
        container.setAttribute('data-index', index);

        container.addEventListener('dragstart', function(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.getAttribute('data-index'));
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        container.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
            containers.forEach(c => c.classList.remove('drag-over'));
        });

        container.addEventListener('dragover', function(e) {
            e.preventDefault();
            const currentIndex = parseInt(this.getAttribute('data-index'));
            if (currentIndex !== draggedIndex) {
                this.classList.add('drag-over');
            }
            return false;
        });

        container.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });

        container.addEventListener('drop', function(e) {
            e.preventDefault();
            const dropIndex = parseInt(this.getAttribute('data-index'));

            if (dropIndex !== draggedIndex) {
                moveBlock(draggedIndex, dropIndex);
            }

            this.classList.remove('drag-over');
            return false;
        });
    });
}

function moveBlock(fromIndex, toIndex) {
    const movedBlock = reportData.splice(fromIndex, 1)[0];
    reportData.splice(toIndex, 0, movedBlock);
    render();
    console.log(`Bloque movido de posición ${fromIndex} a ${toIndex}`);
}
