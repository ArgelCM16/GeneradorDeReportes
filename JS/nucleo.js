// Estado (reportData), seguridad (escapeHtml), crear, borrar y actualizar bloques, tablas.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

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
