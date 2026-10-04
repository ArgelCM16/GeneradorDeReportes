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

    reportData.push(createBlock(type));
    render();
}

/**
 * Crea un bloque nuevo con todos sus campos, sin agregarlo ni dibujar.
 * @param {string} type - Tipo de bloque
 */
function createBlock(type) {
    const id = newBlockId();
    let newBlock = { id, type, content: "" };

    // Los párrafos guardan HTML limpio (negritas, listas, citas...)
    if (type === 'text') newBlock.format = 'html';

    // Código: lenguaje (para los colores) y números de línea
    if (type === 'code') {
        newBlock.language = 'auto';
        newBlock.lineNumbers = false;
    }
    
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
    
    return newBlock;
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
        // En un párrafo, updateContent recibe texto plano (no HTML)
        if (block.type === 'text') delete block.format;
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
    
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        // Se reduce para que no llene el almacenamiento del navegador
        const content = await shrinkImageDataUrl(e.target.result, file.type, BLOCK_IMAGE_MAX_SIZE, true);
        const block = reportData.find(b => b.id === id);
        if (block) {
            block.content = content;
            render();
        }
    };
    reader.readAsDataURL(file);
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
                    <input type="text" id="header-task-name" placeholder="Ej. Práctica 3: Redes Neuronales" value="${escapeAttr(d.taskName || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field" data-field="group"${fieldStyle('group')}>
                    <label for="header-group">${fieldLabel('group')}</label>
                    <input type="text" id="header-group" placeholder="Ej. IDY-7A" value="${escapeAttr(d.group || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
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
                    <input type="text" id="header-career" placeholder="Ej. Ingeniería en Datos" value="${escapeAttr(d.career || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field" data-field="term"${fieldStyle('term')}>
                    <label for="header-term">${fieldLabel('term')}</label>
                    <input type="text" id="header-term" placeholder="Ej. 7" value="${escapeAttr(d.term || '')}" oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                </div>

                <div class="header-field" data-field="date"${fieldStyle('date')}>
                    <label for="header-date">${fieldLabel('date')}</label>
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
            <input type="text" class="student-name-input" placeholder="${placeholder}" value="${escapeAttr(name || '')}" oninput="renderPreview()" style="flex: 1; min-width: 0; width: 100%; box-sizing: border-box;">
            <input type="text" class="student-id-input" placeholder="${escapeAttr(getHeaderFieldLabel('studentId', 'editor'))}" value="${escapeAttr(studentId || '')}" oninput="renderPreview()" title="${escapeAttr(getHeaderFieldLabel('studentId', 'editor'))}"${showId ? '' : ' style="display: none;"'}>
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

    const show = key => isHeaderFieldShown(key);
    const lbl = key => escapeHtml(getHeaderFieldLabel(key, 'preview'));
    const people = getHeaderPeople(h);
    const showIds = show('studentId');
    const emptyName = '<span class="p-cover-empty">[Nombre del alumno]</span>';
    const studentsHtml = h.isTeam
        ? `<div class="p-cover-row p-cover-students"><span>Integrantes:</span>${people.length
            ? people.map(p => `<div>${escapeHtml(p.name)}${showIds && p.id ? ` (${escapeHtml(p.id)})` : ''}</div>`).join('')
            : `<div>${emptyName}</div>`}</div>`
        : `<div class="p-cover-row"><span>Alumno:</span> ${people.length ? escapeHtml(people[0].name) : emptyName}</div>` +
          (showIds && people.length && people[0].id ? `<div class="p-cover-row"><span>${lbl('studentId')}:</span> ${escapeHtml(people[0].id)}</div>` : '');

    const row = (key, value) => (show(key) && value)
        ? `<div class="p-cover-row"><span>${lbl(key)}:</span> ${escapeHtml(value)}</div>` : '';

    const logos = (h.includeLogo && (u.logoLeft || u.logoRight)) ? `
        <div class="p-cover-logos">
            ${u.logoLeft ? `<img src="${escapeAttr(u.logoLeft)}" alt="Logo">` : '<span></span>'}
            ${u.logoRight ? `<img src="${escapeAttr(u.logoRight)}" alt="Logo">` : '<span></span>'}
        </div>` : '';

    const task = (h.taskName || '').trim();

    return `
        <div class="p-cover">
            ${logos}
            <div class="p-cover-uni">${escapeHtml(!show('institution') || u.id === 'generic' ? '' : (u.name || ''))}</div>
            ${show('career') && h.career ? `<div class="p-cover-career">${escapeHtml(h.career)}</div>` : ''}
            <div class="p-cover-title">${task ? escapeHtml(task) : '<span class="p-cover-empty">[Nombre de la tarea]</span>'}</div>
            <div class="p-cover-details">
                ${row('subject', h.subject)}
                ${row('prof', h.prof)}
                ${studentsHtml}
                ${row('group', h.group)}
                ${row('term', formatTerm(h.term))}
            </div>
            <div class="p-cover-date">${show('date') ? escapeHtml(formatLongDate(h.date)) : ''}</div>
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
    return Math.max(0.2, Math.min(1.5, available / getPageWidthPx()));
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
// MOSTRAR / OCULTAR LA VISTA PREVIA Y DISEÑO PARA CELULAR
// En computadora la vista previa se puede ocultar por completo (el editor
// ocupa todo el ancho). En celular hay un menú lateral que se abre con ☰ y
// dos pestañas abajo para cambiar entre el editor y la vista previa.
//
// OJO: la vista previa oculta NO lleva display:none; se saca de la pantalla
// con CSS para que se siga midiendo y paginando (si no, el índice tendría
// números equivocados y la impresión saldría mal).
// ==========================================

const MOBILE_QUERY = '(max-width: 768px)';

function isMobileLayout() {
    return window.matchMedia(MOBILE_QUERY).matches;
}

function isPreviewHidden() {
    return localStorage.getItem('previewHidden') === '1';
}

/**
 * Oculta o muestra la vista previa en computadora (se recuerda).
 */
function setPreviewHidden(hidden) {
    localStorage.setItem('previewHidden', hidden ? '1' : '0');
    applyPreviewVisibility();
}

function togglePreviewVisible() {
    if (isMobileLayout()) {
        setMobileView(document.body.classList.contains('mobile-view-preview') ? 'editor' : 'preview');
        return;
    }
    setPreviewHidden(!isPreviewHidden());
}

function applyPreviewVisibility() {
    const hidden = isPreviewHidden();
    document.body.classList.toggle('preview-is-hidden', hidden);

    const icon = document.getElementById('preview-toggle-icon');
    if (icon) icon.textContent = hidden ? 'visibility' : 'visibility_off';
    const label = document.getElementById('preview-toggle-label');
    if (label) label.textContent = hidden ? 'Mostrar vista previa' : 'Ocultar vista previa';
    const btn = document.getElementById('preview-toggle-btn');
    if (btn) {
        btn.title = hidden ? 'Mostrar la vista previa' : 'Ocultar la vista previa para que el editor ocupe todo el ancho';
        btn.classList.toggle('is-active', hidden);
    }

    if (getPreviewZoom() === 'fit') applyPreviewZoom();
}

/**
 * Celular: muestra el editor o la vista previa (ocupan toda la pantalla).
 * @param {'editor'|'preview'} view
 */
function setMobileView(view) {
    const showPreview = view === 'preview';
    document.body.classList.toggle('mobile-view-preview', showPreview);
    document.querySelectorAll('.mobile-tabs button').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.view === view);
    });
    if (showPreview && getPreviewZoom() === 'fit') applyPreviewZoom();
}

/**
 * Celular: abre o cierra el menú lateral.
 * @param {boolean} [open] - sin valor, alterna
 */
function toggleSidebar(open) {
    const shouldOpen = typeof open === 'boolean' ? open : !document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', shouldOpen);
}

document.addEventListener('DOMContentLoaded', function() {
    applyPreviewVisibility();

    // Celular: al usar un botón del menú, el menú se cierra; si fue para
    // agregar un bloque, se vuelve al editor para verlo.
    const toolbox = document.querySelector('.toolbox');
    if (toolbox) {
        toolbox.addEventListener('click', event => {
            if (!isMobileLayout()) return;
            const button = event.target.closest('button');
            if (!button || button.classList.contains('drive-help-btn')) return;
            if (button.closest('.blocks-grid') || button.classList.contains('btn-ai')) setMobileView('editor');
            toggleSidebar(false);
        });
    }

    // Al pasar de celular a computadora (o al revés) se limpia el estado del otro modo
    window.matchMedia(MOBILE_QUERY).addEventListener('change', e => {
        if (!e.matches) {
            toggleSidebar(false);
            setMobileView('editor');
        }
        if (getPreviewZoom() === 'fit') applyPreviewZoom();
    });
});

// ==========================================
// PÁRRAFOS CON FORMATO Y CITAS
// El contenido de un párrafo (format: 'html') es HTML limpio: solo <p>,
// <ul>/<ol>/<li>, <b>, <i>, <u>, <br> y <span data-cite="id"> (cita a un
// bloque de referencia). Todo lo que entra, escrito o pegado, pasa por
// sanitizeRichHtml(); los párrafos antiguos (texto plano) se convierten al
// dibujar con normalizeTextBlocks().
// ==========================================

const RICH_INLINE_TAGS = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', INS: 'u' };
const RICH_SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH',
    'HEAD', 'TITLE', 'META', 'LINK', 'IMG', 'PICTURE', 'VIDEO', 'AUDIO', 'CANVAS', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'OPTION']);
const RICH_BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'SECTION', 'ARTICLE',
    'HEADER', 'FOOTER', 'PRE', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'CAPTION', 'FIGURE', 'FIGCAPTION',
    'MAIN', 'ASIDE', 'NAV', 'DL', 'DT', 'DD', 'ADDRESS', 'CENTER', 'LI', 'HR']);

function isRichText(block) {
    return !!block && block.format === 'html';
}

/**
 * Texto plano -> HTML de párrafo. Una línea en blanco separa párrafos; un
 * salto de línea sencillo queda como salto de línea.
 */
function plainToRichHtml(text) {
    return String(text || '')
        .replace(/\r\n?/g, '\n')
        .split(/\n[ \t]*\n/)
        .map(chunk => chunk.trim())
        .filter(Boolean)
        .map(chunk => `<p>${escapeHtml(chunk).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function escapeRichText(text) {
    return String(text)
        .replace(/[\u00a0\t\r\n]/g, ' ')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Deja solo el formato permitido. Sirve igual para lo que se escribe en el
 * editor, para lo que se pega (Word, Google Docs, páginas web) y para los
 * proyectos que se cargan.
 */
function sanitizeRichHtml(html) {
    const doc = document.implementation.createHTMLDocument('');
    const root = doc.createElement('div');
    root.innerHTML = html || '';

    const hasContent = fragment => !!fragment.replace(/<br>/g, '').replace(/<[^>]+>/g, '').trim() || fragment.includes('data-cite');
    const trimBreaks = fragment => fragment.replace(/^(\s*<br>)+/, '').replace(/(<br>\s*)+$/, '').trim();

    const inline = node => {
        if (node.nodeType === 3) return escapeRichText(node.nodeValue);
        if (node.nodeType !== 1 || RICH_SKIP_TAGS.has(node.tagName)) return '';
        if (node.tagName === 'BR') return '<br>';
        if (node.hasAttribute('data-cite')) {
            const id = String(node.getAttribute('data-cite')).replace(/[^0-9]/g, '');
            return id ? `<span data-cite="${id}"></span>` : '';
        }
        const inner = Array.from(node.childNodes).map(inline).join('');
        if (!inner) return '';
        const style = node.getAttribute('style') || '';
        const wraps = [];
        const tag = RICH_INLINE_TAGS[node.tagName];
        // Google Docs envuelve todo en <b style="font-weight:normal">
        const notBold = /font-weight\s*:\s*(normal|[1-4]00)\b/i.test(style);
        if (tag && !(tag === 'b' && notBold)) wraps.push(tag);
        if (/font-weight\s*:\s*(bold|[6-9]00)\b/i.test(style) && !wraps.includes('b')) wraps.push('b');
        if (/font-style\s*:\s*italic/i.test(style) && !wraps.includes('i')) wraps.push('i');
        if (/text-decoration[^;]*underline/i.test(style) && !wraps.includes('u')) wraps.push('u');
        return wraps.reduceRight((acc, t) => `<${t}>${acc}</${t}>`, inner);
    };

    const listItems = list => {
        const items = [];
        Array.from(list.childNodes).forEach(child => {
            if (child.nodeType === 1 && (child.tagName === 'UL' || child.tagName === 'OL')) {
                items.push(...listItems(child));
                return;
            }
            if (child.nodeType === 1 && child.tagName === 'LI') {
                let text = '';
                const nested = [];
                Array.from(child.childNodes).forEach(n => {
                    if (n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')) {
                        nested.push(...listItems(n));
                    } else if (n.nodeType === 1 && RICH_BLOCK_TAGS.has(n.tagName)) {
                        const t = inline(n);
                        if (hasContent(t)) text += (hasContent(text) ? '<br>' : '') + t;
                    } else {
                        text += inline(n);
                    }
                });
                text = trimBreaks(text);
                if (hasContent(text)) items.push(text);
                items.push(...nested);
                return;
            }
            const t = trimBreaks(inline(child));
            if (hasContent(t)) items.push(t);
        });
        return items;
    };

    const out = [];
    let line = '';
    const flush = () => {
        const cleaned = trimBreaks(line);
        if (hasContent(cleaned)) out.push(`<p>${cleaned}</p>`);
        line = '';
    };
    const walk = parent => {
        Array.from(parent.childNodes).forEach(node => {
            if (node.nodeType === 3) { line += escapeRichText(node.nodeValue); return; }
            if (node.nodeType !== 1 || RICH_SKIP_TAGS.has(node.tagName)) return;
            const tag = node.tagName;
            if (tag === 'UL' || tag === 'OL') {
                flush();
                const items = listItems(node);
                const name = tag.toLowerCase();
                if (items.length) out.push(`<${name}>${items.map(item => `<li>${item}</li>`).join('')}</${name}>`);
                return;
            }
            if (tag === 'BR') { line += '<br>'; return; }
            if (RICH_BLOCK_TAGS.has(tag) && !node.hasAttribute('data-cite')) {
                flush();
                walk(node);
                flush();
                return;
            }
            line += inline(node);
        });
    };
    walk(root);
    flush();
    return out.join('').replace(/ {2,}/g, ' ');
}

// Se limpia de nuevo al dibujar; esta memoria evita repetir el trabajo
const richSanitizeCache = new Map();

function cachedSanitizeRichHtml(html) {
    const key = html || '';
    if (richSanitizeCache.has(key)) return richSanitizeCache.get(key);
    const clean = sanitizeRichHtml(key);
    if (richSanitizeCache.size > 400) richSanitizeCache.clear();
    richSanitizeCache.set(key, clean);
    richSanitizeCache.set(clean, clean);
    return clean;
}

/**
 * HTML limpio de un párrafo (convierte los antiguos de texto plano).
 */
function getRichHtml(block) {
    if (!block) return '';
    return isRichText(block) ? cachedSanitizeRichHtml(block.content) : plainToRichHtml(block.content);
}

/**
 * Todos los párrafos quedan en formato HTML limpio.
 */
function normalizeTextBlocks() {
    reportData.forEach(block => {
        if (block.type !== 'text') return;
        block.content = getRichHtml(block);
        block.format = 'html';
    });
}

/**
 * Texto plano de un párrafo (TXT, contador de palabras, revisión).
 */
function richHtmlToPlainText(html) {
    const doc = document.implementation.createHTMLDocument('');
    const root = doc.createElement('div');
    root.innerHTML = html || '';
    const text = node => Array.from(node.childNodes).map(n => {
        if (n.nodeType === 3) return n.nodeValue;
        if (n.nodeType !== 1) return '';
        if (n.tagName === 'BR') return '\n';
        if (n.hasAttribute('data-cite')) return getCitationText(n.getAttribute('data-cite'));
        return text(n);
    }).join('');
    const lines = [];
    Array.from(root.children).forEach(el => {
        if (el.tagName === 'UL' || el.tagName === 'OL') {
            Array.from(el.children).forEach((li, i) => lines.push(`${el.tagName === 'OL' ? `${i + 1}.` : '•'} ${text(li).trim()}`));
        } else {
            lines.push(text(el).trim());
        }
    });
    return lines.join('\n');
}

/**
 * Para la vista previa: clases de la hoja y el texto de cada cita.
 */
function richHtmlForPreview(html) {
    return (html || '')
        .replace(/<p>/g, '<p class="p-text">')
        .replace(/<ul>/g, '<ul class="p-list" data-split="children">')
        .replace(/<ol>/g, '<ol class="p-list" data-split="children">')
        .replace(/<span data-cite="(\d+)"><\/span>/g, (m, id) =>
            `<span class="p-cite" data-cite="${id}">${escapeHtml(getCitationText(id))}</span>`);
}

/**
 * Para el editor: las citas se ven como etiquetas que no se pueden editar.
 */
function richHtmlForEditor(html) {
    return (html || '').replace(/<span data-cite="(\d+)"><\/span>/g, (m, id) => citationChipHTML(id));
}

function citationChipHTML(refId) {
    return `<span class="cite-chip" contenteditable="false" data-cite="${refId}">${escapeHtml(getCitationText(refId))}</span>`;
}

function updateRichEmptyState(editor) {
    const empty = !editor.textContent.trim() && !editor.querySelector('li, .cite-chip');
    editor.classList.toggle('is-empty', empty);
}

/**
 * Lo escrito en el editor de un párrafo.
 */
function updateRichText(editor) {
    const block = reportData.find(b => String(b.id) === editor.dataset.blockId);
    if (!block) return;
    block.content = sanitizeRichHtml(editor.innerHTML);
    block.format = 'html';
    updateRichEmptyState(editor);
    renderPreview();
}

// Última selección de cada editor, para que los botones y "Citar" actúen
// donde estaba el cursor aunque el clic le quite el foco.
const richSavedRanges = new Map();

function getRichEditorFor(element) {
    const card = element && element.closest('.block-card');
    return card ? card.querySelector('.rich-editor') : null;
}

function focusRichEditor(editor) {
    editor.focus();
    const saved = richSavedRanges.get(editor.dataset.blockId);
    const selection = window.getSelection();
    if (saved && editor.contains(saved.startContainer)) {
        selection.removeAllRanges();
        selection.addRange(saved);
    } else if (!editor.contains(selection.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function richCommand(button, command) {
    const editor = getRichEditorFor(button);
    if (!editor) return;
    focusRichEditor(editor);
    document.execCommand(command, false, null);
    updateRichText(editor);
    updateRichToolbarState(editor);
}

function updateRichToolbarState(editor) {
    const card = editor && editor.closest('.block-card');
    if (!card) return;
    card.querySelectorAll('.rich-btn[data-cmd]').forEach(btn => {
        let active = false;
        try { active = document.queryCommandState(btn.dataset.cmd); } catch (e) { active = false; }
        btn.classList.toggle('is-active', !!active);
    });
}

document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const anchor = selection.anchorNode;
    const element = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement);
    const editor = element && element.closest('.rich-editor');
    if (!editor) return;
    richSavedRanges.set(editor.dataset.blockId, selection.getRangeAt(0).cloneRange());
    updateRichToolbarState(editor);
});

// Pegar: se conserva el formato básico (negritas, cursivas, listas) y se
// quita todo lo demás (colores, tipos de letra, imágenes...).
document.addEventListener('paste', event => {
    const editor = event.target && event.target.closest && event.target.closest('.rich-editor');
    if (!editor) return;
    event.preventDefault();
    const data = event.clipboardData;
    const html = data.getData('text/html');
    let clean = html ? sanitizeRichHtml(html) : plainToRichHtml(data.getData('text/plain'));
    // Un solo párrafo se pega dentro del párrafo donde está el cursor
    const single = clean.match(/^<p>([\s\S]*)<\/p>$/);
    if (single && !single[1].includes('<p>')) clean = single[1];
    document.execCommand('insertHTML', false, richHtmlForEditor(clean));
    updateRichText(editor);
});

// No se pueden soltar imágenes ni archivos dentro de un párrafo
document.addEventListener('drop', event => {
    const editor = event.target && event.target.closest && event.target.closest('.rich-editor');
    if (editor && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length) event.preventDefault();
}, true);

document.addEventListener('DOMContentLoaded', () => {
    // Enter crea <p> (no <div>) en los editores de párrafo
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* navegador antiguo */ }
});

// ---------- Citas ----------

/**
 * Bloques de referencia en orden (el número IEEE es su posición).
 */
function getReferenceBlocks() {
    return reportData.filter(b => b.type === 'ref' && b.refData);
}

/**
 * Apellido(s) para una cita APA: (Pérez, 2020), (Pérez y López, 2020) o
 * (Pérez et al., 2020). Sin autor se usa el título.
 */
function getAPACitationAuthor(refData) {
    const raw = String(refData.author || '').trim();
    if (!raw) {
        const title = String(refData.title || '').trim();
        if (!title) return 'Sin autor';
        const words = title.split(/\s+/);
        return `"${words.slice(0, 4).join(' ')}${words.length > 4 ? '...' : ''}"`;
    }
    let authors = raw.split(/\s*;\s*|\s+(?:y|and|&)\s+/i).map(a => a.trim()).filter(Boolean);
    // "Pérez, J., López, M., Ruiz, A." (lista con comas)
    if (authors.length === 1 && (authors[0].match(/,/g) || []).length >= 3) {
        authors = authors[0].split(/(?<=\.)\s*,\s*/).filter(Boolean);
    }
    const surname = author => author.includes(',') ? author.split(',')[0].trim() : author.split(/\s+/).pop();
    if (authors.length === 1) return surname(authors[0]);
    if (authors.length === 2) return `${surname(authors[0])} y ${surname(authors[1])}`;
    return `${surname(authors[0])} et al.`;
}

/**
 * Texto de una cita según el formato del documento: [1] o (Pérez, 2020).
 */
function getCitationText(refId) {
    const refs = getReferenceBlocks();
    const index = refs.findIndex(r => String(r.id) === String(refId));
    const apa = getCitationStyle() === 'apa';
    if (index === -1) return apa ? '(referencia eliminada)' : '[?]';
    if (apa) {
        const r = refs[index].refData;
        return `(${getAPACitationAuthor(r)}, ${String(r.year || '').trim() || 's.f.'})`;
    }
    return `[${index + 1}]`;
}

function describeReference(block) {
    const r = block.refData || {};
    const parts = [r.author, r.title].map(t => String(t || '').trim()).filter(Boolean);
    return (parts.join(' — ') || 'Referencia sin datos') + (r.year ? ` (${r.year})` : '');
}

/**
 * Las etiquetas de las citas en el editor siguen a las referencias (número,
 * autor o año) sin tener que volver a dibujar todo.
 */
function refreshCitationChips() {
    document.querySelectorAll('#editor-container .cite-chip').forEach(chip => {
        const text = getCitationText(chip.dataset.cite);
        if (chip.textContent !== text) chip.textContent = text;
        chip.classList.toggle('is-missing', getReferenceBlocks().every(r => String(r.id) !== chip.dataset.cite));
    });
}

function closeCitationPicker() {
    const picker = document.getElementById('cite-picker');
    if (picker) picker.remove();
}

/**
 * Menú para elegir qué referencia citar en el párrafo.
 */
function openCitationPicker(button, blockId) {
    const wasOpen = document.getElementById('cite-picker');
    closeCitationPicker();
    if (wasOpen && wasOpen.dataset.blockId === String(blockId)) return;

    const refs = getReferenceBlocks();
    const picker = document.createElement('div');
    picker.className = 'cite-picker';
    picker.id = 'cite-picker';
    picker.dataset.blockId = String(blockId);
    picker.innerHTML = refs.length
        ? `<div class="cite-picker-title">Citar una referencia</div>` + refs.map(r => `
            <button type="button" data-ref="${escapeAttr(String(r.id))}">
                <span class="cite-picker-label">${escapeHtml(getCitationText(r.id))}</span>
                <span class="cite-picker-desc">${escapeHtml(describeReference(r))}</span>
            </button>`).join('')
        : `<p class="cite-picker-empty">Todavía no tienes referencias. Agrega un bloque de <strong>Referencia</strong> y después cítalo aquí.</p>
           <button type="button" class="cite-picker-add" data-add-ref="1">➕ Agregar una referencia</button>`;

    picker.addEventListener('mousedown', e => e.preventDefault());
    picker.addEventListener('click', e => {
        const option = e.target.closest('button');
        if (!option) return;
        closeCitationPicker();
        if (option.dataset.addRef) {
            addBlock('ref');
            const cards = document.querySelectorAll('#editor-container .ref-card');
            const last = cards[cards.length - 1];
            if (last && last.scrollIntoView) last.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return;
        }
        insertCitation(blockId, option.dataset.ref);
    });

    document.body.appendChild(picker);
    const rect = button.getBoundingClientRect();
    const width = picker.offsetWidth;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    let top = rect.bottom + 6;
    if (top + picker.offsetHeight > window.innerHeight - 8) top = Math.max(8, rect.top - picker.offsetHeight - 6);
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
}

/**
 * Inserta la cita donde estaba el cursor.
 */
function insertCitation(blockId, refId) {
    const editor = document.querySelector(`.rich-editor[data-block-id="${String(blockId)}"]`);
    if (!editor) return;
    focusRichEditor(editor);
    document.execCommand('insertHTML', false, citationChipHTML(String(refId).replace(/[^0-9]/g, '')) + '&nbsp;');
    updateRichText(editor);
}

document.addEventListener('mousedown', event => {
    const picker = document.getElementById('cite-picker');
    if (picker && !picker.contains(event.target) && !event.target.closest('.rich-btn-cite')) closeCitationPicker();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeCitationPicker();
});

// ==========================================
// FORMATO DEL DOCUMENTO
// Tipo y tamaño de letra, interlineado, márgenes, tamaño de hoja, alineación,
// sangría y números de página. Es de cada documento (se guarda con él) y se
// aplica a la vista previa con variables CSS (--doc-*); la impresión y el
// Word usan los mismos valores.
// ==========================================

const DOC_FONTS = {
    georgia: { label: 'Georgia', css: "Georgia, 'Times New Roman', serif", word: 'Georgia' },
    times: { label: 'Times New Roman', css: "'Times New Roman', Times, serif", word: 'Times New Roman' },
    arial: { label: 'Arial', css: 'Arial, Helvetica, sans-serif', word: 'Arial' },
    calibri: { label: 'Calibri', css: "Calibri, Carlito, 'Segoe UI', sans-serif", word: 'Calibri' }
};

// Medidas en pulgadas
const PAPER_SIZES = {
    letter: { label: 'Carta', detail: '21.6 × 27.9 cm', w: 8.5, h: 11 },
    legal: { label: 'Oficio', detail: '21.6 × 35.6 cm', w: 8.5, h: 14 },
    a4: { label: 'A4', detail: '21 × 29.7 cm', w: 8.27, h: 11.69 }
};

const DOC_FONT_SIZES = [10, 11, 12, 13, 14];
const DOC_LINE_HEIGHTS = [
    { value: 1, label: 'Sencillo (1.0)' },
    { value: 1.15, label: '1.15' },
    { value: 1.5, label: '1.5' },
    { value: 1.8, label: 'Amplio (1.8)' },
    { value: 2, label: 'Doble (2.0)' }
];
const DOC_MARGINS = [
    { value: 1.5, label: 'Angostos (1.5 cm)' },
    { value: 2, label: 'Normales (2 cm)' },
    { value: 2.5, label: 'Amplios (2.5 cm)' },
    { value: 2.54, label: '1 pulgada (2.54 cm)' },
    { value: 3, label: 'Muy amplios (3 cm)' }
];

const DEFAULT_DOCUMENT_FORMAT = {
    font: 'georgia', size: 12, lineHeight: 1.8, margin: 2, paper: 'letter',
    align: 'justify', indent: false, pageNumbers: true
};

const DOCUMENT_FORMAT_PRESETS = [
    { id: 'default', name: 'Predeterminado', description: 'Georgia 12, interlineado amplio, márgenes de 2 cm', format: { ...DEFAULT_DOCUMENT_FORMAT } },
    { id: 'apa', name: 'APA 7', description: 'Times New Roman 12, doble espacio, 2.54 cm, sangría y alineado a la izquierda',
        format: { font: 'times', size: 12, lineHeight: 2, margin: 2.54, paper: 'letter', align: 'left', indent: true, pageNumbers: true } },
    { id: 'formal', name: 'Formal', description: 'Arial 12, interlineado 1.5, márgenes de 2.5 cm, justificado',
        format: { font: 'arial', size: 12, lineHeight: 1.5, margin: 2.5, paper: 'letter', align: 'justify', indent: false, pageNumbers: true } }
];

let documentFormatMemory = { ...DEFAULT_DOCUMENT_FORMAT };

/**
 * Completa y valida un formato (lo que falte o no sea válido toma el valor predeterminado).
 */
function normalizeDocumentFormat(format) {
    const f = { ...DEFAULT_DOCUMENT_FORMAT, ...(format && typeof format === 'object' ? format : {}) };
    if (!DOC_FONTS[f.font]) f.font = DEFAULT_DOCUMENT_FORMAT.font;
    if (!PAPER_SIZES[f.paper]) f.paper = DEFAULT_DOCUMENT_FORMAT.paper;
    f.size = DOC_FONT_SIZES.includes(Number(f.size)) ? Number(f.size) : DEFAULT_DOCUMENT_FORMAT.size;
    f.lineHeight = DOC_LINE_HEIGHTS.some(l => l.value === Number(f.lineHeight)) ? Number(f.lineHeight) : DEFAULT_DOCUMENT_FORMAT.lineHeight;
    f.margin = DOC_MARGINS.some(m => m.value === Number(f.margin)) ? Number(f.margin) : DEFAULT_DOCUMENT_FORMAT.margin;
    f.align = f.align === 'left' ? 'left' : 'justify';
    f.indent = !!f.indent;
    f.pageNumbers = f.pageNumbers !== false;
    return {
        font: f.font, size: f.size, lineHeight: f.lineHeight, margin: f.margin, paper: f.paper,
        align: f.align, indent: f.indent, pageNumbers: f.pageNumbers
    };
}

function getDocumentFormat() {
    return { ...documentFormatMemory };
}

/**
 * Formato para los documentos nuevos (el que el usuario eligió como suyo).
 */
function getDefaultDocumentFormat() {
    try {
        return normalizeDocumentFormat(JSON.parse(localStorage.getItem('defaultDocumentFormat')));
    } catch (e) {
        return { ...DEFAULT_DOCUMENT_FORMAT };
    }
}

/**
 * @param {object|null} format
 * @param {boolean} redraw - volver a armar la vista previa (no hace falta si después se llama a render())
 */
function setDocumentFormat(format, redraw = true) {
    documentFormatMemory = normalizeDocumentFormat(format);
    if (isAutosaveEnabled()) localStorage.setItem('documentFormat', JSON.stringify(documentFormatMemory));
    applyDocumentFormat();
    if (redraw) {
        renderPreview();
        applyPreviewZoom();
    }
}

function getPageWidthPx() {
    return Math.round(PAPER_SIZES[documentFormatMemory.paper].w * 96);
}

/**
 * Pasa el formato a la hoja (variables CSS) y al tamaño de página de la impresión.
 */
function applyDocumentFormat() {
    const f = documentFormatMemory;
    const paper = PAPER_SIZES[f.paper];
    const preview = document.getElementById('preview-container');
    if (preview) {
        preview.style.setProperty('--doc-font', DOC_FONTS[f.font].css);
        preview.style.setProperty('--doc-size', f.size + 'pt');
        preview.style.setProperty('--doc-line', String(f.lineHeight));
        preview.style.setProperty('--doc-margin', f.margin + 'cm');
        preview.style.setProperty('--doc-page-w', paper.w + 'in');
        preview.style.setProperty('--doc-page-h', paper.h + 'in');
        preview.style.setProperty('--doc-align', f.align);
        preview.style.setProperty('--doc-align-last', f.align === 'justify' ? 'justify' : 'auto');
        preview.style.setProperty('--doc-indent', f.indent ? '1.27cm' : '0');
        preview.classList.toggle('no-page-numbers', !f.pageNumbers);
    }

    let pageStyle = document.getElementById('doc-page-style');
    if (!pageStyle) {
        pageStyle = document.createElement('style');
        pageStyle.id = 'doc-page-style';
        document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `@media print { @page { size: ${paper.w}in ${paper.h}in; margin: 0; } }`;

    const title = document.getElementById('preview-title');
    if (title) title.textContent = `Vista previa (Hoja ${paper.label})`;
}

document.addEventListener('DOMContentLoaded', applyDocumentFormat);

function closeFormatModal() {
    const overlay = document.getElementById('format-modal-overlay');
    if (overlay) overlay.remove();
}

/**
 * Ventana "Formato del documento": los cambios se ven al momento en la hoja.
 */
function openFormatModal() {
    closeFormatModal();
    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay';
    overlay.id = 'format-modal-overlay';

    const options = (list, current) => list.map(o => `<option value="${o.value}" ${Number(o.value) === Number(current) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('');

    const draw = () => {
        const f = getDocumentFormat();
        const presetId = (DOCUMENT_FORMAT_PRESETS.find(p => JSON.stringify(normalizeDocumentFormat(p.format)) === JSON.stringify(f)) || {}).id;
        overlay.innerHTML = `
            <div class="university-modal format-modal">
                <h3>🔤 Formato del documento</h3>
                <p class="settings-hint">Cómo se ven las hojas, el PDF y el Word de <strong>este documento</strong>. Los cambios se ven al momento en la vista previa.</p>
                <div class="format-presets">
                    ${DOCUMENT_FORMAT_PRESETS.map(p => `
                        <button type="button" class="format-preset${p.id === presetId ? ' is-active' : ''}" data-preset="${p.id}">
                            <span class="format-preset-name">${escapeHtml(p.name)}</span>
                            <span class="format-preset-desc">${escapeHtml(p.description)}</span>
                        </button>`).join('')}
                </div>
                <div class="format-grid">
                    <label>Tipo de letra
                        <select data-field="font">${Object.entries(DOC_FONTS).map(([key, font]) => `<option value="${key}" ${f.font === key ? 'selected' : ''} style="font-family: ${escapeAttr(font.css)}">${escapeHtml(font.label)}</option>`).join('')}</select>
                    </label>
                    <label>Tamaño de letra
                        <select data-field="size">${options(DOC_FONT_SIZES.map(n => ({ value: n, label: `${n} pt` })), f.size)}</select>
                    </label>
                    <label>Interlineado
                        <select data-field="lineHeight">${options(DOC_LINE_HEIGHTS, f.lineHeight)}</select>
                    </label>
                    <label>Márgenes
                        <select data-field="margin">${options(DOC_MARGINS, f.margin)}</select>
                    </label>
                    <label>Tamaño de hoja
                        <select data-field="paper">${Object.entries(PAPER_SIZES).map(([key, paper]) => `<option value="${key}" ${f.paper === key ? 'selected' : ''}>${escapeHtml(paper.label)} (${escapeHtml(paper.detail)})</option>`).join('')}</select>
                    </label>
                    <label>Alineación de los párrafos
                        <select data-field="align">
                            <option value="justify" ${f.align === 'justify' ? 'selected' : ''}>Justificado</option>
                            <option value="left" ${f.align === 'left' ? 'selected' : ''}>A la izquierda</option>
                        </select>
                    </label>
                </div>
                <div class="format-checks">
                    <label class="backup-check"><input type="checkbox" data-field="indent" ${f.indent ? 'checked' : ''}> <span>Sangría en la primera línea de cada párrafo (1.27 cm)</span></label>
                    <label class="backup-check"><input type="checkbox" data-field="pageNumbers" ${f.pageNumbers ? 'checked' : ''}> <span>Números de página</span></label>
                </div>
                <p id="format-message" class="settings-success"></p>
                <div class="university-modal-actions">
                    <button type="button" class="action-btn" data-action="default" title="Los documentos nuevos empezarán con este formato">Usar en mis documentos nuevos</button>
                    <button type="button" class="action-btn save-btn" data-action="close">Listo</button>
                </div>
            </div>`;

        overlay.querySelectorAll('[data-field]').forEach(input => {
            input.addEventListener('change', () => {
                const next = getDocumentFormat();
                const field = input.dataset.field;
                next[field] = input.type === 'checkbox' ? input.checked : (['font', 'paper', 'align'].includes(field) ? input.value : Number(input.value));
                setDocumentFormat(next);
                draw();
            });
        });
        overlay.querySelectorAll('[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = DOCUMENT_FORMAT_PRESETS.find(p => p.id === btn.dataset.preset);
                setDocumentFormat({ ...preset.format });
                draw();
            });
        });
        overlay.querySelector('[data-action="default"]').addEventListener('click', () => {
            localStorage.setItem('defaultDocumentFormat', JSON.stringify(getDocumentFormat()));
            overlay.querySelector('#format-message').textContent = '✓ Tus documentos nuevos usarán este formato';
        });
        overlay.querySelector('[data-action="close"]').addEventListener('click', closeFormatModal);
    };

    overlay.addEventListener('click', e => { if (e.target === overlay) closeFormatModal(); });
    draw();
    document.body.appendChild(overlay);
}

// ==========================================
// CONTADOR DE PALABRAS Y REVISIÓN ANTES DE ENTREGAR
// La barra de abajo del editor muestra palabras y páginas, y el botón
// "Revisar" lista lo que falta (también se abre al imprimir si hay algo).
// ==========================================

/**
 * Palabras del cuerpo del documento: títulos, párrafos, tablas y
 * descripciones. No cuenta el encabezado, el índice, el código, las
 * referencias ni la declaración de IA.
 */
function countWords(text) {
    return String(text || '').split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
}

function countDocumentWords() {
    let total = 0;
    reportData.forEach(block => {
        if (block.type === 'title' || block.type === 'subtitle') total += countWords(block.content);
        else if (block.type === 'text') total += countWords(richHtmlToPlainText(getRichHtml(block)));
        else if (block.type === 'image') total += countWords(block.caption);
        else if (block.type === 'table') {
            total += countWords(block.caption);
            (block.tableData || []).forEach(row => (row || []).forEach(cell => { total += countWords(cell); }));
        }
    });
    return total;
}

let documentStatsTimer = null;

function scheduleDocumentStats() {
    clearTimeout(documentStatsTimer);
    documentStatsTimer = setTimeout(updateDocumentStats, 250);
}

function updateDocumentStats() {
    clearTimeout(documentStatsTimer);
    const stats = document.getElementById('doc-stats');
    if (stats) {
        const words = countDocumentWords();
        const pages = document.querySelectorAll('#preview-container .preview-page').length || 1;
        stats.textContent = `${words.toLocaleString('es-MX')} ${words === 1 ? 'palabra' : 'palabras'} · ${pages} ${pages === 1 ? 'página' : 'páginas'}`;
    }
    const badge = document.getElementById('review-badge');
    if (badge) {
        const pending = getDocumentIssues().filter(issue => issue.level !== 'info').length;
        badge.textContent = pending ? String(pending) : '✓';
        badge.classList.toggle('is-ok', !pending);
        const button = document.getElementById('review-btn');
        if (button) button.title = pending ? `Hay ${pending} ${pending === 1 ? 'detalle' : 'detalles'} por revisar antes de entregar` : 'Todo listo para entregar';
    }
}

/**
 * Lo que conviene revisar antes de entregar.
 * level: 'error' (falta algo importante), 'warn' (revisa) o 'info' (sugerencia).
 */
function getDocumentIssues() {
    const issues = [];
    const add = (level, message, blockId = null) => issues.push({ level, message, blockId });

    if (!reportData.length) {
        add('error', 'El documento está vacío: agrega bloques o usa una plantilla.');
        return issues;
    }

    // Encabezado
    const header = reportData.find(b => b.type === 'header');
    const h = getHeaderData() || {};
    if (!header) {
        add('warn', 'No tiene encabezado (tu nombre, materia, profesor...).');
    } else {
        const people = getHeaderPeople(h);
        if (!people.length) add('error', h.isTeam ? 'El encabezado no tiene integrantes.' : 'Falta tu nombre en el encabezado.', header.id);
        if (h.coverMode && !String(h.taskName || '').trim()) add('error', 'La portada no tiene el nombre de la tarea.', header.id);
        if (isHeaderFieldShown('studentId')) {
            const missing = people.filter(person => !person.id).map(person => person.name);
            if (missing.length) add('warn', `Falta la ${getHeaderFieldLabel('studentId', 'preview').toLowerCase()} de: ${missing.join(', ')}.`, header.id);
        }
        if (isHeaderFieldShown('subject') && !String(h.subject || '').trim()) add('warn', `Falta la ${getHeaderFieldLabel('subject', 'preview').toLowerCase()} en el encabezado.`, header.id);
        if (isHeaderFieldShown('prof') && !String(h.prof || '').trim()) add('warn', `Falta el ${getHeaderFieldLabel('prof', 'preview').toLowerCase()} en el encabezado.`, header.id);
        if (isHeaderFieldShown('date') && !String(h.date || '').trim()) add('warn', 'Falta la fecha de entrega en el encabezado.', header.id);
    }

    const refs = getReferenceBlocks();
    const refIds = new Set(refs.map(r => String(r.id)));
    const citedIds = new Set();
    let figure = 0;
    let table = 0;

    reportData.forEach(block => {
        switch (block.type) {
            case 'title':
                if (!String(block.content || '').trim()) add('warn', 'Hay un título vacío.', block.id);
                break;
            case 'subtitle':
                if (!String(block.content || '').trim()) add('warn', 'Hay un subtítulo vacío.', block.id);
                break;
            case 'text': {
                const html = getRichHtml(block);
                if (!richHtmlToPlainText(html).trim()) {
                    add('warn', block.hint ? `Párrafo sin llenar: "${block.hint}"` : 'Hay un párrafo vacío.', block.id);
                }
                const cited = Array.from(html.matchAll(/data-cite="(\d+)"/g)).map(m => m[1]);
                cited.forEach(id => citedIds.add(id));
                if (cited.some(id => !refIds.has(id))) add('error', 'Un párrafo cita una referencia que ya no existe.', block.id);
                break;
            }
            case 'image':
                figure++;
                if (!block.content) add('error', `La figura ${figure} no tiene imagen.`, block.id);
                if (!String(block.caption || '').trim()) add('warn', `La figura ${figure} no tiene descripción.`, block.id);
                break;
            case 'table': {
                table++;
                const data = block.tableData || [];
                const cells = data.flat().map(cell => String(cell || '').trim());
                if (!cells.some(Boolean)) add('warn', `La tabla ${table} está vacía.`, block.id);
                else if (!(data[0] || []).some(cell => String(cell || '').trim())) add('warn', `La tabla ${table} no tiene encabezados.`, block.id);
                if (!String(block.caption || '').trim()) add('warn', `La tabla ${table} no tiene descripción.`, block.id);
                break;
            }
            case 'code':
                if (!String(block.content || '').trim()) add('warn', 'Hay un bloque de código vacío.', block.id);
                break;
            case 'ref': {
                if (!block.refData) break;
                const r = block.refData;
                const missing = [];
                if (!String(r.author || '').trim()) missing.push('autor');
                if (!String(r.title || '').trim()) missing.push('título');
                if (!String(r.year || '').trim()) missing.push('año');
                if (block.refType === 'web' && !String(r.url || '').trim()) missing.push('URL');
                const name = getCitationStyle() === 'apa' ? `"${String(r.title || '').trim() || 'sin título'}"` : `[${refs.indexOf(block) + 1}]`;
                if (missing.length) add('warn', `A la referencia ${name} le falta: ${missing.join(', ')}.`, block.id);
                break;
            }
            case 'toc':
                if (!getTocAnchors().size) add('warn', 'El índice no tiene títulos ni subtítulos.', block.id);
                break;
            case 'ai':
                if (block.aiUsed === 'yes') {
                    const ai = block.aiData || {};
                    const missing = [];
                    if (!String(ai.aiTool || '').trim()) missing.push('qué IA usaste');
                    if (!String(ai.purpose || '').trim()) missing.push('el propósito');
                    if (!String(ai.prompt || '').trim()) missing.push('el prompt');
                    if (missing.length) add('warn', `En la declaración de IA falta: ${missing.join(', ')}.`, block.id);
                }
                break;
        }
    });

    // Referencias que no se citan (solo si el documento ya usa citas en el texto)
    if (citedIds.size) {
        refs.forEach((ref, i) => {
            if (!citedIds.has(String(ref.id))) {
                add('info', `La referencia ${getCitationStyle() === 'apa' ? `"${String(ref.refData.title || '').trim() || 'sin título'}"` : `[${i + 1}]`} no se cita en el texto.`, ref.id);
            }
        });
    }
    if (!reportData.some(b => b.type === 'ai')) add('info', 'No incluye la Declaración de uso de IA (muchas escuelas la piden).');
    if (!getDocumentName()) add('info', `El documento se llama "${DEFAULT_DOCUMENT_NAME}"; así se llamará el PDF.`);

    const order = { error: 0, warn: 1, info: 2 };
    return issues.sort((a, b) => order[a.level] - order[b.level]);
}

function closeReviewModal() {
    const overlay = document.getElementById('review-modal-overlay');
    if (overlay) overlay.remove();
}

/**
 * Lista de la revisión. Con forPrint = true se abrió al imprimir y ofrece
 * imprimir de todos modos.
 */
function openReviewModal(forPrint = false) {
    closeReviewModal();
    const issues = getDocumentIssues();
    const pending = issues.filter(i => i.level !== 'info').length;
    const icons = { error: 'error', warn: 'warning', info: 'lightbulb' };
    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay';
    overlay.id = 'review-modal-overlay';
    overlay.innerHTML = `
        <div class="university-modal review-modal">
            <h3>${pending ? '🔎 Antes de entregar' : '✅ Todo listo para entregar'}</h3>
            <p class="settings-hint">${pending
                ? `Encontramos ${pending} ${pending === 1 ? 'detalle' : 'detalles'} que conviene revisar.${forPrint ? ' Puedes corregirlos o imprimir de todos modos.' : ''}`
                : 'No falta nada importante.'} <span class="review-stats">${escapeHtml(document.getElementById('doc-stats') ? document.getElementById('doc-stats').textContent : '')}</span></p>
            ${issues.length ? `<ul class="review-list">
                ${issues.map((issue, i) => `
                    <li class="review-item is-${issue.level}">
                        <span class="material-symbols-outlined">${icons[issue.level]}</span>
                        <span class="review-text">${escapeHtml(issue.message)}</span>
                        ${issue.blockId !== null ? `<button type="button" class="review-go" data-index="${i}">Ir</button>` : ''}
                    </li>`).join('')}
            </ul>` : ''}
            <div class="university-modal-actions">
                ${forPrint ? '<button type="button" class="action-btn" data-action="print">Imprimir de todos modos</button>' : ''}
                <button type="button" class="action-btn save-btn" data-action="close">${forPrint && pending ? 'Revisar' : 'Cerrar'}</button>
            </div>
        </div>`;
    overlay.addEventListener('click', e => {
        if (e.target === overlay) { closeReviewModal(); return; }
        const go = e.target.closest('.review-go');
        if (go) {
            closeReviewModal();
            goToBlock(issues[Number(go.dataset.index)].blockId);
            return;
        }
        const action = e.target.closest('[data-action]');
        if (!action) return;
        closeReviewModal();
        if (action.dataset.action === 'print') printDocument(true);
    });
    document.body.appendChild(overlay);
}

/**
 * Lleva a la tarjeta del bloque y la resalta un momento.
 */
function goToBlock(blockId) {
    if (isMobileLayout()) setMobileView('editor');
    const index = reportData.findIndex(b => b.id === blockId);
    const card = document.querySelectorAll('#editor-container .block-card-container')[index];
    if (!card) return;
    if (card.scrollIntoView) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.classList.remove('is-highlighted');
    void card.offsetWidth;
    card.classList.add('is-highlighted');
    setTimeout(() => card.classList.remove('is-highlighted'), 2200);
}

/**
 * Imprimir / PDF: si hay detalles pendientes, primero se muestran.
 */
function printDocument(force = false) {
    if (!force && getDocumentIssues().some(issue => issue.level !== 'info')) {
        openReviewModal(true);
        return;
    }
    window.print();
}

// Ctrl+P también pasa por la revisión
document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'p') return;
    if (document.querySelector('.university-modal-overlay')) return;
    event.preventDefault();
    printDocument();
});

// ==========================================
// EXPORTAR A WORD (.docx)
// Un .docx es un ZIP con archivos XML (WordprocessingML). Se arma aquí mismo,
// sin librerías: zipFiles() junta los archivos (sin comprimir) y las
// funciones docx* escriben el XML. Usa el formato del documento (letra,
// interlineado, márgenes, hoja) y los colores de la universidad. El índice es
// un campo de Word: trae los números de página de la vista previa y Word
// ofrece actualizarlos al abrir.
// ==========================================

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * ZIP sin compresión. files: [{ name, data: Uint8Array | string }]
 */
function zipFiles(files, mimeType = 'application/zip') {
    const encoder = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [];
    const central = [];
    let offset = 0;

    files.forEach(file => {
        const name = encoder.encode(file.name);
        const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
        const crc = crc32(data);

        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true);
        local.setUint16(6, 0x0800, true); // nombres en UTF-8
        local.setUint16(8, 0, true);      // sin compresión
        local.setUint16(10, dosTime, true);
        local.setUint16(12, dosDate, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, data.length, true);
        local.setUint32(22, data.length, true);
        local.setUint16(26, name.length, true);
        local.setUint16(28, 0, true);
        parts.push(new Uint8Array(local.buffer), name, data);

        const entry = new DataView(new ArrayBuffer(46));
        entry.setUint32(0, 0x02014b50, true);
        entry.setUint16(4, 20, true);
        entry.setUint16(6, 20, true);
        entry.setUint16(8, 0x0800, true);
        entry.setUint16(10, 0, true);
        entry.setUint16(12, dosTime, true);
        entry.setUint16(14, dosDate, true);
        entry.setUint32(16, crc, true);
        entry.setUint32(20, data.length, true);
        entry.setUint32(24, data.length, true);
        entry.setUint16(28, name.length, true);
        entry.setUint32(42, offset, true);
        central.push(new Uint8Array(entry.buffer), name);

        offset += 30 + name.length + data.length;
    });

    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: mimeType });
}

function xmlText(text) {
    return String(text === undefined || text === null ? '' : text)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Color de la universidad en hexadecimal para Word ("1E3A8A").
 */
function docxColor(color, fallback) {
    const value = String(color || '').trim();
    let m = /^#?([0-9a-f]{6})$/i.exec(value);
    if (m) return m[1].toUpperCase();
    m = /^#?([0-9a-f]{3})$/i.exec(value);
    if (m) return m[1].split('').map(c => c + c).join('').toUpperCase();
    return fallback;
}

function docxRunProps(props) {
    let x = '';
    if (props.font) x += `<w:rFonts w:ascii="${xmlText(props.font)}" w:hAnsi="${xmlText(props.font)}" w:cs="${xmlText(props.font)}"/>`;
    if (props.b) x += '<w:b/><w:bCs/>';
    if (props.i) x += '<w:i/><w:iCs/>';
    if (props.color) x += `<w:color w:val="${props.color}"/>`;
    if (props.size) x += `<w:sz w:val="${Math.round(props.size * 2)}"/><w:szCs w:val="${Math.round(props.size * 2)}"/>`;
    if (props.u) x += '<w:u w:val="single"/>';
    return x ? `<w:rPr>${x}</w:rPr>` : '';
}

/**
 * Un "run" de texto con formato. \n = salto de línea, \t = tabulador.
 */
function docxRun(text, props = {}) {
    const inner = String(text === undefined || text === null ? '' : text).split('\n').map((line, i) =>
        (i ? '<w:br/>' : '') + line.split('\t').map((piece, j) =>
            (j ? '<w:tab/>' : '') + (piece ? `<w:t xml:space="preserve">${xmlText(piece)}</w:t>` : '')).join('')).join('');
    return inner ? `<w:r>${docxRunProps(props)}${inner}</w:r>` : '';
}

function docxParagraph(content, o = {}) {
    let pPr = '';
    if (o.style) pPr += `<w:pStyle w:val="${o.style}"/>`;
    if (o.keepNext) pPr += '<w:keepNext/>';
    if (o.numId) pPr += `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${o.numId}"/></w:numPr>`;
    if (o.borderBottom) pPr += `<w:pBdr><w:bottom w:val="single" w:sz="${o.borderBottom.size || 8}" w:space="4" w:color="${o.borderBottom.color}"/></w:pBdr>`;
    if (o.tabs) pPr += `<w:tabs>${o.tabs.map(t => `<w:tab w:val="${t.val}"${t.leader ? ` w:leader="${t.leader}"` : ''} w:pos="${t.pos}"/>`).join('')}</w:tabs>`;
    if (o.spacing) {
        const sp = o.spacing;
        pPr += `<w:spacing${sp.before !== undefined ? ` w:before="${sp.before}"` : ''}${sp.after !== undefined ? ` w:after="${sp.after}"` : ''}${sp.line !== undefined ? ` w:line="${sp.line}" w:lineRule="auto"` : ''}/>`;
    }
    if (o.ind) {
        const ind = o.ind;
        pPr += `<w:ind${ind.left !== undefined ? ` w:left="${ind.left}"` : ''}${ind.hanging !== undefined ? ` w:hanging="${ind.hanging}"` : ''}${ind.firstLine !== undefined ? ` w:firstLine="${ind.firstLine}"` : ''}/>`;
    }
    if (o.align) pPr += `<w:jc w:val="${o.align}"/>`;
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${content || ''}</w:p>`;
}

/**
 * HTML de una línea (negritas, cursivas, subrayado, <br> y citas) -> runs.
 */
function docxRunsFromHtml(html, base = {}) {
    const doc = document.implementation.createHTMLDocument('');
    const root = doc.createElement('div');
    root.innerHTML = String(html || '').trim();
    const walk = (node, props) => Array.from(node.childNodes).map(n => {
        if (n.nodeType === 3) return docxRun(n.nodeValue.replace(/\s+/g, ' '), props);
        if (n.nodeType !== 1) return '';
        if (n.tagName === 'BR') return '<w:r><w:br/></w:r>';
        if (n.hasAttribute('data-cite')) return docxRun(getCitationText(n.getAttribute('data-cite')), props);
        const next = { ...props };
        if (n.tagName === 'B' || n.tagName === 'STRONG') next.b = true;
        if (n.tagName === 'I' || n.tagName === 'EM') next.i = true;
        if (n.tagName === 'U') next.u = true;
        return walk(n, next);
    }).join('');
    return walk(root, base);
}

/**
 * Bytes, tipo y medidas de una imagen (data URL o dirección web). Los
 * formatos que Word no abre (SVG, WebP...) se pasan a PNG. null si no se
 * pudo leer (por ejemplo, un logo de otro sitio que no lo permite).
 */
async function loadImageForDocx(src) {
    if (!src) return null;
    try {
        let blob;
        const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(src);
        if (match) {
            const raw = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xFF;
            blob = new Blob([bytes], { type: match[1] || 'image/png' });
        } else {
            const response = await fetch(src, { mode: 'cors' });
            if (!response.ok) return null;
            blob = await response.blob();
        }
        const url = URL.createObjectURL(blob);
        try {
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = url;
            });
            const w = img.naturalWidth || 300;
            const h = img.naturalHeight || 150;
            let type = blob.type;
            if (!['image/png', 'image/jpeg', 'image/gif'].includes(type)) {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (!blob) return null;
                type = 'image/png';
            }
            return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: type === 'image/jpeg' ? 'jpeg' : type.split('/')[1], w, h };
        } finally {
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        return null;
    }
}

/**
 * Arma el .docx del documento actual (Blob). Lo usa exportDOCX().
 */
async function buildDocx() {
    const f = getDocumentFormat();
    const paper = PAPER_SIZES[f.paper];
    const font = DOC_FONTS[f.font].word;
    const size = f.size;
    const pageW = Math.round(paper.w * 1440);
    const pageH = Math.round(paper.h * 1440);
    const margin = Math.round(f.margin * 566.93);
    const contentW = pageW - 2 * margin;           // twips
    const contentEmu = contentW * 635;             // 1 twip = 635 EMU
    const maxImageEmu = 6480000;                   // 18 cm, como en la hoja
    const bodyAlign = f.align === 'justify' ? 'both' : 'left';
    const bodyInd = f.indent ? { firstLine: 720 } : null;

    const themeId = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
    const uni = getUniversityById(themeId) || getUniversityById('generic') || {};
    const colors = uni.color || {};
    const primary = docxColor(colors.primary, '1F2937');
    const secondary = docxColor(colors.secondary, '6B7280');

    // ---------- Imágenes ----------
    const media = [];
    let drawingId = 0;
    const imageRun = async (src, maxW, maxH) => {
        const image = await loadImageForDocx(src);
        if (!image) return '';
        const n = media.length + 1;
        media.push({ name: `word/media/image${n}.${image.ext}`, data: image.bytes, ext: image.ext, rid: `rIdImg${n}` });
        let cx = image.w * 9525;
        let cy = image.h * 9525;
        const scale = Math.min(1, maxW / cx, maxH / cy);
        cx = Math.round(cx * scale);
        cy = Math.round(cy * scale);
        drawingId++;
        return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
            `<wp:docPr id="${drawingId}" name="Imagen ${drawingId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
            `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>` +
            `<pic:nvPicPr><pic:cNvPr id="${drawingId}" name="image${n}.${image.ext}"/><pic:cNvPicPr/></pic:nvPicPr>` +
            `<pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
            `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
            `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    };

    // ---------- Listas ----------
    const orderedLists = []; // un numId por lista numerada (cada una empieza en 1)

    // ---------- Contenido ----------
    const body = [];
    const header = getHeaderData() || {};
    const show = key => isHeaderFieldShown(key);
    const lbl = key => getHeaderFieldLabel(key, 'preview');
    const labelRun = text => docxRun(text, { b: true });
    const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    let hasCover = false;
    let hasToc = false;
    let figure = 0;
    let table = 0;
    let refNumber = 0;
    const tocAnchors = getTocAnchors();
    const preview = document.getElementById('preview-container');
    const tocPage = anchor => {
        const target = preview && preview.querySelector(`[data-toc-anchor="${anchor}"]`);
        const page = target && target.closest('.preview-page');
        return page ? page.dataset.page : '';
    };

    const logosParagraph = async (alignCenter) => {
        if (!header.includeLogo || !(uni.logoLeft || uni.logoRight)) return '';
        const left = uni.logoLeft ? await imageRun(uni.logoLeft, 952500, 762000) : '';
        const right = uni.logoRight ? await imageRun(uni.logoRight, 952500, 762000) : '';
        if (!left && !right) return '';
        return docxParagraph(`${left}<w:r><w:tab/></w:r>${right}`, {
            tabs: [{ val: 'right', pos: contentW }], spacing: { after: 240 }, align: alignCenter ? undefined : undefined
        });
    };

    for (const block of reportData) {
        switch (block.type) {
            case 'header': {
                const people = getHeaderPeople(header);
                const showIds = show('studentId');
                if (header.coverMode) {
                    hasCover = true;
                    const center = { align: 'center', spacing: { after: 120 } };
                    body.push(await logosParagraph(true));
                    if (show('institution') && uni.id !== 'generic' && uni.name) {
                        body.push(docxParagraph(docxRun(uni.name, { b: true, color: primary, size: size * 1.4 }), { align: 'center', spacing: { before: 600, after: 120 } }));
                    }
                    if (show('career') && header.career) body.push(docxParagraph(docxRun(header.career, { size: size * 1.15 }), center));
                    const task = String(header.taskName || '').trim() || '[Nombre de la tarea]';
                    body.push(docxParagraph(docxRun(task, { b: true, color: primary, size: size * 2.2 }), { align: 'center', spacing: { before: 2400, after: 2400, line: 240 } }));
                    const row = (key, value) => (show(key) && value)
                        ? body.push(docxParagraph(labelRun(`${lbl(key)}: `) + docxRun(value), center)) : null;
                    row('subject', header.subject);
                    row('prof', header.prof);
                    if (header.isTeam) {
                        body.push(docxParagraph(labelRun('Integrantes:'), center));
                        (people.length ? people : [{ name: '[Nombre del alumno]', id: '' }]).forEach(person => {
                            body.push(docxParagraph(docxRun(person.name + (showIds && person.id ? ` (${person.id})` : '')), { align: 'center', spacing: { after: 40 } }));
                        });
                    } else {
                        const person = people[0] || { name: '[Nombre del alumno]', id: '' };
                        body.push(docxParagraph(labelRun('Alumno: ') + docxRun(person.name), center));
                        if (showIds && person.id) body.push(docxParagraph(labelRun(`${lbl('studentId')}: `) + docxRun(person.id), center));
                    }
                    row('group', header.group);
                    row('term', formatTerm(header.term));
                    if (show('date') && header.date) body.push(docxParagraph(docxRun(formatLongDate(header.date)), { align: 'center', spacing: { before: 1800 } }));
                    body.push(pageBreak);
                    break;
                }

                const line = { spacing: { after: 60, line: 276 } };
                body.push(await logosParagraph(false));
                if (show('institution')) body.push(docxParagraph(labelRun(`${lbl('institution')}: `) + docxRun(uni.name || ''), line));
                if (show('career') && header.career) body.push(docxParagraph(labelRun(`${lbl('career')}: `) + docxRun(header.career), line));
                const termText = show('term') && header.term ? formatTerm(header.term) : '';
                if (show('subject')) body.push(docxParagraph(labelRun(`${lbl('subject')}: `) + docxRun(`${header.subject || ''}${termText ? ` (${termText})` : ''}`), line));
                else if (termText) body.push(docxParagraph(labelRun(`${lbl('term')}: `) + docxRun(termText), line));
                if (show('prof')) body.push(docxParagraph(labelRun(`${lbl('prof')}: `) + docxRun(header.prof || ''), line));
                let peopleRuns;
                if (header.isTeam) {
                    peopleRuns = labelRun('Integrantes: ') + docxRun(people.map(p => p.name + (showIds && p.id ? ` (${p.id})` : '')).join(', '));
                } else {
                    const person = people[0] || { name: '', id: '' };
                    peopleRuns = labelRun('Alumno: ') + docxRun(person.name) +
                        (showIds && person.id ? docxRun(' | ') + labelRun(`${lbl('studentId')}: `) + docxRun(person.id) : '');
                }
                if (show('group') && header.group) peopleRuns += docxRun(' | ') + labelRun(`${lbl('group')}: `) + docxRun(header.group);
                body.push(docxParagraph(peopleRuns, line));
                if (show('date')) body.push(docxParagraph(labelRun(`${lbl('date')}: `) + docxRun(header.date || ''), line));
                body.push(docxParagraph('', { borderBottom: { color: primary, size: 12 }, spacing: { after: 360 } }));
                break;
            }

            case 'toc': {
                hasToc = true;
                body.push(docxParagraph(docxRun((block.content || '').trim() || 'Índice', { b: true, color: primary, size: size * 1.6 }), { align: 'center', spacing: { after: 360 } }));
                const entries = reportData.filter(b => tocAnchors.has(b.id));
                const tabs = [{ val: 'right', leader: 'dot', pos: contentW }];
                const begin = '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>';
                const end = '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
                if (!entries.length) {
                    body.push(docxParagraph(begin + docxRun('Agrega títulos o subtítulos y actualiza el índice.', { i: true }) + end));
                } else {
                    entries.forEach((entry, i) => {
                        const runs = docxRun(entry.content.trim()) + '<w:r><w:tab/></w:r>' + docxRun(tocPage(tocAnchors.get(entry.id)));
                        body.push(docxParagraph((i === 0 ? begin : '') + runs + (i === entries.length - 1 ? end : ''), {
                            style: entry.type === 'title' ? 'TOC1' : 'TOC2', tabs
                        }));
                    });
                }
                body.push(pageBreak);
                break;
            }

            case 'title':
                body.push(docxParagraph(docxRun(block.content || ''), { style: 'Heading1' }));
                break;

            case 'subtitle':
                body.push(docxParagraph(docxRun(block.content || ''), { style: 'Heading2' }));
                break;

            case 'text': {
                const doc = document.implementation.createHTMLDocument('');
                const root = doc.createElement('div');
                root.innerHTML = getRichHtml(block);
                Array.from(root.children).forEach(el => {
                    if (el.tagName === 'UL' || el.tagName === 'OL') {
                        let numId = 1;
                        if (el.tagName === 'OL') {
                            numId = 2 + orderedLists.length;
                            orderedLists.push(numId);
                        }
                        Array.from(el.children).forEach(li => {
                            body.push(docxParagraph(docxRunsFromHtml(li.innerHTML), { numId, align: bodyAlign, spacing: { after: 80 } }));
                        });
                    } else {
                        body.push(docxParagraph(docxRunsFromHtml(el.innerHTML), { align: bodyAlign, ind: bodyInd }));
                    }
                });
                break;
            }

            case 'image': {
                figure++;
                const picture = block.content ? await imageRun(block.content, contentEmu, maxImageEmu) : '';
                body.push(docxParagraph(picture || docxRun('[Imagen no seleccionada]', { i: true }), { align: 'center', keepNext: true, spacing: { before: 240, after: 120 } }));
                body.push(docxParagraph(docxRun(`Figura ${figure}: `, { b: true }) + docxRun(block.caption || ''), { style: 'Caption', align: 'center' }));
                break;
            }

            case 'table': {
                table++;
                const data = block.tableData || [];
                if (!data.length) break;
                const cols = Math.max(1, Math.min(6, block.columns || (data[0] || []).length || 1));
                const colW = Math.floor(contentW / cols);
                const cell = (text, isHeader, last) => `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>` +
                    (isHeader ? '<w:tcBorders><w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/></w:tcBorders>' : '') +
                    `<w:vAlign w:val="center"/></w:tcPr>` +
                    docxParagraph(docxRun(text, { size: size * (isHeader ? 0.9 : 0.85) }), { align: 'center', spacing: { before: 60, after: 60, line: 260 } }) + '</w:tc>';
                const rows = data.map((row, r) => {
                    const cells = [];
                    for (let c = 0; c < cols; c++) cells.push(cell((row || [])[c] || '', r === 0, r === data.length - 1));
                    return `<w:tr>${r === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>'}${cells.join('')}</w:tr>`;
                }).join('');
                body.push(`<w:tbl><w:tblPr><w:tblW w:w="${contentW}" w:type="dxa"/><w:jc w:val="center"/>` +
                    `<w:tblBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/></w:tblBorders>` +
                    `<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar>` +
                    `<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr>` +
                    `<w:tblGrid>${Array.from({ length: cols }, () => `<w:gridCol w:w="${colW}"/>`).join('')}</w:tblGrid>${rows}</w:tbl>`);
                body.push(docxParagraph(docxRun(`Tabla ${table}: `, { b: true }) + docxRun(block.caption || ''), { style: 'Caption' }));
                break;
            }

            case 'code': {
                const lines = codeTokenLines(block.content, getCodeLanguage(block));
                const digits = String(lines.length).length;
                lines.forEach((tokens, i) => {
                    const number = block.lineNumbers ? docxRun(String(i + 1).padStart(digits, ' ') + '  ', { color: '94A3B8' }) : '';
                    const runs = tokens.map(token => docxRun(token.v.replace(/\t/g, '    '), {
                        color: CODE_TOKEN_COLORS[token.t], i: token.t === 'com'
                    })).join('');
                    body.push(docxParagraph(number + runs, {
                        style: 'Codigo', spacing: i === 0 ? { before: 240 } : (i === lines.length - 1 ? { after: 240 } : undefined)
                    }));
                });
                break;
            }

            case 'ref': {
                if (!block.refData) break;
                refNumber++;
                const r = block.refData;
                if (getCitationStyle() === 'apa') {
                    body.push(docxParagraph(docxRunsFromHtml(formatAPAReference(block.refType, r.author, r.title, r.source, r.year, r.url)), {
                        ind: { left: 720, hanging: 720 }, align: 'left', spacing: { after: 160 }
                    }));
                } else {
                    body.push(docxParagraph(docxRun(`[${refNumber}]`, { b: true, color: primary }) + '<w:r><w:tab/></w:r>' +
                        docxRunsFromHtml(formatIEEEReference(block.refType, r.author, r.title, r.source, r.year, r.url)), {
                        tabs: [{ val: 'left', pos: 720 }], ind: { left: 720, hanging: 720 }, align: 'left', spacing: { after: 160 }
                    }));
                }
                break;
            }

            case 'ai': {
                if (!block.aiData) break;
                const ai = block.aiData;
                const studentName = getHeaderStudentName(header) || '[Nombre del estudiante]';
                if (block.aiUsed === 'no') {
                    const name = ai.name || studentName;
                    body.push(docxParagraph(docxRunsFromHtml(`Yo, <b>${escapeHtml(name)}</b>, declaro que <b>NO</b> he utilizado herramientas de Inteligencia Artificial para la elaboración de este trabajo académico. Afirmo que cuento con evidencias físicas y/o digitales que demuestran mi autoría, incluyendo pero no limitándose a: documentos manuscritos, materiales impresos con anotaciones o subrayado, historial de versiones de documentos electrónicos, o commits en repositorios de código.`), { align: bodyAlign, spacing: { before: 480 } }));
                    body.push(docxParagraph(docxRun('Reconozco y acepto que el profesor se reserva el derecho de solicitar dichas evidencias en cualquier momento, especialmente cuando existan sospechas o se detecten conductas que atenten contra la integridad académica, tales como plagio o uso no reportado de herramientas de IA.'), { align: bodyAlign }));
                } else {
                    const line = (label, value) => body.push(docxParagraph(labelRun(`${label}: `) + docxRun(value || ''), { spacing: { after: 80 } }));
                    line('Nombre del estudiante', ai.name || studentName);
                    line('IA utilizada', ai.aiTool);
                    line('Fecha de uso', ai.date);
                    line('Propósito', ai.purpose);
                    body.push(docxParagraph(labelRun('Prompt utilizado:'), { spacing: { before: 240, after: 80 }, keepNext: true }));
                    String(ai.prompt || '').split('\n').forEach(l => body.push(docxParagraph(docxRun(l), { style: 'Codigo' })));
                    if (ai.attachments) line('Archivos suministrados', ai.attachments);
                    body.push(docxParagraph(labelRun('Respuesta en crudo (raw):'), { spacing: { before: 240, after: 80 }, keepNext: true }));
                    String(ai.rawResponse || '').split('\n').forEach(l => body.push(docxParagraph(docxRun(l), { style: 'Codigo' })));
                }
                break;
            }
        }
    }

    const sectPr = `<w:sectPr>${f.pageNumbers ? '<w:footerReference w:type="default" r:id="rIdFooter1"/>' : ''}` +
        `<w:pgSz w:w="${pageW}" w:h="${pageH}"/>` +
        `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="708" w:footer="567" w:gutter="0"/>` +
        `${hasCover ? '<w:titlePg/>' : ''}</w:sectPr>`;

    const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        `<w:body>${body.filter(Boolean).join('')}${sectPr}</w:body></w:document>`;

    const half = n => Math.round(n * 2);
    const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${xmlText(font)}" w:hAnsi="${xmlText(font)}" w:eastAsia="${xmlText(font)}" w:cs="${xmlText(font)}"/>` +
        `<w:sz w:val="${half(size)}"/><w:szCs w:val="${half(size)}"/><w:lang w:val="es-MX" w:eastAsia="es-MX" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>` +
        `<w:pPrDefault><w:pPr><w:spacing w:after="240" w:line="${Math.round(f.lineHeight * 240)}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
        '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>' +
        `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>` +
        `<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="480" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr>` +
        `<w:rPr><w:b/><w:bCs/><w:color w:val="${primary}"/><w:sz w:val="${half(size * 2.2)}"/><w:szCs w:val="${half(size * 2.2)}"/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/>` +
        `<w:pPr><w:keepNext/><w:keepLines/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="${secondary}"/></w:pBdr><w:spacing w:before="360" w:after="200" w:line="240" w:lineRule="auto"/><w:outlineLvl w:val="1"/></w:pPr>` +
        `<w:rPr><w:b/><w:bCs/><w:color w:val="${primary}"/><w:sz w:val="${half(size * 1.5)}"/><w:szCs w:val="${half(size * 1.5)}"/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="35"/><w:unhideWhenUsed/><w:qFormat/>` +
        `<w:pPr><w:spacing w:before="120" w:after="360" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="6C757D"/><w:sz w:val="${half(size * 0.9)}"/><w:szCs w:val="${half(size * 0.9)}"/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:customStyle="1" w:styleId="Codigo"><w:name w:val="Código"/><w:basedOn w:val="Normal"/><w:qFormat/>` +
        `<w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="${secondary}"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F8F9FA"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="240"/><w:jc w:val="left"/></w:pPr>` +
        `<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Courier New"/><w:noProof/><w:sz w:val="${half(size * 0.8)}"/><w:szCs w:val="${half(size * 0.8)}"/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/>` +
        `<w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:b/><w:bCs/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="TOC2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/>` +
        `<w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/><w:ind w:left="440"/></w:pPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/>` +
        `<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="64748B"/><w:sz w:val="${half(size * 0.85)}"/><w:szCs w:val="${half(size * 0.85)}"/></w:rPr></w:style>` +
        '</w:styles>';

    const lvl = (fmt, text) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>`;
    const numberingXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>${lvl('bullet', '•')}</w:abstractNum>` +
        `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>${lvl('decimal', '%1.')}</w:abstractNum>` +
        '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
        orderedLists.map(id => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('') +
        '</w:numbering>';

    const settingsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:defaultTabStop w:val="708"/>' + (hasToc ? '<w:updateFields w:val="true"/>' : '') +
        '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
        '</w:settings>';

    const footerXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' +
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';

    const rel = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
    const documentRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        rel('rIdStyles', 'styles', 'styles.xml') + rel('rIdNumbering', 'numbering', 'numbering.xml') +
        rel('rIdSettings', 'settings', 'settings.xml') + rel('rIdFooter1', 'footer', 'footer1.xml') +
        media.map(m => rel(m.rid, 'image', m.name.replace('word/', ''))).join('') +
        '</Relationships>';

    const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '</Relationships>';

    const authors = getHeaderPeople(header).map(person => person.name).join(', ');
    const nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const coreXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        `<dc:title>${xmlText(getDocumentName() || DEFAULT_DOCUMENT_NAME)}</dc:title><dc:creator>${xmlText(authors)}</dc:creator>` +
        `<dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>` +
        '</cp:coreProperties>';

    const exts = Array.from(new Set(media.map(m => m.ext)));
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        exts.map(ext => `<Default Extension="${ext}" ContentType="image/${ext}"/>`).join('') +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '</Types>';

    return zipFiles([
        { name: '[Content_Types].xml', data: contentTypes },
        { name: '_rels/.rels', data: rootRels },
        { name: 'docProps/core.xml', data: coreXml },
        { name: 'word/document.xml', data: documentXml },
        { name: 'word/styles.xml', data: stylesXml },
        { name: 'word/numbering.xml', data: numberingXml },
        { name: 'word/settings.xml', data: settingsXml },
        { name: 'word/footer1.xml', data: footerXml },
        { name: 'word/_rels/document.xml.rels', data: documentRels },
        ...media.map(m => ({ name: m.name, data: m.data }))
    ], DOCX_MIME);
}

