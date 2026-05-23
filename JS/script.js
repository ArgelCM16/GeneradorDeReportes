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

    const schoolNames = {
        'upy': 'UPY - Universidad Politécnica de Yucatán',
        'tsw': 'TSW - Tecnológico de Software',
        'upp': 'UPP - Universidad Privada de la Península'
    };

    const d = savedData || { name: '', group: '', subject: '', prof: '', inst: '', term: '', date: '' };
    const currentInst = d.inst || schoolNames[savedTheme] || '';
    const isLocked = savedData ? 'disabled' : '';

    return `
        <div class="block-card header-card" id="header-card-main">
            ${deleteBtn}
            <label>Datos del Alumno / Encabezado:</label>
            <div class="grid-inputs">
                <!-- Cambiamos updateContent por renderPreview() -->
                <input type="text" placeholder="Nombre del Alumno" value="${escapeAttr(d.name || '')}" ${isLocked} oninput="renderPreview()">
                <input type="text" placeholder="Grupo" value="${escapeAttr(d.group || '')}" ${isLocked} oninput="renderPreview()">
                
                <!-- Materia -->
                <div class="input-with-action">
                    <select id="select-subject-main" ${isLocked} onchange="renderPreview()">
                        ${generateSelectOptions('list_subjects', d.subject)}
                    </select>
                    <button type="button" class="icon-btn action-icon" onclick="addSubjectToList()" title="Añadir materia" ${isLocked}>➕</button>
                    <button type="button" class="icon-btn action-icon" onclick="editSubjectInList()" title="Editar materia seleccionada" ${isLocked}>✏️</button>
                    <button type="button" class="icon-btn action-icon" onclick="deleteSubjectFromList()" title="Eliminar materia seleccionada" ${isLocked}>🗑️</button>
                </div>

                <!-- Profesor -->
                <div class="input-with-action">
                    <select id="select-prof-main" ${isLocked} onchange="renderPreview()">
                        ${generateSelectOptions('list_profs', d.prof)}
                    </select>
                    <button type="button" class="icon-btn action-icon" onclick="addProfToList()" title="Añadir profesor" ${isLocked}>➕</button>
                    <button type="button" class="icon-btn action-icon" onclick="editProfInList()" title="Editar profesor seleccionado" ${isLocked}>✏️</button>
                    <button type="button" class="icon-btn action-icon" onclick="deleteProfFromList()" title="Eliminar profesor seleccionado" ${isLocked}>🗑️</button>
                </div>

                <input type="text" placeholder="Institución" value="${escapeAttr(currentInst)}" ${isLocked} oninput="renderPreview()">
                <input type="text" placeholder="Cuatrimestre" value="${escapeAttr(d.term || '')}" ${isLocked} oninput="renderPreview()">
                <input type="date" value="${escapeAttr(d.date || '')}" ${isLocked} oninput="renderPreview()">
                
            </div>
            <div class="card-actions">
                <div class="checkbox-container" style="margin-top: 15px; display: flex; align-items: center; gap: 8px;">
                  <input type="checkbox" id="check-include-logo" name="check-include-logo" onchange="renderPreview()">
                  <label for="check-include-logo">Incluir logos</label>
                </div>
                <button type="button" class="action-btn save-btn" onclick="saveHeaderData()" title="Guardar datos">💾</button>
                <button type="button" class="action-btn edit-btn" onclick="editHeaderData()" title="Editar datos">🔄</button>
                <button type="button" class="action-btn" onclick="deleteHeaderData()" title="Eliminar datos">🗑️</button>
            </div>
        </div>`;
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
        const inputs = card.querySelectorAll('input');
        const selects = card.querySelectorAll('select');

        const hDataToSave = {
            name: inputs[0].value,       
            group: inputs[1].value,      
            subject: selects[0].value,   
            prof: selects[1].value,      
            inst: inputs[2].value,       
            term: inputs[3].value,       
            date: inputs[4].value        
        };

        // Guardar con clave fija
        localStorage.setItem('global_header_data', JSON.stringify(hDataToSave));

        const allFields = card.querySelectorAll('input, select, .action-icon');
        allFields.forEach(field => field.disabled = true);

        updateContent()
        
        alert("Datos guardados y bloqueados correctamente.");
    }
}

function editHeaderData() {
    const confirmEdit = confirm("¿Deseas habilitar la edición? Los cambios no se guardarán hasta que presiones '💾'.");
    
    if (confirmEdit) {
        const card = document.getElementById('header-card-main');
        if (card) {
            const allFields = card.querySelectorAll('input, select, .action-icon');
            allFields.forEach(field => field.disabled = false);
        }
    }
}

