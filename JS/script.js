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

    reportData.forEach(block => {
        const div = document.createElement('div');
        div.className = 'block-card-container';
        
        const deleteBtn = `<button class="delete-btn" onclick="deleteBlock(${block.id})" title="Eliminar bloque">&times;</button>`;
        let blockHTML = "";

        switch(block.type) {
            case 'header':
                blockHTML = renderHeaderEditor(block, deleteBtn);
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
function generateSelectOptions(storageKey, selectedValue) {
    const list = JSON.parse(localStorage.getItem(storageKey)) || [];
    let options = '<option value="">Seleccione...</option>';
    list.forEach(item => {
        const isSelected = item === selectedValue ? 'selected' : '';
        options += `<option value="${escapeAttr(item)}" ${isSelected}>${item}</option>`;
    });
    return options;
}


function renderHeaderEditor(block, deleteBtn) {
    const savedData = JSON.parse(localStorage.getItem('global_header_data'));
    
    let savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
        savedTheme = savedTheme.replace(/['"]+/g, '');
    }

    // La institución ya NO se elige manualmente aquí: siempre sigue a la
    // universidad seleccionada en "Tema" del menú lateral. Ahí (y solo ahí)
    // se puede añadir, editar o eliminar universidades.
    const currentUni = getUniversityById(savedTheme || 'generic') || getUniversityById('generic');
    const currentInstName = currentUni ? currentUni.name : '';

    // Actualizamos el modelo de datos por defecto
    const d = savedData || { names: [], name: '', group: '', subject: '', prof: '', term: '', date: '', isTeam: false };
    const isLocked = savedData ? 'disabled' : '';
    
    // Si está bloqueado, mejor ocultamos el botón de añadir por completo para que se vea más limpio
    const displayAddBtn = (d.isTeam && !savedData) ? 'inline-block' : 'none';

    // Lógica para renderizar los inputs de nombres guardados
    let membersHtml = '';
    const namesArray = (d.names && d.names.length > 0) ? d.names : [d.name || ''];

    namesArray.forEach((name, i) => {
        let placeholderText = d.isTeam ? `Nombre del integrante ${i + 1}` : 'Nombre del Alumno';
        
        let deleteBtnElement = (d.isTeam && i > 0) ? 
            `<button type="button" class="icon-btn action-icon btn-remove-member" onclick="removeTeamMember(this)" title="Eliminar integrante" ${isLocked}>🗑️</button>` : '';

        // FORZAMOS EL TAMAÑO: display: flex y flex: 1 en el input
        membersHtml += `
            <div class="input-with-action member-row" style="display: flex; width: 100%;">
                <input type="text" class="student-name-input" placeholder="${placeholderText}" value="${escapeAttr(name)}" ${isLocked} oninput="renderPreview()" style="flex: 1; min-width: 0; width: 100%; box-sizing: border-box;">
                ${deleteBtnElement}
            </div>
        `;
    });

    return `
        <div class="block-card header-card" id="header-card-main">
            ${deleteBtn}
            
            <div style="margin-bottom: 15px;">
                <label style="font-weight: bold; display: block; margin-bottom: 10px;">Datos del Alumno / Equipo:</label>
                
                <div id="team-members-container" class="grid-inputs" style="margin-bottom: 10px;">
                    ${membersHtml}
                </div>
                
                <button type="button" id="btn-add-member" class="action-btn" onclick="addTeamMember()" style="display: ${displayAddBtn};" ${isLocked}>
                    ➕ Añadir integrante
                </button>
            </div>

            <div class="grid-inputs">
                <input type="text" placeholder="Grupo" value="${escapeAttr(d.group || '')}" ${isLocked} oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                
                <div class="input-with-action" style="display: flex; width: 100%;">
                    <select id="select-subject-main" ${isLocked} onchange="renderPreview()" style="flex: 1; min-width: 0; width: 100%; box-sizing: border-box;">
                        ${generateSelectOptions('list_subjects', d.subject)}
                    </select>
                    <button type="button" class="icon-btn action-icon" onclick="addSubjectToList()" title="Añadir materia" ${isLocked}>➕</button>
                    <button type="button" class="icon-btn action-icon" onclick="editSubjectInList()" title="Editar materia seleccionada" ${isLocked}>✏️</button>
                    <button type="button" class="icon-btn action-icon" onclick="deleteSubjectFromList()" title="Eliminar materia seleccionada" ${isLocked}>🗑️</button>
                </div>

                <div class="input-with-action" style="display: flex; width: 100%;">
                    <select id="select-prof-main" ${isLocked} onchange="renderPreview()" style="flex: 1; min-width: 0; width: 100%; box-sizing: border-box;">
                        ${generateSelectOptions('list_profs', d.prof)}
                    </select>
                    <button type="button" class="icon-btn action-icon" onclick="addProfToList()" title="Añadir profesor" ${isLocked}>➕</button>
                    <button type="button" class="icon-btn action-icon" onclick="editProfInList()" title="Editar profesor seleccionado" ${isLocked}>✏️</button>
                    <button type="button" class="icon-btn action-icon" onclick="deleteProfFromList()" title="Eliminar profesor seleccionado" ${isLocked}>🗑️</button>
                </div>

                <input type="text" id="header-inst-display" value="${escapeAttr(currentInstName)}" disabled readonly title="La institución se define según el tema seleccionado en el menú lateral. Usa los botones junto a 'Tema' para añadir, editar o eliminar universidades." style="width: 100%; box-sizing: border-box; background: #f0f0f0; cursor: not-allowed;">
                <input type="text" placeholder="Cuatrimestre" value="${escapeAttr(d.term || '')}" ${isLocked} oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
                <input type="date" value="${escapeAttr(d.date || '')}" ${isLocked} oninput="renderPreview()" style="width: 100%; box-sizing: border-box;">
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0 15px 0;">

            <div class="card-actions" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                
                <div class="options-group" style="display: flex; gap: 20px; align-items: center;">
                    <div class="checkbox-container" style="display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" id="check-include-logo" name="check-include-logo" onchange="renderPreview()" ${d.includeLogo ? 'checked' : ''} ${isLocked} style="margin: 0; width: 15px; height: 15px;">
                        <label for="check-include-logo" style="margin: 0; cursor: pointer; line-height: 1; font-size: 14px; padding-top: 1px;">Incluir logos</label>
                    </div>
                    <div class="checkbox-container" style="display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" id="check-is-team" onchange="toggleTeamMode(this)" ${d.isTeam ? 'checked' : ''} ${isLocked} style="margin: 0; width: 15px; height: 15px;">
                        <label for="check-is-team" style="margin: 0; cursor: pointer; line-height: 1; font-size: 14px; padding-top: 1px;">Es tarea en equipo</label>
                    </div>
                </div>

                <div class="action-buttons-group" style="display: flex; gap: 10px;">
                    <button type="button" class="action-btn save-btn" onclick="saveHeaderData()" title="Guardar datos">💾</button>
                    <button type="button" class="action-btn edit-btn" onclick="editHeaderData()" title="Editar datos">✏️</button>
                    <button type="button" class="action-btn" onclick="deleteHeaderData()" title="Eliminar datos">🗑️</button>
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
function editSubjectInList() {
    const selectEl = document.getElementById('select-subject-main');
    const currentValue = selectEl.value;
    
    if (!currentValue) {
        return alert("Por favor, selecciona una materia de la lista para editarla.");
    }

    const newValue = prompt("Editar nombre de la materia:", currentValue);
    if (!newValue || newValue.trim() === "" || newValue.trim() === currentValue) return;

    const trimmedNew = newValue.trim();
    let subjects = JSON.parse(localStorage.getItem('list_subjects')) || [];
    
    // Actualizar en el arreglo
    const index = subjects.indexOf(currentValue);
    if (index > -1) {
        subjects[index] = trimmedNew;
        localStorage.setItem('list_subjects', JSON.stringify(subjects));
    }

    // Volver a renderizar las opciones y seleccionar el nuevo valor
    selectEl.innerHTML = generateSelectOptions('list_subjects', trimmedNew);
    
    // Sincronizar con los datos guardados si estaba seleccionado
    syncGlobalHeaderData('subject', currentValue, trimmedNew);
}

function editProfInList() {
    const selectEl = document.getElementById('select-prof-main');
    const currentValue = selectEl.value;
    
    if (!currentValue) {
        return alert("Por favor, selecciona un profesor de la lista para editarlo.");
    }

    const newValue = prompt("Editar nombre del profesor:", currentValue);
    if (!newValue || newValue.trim() === "" || newValue.trim() === currentValue) return;

    const trimmedNew = newValue.trim();
    let profs = JSON.parse(localStorage.getItem('list_profs')) || [];
    
    const index = profs.indexOf(currentValue);
    if (index > -1) {
        profs[index] = trimmedNew;
        localStorage.setItem('list_profs', JSON.stringify(profs));
    }

    selectEl.innerHTML = generateSelectOptions('list_profs', trimmedNew);
    syncGlobalHeaderData('prof', currentValue, trimmedNew);
}

// ==========================================
// FUNCIONES PARA ELIMINAR DE LAS LISTAS
// ==========================================

function deleteSubjectFromList() {
    const selectEl = document.getElementById('select-subject-main');
    const currentValue = selectEl.value;
    
    if (!currentValue) {
        return alert("Por favor, selecciona una materia de la lista para eliminarla.");
    }

    if (confirm(`¿Estás seguro de que deseas eliminar la materia "${currentValue}" de tu lista?`)) {
        let subjects = JSON.parse(localStorage.getItem('list_subjects')) || [];
        subjects = subjects.filter(s => s !== currentValue);
        localStorage.setItem('list_subjects', JSON.stringify(subjects));

        // Volver a renderizar dejando la selección vacía
        selectEl.innerHTML = generateSelectOptions('list_subjects', '');
        syncGlobalHeaderData('subject', currentValue, '');
    }
}

function deleteProfFromList() {
    const selectEl = document.getElementById('select-prof-main');
    const currentValue = selectEl.value;
    
    if (!currentValue) {
        return alert("Por favor, selecciona un profesor de la lista para eliminarlo.");
    }

    if (confirm(`¿Estás seguro de que deseas eliminar al profesor "${currentValue}" de tu lista?`)) {
        let profs = JSON.parse(localStorage.getItem('list_profs')) || [];
        profs = profs.filter(p => p !== currentValue);
        localStorage.setItem('list_profs', JSON.stringify(profs));

        selectEl.innerHTML = generateSelectOptions('list_profs', '');
        syncGlobalHeaderData('prof', currentValue, '');
    }
}

// Función auxiliar para mantener sincronizado el encabezado guardado si cambias algo en las listas
function syncGlobalHeaderData(key, oldValue, newValue) {
    let savedData = JSON.parse(localStorage.getItem('global_header_data'));
    if (savedData && savedData[key] === oldValue) {
        savedData[key] = newValue;
        localStorage.setItem('global_header_data', JSON.stringify(savedData));
    }
}

function addSubjectToList() {
    const newSubject = prompt("Ingrese el nombre de la nueva materia:");
    if (!newSubject || newSubject.trim() === "") return;

    const subjectName = newSubject.trim();
    let subjects = JSON.parse(localStorage.getItem('list_subjects')) || [];
    
    if (!subjects.includes(subjectName)) {
        subjects.push(subjectName);
        localStorage.setItem('list_subjects', JSON.stringify(subjects));
    }

    const selectEl = document.getElementById('select-subject-main');
    if (selectEl) {
        let exists = Array.from(selectEl.options).some(opt => opt.value === subjectName);
        if (!exists) {
            const option = document.createElement("option");
            option.text = subjectName;
            option.value = subjectName;
            selectEl.add(option);
        }
        selectEl.value = subjectName;
    }
}

function addProfToList() {
    const newProf = prompt("Ingrese el nombre del nuevo profesor:");
    if (!newProf || newProf.trim() === "") return;

    const profName = newProf.trim();
    let profs = JSON.parse(localStorage.getItem('list_profs')) || [];
    
    if (!profs.includes(profName)) {
        profs.push(profName);
        localStorage.setItem('list_profs', JSON.stringify(profs));
    }

    const selectEl = document.getElementById('select-prof-main');
    if (selectEl) {
        let exists = Array.from(selectEl.options).some(opt => opt.value === profName);
        if (!exists) {
            const option = document.createElement("option");
            option.text = profName;
            option.value = profName;
            selectEl.add(option);
        }
        selectEl.value = profName;
    }
}

// ==========================================
// FUNCIONES DE ACCIÓN PRINCIPAL (Sin IDs)
// ==========================================

function saveHeaderData() {
    const card = document.getElementById('header-card-main');

    if (card) {
        // 1. Extraemos los nombres dinámicos de los integrantes
        const nameInputs = card.querySelectorAll('.student-name-input');
        const namesArray = Array.from(nameInputs).map(input => input.value);

        // 2. Extraemos el estado de la casilla de equipo
        const isTeamCheckbox = card.querySelector('#check-is-team');
        const isTeam = isTeamCheckbox ? isTeamCheckbox.checked : false;

        // 3. Extraemos el resto de campos. IMPORTANTE: el contenedor de integrantes
        // también tiene la clase .grid-inputs, así que hay que excluir explícitamente
        // los inputs de nombre (y el de institución, que es de solo lectura) para no
        // desalinear los índices de Grupo/Cuatrimestre.
        const gridTextInputs = Array.from(card.querySelectorAll('.grid-inputs input[type="text"]'))
            .filter(input => !input.classList.contains('student-name-input') && input.id !== 'header-inst-display');
        const dateInput = card.querySelector('.grid-inputs input[type="date"]');
        const logoCheckbox = card.querySelector('#check-include-logo');

        // Los selects se leen por su ID específico (materia y profesor).
        // La institución NO se guarda aquí: siempre se deriva del tema/universidad
        // seleccionado en el menú lateral (ver getUniversityById en renderPreview).
        const subjectSelect = card.querySelector('#select-subject-main');
        const profSelect = card.querySelector('#select-prof-main');

        // Construimos el objeto con la nueva estructura
        const hDataToSave = {
            names: namesArray,         // Guardamos el arreglo de nombres
            isTeam: isTeam,            // Guardamos si es equipo o no
            group: gridTextInputs[0] ? gridTextInputs[0].value : '',
            subject: subjectSelect ? subjectSelect.value : '',
            prof: profSelect ? profSelect.value : '',
            term: gridTextInputs[1] ? gridTextInputs[1].value : '',
            date: dateInput ? dateInput.value : '',
            includeLogo: logoCheckbox ? logoCheckbox.checked : false
        };

        // Guardar con clave fija en LocalStorage
        localStorage.setItem('global_header_data', JSON.stringify(hDataToSave));

        // Seleccionamos todo lo que queremos bloquear (añadimos el botón de "Añadir integrante")
        const allFields = card.querySelectorAll('input, select, .action-icon, #btn-add-member');
        allFields.forEach(field => field.disabled = true);

        // Refrescar la vista previa con los datos recién guardados
        renderPreview();

        alert("Datos guardados y bloqueados correctamente.");
    }
}

function editHeaderData() {
    const confirmEdit = confirm("¿Deseas habilitar la edición? Los cambios no se guardarán hasta que presiones '💾'.");
    
    if (confirmEdit) {
        const card = document.getElementById('header-card-main');
        if (card) {
            // Desbloqueamos inputs, selects, iconos de acción y el botón de añadir miembro
            const allFields = card.querySelectorAll('input, select, .action-icon, #btn-add-member');
            allFields.forEach(field => field.disabled = false);

            // La institución nunca se edita aquí: siempre permanece bloqueada
            // porque se deriva del tema/universidad seleccionado en el menú lateral.
            const instDisplay = card.querySelector('#header-inst-display');
            if (instDisplay) instDisplay.disabled = true;
        }
    }
}

function deleteHeaderData() {
    const confirmDelete = confirm("⚠️ ¿Estás seguro de que deseas eliminar permanentemente estos datos?");

    if (confirmDelete) {
        // Eliminar usando la clave fija
        localStorage.removeItem('global_header_data');

        // Re-renderizamos el bloque completo para que vuelva a un estado
        // limpio y desbloqueado (en vez de limpiar campo por campo, lo cual
        // no restablecía correctamente los checkboxes ni la vista previa).
        render();
    }
}

// ==========================================
// termina modificaciones Argel cano para el header (listas desplegables y botones de acción)
// ==========================================

/**
 * Renderiza el editor de título (AHORA SEGURO)
 */
function renderTitleEditor(block, deleteBtn) {
    return `
        <div class="block-card title-card">
            ${deleteBtn}
            <label>Título Principal:</label>
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
            <label>Subtítulo:</label>
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
            <label>Párrafo de Texto:</label>
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
            <label>Bloque de Código:</label>
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
            <label>Imagen:</label>
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
            <label>Referencia Bibliográfica (IEEE):</label>
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
    
    // Obtener el nombre del estudiante del header si existe
    const headerBlock = reportData.find(b => b.type === 'header');
    const studentName = headerBlock && headerBlock.hData ? headerBlock.hData.name : '';
    
    return `
        <div class="block-card ai-card">
            ${deleteBtn}
            <label><strong>Declaración de Uso de Inteligencia Artificial</strong></label>

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
                    <input type="text" class="editor-input" placeholder="Nombre del estudiante" value="${escapeAttr(ai.name)}" oninput="updateAI(${block.id}, 'name', this.value)">
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
    const preview = document.getElementById('preview-container');
    let figureCounter = 0;
    let tableCounter = 0;
    let refCounter = 0;

    // 1. Obtener los datos del encabezado desde el LocalStorage
    const savedHeader = JSON.parse(localStorage.getItem('global_header_data')) || {};

    preview.innerHTML = reportData.map(block => {
        switch(block.type) {
            case 'title':
                return `<h1 class="p-title">${escapeHtml(block.content)}</h1>`;
            
            case 'subtitle':
                return `<h2 class="p-subtitle">${escapeHtml(block.content)}</h2>`;
            
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
            let liveData = JSON.parse(localStorage.getItem('global_header_data')) || {};
            
            // Aseguramos compatibilidad inicial si el objeto en localStorage usa el formato antiguo
            if (liveData.name && !liveData.names) {
                liveData.names = [liveData.name];
                liveData.isTeam = false;
            }

            // MAGIA EN VIVO: Si el editor está en pantalla, leemos directamente de los elementos del DOM
            const headerCard = document.getElementById('header-card-main');
            if (headerCard) {
                // 1. Extraemos TODOS los inputs de nombres usando la clase específica que creamos
                const nameInputs = headerCard.querySelectorAll('.student-name-input');
                const namesArray = Array.from(nameInputs).map(input => input.value);

                // 2. Extraemos el checkbox de equipo
                const isTeamCheckbox = headerCard.querySelector('#check-is-team');
                const isTeam = isTeamCheckbox ? isTeamCheckbox.checked : false;

                // 3. Extraemos el resto de inputs de texto (excluyendo los nombres y el
                //    de institución, que es de solo lectura y se deriva del tema)
                const inputsText = Array.from(headerCard.querySelectorAll('.grid-inputs input[type="text"]'))
                                        .filter(input => !input.classList.contains('student-name-input') && input.id !== 'header-inst-display');

                const dateInput = headerCard.querySelector('.grid-inputs input[type="date"]');
                const logoCheckbox = headerCard.querySelector('#check-include-logo');

                // 4. Extraemos los selects por sus IDs específicos (¡Más seguro!)
                const subjectSelect = headerCard.querySelector('#select-subject-main');
                const profSelect = headerCard.querySelector('#select-prof-main');

                // Validamos que existan suficientes campos (ahora son 2 text inputs y 2 selects;
                // la institución ya no es un campo del formulario, se deriva del tema)
                if (inputsText.length >= 2 && subjectSelect && profSelect) {
                    liveData = {
                        names: namesArray,
                        isTeam: isTeam,
                        // Ahora inputsText solo tiene 2 elementos: 0: Grupo, 1: Cuatrimestre
                        group: inputsText[0].value,
                        term: inputsText[1].value,

                        // Leemos directamente del valor de cada select
                        subject: subjectSelect.value,
                        prof: profSelect.value,

                        date: dateInput ? dateInput.value : '',
                        includeLogo: logoCheckbox ? logoCheckbox.checked : false
                    };
                }
            }

            // LÓGICA DE TEMAS PARA LOGOS E INSTITUCIÓN: ambos se resuelven según la
            // universidad seleccionada en el selector de temas del nav (no son
            // editables desde el propio bloque de encabezado)
            const currentThemeId = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
            const currentUni = getUniversityById(currentThemeId) || getUniversityById('generic') || {};
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
                    <p><strong>Materia:</strong> ${escapeHtml(liveData.subject || '')} ${liveData.term ? `(${escapeHtml(liveData.term)}° Cuatrimestre)` : ''}</p>
                    <p><strong>Profesor:</strong> ${escapeHtml(liveData.prof || '')}</p>
                    <p>${nombresHtmlFinal} ${liveData.group ? `| <strong>Grupo:</strong> ${escapeHtml(liveData.group)}` : ''}</p>
                    <p><strong>Fecha:</strong> ${escapeHtml(liveData.date || '')}</p>
                    <hr>
                </div>`;

            case 'ref':
                if (!block.refData) return '';
                refCounter++;
                const { author, title, source, year, url } = block.refData;
                let refText = formatIEEEReference(block.refType, author, title, source, year, url);
                return `
                    <div class="p-ref-ieee">
                        <div class="ref-num">[${refCounter}]</div>
                        <div class="ref-content">${refText}</div>
                    </div>`;
            
            case 'ai':
                if (!block.aiData) return '';
                const ai = block.aiData;
                
                // Ahora lee el nombre del estudiante directamente desde nuestro savedHeader
                const studentName = savedHeader.name || '[Nombre del estudiante]';

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
                        <div class="p-ai-declaration">
                            <div style="margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Nombre del estudiante:</strong> ${escapeHtml(ai.name || studentName)}</p>
                                <p style="margin: 5px 0;"><strong>IA utilizada:</strong> ${escapeHtml(ai.aiTool)}</p>
                                <p style="margin: 5px 0;"><strong>Fecha de uso:</strong> ${escapeHtml(ai.date)}</p>
                                <p style="margin: 5px 0;"><strong>Propósito:</strong> ${escapeHtml(ai.purpose)}</p>
                                
                                <p style="margin: 15px 0 5px 0;"><strong>Prompt utilizado:</strong></p>
                                <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 0.9em;">${escapeHtml(ai.prompt)}</pre>
                                
                                ${ai.attachments ? `<p style="margin: 10px 0 5px 0;"><strong>Archivos suministrados:</strong> ${escapeHtml(ai.attachments)}</p>` : ''}
                                
                                <p style="margin: 15px 0 5px 0;"><strong>Respuesta en crudo (raw):</strong></p>
                                <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 0.85em; max-height: 300px; overflow-y: auto;">${escapeHtml(ai.rawResponse)}</pre>
                            </div>
                        </div>`;
                }
            
            default:
                return "";
        }
    }).join('');

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
    const savedHeader = JSON.parse(localStorage.getItem('global_header_data')) || {};

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

                textContent += `DATOS DEL ESTUDIANTE\n`;
                textContent += `-`.repeat(40) + "\n";
                textContent += `Institución: ${exportUni.name || 'N/A'}\n`;
                textContent += `Materia: ${savedHeader.subject || 'N/A'} (${savedHeader.term || 'N/A'}° Cuatrimestre)\n`;
                textContent += `Profesor: ${savedHeader.prof || 'N/A'}\n`;
                textContent += `Alumno: ${alumnoLabel || 'N/A'} | Grupo: ${savedHeader.group || 'N/A'}\n`;
                textContent += `Fecha: ${savedHeader.date || 'N/A'}\n`;
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
                    // Ahora lee el nombre del estudiante directamente desde nuestro savedHeader
                    const studentName = savedHeader.name || '[Nombre del estudiante]';
                    
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
    link.download = "reporte_academico.txt";
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
            reportData = JSON.parse(saved);
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
    autosaveTimer = setTimeout(saveToLocalStorage, 500);
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

function saveUniversities(list) {
    localStorage.setItem('list_universities', JSON.stringify(list));
}

function getUniversityById(id) {
    return getUniversities().find(u => u.id === id);
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

function previewLogoFile(input, previewId) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById(previewId);
        img.src = e.target.result;
        img.style.display = 'inline-block';
    };
    reader.readAsDataURL(input.files[0]);
}

function closeUniversityModal() {
    const overlay = document.getElementById('university-modal-overlay');
    if (overlay) overlay.remove();
}

/**
 * Abre el modal para añadir una nueva universidad o editar la seleccionada.
 * @param {boolean} isEdit - true para editar la universidad actualmente seleccionada
 */
function openUniversityModal(isEdit) {
    const selector = document.getElementById('themeSelector');
    let editing = null;

    if (isEdit) {
        const currentId = selector ? selector.value : '';
        editing = getUniversityById(currentId);
        if (!editing) {
            alert('Selecciona una universidad válida para editar.');
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

    saveUniversities(universities);
    closeUniversityModal();
    renderThemeSelector();
    changeTheme(themeToApply);
}

/**
 * Elimina la universidad actualmente seleccionada en el selector de temas.
 * La universidad 'generic' no se puede eliminar porque sirve de respaldo.
 */
function deleteUniversityFromList() {
    const selector = document.getElementById('themeSelector');
    const currentId = selector ? selector.value : '';
    const uni = getUniversityById(currentId);

    if (!uni) return;
    if (uni.id === 'generic') {
        alert('La universidad genérica no se puede eliminar.');
        return;
    }

    if (!confirm(`¿Eliminar la universidad "${uni.name}"? Esta acción no se puede deshacer.`)) return;

    const universities = getUniversities().filter(u => u.id !== currentId);
    saveUniversities(universities);
    renderThemeSelector();
    changeTheme('generic');
}

// ============================================================================
// GUARDAR Y CARGAR PROYECTO (JSON)
// ============================================================================

/**
 * Guarda el proyecto completo como archivo JSON
 * Permite al usuario descargar su trabajo y continuarlo después
 */
function saveJSON() {
    try {
        // Crear objeto con todos los datos del proyecto
        const projectData = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            theme: document.body.getAttribute('data-theme') || 'generic',
            reportData: reportData
        };

        // Convertir a JSON con formato legible
        const jsonString = JSON.stringify(projectData, null, 2);

        // Crear Blob
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Crear nombre de archivo con fecha y hora
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '-'); // HH-MM
        const filename = `REPORTE-FECHA-${dateStr}-HORA-${timeStr}.json`;

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

        console.log('Proyecto guardado:', filename);
        alert('Proyecto guardado exitosamente como ' + filename);

    } catch (error) {
        console.error('Error al guardar proyecto:', error);
        alert('Error al guardar el proyecto. Por favor intenta de nuevo.');
    }
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

            // Cargar datos
            reportData = projectData.reportData;

            // Cargar tema si está disponible
            if (projectData.theme) {
                changeTheme(projectData.theme);
                const selector = document.getElementById('themeSelector');
                if (selector) {
                    selector.value = projectData.theme;
                }
            }

            // Renderizar
            render();

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
 * Construye el mismo JSON de proyecto que usa saveJSON(), para reutilizarlo
 * también al guardar en Google Drive.
 */
function buildProjectJSON() {
    return JSON.stringify({
        version: '2.0',
        timestamp: new Date().toISOString(),
        theme: document.body.getAttribute('data-theme') || 'generic',
        reportData: reportData
    }, null, 2);
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

    const jsonString = buildProjectJSON();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
    const filename = `REPORTE-FECHA-${dateStr}-HORA-${timeStr}.json`;

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

        if (!projectData.reportData || !Array.isArray(projectData.reportData)) {
            throw new Error('Formato de archivo inválido');
        }

        reportData = projectData.reportData;
        driveCurrentFileId = fileId;

        if (projectData.theme) {
            changeTheme(projectData.theme);
        }

        render();
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