/**
 * Botón "Word": descarga el documento como .docx.
 */
async function exportDOCX() {
    const buttons = document.querySelectorAll('.btn-word, .preview-docx-link');
    buttons.forEach(b => { b.disabled = true; });
    try {
        renderPreview(); // números de página del índice al día
        const blob = await buildDocx();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${getSafeFileName()}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (error) {
        console.error('Error al exportar a Word:', error);
        alert('No se pudo crear el archivo de Word: ' + error.message);
    } finally {
        buttons.forEach(b => { b.disabled = false; });
    }
}

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

// ==========================================
// CÓDIGO CON COLORES
// Resaltado propio (sin librerías, funciona sin internet): tokenizeCode()
// separa el código en piezas (palabra clave, texto, comentario, número...)
// y la vista previa y el Word les dan color. El lenguaje se elige en la
// tarjeta o se detecta solo (detectCodeLanguage).
// ==========================================

const CODE_LANGUAGES = {
    auto: { label: 'Detectar solo' },
    python: {
        label: 'Python', line: ['#'], block: [], strings: ['\"\"\"', "'''", '"', "'"], decorators: true,
        keywords: 'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case None True False self',
        builtins: 'print len range int float str list dict set tuple bool input open type isinstance enumerate zip map filter sum min max abs round sorted reversed super object Exception ValueError TypeError KeyError'
    },
    javascript: {
        label: 'JavaScript / TypeScript', line: ['//'], block: [['/*', '*/']], strings: ['`', '"', "'"], decorators: true,
        keywords: 'break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return super switch this throw try typeof var void while with yield async await static get set null undefined true false interface type enum implements public private protected readonly as',
        builtins: 'console document window Math JSON Array Object String Number Boolean Promise Map Set Date RegExp Error parseInt parseFloat setTimeout fetch require module exports any string number boolean void never unknown'
    },
    java: {
        label: 'Java', line: ['//'], block: [['/*', '*/']], strings: ['"', "'"], decorators: true, typeCase: true,
        keywords: 'abstract assert break case catch class continue default do else enum extends final finally for if implements import instanceof interface native new package private protected public return static super switch synchronized this throw throws transient try volatile while var record true false null',
        builtins: 'int long short byte float double char boolean void String System Integer Double List ArrayList Map HashMap Scanner Math Object'
    },
    c: {
        label: 'C', line: ['//'], block: [['/*', '*/']], strings: ['"', "'"], preprocessor: true,
        keywords: 'auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while NULL true false',
        builtins: 'int long short char float double void unsigned signed bool size_t FILE printf scanf malloc free puts gets strlen strcpy'
    },
    cpp: {
        label: 'C++', line: ['//'], block: [['/*', '*/']], strings: ['"', "'"], preprocessor: true, typeCase: true,
        keywords: 'alignas auto break case catch class const constexpr continue default delete do else enum explicit export extern for friend goto if inline mutable namespace new noexcept nullptr operator private protected public return sizeof static struct switch template this throw try typedef typename union using virtual volatile while true false',
        builtins: 'int long short char float double void unsigned signed bool string vector map set std cout cin endl size_t printf'
    },
    csharp: {
        label: 'C#', line: ['//'], block: [['/*', '*/']], strings: ['"', "'"], typeCase: true,
        keywords: 'abstract as base break case catch class const continue default delegate do else enum event explicit extern finally fixed for foreach goto if implicit in interface internal is lock namespace new operator out override params private protected public readonly ref return sealed sizeof static struct switch this throw try typeof unchecked unsafe using virtual void volatile while var async await get set true false null',
        builtins: 'int long short byte float double decimal char bool string object Console List Dictionary Math Task'
    },
    php: {
        label: 'PHP', line: ['//', '#'], block: [['/*', '*/']], strings: ['"', "'"], variables: true,
        keywords: 'abstract and array as break case catch class clone const continue declare default do echo else elseif empty endif endforeach endwhile extends final finally fn for foreach function global if implements include include_once instanceof interface isset list namespace new or print private protected public require require_once return static switch throw trait try unset use var while yield true false null',
        builtins: 'strlen count array_push array_map explode implode str_replace json_encode json_decode isset print_r var_dump'
    },
    sql: {
        label: 'SQL', line: ['--'], block: [['/*', '*/']], strings: ["'", '"'], caseInsensitive: true,
        keywords: 'select from where insert into values update set delete create table alter drop index view primary key foreign references not null unique default and or in is like between join inner left right outer full on group by order having limit offset as distinct union all exists case when then else end begin commit rollback database if',
        builtins: 'int integer varchar char text date datetime timestamp float double decimal boolean count sum avg min max now coalesce'
    },
    html: { label: 'HTML / XML', markup: true },
    css: { label: 'CSS', css: true },
    plain: { label: 'Texto sin colores' }
};

// Para cada lenguaje, las listas de palabras como conjuntos
Object.values(CODE_LANGUAGES).forEach(lang => {
    lang.kwSet = new Set((lang.keywords || '').split(/\s+/).filter(Boolean));
    lang.biSet = new Set((lang.builtins || '').split(/\s+/).filter(Boolean));
});

// Colores (los mismos en la hoja y en el Word)
const CODE_TOKEN_COLORS = {
    kw: 'CF222E', str: '0A3069', com: '6E7781', num: '0550AE', fn: '8250DF',
    type: '953800', tag: '116329', attr: '0550AE', var: '953800', pre: 'CF222E'
};

/**
 * Adivina el lenguaje por el contenido.
 */
function detectCodeLanguage(code) {
    const c = String(code || '');
    if (!c.trim()) return 'plain';
    if (/<\?php/.test(c)) return 'php';
    if (/^\s*<(!doctype|\?xml|[a-z][\w-]*[\s>])/i.test(c) && /<\/[a-z][\w-]*>|\/>/i.test(c)) return 'html';
    if (/^\s*#\s*include\s*[<"]/m.test(c)) return /\bstd::|\bcout\b|\bcin\b|\bnamespace\b|\btemplate\s*</.test(c) ? 'cpp' : 'c';
    if (/^\s*(SELECT|INSERT\s+INTO|CREATE\s+(TABLE|DATABASE|VIEW)|UPDATE\s+\w+\s+SET|DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE)\b/im.test(c)) return 'sql';
    if (/\busing\s+System\b|Console\.Write/.test(c)) return 'csharp';
    if (/System\.out\.print|\bpublic\s+(static\s+)?(class|void)\b|\bpublic\s+static\s+void\s+main\b/.test(c)) return 'java';
    if (/^\s*def\s+\w+\s*\(.*\)\s*(->[^:]+)?:\s*$/m.test(c) || /^\s*from\s+[\w.]+\s+import\b/m.test(c) ||
        /^\s*import\s+[\w.]+(\s+as\s+\w+)?\s*$/m.test(c) || /^\s*(elif|except)\b.*:\s*$/m.test(c) ||
        (/^\s*(if|for|while|else|class)\b.*:\s*$/m.test(c) && !/[{;]\s*$/m.test(c)) || (/\bprint\(/.test(c) && !/;\s*$/m.test(c))) return 'python';
    if (/\$[a-z_]\w*\s*=/i.test(c) && /;\s*$/m.test(c)) return 'php';
    if (/\b(function|const|let|var)\s+\w+|=>|console\.log|document\.|require\(|^\s*export\s|^\s*import\s.+\sfrom\s/m.test(c)) return 'javascript';
    if (/^\s*[.#@]?[\w-][\w\s.#:>,[\]="'-]*\{[\s\S]*?[\w-]+\s*:[^;{}]+;/m.test(c)) return 'css';
    if (/\b(int|void|char|float|double)\s+\w+\s*\(.*\)\s*\{/.test(c)) return 'c';
    return 'plain';
}

function getCodeLanguage(block) {
    const chosen = block && CODE_LANGUAGES[block.language] ? block.language : 'auto';
    return chosen === 'auto' ? detectCodeLanguage(block ? block.content : '') : chosen;
}

function describeDetectedLanguage(code) {
    if (!String(code || '').trim()) return '';
    const lang = detectCodeLanguage(code);
    return lang === 'plain' ? 'Sin colores (no se reconoció el lenguaje)' : `Se detectó: ${CODE_LANGUAGES[lang].label}`;
}

/**
 * Piezas del código: [{ t: tipo ('' = normal), v: texto }].
 */
function tokenizeCode(code, language) {
    const text = String(code || '').replace(/\r\n?/g, '\n');
    const spec = CODE_LANGUAGES[language];
    if (!spec || language === 'plain' || language === 'auto') return [{ t: '', v: text }];
    if (spec.markup) return tokenizeMarkup(text);
    if (spec.css) return tokenizeCss(text);

    const tokens = [];
    const push = (t, v) => {
        if (!v) return;
        const last = tokens[tokens.length - 1];
        if (last && last.t === t) last.v += v; else tokens.push({ t, v });
    };
    const isIdStart = ch => /[A-Za-z_\u00C0-\u024F]/.test(ch);
    const isIdChar = ch => /[\w\u00C0-\u024F]/.test(ch);
    const NUM = /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)[fFlLuUmMdD]?/y;
    const n = text.length;
    let i = 0;
    let lineStart = true;

    while (i < n) {
        const ch = text[i];
        let done = false;

        for (const [open, close] of spec.block) {
            if (text.startsWith(open, i)) {
                let end = text.indexOf(close, i + open.length);
                end = end === -1 ? n : end + close.length;
                push('com', text.slice(i, end));
                i = end;
                done = true;
                break;
            }
        }
        if (done) continue;

        if (spec.preprocessor && ch === '#' && lineStart) {
            let end = text.indexOf('\n', i);
            if (end === -1) end = n;
            push('pre', text.slice(i, end));
            i = end;
            continue;
        }

        for (const marker of spec.line) {
            if (text.startsWith(marker, i)) {
                let end = text.indexOf('\n', i);
                if (end === -1) end = n;
                push('com', text.slice(i, end));
                i = end;
                done = true;
                break;
            }
        }
        if (done) continue;

        for (const quote of spec.strings) {
            if (text.startsWith(quote, i)) {
                let j = i + quote.length;
                while (j < n) {
                    if (text[j] === '\\') { j += 2; continue; }
                    if (text.startsWith(quote, j)) { j += quote.length; break; }
                    if (quote.length === 1 && quote !== '`' && text[j] === '\n') break;
                    j++;
                }
                j = Math.min(j, n);
                push('str', text.slice(i, j));
                i = j;
                done = true;
                break;
            }
        }
        if (done) continue;

        if (ch === '\n') {
            push('', ch);
            lineStart = true;
            i++;
            continue;
        }
        if (ch === ' ' || ch === '\t') {
            push('', ch);
            i++;
            continue;
        }
        lineStart = false;

        if (/\d/.test(ch) && !(i > 0 && isIdChar(text[i - 1]))) {
            NUM.lastIndex = i;
            const m = NUM.exec(text);
            if (m) {
                push('num', m[0]);
                i += m[0].length;
                continue;
            }
        }

        if (spec.variables && ch === '$' && i + 1 < n && isIdStart(text[i + 1])) {
            let j = i + 1;
            while (j < n && isIdChar(text[j])) j++;
            push('var', text.slice(i, j));
            i = j;
            continue;
        }

        if (spec.decorators && ch === '@' && i + 1 < n && isIdStart(text[i + 1])) {
            let j = i + 1;
            while (j < n && (isIdChar(text[j]) || text[j] === '.')) j++;
            push('attr', text.slice(i, j));
            i = j;
            continue;
        }

        if (isIdStart(ch) || (ch === '$' && language === 'javascript')) {
            let j = i + 1;
            while (j < n && (isIdChar(text[j]) || (text[j] === '$' && language === 'javascript'))) j++;
            const word = text.slice(i, j);
            const key = spec.caseInsensitive ? word.toLowerCase() : word;
            let k = j;
            while (k < n && (text[k] === ' ' || text[k] === '\t')) k++;
            let type = '';
            if (spec.kwSet.has(key)) type = 'kw';
            else if (spec.biSet.has(key)) type = 'type';
            else if (text[k] === '(') type = 'fn';
            else if (spec.typeCase && /^[A-Z][a-z0-9]/.test(word)) type = 'type';
            push(type, word);
            i = j;
            continue;
        }

        push('', ch);
        i++;
    }
    return tokens;
}

function tokenizeMarkup(text) {
    const tokens = [];
    const push = (t, v) => { if (v) tokens.push({ t, v }); };
    let i = 0;
    const n = text.length;
    while (i < n) {
        if (text.startsWith('<!--', i)) {
            let end = text.indexOf('-->', i + 4);
            end = end === -1 ? n : end + 3;
            push('com', text.slice(i, end));
            i = end;
            continue;
        }
        const tag = /<\/?[A-Za-z!?][\w:.-]*/y;
        tag.lastIndex = i;
        const m = tag.exec(text);
        if (m) {
            push('tag', m[0]);
            i += m[0].length;
            // Atributos hasta ">"
            while (i < n && text[i] !== '>' && !text.startsWith('/>', i) && !text.startsWith('?>', i)) {
                const ch = text[i];
                if (ch === '"' || ch === "'") {
                    let end = text.indexOf(ch, i + 1);
                    end = end === -1 ? n : end + 1;
                    push('str', text.slice(i, end));
                    i = end;
                } else if (/[\w:-]/.test(ch)) {
                    let j = i;
                    while (j < n && /[\w:.-]/.test(text[j])) j++;
                    push('attr', text.slice(i, j));
                    i = j;
                } else {
                    push('', ch);
                    i++;
                }
            }
            const close = text.startsWith('/>', i) || text.startsWith('?>', i) ? 2 : (text[i] === '>' ? 1 : 0);
            push('tag', text.slice(i, i + close));
            i += close;
            continue;
        }
        let next = text.indexOf('<', i + 1);
        if (next === -1) next = n;
        push('', text.slice(i, next));
        i = next;
    }
    return tokens;
}

function tokenizeCss(text) {
    const tokens = [];
    const push = (t, v) => { if (v) tokens.push({ t, v }); };
    let i = 0;
    let depth = 0;
    const n = text.length;
    while (i < n) {
        const ch = text[i];
        if (text.startsWith('/*', i)) {
            let end = text.indexOf('*/', i + 2);
            end = end === -1 ? n : end + 2;
            push('com', text.slice(i, end));
            i = end;
        } else if (ch === '"' || ch === "'") {
            let end = text.indexOf(ch, i + 1);
            end = end === -1 ? n : end + 1;
            push('str', text.slice(i, end));
            i = end;
        } else if (ch === '{' || ch === '}') {
            depth += ch === '{' ? 1 : -1;
            if (depth < 0) depth = 0;
            push('', ch);
            i++;
        } else if (ch === '@') {
            let j = i + 1;
            while (j < n && /[\w-]/.test(text[j])) j++;
            push('kw', text.slice(i, j));
            i = j;
        } else if (depth > 0 && ch === '#' && /[\da-fA-F]/.test(text[i + 1] || '')) {
            let j = i + 1;
            while (j < n && /[\da-fA-F]/.test(text[j])) j++;
            push('num', text.slice(i, j));
            i = j;
        } else if (depth > 0 && /[\d.]/.test(ch) && /\d/.test(text[ch === '.' ? i + 1 : i] || '')) {
            let j = i;
            while (j < n && /[\d.]/.test(text[j])) j++;
            while (j < n && /[a-z%]/i.test(text[j])) j++;
            push('num', text.slice(i, j));
            i = j;
        } else if (/[\w-]/.test(ch)) {
            let j = i;
            while (j < n && /[\w-]/.test(text[j])) j++;
            const word = text.slice(i, j);
            let k = j;
            while (k < n && /\s/.test(text[k])) k++;
            push(depth > 0 ? (text[k] === ':' ? 'attr' : '') : 'tag', word);
            i = j;
        } else {
            push('', ch);
            i++;
        }
    }
    return tokens;
}

/**
 * Las piezas repartidas por línea: [[{ t, v }, ...], ...]
 */
function codeTokenLines(code, language) {
    const lines = [[]];
    tokenizeCode(code, language).forEach(token => {
        token.v.split('\n').forEach((piece, i) => {
            if (i > 0) lines.push([]);
            if (piece) lines[lines.length - 1].push({ t: token.t, v: piece });
        });
    });
    return lines;
}

function escapeCodeText(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Memoria del resaltado (se repite con cada tecla de otros bloques)
const codeHighlightCache = new Map();

function highlightCodeLines(code, language) {
    const key = language + '\u0000' + (code || '');
    if (codeHighlightCache.has(key)) return codeHighlightCache.get(key);
    const lines = codeTokenLines(code, language).map(tokens => tokens
        .map(token => token.t ? `<span class="tok-${token.t}">${escapeCodeText(token.v)}</span>` : escapeCodeText(token.v))
        .join(''));
    if (codeHighlightCache.size > 200) codeHighlightCache.clear();
    codeHighlightCache.set(key, lines);
    return lines;
}

/**
 * <pre> de la hoja: una línea por <span class="code-line"> (así se parte entre
 * hojas por líneas y los números de línea siguen la cuenta).
 */
function renderCodePreview(block) {
    const language = getCodeLanguage(block);
    const lines = highlightCodeLines(block.content, language);
    return `<pre class="code-preview code-lang-${language}${block.lineNumbers ? ' has-line-numbers' : ''}"><code>${lines.map(line => `<span class="code-line">${line || ' '}</span>`).join('')}</code></pre>`;
}

function updateCodeLanguage(id, language) {
    const block = reportData.find(b => b.id === id);
    if (!block) return;
    block.language = CODE_LANGUAGES[language] ? language : 'auto';
    refreshDetectedLanguages();
    renderPreview();
}

function updateCodeLineNumbers(id, on) {
    const block = reportData.find(b => b.id === id);
    if (!block) return;
    block.lineNumbers = !!on;
    renderPreview();
}

/**
 * El texto "Se detectó: ..." de las tarjetas de código en modo automático.
 */
function refreshDetectedLanguages() {
    document.querySelectorAll('#editor-container [data-code-detected]').forEach(label => {
        const block = reportData.find(b => String(b.id) === label.dataset.codeDetected);
        if (!block) return;
        const text = (block.language || 'auto') === 'auto' ? describeDetectedLanguage(block.content) : '';
        if (label.textContent !== text) label.textContent = text;
    });
}

// ==========================================
// IDS DE BLOQUE, MOVER Y DUPLICAR
// ==========================================

let lastBlockId = 0;

/**
 * id único para un bloque nuevo (antes era Date.now(), que se repetía si se
 * creaban dos bloques en el mismo milisegundo).
 */
function newBlockId() {
    const maxExisting = reportData.reduce((max, b) => Math.max(max, Number(b.id) || 0), 0);
    lastBlockId = Math.max(Date.now(), lastBlockId + 1, maxExisting + 1);
    return lastBlockId;
}

/**
 * Botones de la esquina de cada tarjeta. Funcionan con el dedo (el arrastrar
 * y soltar no funciona en pantallas táctiles).
 */
function buildBlockToolsHTML(block, index) {
    const deleteButton = `<button class="delete-btn" onclick="deleteBlock(${block.id})" title="Eliminar bloque">&times;</button>`;
    // El encabezado va siempre arriba y el índice se acomoda solo después de él
    if (block.type === 'header' || block.type === 'toc') return deleteButton;

    // No se puede subir por encima del encabezado ni del índice
    const fixedBefore = reportData.slice(0, index).every(b => b.type === 'header' || b.type === 'toc');
    const first = index === 0 || fixedBefore;
    const last = index === reportData.length - 1;
    const moveButtons = `
        <button type="button" class="block-tool" onclick="moveBlockBy(${block.id}, -1)" title="Subir" ${first ? 'disabled' : ''}><span class="material-symbols-outlined">arrow_upward</span></button>
        <button type="button" class="block-tool" onclick="moveBlockBy(${block.id}, 1)" title="Bajar" ${last ? 'disabled' : ''}><span class="material-symbols-outlined">arrow_downward</span></button>`;
    const duplicateButton = `<button type="button" class="block-tool" onclick="duplicateBlock(${block.id})" title="Duplicar"><span class="material-symbols-outlined">content_copy</span></button>`;
    return `
        <div class="block-tools">
            ${moveButtons}
            ${duplicateButton}
            ${deleteButton}
        </div>`;
}

/**
 * Mueve un bloque una posición arriba (-1) o abajo (+1).
 */
function moveBlockBy(id, direction) {
    const from = reportData.findIndex(b => b.id === id);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= reportData.length) return;
    if (['header', 'toc'].includes(reportData[to].type) && reportData.slice(0, to + 1).every(b => b.type === 'header' || b.type === 'toc')) return;
    const [block] = reportData.splice(from, 1);
    reportData.splice(to, 0, block);
    render();

    // Mantener la tarjeta a la vista después de moverla
    const cards = document.querySelectorAll('#editor-container .block-card-container');
    const index = reportData.findIndex(b => b.id === id);
    if (cards[index] && cards[index].scrollIntoView) cards[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/**
 * Inserta una copia del bloque justo debajo.
 */
function duplicateBlock(id) {
    const index = reportData.findIndex(b => b.id === id);
    const block = reportData[index];
    if (!block || block.type === 'header' || block.type === 'toc') return;
    const copy = JSON.parse(JSON.stringify(block));
    copy.id = newBlockId();
    reportData.splice(index + 1, 0, copy);
    render();
}

// ==========================================
// IMÁGENES MÁS LIGERAS
// ==========================================

const BLOCK_IMAGE_MAX_SIZE = 1600;

/**
 * Reduce una imagen a maxSize px por lado. Con preferJpeg, las imágenes sin
 * transparencia (fotos, capturas) se guardan como JPEG, que pesa mucho menos.
 * Siempre se queda con la versión más ligera; los SVG no se tocan.
 */
function shrinkImageDataUrl(dataUrl, mimeType, maxSize, preferJpeg = false) {
    return new Promise(resolve => {
        if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
            resolve(dataUrl);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const hasTransparency = () => {
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const step = Math.max(4, Math.floor(data.length / 40000) * 4);
                for (let i = 3; i < data.length; i += step) {
                    if (data[i] < 255) return true;
                }
                return false;
            };

            // Se prueban los formatos posibles y se queda el más ligero
            const candidates = [];
            if (mimeType === 'image/jpeg' || (preferJpeg && !hasTransparency())) {
                candidates.push(canvas.toDataURL('image/jpeg', 0.85));
            }
            if (mimeType !== 'image/jpeg') candidates.push(canvas.toDataURL('image/png'));
            const best = candidates.reduce((a, b) => (b.length < a.length ? b : a));
            // Si ya era pequeña y pesa menos así, se deja la original
            resolve(scale === 1 && dataUrl.length <= best.length ? dataUrl : best);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

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

// ==========================================
// PLANTILLAS
// ==========================================

const TEMPLATES = [
    {
        id: 'practica',
        name: 'Reporte de práctica',
        icon: 'science',
        description: 'Para prácticas de laboratorio o de taller.',
        blocks: [
            { type: 'toc' },
            { type: 'title', content: 'Reporte de práctica' },
            { type: 'subtitle', content: 'Introducción' },
            { type: 'text', hint: 'Explica el tema de la práctica y por qué es importante.' },
            { type: 'subtitle', content: 'Objetivo' },
            { type: 'text', hint: '¿Qué se busca lograr con esta práctica?' },
            { type: 'subtitle', content: 'Marco teórico' },
            { type: 'text', hint: 'Conceptos y fundamentos necesarios para entender la práctica.' },
            { type: 'subtitle', content: 'Materiales y equipo' },
            { type: 'text', hint: 'Lista de materiales, herramientas, software y equipo utilizado.' },
            { type: 'subtitle', content: 'Desarrollo' },
            { type: 'text', hint: 'Describe paso a paso el procedimiento que seguiste.' },
            { type: 'subtitle', content: 'Resultados' },
            { type: 'table', caption: 'Resultados obtenidos' },
            { type: 'text', hint: 'Analiza e interpreta los resultados.' },
            { type: 'subtitle', content: 'Conclusiones' },
            { type: 'text', hint: '¿Se cumplió el objetivo? ¿Qué aprendiste?' },
            { type: 'subtitle', content: 'Referencias' },
            { type: 'ref' },
            { type: 'ai' }
        ]
    },
    {
        id: 'ensayo',
        name: 'Ensayo',
        icon: 'edit_note',
        description: 'Texto argumentativo con introducción, desarrollo y conclusión.',
        blocks: [
            { type: 'title', content: 'Título del ensayo' },
            { type: 'subtitle', content: 'Introducción' },
            { type: 'text', hint: 'Presenta el tema y plantea tu tesis o postura.' },
            { type: 'subtitle', content: 'Desarrollo' },
            { type: 'text', hint: 'Primer argumento con su evidencia.' },
            { type: 'text', hint: 'Segundo argumento con su evidencia.' },
            { type: 'text', hint: 'Contraargumento y tu respuesta.' },
            { type: 'subtitle', content: 'Conclusión' },
            { type: 'text', hint: 'Retoma tu tesis y cierra con una reflexión.' },
            { type: 'subtitle', content: 'Referencias' },
            { type: 'ref' }
        ]
    },
    {
        id: 'investigacion',
        name: 'Trabajo de investigación',
        icon: 'travel_explore',
        description: 'Estructura formal con planteamiento, metodología y resultados.',
        blocks: [
            { type: 'toc' },
            { type: 'title', content: 'Título de la investigación' },
            { type: 'subtitle', content: 'Resumen' },
            { type: 'text', hint: 'Resume en un párrafo el problema, el método y los resultados.' },
            { type: 'subtitle', content: 'Introducción' },
            { type: 'text', hint: 'Contexto del tema.' },
            { type: 'subtitle', content: 'Planteamiento del problema' },
            { type: 'text', hint: '¿Qué problema se estudia y por qué?' },
            { type: 'subtitle', content: 'Justificación' },
            { type: 'text', hint: '¿Por qué es importante investigarlo?' },
            { type: 'subtitle', content: 'Objetivos' },
            { type: 'text', hint: 'Objetivo general y objetivos específicos.' },
            { type: 'subtitle', content: 'Marco teórico' },
            { type: 'text', hint: 'Teorías, conceptos y estudios previos.' },
            { type: 'subtitle', content: 'Metodología' },
            { type: 'text', hint: 'Tipo de investigación, población, instrumentos y procedimiento.' },
            { type: 'subtitle', content: 'Resultados' },
            { type: 'text', hint: 'Presenta lo que encontraste.' },
            { type: 'subtitle', content: 'Conclusiones' },
            { type: 'text', hint: 'Responde a los objetivos planteados.' },
            { type: 'subtitle', content: 'Referencias' },
            { type: 'ref' },
            { type: 'ai' }
        ]
    },
    {
        id: 'proyecto',
        name: 'Proyecto de programación',
        icon: 'code',
        description: 'Documentación de un programa o sistema, con código y pruebas.',
        blocks: [
            { type: 'toc' },
            { type: 'title', content: 'Nombre del proyecto' },
            { type: 'subtitle', content: 'Descripción' },
            { type: 'text', hint: '¿Qué hace el programa y para quién es?' },
            { type: 'subtitle', content: 'Requisitos' },
            { type: 'text', hint: 'Requisitos funcionales y no funcionales.' },
            { type: 'subtitle', content: 'Diseño' },
            { type: 'text', hint: 'Arquitectura, diagramas y decisiones de diseño.' },
            { type: 'image', caption: 'Diagrama del sistema' },
            { type: 'subtitle', content: 'Implementación' },
            { type: 'text', hint: 'Explica las partes principales del código.' },
            { type: 'code' },
            { type: 'subtitle', content: 'Pruebas' },
            { type: 'table', caption: 'Casos de prueba' },
            { type: 'subtitle', content: 'Conclusiones' },
            { type: 'text', hint: 'Resultados, dificultades y mejoras posibles.' },
            { type: 'subtitle', content: 'Referencias' },
            { type: 'ref' },
            { type: 'ai' }
        ]
    }
];

/**
 * Crea un bloque completo a partir de la definición de la plantilla.
 */
function createBlockFromTemplate(def) {
    const block = createBlock(def.type);
    if (def.content !== undefined) block.content = def.content;
    if (def.hint) block.hint = def.hint;
    if (def.caption !== undefined) block.caption = def.caption;
    return block;
}

/**
 * Aplica una plantilla. Conserva el encabezado (y lo agrega si no hay).
 * @param {'append'|'replace'} mode
 */
function applyTemplate(templateId, mode = 'append') {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    let header = reportData.find(b => b.type === 'header');
    const hasToc = reportData.some(b => b.type === 'toc');
    let base = mode === 'replace' ? (header ? [header] : []) : [...reportData];
    reportData = base;

    if (!header) {
        header = createBlockFromTemplate({ type: 'header' });
        reportData.unshift(header);
    }

    template.blocks.forEach(def => {
        if (def.type === 'toc' && (mode === 'append' && hasToc)) return;
        reportData.push(createBlockFromTemplate(def));
    });

    closeTemplatesModal();
    if (isMobileLayout()) setMobileView('editor');
    render();
    const editor = document.getElementById('editor-container');
    if (editor) editor.scrollTop = 0;
}

function openTemplatesModal() {
    closeTemplatesModal();
    const hasContent = reportData.some(b => b.type !== 'header');
    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay';
    overlay.id = 'templates-modal-overlay';
    overlay.innerHTML = `
        <div class="university-modal templates-modal">
            <h3>📋 Plantillas</h3>
            <p class="settings-hint">Arma de un clic la estructura típica de un trabajo. Tu encabezado se conserva; solo tienes que llenar los párrafos (cada uno trae una pista de qué escribir).</p>
            ${hasContent ? `
                <div class="template-mode">
                    <span>Ya tienes contenido:</span>
                    <label><input type="radio" name="template-mode" value="append" checked> Agregar al final</label>
                    <label><input type="radio" name="template-mode" value="replace"> Reemplazar el documento</label>
                </div>` : ''}
            <div class="template-grid">
                ${TEMPLATES.map(t => `
                    <button type="button" class="template-card" data-template="${t.id}">
                        <span class="template-icon material-symbols-outlined">${t.icon}</span>
                        <span class="template-name">${escapeHtml(t.name)}</span>
                        <span class="template-desc">${escapeHtml(t.description)}</span>
                        <span class="template-sections">${escapeHtml(t.blocks.filter(b => b.type === 'subtitle').map(b => b.content).join(' · '))}</span>
                    </button>`).join('')}
            </div>
            <div class="university-modal-actions">
                <button type="button" class="action-btn" onclick="closeTemplatesModal()">Cerrar</button>
            </div>
        </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeTemplatesModal(); });
    overlay.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const modeInput = overlay.querySelector('input[name="template-mode"]:checked');
            const mode = modeInput ? modeInput.value : 'append';
            if (mode === 'replace' && !confirm('¿Reemplazar el contenido del documento por la plantilla? (Tu encabezado se conserva y puedes deshacerlo con Ctrl+Z.)')) return;
            applyTemplate(card.dataset.template, mode);
        });
    });
    document.body.appendChild(overlay);
}

function closeTemplatesModal() {
    const overlay = document.getElementById('templates-modal-overlay');
    if (overlay) overlay.remove();
}

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
        if (el.matches('p.p-text')) return splitInline(el, parent);
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

    // Párrafo (con o sin formato): se corta después de un espacio o de un
    // salto de línea, con búsqueda binaria; Range conserva las negritas,
    // cursivas y citas de cada parte.
    const splitInline = (el, parent) => {
        const points = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === 1) {
                if (node.tagName === 'BR') {
                    const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
                    points.push({ node: node.parentNode, offset: index + 1 });
                }
                continue;
            }
            if (node.parentElement && node.parentElement.closest('.p-cite')) continue; // las citas no se parten
            const text = node.nodeValue;
            for (let i = 0; i < text.length - 1; i++) {
                if (text[i] === ' ') points.push({ node, offset: i + 1 });
            }
        }
        if (!points.length) return el;

        const part = (fromStart, point) => {
            const range = document.createRange();
            if (fromStart) {
                range.setStart(el, 0);
                range.setEnd(point.node, point.offset);
            } else {
                range.setStart(point.node, point.offset);
                range.setEnd(el, el.childNodes.length);
            }
            const clone = el.cloneNode(false);
            clone.appendChild(range.cloneContents());
            return clone;
        };

        let low = 0;
        let high = points.length;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const trial = part(true, points[mid - 1]);
            parent.appendChild(trial);
            const ok = fits();
            parent.removeChild(trial);
            if (ok) low = mid; else high = mid - 1;
        }
        if (low === 0) return el;

        const first = part(true, points[low - 1]);
        first.classList.add('p-split-start');
        parent.appendChild(first);

        const rest = part(false, points[low - 1]);
        if (!rest.textContent.trim()) return null;
        rest.classList.add('p-split-rest');
        return rest;
    };

    // Código con colores: cada línea es un <span class="code-line">
    const splitCodeLines = (el, parent) => {
        const lines = Array.from(el.querySelector('code').children);
        if (lines.length < 2) return el;
        const start = parseInt(el.dataset.startLine, 10) || 1;
        const build = (from, to) => {
            const clone = el.cloneNode(true);
            const code = clone.querySelector('code');
            Array.from(code.children).forEach((line, i) => { if (i < from || i >= to) line.remove(); });
            clone.dataset.startLine = String(start + from);
            code.style.counterReset = `code-line ${start + from - 1}`;
            return clone;
        };
        let low = 0;
        let high = lines.length - 1;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const trial = build(0, mid);
            parent.appendChild(trial);
            const ok = fits();
            parent.removeChild(trial);
            if (ok) low = mid; else high = mid - 1;
        }
        if (low === 0) return el;
        const first = build(0, low);
        first.classList.add('p-split-start');
        parent.appendChild(first);
        const rest = build(low, lines.length);
        rest.classList.add('p-split-rest');
        return rest;
    };

    const splitPre = (el, parent) => {
        const codeEl = el.querySelector('code');
        if (codeEl && codeEl.firstElementChild && codeEl.firstElementChild.classList.contains('code-line')) return splitCodeLines(el, parent);
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
        // Lista numerada partida: la continuación sigue la numeración
        if (el.tagName === 'OL') {
            const placed = first.children.length - (remainderChild ? 1 : 0);
            rest.setAttribute('start', (parseInt(el.getAttribute('start'), 10) || 1) + placed);
            rest.classList.add('p-split-rest');
        }
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
    const html = richHtmlForEditor(getRichHtml(block));
    const isEmpty = !richHtmlToPlainText(getRichHtml(block)).trim();
    return `
        <div class="block-card text-card">
            ${deleteBtn}
            <label>Párrafo</label>
            <span class="field-label">Contenido del párrafo</span>
            <div class="rich-toolbar" role="toolbar" aria-label="Formato del párrafo">
                <button type="button" class="rich-btn" data-cmd="bold" title="Negritas (Ctrl+B)" aria-label="Negritas" onmousedown="event.preventDefault()" onclick="richCommand(this, 'bold')"><span class="material-symbols-outlined">format_bold</span></button>
                <button type="button" class="rich-btn" data-cmd="italic" title="Cursivas (Ctrl+I)" aria-label="Cursivas" onmousedown="event.preventDefault()" onclick="richCommand(this, 'italic')"><span class="material-symbols-outlined">format_italic</span></button>
                <button type="button" class="rich-btn" data-cmd="underline" title="Subrayado (Ctrl+U)" aria-label="Subrayado" onmousedown="event.preventDefault()" onclick="richCommand(this, 'underline')"><span class="material-symbols-outlined">format_underlined</span></button>
                <span class="rich-sep"></span>
                <button type="button" class="rich-btn" data-cmd="insertUnorderedList" title="Lista con viñetas" aria-label="Lista con viñetas" onmousedown="event.preventDefault()" onclick="richCommand(this, 'insertUnorderedList')"><span class="material-symbols-outlined">format_list_bulleted</span></button>
                <button type="button" class="rich-btn" data-cmd="insertOrderedList" title="Lista numerada" aria-label="Lista numerada" onmousedown="event.preventDefault()" onclick="richCommand(this, 'insertOrderedList')"><span class="material-symbols-outlined">format_list_numbered</span></button>
                <span class="rich-sep"></span>
                <button type="button" class="rich-btn rich-btn-cite" title="Citar una de tus referencias" onmousedown="event.preventDefault()" onclick="openCitationPicker(this, ${block.id})"><span class="material-symbols-outlined">format_quote</span><span>Citar</span></button>
            </div>
            <div class="editor-input rich-editor${isEmpty ? ' is-empty' : ''}" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true"
                data-block-id="${escapeAttr(String(block.id))}" data-placeholder="${escapeAttr(block.hint || 'Escribe tu texto aquí...')}"
                oninput="updateRichText(this)">${html}</div>
        </div>`;
}

/**
 * Renderiza el editor de código (AHORA SEGURO)
 */
function renderCodeEditor(block, deleteBtn) {
    const language = CODE_LANGUAGES[block.language] ? block.language : 'auto';
    return `
        <div class="block-card code-card">
            ${deleteBtn}
            <label>Código</label>
            <div class="code-options">
                <label class="code-option">
                    <span>Lenguaje</span>
                    <select onchange="updateCodeLanguage(${block.id}, this.value)">
                        ${Object.entries(CODE_LANGUAGES).map(([key, lang]) => `<option value="${key}" ${key === language ? 'selected' : ''}>${escapeHtml(lang.label)}</option>`).join('')}
                    </select>
                </label>
                <span class="code-detected" data-code-detected="${block.id}">${language === 'auto' ? escapeHtml(describeDetectedLanguage(block.content)) : ''}</span>
                <label class="code-option code-option-check">
                    <input type="checkbox" ${block.lineNumbers ? 'checked' : ''} onchange="updateCodeLineNumbers(${block.id}, this.checked)">
                    <span>Números de línea</span>
                </label>
            </div>
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
                return richHtmlForPreview(getRichHtml(block));
            
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
                return renderCodePreview(block);
            
            
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

            // Solo los datos que el usuario eligió mostrar, con sus nombres
            const show = key => isHeaderFieldShown(key);
            const lbl = key => escapeHtml(getHeaderFieldLabel(key, 'preview'));
            const people = getHeaderPeople(liveData);
            const showIds = show('studentId');

            let nombresHtmlFinal = '';
            if (liveData.isTeam) {
                const list = people
                    .map(p => escapeHtml(p.name) + (showIds && p.id ? ` (${escapeHtml(p.id)})` : ''))
                    .join(', ');
                nombresHtmlFinal = `<strong>Integrantes:</strong> ${list || '<em>(Sin integrantes)</em>'}`;
            } else {
                const p = people[0] || { name: '', id: '' };
                nombresHtmlFinal = `<strong>Alumno:</strong> ${escapeHtml(p.name)}` +
                    (showIds && p.id ? ` | <strong>${lbl('studentId')}:</strong> ${escapeHtml(p.id)}` : '');
            }

            const termText = show('term') && liveData.term ? formatTerm(liveData.term) : '';
            let subjectLine = '';
            if (show('subject')) {
                subjectLine = `<p><strong>${lbl('subject')}:</strong> ${escapeHtml(liveData.subject || '')} ${termText ? `(${escapeHtml(termText)})` : ''}</p>`;
            } else if (termText) {
                subjectLine = `<p><strong>${lbl('term')}:</strong> ${escapeHtml(termText)}</p>`;
            }

            return `
                <div class="p-header">
                    ${logosHTML}
                    ${show('institution') ? `<p><strong>${lbl('institution')}:</strong> ${escapeHtml(currentUni.name || '')}</p>` : ''}
                    ${show('career') && liveData.career ? `<p><strong>${lbl('career')}:</strong> ${escapeHtml(liveData.career)}</p>` : ''}
                    ${subjectLine}
                    ${show('prof') ? `<p><strong>${lbl('prof')}:</strong> ${escapeHtml(liveData.prof || '')}</p>` : ''}
                    <p>${nombresHtmlFinal} ${show('group') && liveData.group ? `| <strong>${lbl('group')}:</strong> ${escapeHtml(liveData.group)}` : ''}</p>
                    ${show('date') ? `<p><strong>${lbl('date')}:</strong> ${escapeHtml(liveData.date || '')}</p>` : ''}
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
    refreshCitationChips();
    refreshDetectedLanguages();
    scheduleDocumentStats();

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
                const show = key => isHeaderFieldShown(key);
                const lbl = key => getHeaderFieldLabel(key, 'preview');
                const people = getHeaderPeople(savedHeader);
                const peopleText = people
                    .map(p => p.name + (show('studentId') && p.id ? ` (${p.id})` : ''))
                    .join(', ');

                if (savedHeader.coverMode) {
                    textContent += `PORTADA\n`;
                    textContent += `-`.repeat(40) + "\n";
                    if (show('institution') && exportUni.id && exportUni.id !== 'generic') textContent += `${exportUni.name}\n`;
                    if (show('career') && savedHeader.career) textContent += `${savedHeader.career}\n`;
                    textContent += `\n${(savedHeader.taskName || '').trim() || '[Nombre de la tarea]'}\n\n`;
                    if (show('subject') && savedHeader.subject) textContent += `${lbl('subject')}: ${savedHeader.subject}\n`;
                    if (show('prof') && savedHeader.prof) textContent += `${lbl('prof')}: ${savedHeader.prof}\n`;
                    textContent += `${savedHeader.isTeam ? 'Integrantes' : 'Alumno'}: ${peopleText || 'N/A'}\n`;
                    if (show('group') && savedHeader.group) textContent += `${lbl('group')}: ${savedHeader.group}\n`;
                    if (show('term') && savedHeader.term) textContent += `${lbl('term')}: ${formatTerm(savedHeader.term)}\n`;
                    if (show('date') && savedHeader.date) textContent += `${formatLongDate(savedHeader.date)}\n`;
                    textContent += `\n`;
                    break;
                }

                textContent += `DATOS DEL ESTUDIANTE\n`;
                textContent += `-`.repeat(40) + "\n";
                if (show('institution')) textContent += `${lbl('institution')}: ${exportUni.name || 'N/A'}\n`;
                if (show('career') && savedHeader.career) textContent += `${lbl('career')}: ${savedHeader.career}\n`;
                if (show('subject')) textContent += `${lbl('subject')}: ${savedHeader.subject || 'N/A'}${show('term') ? ` (${formatTerm(savedHeader.term) || 'N/A'})` : ''}\n`;
                else if (show('term') && savedHeader.term) textContent += `${lbl('term')}: ${formatTerm(savedHeader.term)}\n`;
                if (show('prof')) textContent += `${lbl('prof')}: ${savedHeader.prof || 'N/A'}\n`;
                textContent += `${savedHeader.isTeam ? 'Integrantes' : 'Alumno'}: ${peopleText || 'N/A'}${show('group') ? ` | ${lbl('group')}: ${savedHeader.group || 'N/A'}` : ''}\n`;
                if (show('date')) textContent += `${lbl('date')}: ${savedHeader.date || 'N/A'}\n`;
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
                textContent += `${richHtmlToPlainText(getRichHtml(block))}\n\n`;
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

// ==========================================
// PANEL DE CONFIGURACIÓN
// Un solo lugar para añadir, editar y eliminar universidades, materias y
// profesores (antes eran botones sueltos junto a cada campo).
// ==========================================

let settingsActiveTab = 'profile';

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
                <button type="button" data-tab="profile">Mi perfil</button>
                <button type="button" data-tab="header_fields">Encabezado</button>
                <button type="button" data-tab="universities">Universidades</button>
                <button type="button" data-tab="list_subjects">Materias</button>
                <button type="button" data-tab="list_profs">Profesores</button>
                <button type="button" data-tab="classmates">Compañeros</button>
                <button type="button" data-tab="backup">Respaldo</button>
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
    if (settingsActiveTab === 'profile') {
        renderProfileTab(content);
    } else if (settingsActiveTab === 'header_fields') {
        renderHeaderFieldsTab(content);
    } else if (settingsActiveTab === 'backup') {
        renderBackupTab(content);
    } else if (settingsActiveTab === 'classmates') {
        renderClassmatesTab(content);
    } else if (settingsActiveTab === 'universities') {
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
// PERFIL DEL USUARIO, CAMPOS DEL ENCABEZADO Y COMPAÑEROS
// Todo se guarda solo en este navegador.
// ============================================================================

const PERIOD_TYPES = { cuatrimestre: 'Cuatrimestre', semestre: 'Semestre', anio: 'Año escolar' };

/**
 * Perfil: { fullName, studentId, career, group, periodType, period, onboardingDone }.
 * La universidad es la seleccionada en el tema.
 */
function getProfile() {
    try {
        const profile = JSON.parse(localStorage.getItem('user_profile'));
        return profile && typeof profile === 'object' ? profile : {};
    } catch (e) {
        return {};
    }
}

function saveProfile(profile) {
    localStorage.setItem('user_profile', JSON.stringify(profile));
}

function getPeriodType() {
    const type = getProfile().periodType;
    return PERIOD_TYPES[type] ? type : 'cuatrimestre';
}

function getPeriodWord() {
    return PERIOD_TYPES[getPeriodType()];
}

/**
 * Valores iniciales del encabezado de un documento nuevo: los del perfil.
 * Cambiarlos en el documento no cambia el perfil.
 */
function getHeaderDefaultsFromProfile() {
    const p = getProfile();
    return {
        names: [p.fullName || ''], studentIds: [p.studentId || ''], isTeam: false,
        group: p.group || '', career: p.career || '', term: p.period || '',
        subject: '', prof: '', date: '', includeLogo: false, coverMode: false, taskName: ''
    };
}

/**
 * Pone los datos del perfil en el encabezado actual (conserva lo demás).
 */
function applyProfileToHeader() {
    const p = getProfile();
    const current = getHeaderData() || getHeaderDefaultsFromProfile();
    const names = (current.names && current.names.length) ? [...current.names] : [''];
    const ids = [...(current.studentIds || [])];
    names[0] = p.fullName || names[0] || '';
    ids[0] = p.studentId || ids[0] || '';
    setHeaderData({
        ...current, names, studentIds: ids,
        group: p.group || current.group || '',
        career: p.career || current.career || '',
        term: p.period || current.term || ''
    });
    render();
}

/**
 * Estudiantes del encabezado como [{ name, id }], sin filas vacías.
 */
function getHeaderPeople(headerData) {
    const h = headerData || {};
    const names = (h.names && h.names.length) ? h.names : [h.name || ''];
    const ids = h.studentIds || [];
    return names
        .map((name, i) => ({ name: (name || '').trim(), id: (ids[i] || '').trim() }))
        .filter(person => person.name);
}

// ---------- Campos del encabezado: mostrar/ocultar y renombrar ----------

const HEADER_FIELDS = [
    { key: 'institution', editor: 'Institución', preview: 'Institución', about: 'Nombre de la universidad o escuela' },
    { key: 'career', editor: 'Carrera', preview: 'Carrera', about: 'Carrera, bachillerato, área...' },
    { key: 'subject', editor: 'Materia', preview: 'Materia', about: 'Materia de la tarea' },
    { key: 'prof', editor: 'Profesor', preview: 'Profesor', about: 'Profesor de la materia' },
    { key: 'studentId', editor: 'Matrícula', preview: 'Matrícula', about: 'Matrícula de cada estudiante' },
    { key: 'group', editor: 'Grupo', preview: 'Grupo', about: 'Grupo o salón' },
    { key: 'term', editor: null, preview: null, about: 'Cuatrimestre, semestre o año escolar' },
    { key: 'date', editor: 'Fecha de entrega', preview: 'Fecha', about: 'Fecha de entrega' }
];

function getHeaderFieldConfig() {
    let stored = {};
    try {
        stored = JSON.parse(localStorage.getItem('header_fields')) || {};
    } catch (e) {
        stored = {};
    }
    const config = {};
    HEADER_FIELDS.forEach(field => {
        const saved = stored[field.key] || {};
        config[field.key] = { show: saved.show !== false, label: (saved.label || '').trim() };
    });
    return config;
}

function saveHeaderFieldConfig(config) {
    localStorage.setItem('header_fields', JSON.stringify(config));
}

function isHeaderFieldShown(key) {
    const field = getHeaderFieldConfig()[key];
    return !field || field.show;
}

/**
 * Nombre de un campo: el personalizado o, si no hay, el de siempre.
 * @param {'editor'|'preview'} context - en el editor "Fecha de entrega", en el documento "Fecha"
 */
function getHeaderFieldLabel(key, context = 'preview') {
    const custom = (getHeaderFieldConfig()[key] || {}).label;
    if (custom) return custom;
    const field = HEADER_FIELDS.find(f => f.key === key);
    return (field && field[context]) || getPeriodWord();
}

/**
 * Editor de campos (lo usan la pestaña "Encabezado" y el asistente).
 * Los cambios se guardan al momento.
 */
function renderHeaderFieldsEditor(container) {
    const config = getHeaderFieldConfig();
    container.innerHTML = `
        <p class="settings-hint">Elige qué datos salen en el encabezado y cómo se llaman. Por ejemplo, si no estudias una ingeniería, "Carrera" puede llamarse "Escuela" o "Bachillerato".</p>
        <div class="field-config-list">
            ${HEADER_FIELDS.map(field => {
                const defaultName = field.preview || getPeriodWord();
                return `
                <div class="field-config-row" data-key="${field.key}">
                    <label class="field-config-toggle" title="${escapeAttr(field.about)}">
                        <input type="checkbox" ${config[field.key].show ? 'checked' : ''}>
                        <span>${escapeHtml(defaultName)}</span>
                    </label>
                    <input type="text" class="field-config-label" maxlength="40" placeholder="Se llama: ${escapeAttr(defaultName)}" value="${escapeAttr(config[field.key].label)}" title="Nombre que aparece en el encabezado">
                </div>`;
            }).join('')}
        </div>`;

    const save = () => {
        const newConfig = {};
        container.querySelectorAll('.field-config-row').forEach(row => {
            newConfig[row.dataset.key] = {
                show: row.querySelector('input[type="checkbox"]').checked,
                label: row.querySelector('.field-config-label').value.trim()
            };
        });
        saveHeaderFieldConfig(newConfig);
        render();
    };
    container.querySelectorAll('.field-config-row input').forEach(input => {
        input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', save);
    });
}

function renderHeaderFieldsTab(content) {
    renderHeaderFieldsEditor(content);
}

// ---------- Compañeros de clase (nombre + matrícula) ----------

function getClassmates() {
    try {
        const list = JSON.parse(localStorage.getItem('list_classmates'));
        return Array.isArray(list) ? list.filter(c => c && typeof c.name === 'string' && c.name.trim()) : [];
    } catch (e) {
        return [];
    }
}

function saveClassmates(list) {
    localStorage.setItem('list_classmates', JSON.stringify(list));
    refreshClassmatePicker();
}

/**
 * Añade un compañero. Devuelve un mensaje de error o null.
 */
function addClassmate(rawName, rawId) {
    const name = (rawName || '').trim();
    const studentId = (rawId || '').trim();
    if (!name) return 'Escribe el nombre de tu compañero.';
    const list = getClassmates();
    if (list.some(c => c.name.toLowerCase() === name.toLowerCase() && (c.studentId || '') === studentId)) {
        return `"${name}" ya está en tu lista.`;
    }
    list.push({ name, studentId });
    saveClassmates(list);
    return null;
}

function editClassmate(index) {
    const list = getClassmates();
    const c = list[index];
    if (!c) return false;
    const name = prompt('Nombre del compañero:', c.name);
    if (name === null || !name.trim()) return false;
    const studentId = prompt(`Matrícula de ${name.trim()}:`, c.studentId || '');
    if (studentId === null) return false;
    list[index] = { name: name.trim(), studentId: studentId.trim() };
    saveClassmates(list);
    return true;
}

function deleteClassmate(index) {
    const list = getClassmates();
    const c = list[index];
    if (!c || !confirm(`¿Eliminar a "${c.name}" de tu lista de compañeros?`)) return false;
    list.splice(index, 1);
    saveClassmates(list);
    return true;
}

/**
 * Actualiza la lista de compañeros del encabezado (si está en pantalla).
 */
function refreshClassmatePicker() {
    const picker = document.getElementById('classmate-picker');
    if (!picker) return;
    const classmates = getClassmates();
    picker.innerHTML = '<option value="">👥 Añadir compañero de la lista...</option>' + classmates
        .map((c, i) => `<option value="${i}">${escapeHtml(c.name)}${c.studentId ? ` (${escapeHtml(c.studentId)})` : ''}</option>`)
        .join('');
    const teamBox = document.getElementById('check-is-team');
    picker.style.display = teamBox && teamBox.checked && classmates.length ? '' : 'none';
}

function renderClassmatesTab(content) {
    const list = getClassmates();
    content.innerHTML = `
        <p class="settings-hint">En las tareas en equipo podrás elegirlos de una lista y se llenan solos su nombre y su matrícula.</p>
        <div class="settings-add-row">
            <input type="text" id="classmate-new-name" placeholder="Nombre completo">
            <input type="text" id="classmate-new-id" class="classmate-id-field" placeholder="Matrícula">
            <button type="button" class="action-btn save-btn" id="classmate-add">➕ Añadir</button>
        </div>
        <p id="settings-error" class="settings-error"></p>
        ${list.length ? `
            <ul class="settings-list">
                ${list.map((c, i) => `
                    <li data-index="${i}">
                        <span class="settings-item-name">${escapeHtml(c.name)}${c.studentId ? ` <em>${escapeHtml(c.studentId)}</em>` : ''}</span>
                        <button type="button" class="icon-btn" data-action="edit" title="Editar">✏️</button>
                        <button type="button" class="icon-btn" data-action="delete" title="Eliminar">🗑️</button>
                    </li>`).join('')}
            </ul>` : '<p class="settings-empty">Todavía no has añadido compañeros.</p>'}`;

    const nameInput = content.querySelector('#classmate-new-name');
    const idInput = content.querySelector('#classmate-new-id');
    const add = () => {
        const error = addClassmate(nameInput.value, idInput.value);
        if (error) {
            content.querySelector('#settings-error').textContent = error;
            return;
        }
        refreshSettingsModal();
        const again = document.getElementById('classmate-new-name');
        if (again) again.focus();
    };
    content.querySelector('#classmate-add').addEventListener('click', add);
    [nameInput, idInput].forEach(input => input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); }));

    content.querySelectorAll('.settings-list li').forEach(li => {
        const index = parseInt(li.dataset.index, 10);
        li.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const changed = btn.dataset.action === 'edit' ? editClassmate(index) : deleteClassmate(index);
                if (changed) refreshSettingsModal();
            });
        });
    });
}

// ---------- Mi perfil ----------

/**
 * Campos del formulario del perfil (los usan la pestaña "Mi perfil" y el asistente).
 * @param {object} p - valores
 * @param {string[]} parts - 'personal' y/o 'school'
 */
function profileFormHTML(p, parts) {
    const universities = getUniversities();
    const currentTheme = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
    const periodType = PERIOD_TYPES[p.periodType] ? p.periodType : 'cuatrimestre';
    let html = '<div class="profile-form">';
    if (parts.includes('personal')) {
        html += `
            <div class="profile-field profile-field-wide">
                <label for="profile-fullname">Nombre completo</label>
                <input type="text" id="profile-fullname" value="${escapeAttr(p.fullName || '')}" placeholder="Ej. Ana Pérez López" autocomplete="name">
            </div>
            <div class="profile-field">
                <label for="profile-studentid">Matrícula</label>
                <input type="text" id="profile-studentid" value="${escapeAttr(p.studentId || '')}" placeholder="Ej. 2109045">
            </div>`;
    }
    if (parts.includes('school')) {
        html += `
            <div class="profile-field profile-field-wide">
                <label for="profile-university">Universidad / escuela</label>
                <div class="profile-inline">
                    <select id="profile-university">
                        ${universities.map(u => `<option value="${escapeAttr(u.id)}" ${u.id === currentTheme ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
                    </select>
                    <button type="button" class="action-btn" id="profile-add-university" title="Agregar tu universidad con sus colores y logos">➕ Agregar</button>
                </div>
            </div>
            <div class="profile-field profile-field-wide">
                <label for="profile-career">${escapeHtml(getHeaderFieldLabel('career', 'editor'))}</label>
                <input type="text" id="profile-career" value="${escapeAttr(p.career || '')}" placeholder="Ej. Ingeniería en Datos">
            </div>
            <div class="profile-field">
                <label for="profile-group">Grupo</label>
                <input type="text" id="profile-group" value="${escapeAttr(p.group || '')}" placeholder="Ej. IDY-7A">
            </div>
            <div class="profile-field">
                <label for="profile-period">Periodo actual</label>
                <input type="text" id="profile-period" value="${escapeAttr(p.period || '')}" placeholder="Ej. 7">
            </div>
            <div class="profile-field profile-field-wide">
                <label>Tu escuela va por</label>
                <div class="period-type-options">
                    ${Object.entries(PERIOD_TYPES).map(([value, word]) => `
                        <label class="period-type-option">
                            <input type="radio" name="profile-period-type" value="${value}" ${value === periodType ? 'checked' : ''}>
                            <span>${word}</span>
                        </label>`).join('')}
                </div>
            </div>`;
    }
    return html + '</div>';
}

/**
 * Lee el formulario del perfil (solo los campos que estén en pantalla).
 */
function readProfileForm(root) {
    const value = id => {
        const el = root.querySelector('#' + id);
        return el ? el.value.trim() : undefined;
    };
    const data = {
        fullName: value('profile-fullname'),
        studentId: value('profile-studentid'),
        career: value('profile-career'),
        group: value('profile-group'),
        period: value('profile-period')
    };
    const periodType = root.querySelector('input[name="profile-period-type"]:checked');
    if (periodType) data.periodType = periodType.value;
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    return data;
}

/**
 * Conecta el selector de universidad y el botón "Agregar" del formulario.
 */
function bindProfileForm(root, beforeAddUniversity) {
    const uniSelect = root.querySelector('#profile-university');
    if (uniSelect) uniSelect.addEventListener('change', () => changeTheme(uniSelect.value));
    const addUni = root.querySelector('#profile-add-university');
    if (addUni) addUni.addEventListener('click', () => {
        if (beforeAddUniversity) beforeAddUniversity();
        openUniversityModal();
    });
}

function renderProfileTab(content) {
    content.innerHTML = `
        <p class="settings-hint">Tus datos se llenan solos en el encabezado de cada documento nuevo. Si en un documento cambias algo, tu perfil no cambia.</p>
        ${profileFormHTML(getProfile(), ['personal', 'school'])}
        <p id="profile-message" class="settings-success"></p>
        <div class="profile-actions">
            <button type="button" class="action-btn save-btn" id="profile-save">💾 Guardar perfil</button>
            <button type="button" class="action-btn" id="profile-apply" title="Pone tu nombre, matrícula, carrera, grupo y periodo en el encabezado del documento actual">Usar en el encabezado actual</button>
        </div>
        <button type="button" class="link-btn" id="profile-wizard">Volver a abrir el asistente de bienvenida</button>`;

    bindProfileForm(content);
    const message = content.querySelector('#profile-message');
    const save = () => {
        saveProfile({ ...getProfile(), ...readProfileForm(content) });
        render();
        message.textContent = '✓ Perfil guardado';
    };
    content.querySelector('#profile-save').addEventListener('click', save);
    content.querySelector('#profile-apply').addEventListener('click', () => {
        save();
        applyProfileToHeader();
        message.textContent = '✓ Perfil guardado y aplicado al encabezado actual';
    });
    content.querySelector('#profile-wizard').addEventListener('click', () => {
        closeSettingsModal();
        openOnboarding();
    });
}

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

// ============================================================================
// ASISTENTE DE BIENVENIDA (primera vez que se abre la app)
// ============================================================================

const ONBOARDING_STEPS = [
    { title: 'Tus datos', optional: false },
    { title: 'Tu escuela', optional: false },
    { title: 'Tu encabezado', optional: false },
    { title: 'Materias y profesores', optional: true },
    { title: 'Compañeros de clase', optional: true }
];

let onboardingState = null;

function openOnboarding() {
    closeOnboarding();
    const p = getProfile();
    const h = getHeaderData() || {};
    // Si ya había datos en el encabezado, se proponen como punto de partida
    onboardingState = {
        step: 0,
        profile: {
            fullName: p.fullName || ((h.names || [])[0] || '').trim(),
            studentId: p.studentId || ((h.studentIds || [])[0] || ''),
            career: p.career || h.career || '',
            group: p.group || h.group || '',
            period: p.period || h.term || '',
            periodType: getPeriodType()
        },
        subjects: [{ subject: '', prof: '' }],
        classmates: [{ name: '', studentId: '' }]
    };

    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay onboarding-overlay';
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = '<div class="university-modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"></div>';
    document.body.appendChild(overlay);
    renderOnboardingStep();
}

function closeOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.remove();
    onboardingState = null;
}

/**
 * Guarda en el estado lo que hay escrito en el paso actual.
 */
function collectOnboardingStep() {
    const modal = document.querySelector('#onboarding-overlay .onboarding-modal');
    if (!modal || !onboardingState) return;
    const step = onboardingState.step;
    if (step === 0 || step === 1) {
        onboardingState.profile = { ...onboardingState.profile, ...readProfileForm(modal) };
    } else if (step === 3) {
        onboardingState.subjects = Array.from(modal.querySelectorAll('.onboarding-row')).map(row => ({
            subject: row.querySelector('.ob-subject').value.trim(),
            prof: row.querySelector('.ob-prof').value.trim()
        }));
    } else if (step === 4) {
        onboardingState.classmates = Array.from(modal.querySelectorAll('.onboarding-row')).map(row => ({
            name: row.querySelector('.ob-name').value.trim(),
            studentId: row.querySelector('.ob-id').value.trim()
        }));
    }
}

function renderOnboardingStep() {
    const modal = document.querySelector('#onboarding-overlay .onboarding-modal');
    if (!modal || !onboardingState) return;
    const state = onboardingState;
    const step = ONBOARDING_STEPS[state.step];
    const isLast = state.step === ONBOARDING_STEPS.length - 1;

    let body = '';
    if (state.step === 0) {
        body = `
            <p class="onboarding-lead">Antes de empezar, guardemos tus datos para que tus reportes se llenen solos. Todo se queda en este navegador.</p>
            ${profileFormHTML(state.profile, ['personal'])}`;
    } else if (state.step === 1) {
        body = `
            <p class="onboarding-lead">¿Dónde estudias? Esto aparece en el encabezado y en la portada.</p>
            ${profileFormHTML(state.profile, ['school'])}`;
    } else if (state.step === 2) {
        body = '<div id="onboarding-fields"></div>';
    } else if (state.step === 3) {
        body = `
            <p class="onboarding-lead">Si quieres, da de alta tus materias y quién las imparte. Al elegir la materia en un reporte, el profesor se llena solo. También puedes hacerlo después en ⚙️ Configuración.</p>
            <div class="onboarding-rows">
                ${state.subjects.map(r => `
                    <div class="onboarding-row">
                        <input type="text" class="ob-subject" placeholder="Materia" value="${escapeAttr(r.subject)}">
                        <input type="text" class="ob-prof" placeholder="Profesor (opcional)" value="${escapeAttr(r.prof)}">
                    </div>`).join('')}
            </div>
            <button type="button" class="link-btn" id="onboarding-add-row">➕ Agregar otra materia</button>`;
    } else if (state.step === 4) {
        body = `
            <p class="onboarding-lead">Si haces tareas en equipo, guarda a tus compañeros con su matrícula y luego solo los eliges de una lista. También puedes hacerlo después.</p>
            <div class="onboarding-rows">
                ${state.classmates.map(r => `
                    <div class="onboarding-row">
                        <input type="text" class="ob-name" placeholder="Nombre completo" value="${escapeAttr(r.name)}">
                        <input type="text" class="ob-id" placeholder="Matrícula" value="${escapeAttr(r.studentId)}">
                    </div>`).join('')}
            </div>
            <button type="button" class="link-btn" id="onboarding-add-row">➕ Agregar otro compañero</button>`;
    }

    modal.innerHTML = `
        <div class="onboarding-progress" aria-label="Paso ${state.step + 1} de ${ONBOARDING_STEPS.length}">
            ${ONBOARDING_STEPS.map((s, i) => `<span class="onboarding-dot${i === state.step ? ' is-current' : ''}${i < state.step ? ' is-done' : ''}" title="${escapeAttr(s.title)}"></span>`).join('')}
        </div>
        <p class="onboarding-step-count">Paso ${state.step + 1} de ${ONBOARDING_STEPS.length}${step.optional ? ' · opcional' : ''}</p>
        <h3 id="onboarding-title">${state.step === 0 ? '👋 ¡Bienvenido!' : escapeHtml(step.title)}</h3>
        ${body}
        <p id="onboarding-error" class="settings-error"></p>
        <div class="onboarding-actions">
            ${state.step === 0
                ? '<button type="button" class="link-btn" id="onboarding-later">Configurar después</button>'
                : '<button type="button" class="action-btn" id="onboarding-back">← Atrás</button>'}
            <span class="onboarding-spacer"></span>
            ${step.optional ? '<button type="button" class="action-btn" id="onboarding-skip">Omitir</button>' : ''}
            <button type="button" class="action-btn save-btn" id="onboarding-next">${isLast ? '✓ Terminar' : 'Siguiente →'}</button>
        </div>`;

    if (state.step === 0 || state.step === 1) {
        bindProfileForm(modal, collectOnboardingStep);
    }
    if (state.step === 2) {
        renderHeaderFieldsEditor(modal.querySelector('#onboarding-fields'));
    }

    const addRow = modal.querySelector('#onboarding-add-row');
    if (addRow) addRow.addEventListener('click', () => {
        collectOnboardingStep();
        if (state.step === 3) state.subjects.push({ subject: '', prof: '' });
        else state.classmates.push({ name: '', studentId: '' });
        renderOnboardingStep();
        const rows = document.querySelectorAll('#onboarding-overlay .onboarding-row');
        const last = rows[rows.length - 1];
        if (last) last.querySelector('input').focus();
    });

    const later = modal.querySelector('#onboarding-later');
    if (later) later.addEventListener('click', () => {
        saveProfile({ ...getProfile(), onboardingDone: true });
        closeOnboarding();
    });
    const back = modal.querySelector('#onboarding-back');
    if (back) back.addEventListener('click', () => {
        collectOnboardingStep();
        state.step--;
        renderOnboardingStep();
    });
    const skip = modal.querySelector('#onboarding-skip');
    if (skip) skip.addEventListener('click', () => {
        if (state.step === 3) state.subjects = [];
        if (state.step === 4) state.classmates = [];
        goToNextOnboardingStep(false);
    });
    modal.querySelector('#onboarding-next').addEventListener('click', () => goToNextOnboardingStep(true));

    const firstInput = modal.querySelector('input[type="text"]');
    if (firstInput && state.step !== 2) firstInput.focus();
}

function goToNextOnboardingStep(collect) {
    const state = onboardingState;
    if (!state) return;
    if (collect) collectOnboardingStep();

    if (state.step === 0 && !state.profile.fullName) {
        const error = document.getElementById('onboarding-error');
        if (error) error.textContent = 'Escribe tu nombre completo para continuar.';
        const input = document.getElementById('profile-fullname');
        if (input) input.focus();
        return;
    }

    // Se guarda el avance en cada paso (así, por ejemplo, el paso del
    // encabezado ya usa el tipo de periodo que se acaba de elegir)
    saveProfile({ ...getProfile(), ...state.profile });

    if (state.step < ONBOARDING_STEPS.length - 1) {
        state.step++;
        renderOnboardingStep();
    } else {
        finishOnboarding();
    }
}

function finishOnboarding() {
    const state = onboardingState;
    if (!state) return;

    saveProfile({ ...getProfile(), ...state.profile, onboardingDone: true });

    state.subjects.filter(r => r.subject).forEach(r => {
        addListItem('list_subjects', r.subject);
        if (r.prof) {
            addListItem('list_profs', r.prof);
            setSubjectProf(r.subject, r.prof);
        }
    });
    state.classmates.filter(r => r.name).forEach(r => addClassmate(r.name, r.studentId));

    closeOnboarding();

    // El primer documento ya empieza con el encabezado lleno
    const header = getHeaderData();
    if (header && !getHeaderStudentName(header)) {
        applyProfileToHeader();
    } else if (!reportData.length) {
        addBlock('header');
    } else {
        render();
    }
}

// La primera vez que se abre la app, se muestra el asistente
document.addEventListener('DOMContentLoaded', function() {
    if (!getProfile().onboardingDone) openOnboarding();
});

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
        documentFormat: getDocumentFormat(),
        settings: {
            universities: getUniversities(),
            subjects: getSimpleList('list_subjects'),
            profs: getSimpleList('list_profs'),
            subjectProfMap: getSubjectProfMap(),
            classmates: getClassmates(),
            headerFields: getHeaderFieldConfig(),
            periodType: getPeriodType()
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

    // Compañeros: se añaden los que falten
    if (Array.isArray(settings.classmates)) {
        const classmates = getClassmates();
        settings.classmates.forEach(c => {
            if (c && typeof c.name === 'string' && c.name.trim() &&
                !classmates.some(local => local.name === c.name && (local.studentId || '') === (c.studentId || ''))) {
                classmates.push({ name: c.name.trim(), studentId: (c.studentId || '').trim() });
            }
        });
        saveClassmates(classmates);
    }

    // Campos del encabezado y tipo de periodo: solo si aquí no se han configurado
    if (settings.headerFields && typeof settings.headerFields === 'object' && !localStorage.getItem('header_fields')) {
        saveHeaderFieldConfig(settings.headerFields);
    }
    if (PERIOD_TYPES[settings.periodType] && !getProfile().periodType) {
        saveProfile({ ...getProfile(), periodType: settings.periodType });
    }

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

    // El proyecto se abre como un documento más de "Mis documentos"
    startNewLibraryDocument();

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
    setDocumentFormat(projectData.documentFormat || getDefaultDocumentFormat(), false);

    renderThemeSelector();
    if (projectData.theme) {
        changeTheme(projectData.theme);
    }

    setDocumentName(projectData.documentName || fallbackName.replace(/\.json$/i, ''));
    render();
    markDocumentSaved();
    resetUndoHistory();
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
            const hasCurrentData = reportData.length > 0 && !canKeepInLibrary();
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

        // Al seleccionar texto dentro de un campo, la tarjeta no se arrastra
        container.addEventListener('mousedown', function(e) {
            this.setAttribute('draggable', e.target.closest('.rich-editor, input, textarea, select') ? 'false' : 'true');
        });

        container.addEventListener('dragstart', function(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.getAttribute('data-index'));
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        container.addEventListener('dragend', function(e) {
            draggedIndex = null;
            this.setAttribute('draggable', 'true');
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
            // Texto soltado dentro de un campo: lo maneja el navegador
            if (draggedIndex === null) return;
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