function deleteHeaderData() {
    const confirmDelete = confirm("⚠️ ¿Estás seguro de que deseas eliminar permanentemente estos datos?");
    
    if (confirmDelete) {
        // Eliminar usando la clave fija
        localStorage.removeItem('global_header_data');
        
        const card = document.getElementById('header-card-main');
        if (card) {
            const inputsAndSelects = card.querySelectorAll('input, select');
            inputsAndSelects.forEach(field => {
                field.value = ''; 
                field.disabled = false;
            });
            
            const actionIcons = card.querySelectorAll('.action-icon');
            actionIcons.forEach(icon => icon.disabled = false);
        }
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
                
                // MAGIA EN VIVO: Si el editor está en pantalla, leemos directamente los inputs
                const headerCard = document.getElementById('header-card-main');
                if (headerCard) {
                    const inputs = headerCard.querySelectorAll('input[type="text"], input[type="date"], input:not([type="checkbox"])');
                    const selects = headerCard.querySelectorAll('select');
                    const logoCheckbox = headerCard.querySelector('#check-include-logo');
                    
                    if (inputs.length >= 5 && selects.length >= 2) {
                        liveData = {
                            name: inputs[0].value,
                            group: inputs[1].value,
                            subject: selects[0].value,
                            prof: selects[1].value,
                            inst: inputs[2].value,
                            term: inputs[3].value,
                            date: inputs[4].value,
                            includeLogo: logoCheckbox ? logoCheckbox.checked : false
                        };
                    }
                }

                // LÓGICA DE TEMAS PARA LOS LOGOS
                // Leemos la clave exacta de tu LocalStorage ('selectedTheme')
                const currentTheme = localStorage.getItem('selectedTheme') || 'default';
                let logoIzquierdo = '';
                let logoDerecho = '';

                // Asignar imágenes dependiendo de los 3 temas (Ajusta los nombres de los case 2 y 3)
        //               <option value="upy">UPY - Universidad Politécnica de Yucatán</option>
        //   <option value="tsw">TSW - Tecnológico de Software</option>
        //   <option value="upp">UPP - Universidad Privada de la Península</option>
                switch (currentTheme) {
                    case 'upy':
                        // Pon aquí las URLs de los logos para la UPY
                        logoIzquierdo = '../assets/img/upy.png'; 
                        logoDerecho = '../assets/img/upy.png';
                        break;
                    case 'tsw': // Reemplaza 'tema2' por el valor exacto de tu segundo tema
                        logoIzquierdo = '../assets/img/tsw.png';
                        logoDerecho = '../assets/img/tsw.png';
                        break;
                    case 'upp': // Reemplaza 'tema3' por el valor exacto de tu tercer tema
                        logoIzquierdo = '../assets/img/upp.png';
                        logoDerecho = '../assets/img/upp.png';
                        break;
                    default:
                        // Logos genéricos por defecto
                        logoIzquierdo = 'https://static.wixstatic.com/media/e16f80_9c4ca79ed84340e0984c64712e35448c~mv2_d_3000_2100_s_2.png';
                        logoDerecho = 'https://static.wixstatic.com/media/e16f80_9c4ca79ed84340e0984c64712e35448c~mv2_d_3000_2100_s_2.png';
                        break;
                }

                // Generar el HTML de los logos si el checkbox está marcado
                let logosHTML = '';
                if (liveData.includeLogo) {
                    logosHTML = `
                        <div class="header-logos" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <img src="${logoIzquierdo}" alt="Logo Institución" style="height: 80px; max-width: 100px; object-fit: contain;">
                            <img src="${logoDerecho}" alt="Logo Carrera" style="height: 80px; max-width: 100px; object-fit: contain;">
                        </div>
                    `;
                }

                return `
                    <div class="p-header">
                        ${logosHTML}
                        <p><strong>Institución:</strong> ${escapeHtml(liveData.inst || '')}</p>
                        <p><strong>Materia:</strong> ${escapeHtml(liveData.subject || '')} ${liveData.term ? `(${escapeHtml(liveData.term)}° Cuatrimestre)` : ''}</p>
                        <p><strong>Profesor:</strong> ${escapeHtml(liveData.prof || '')}</p>
                        <p><strong>Alumno:</strong> ${escapeHtml(liveData.name || '')} ${liveData.group ? `| <strong>Grupo:</strong> ${escapeHtml(liveData.group)}` : ''}</p>
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
            case 'header':
                // Ahora lee de savedHeader en lugar de block.hData
                textContent += `DATOS DEL ESTUDIANTE\n`;
                textContent += `-`.repeat(40) + "\n";
                textContent += `Institución: ${savedHeader.inst || 'N/A'}\n`;
                textContent += `Materia: ${savedHeader.subject || 'N/A'} (${savedHeader.term || 'N/A'}° Cuatrimestre)\n`;
                textContent += `Profesor: ${savedHeader.prof || 'N/A'}\n`;
                textContent += `Alumno: ${savedHeader.name || 'N/A'} | Grupo: ${savedHeader.group || 'N/A'}\n`;
                textContent += `Fecha: ${savedHeader.date || 'N/A'}\n`;
                textContent += `\n`;
                break;
            
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
 * Guarda el estado actual en localStorage (opcional)
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('reportData', JSON.stringify(reportData));
        console.log('Reporte guardado automáticamente');
    } catch (e) {
        console.error('Error al guardar en localStorage:', e);
    }
}

/**
 * Carga el estado desde localStorage (opcional)
 */
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('reportData');
        if (saved) {
            reportData = JSON.parse(saved);
            render();
            console.log('Reporte recuperado');
        }
    } catch (e) {
        console.error('Error al cargar desde localStorage:', e);
    }
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

// Cargar datos guardados al iniciar (opcional - comentado por ahora)
// document.addEventListener('DOMContentLoaded', function() {
//     loadFromLocalStorage();
// });

// Autoguardado cada 30 segundos (opcional - comentado por ahora)
// setInterval(saveToLocalStorage, 30000);

// ============================================================================
// GESTIÓN DE TEMAS
// ============================================================================

/**
 * Cambia el tema visual de la aplicación
 * @param {string} theme - 'tsw', 'upy', o 'upp'
 */
function changeTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('selectedTheme', theme);
    console.log(`Tema cambiado a: ${theme}`);
}

/**
 * Carga el tema guardado al iniciar
 */
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('selectedTheme') || 'upy';
    document.body.setAttribute('data-theme', savedTheme);
    const selector = document.getElementById('themeSelector');
    if (selector) {
        selector.value = savedTheme;
    }
}

// Cargar tema al iniciar
document.addEventListener('DOMContentLoaded', function() {
    loadSavedTheme();
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
        // Crear objeto con todos los datos del proyecto
        const projectData = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            theme: document.body.getAttribute('data-theme') || 'tsw',
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
                `Tema: ${projectData.theme || 'tsw'}`
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
