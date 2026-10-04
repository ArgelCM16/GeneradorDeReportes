// Índice, editores de cada tipo de bloque y renderPreview().
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

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
// ==========================================
// RENDIMIENTO DE LA VISTA PREVIA
// Repartir el documento en hojas es lo más pesado (mide cada elemento). Por
// eso: 1) si el HTML y el formato no cambiaron, no se vuelve a paginar; y
// 2) mientras se escribe en un documento largo, se espera a que se deje de
// escribir (renderPreviewSoon). Los documentos cortos se actualizan al momento.
// ==========================================

const PREVIEW_DEBOUNCE_MIN_PAGES = 8;   // desde cuántas hojas se espera al escribir
const PREVIEW_DEBOUNCE_MS = 250;
let previewSoonTimer = null;
let lastPreviewLayoutKey = null;
let lastPaginationMs = 0;

/**
 * Para lo que se escribe tecla por tecla.
 */
function renderPreviewSoon() {
    const pages = document.querySelectorAll('#preview-container .preview-page').length;
    if (pages < PREVIEW_DEBOUNCE_MIN_PAGES) {
        renderPreview();
        return;
    }
    clearTimeout(previewSoonTimer);
    previewSoonTimer = setTimeout(() => {
        previewSoonTimer = null;
        renderPreview();
    }, PREVIEW_DEBOUNCE_MS);
}

/**
 * Si hay una actualización esperando, se hace ya (antes de imprimir, al cerrar...).
 */
function flushPreview() {
    if (previewSoonTimer) renderPreview();
}

// Al cerrar o cambiar de pestaña no se pierde lo último que se escribió
function flushPendingWork() {
    flushPreview();
    if (typeof autosaveTimer !== 'undefined' && autosaveTimer) {
        clearTimeout(autosaveTimer);
        autosaveTimer = null;
        saveToLocalStorage();
    }
}
window.addEventListener('pagehide', flushPendingWork);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingWork();
});

/**
 * @param {boolean} force - volver a paginar aunque nada haya cambiado (por
 *   ejemplo, cuando termina de cargar una imagen y ya se conoce su tamaño)
 */
function renderPreview(force = false) {
    clearTimeout(previewSoonTimer);
    previewSoonTimer = null;

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

    // Se arma en hojas, igual que como se imprimirá (solo si algo cambió)
    const layoutKey = previewHTML + '\u0000' + JSON.stringify(getDocumentFormat());
    if (force === true || layoutKey !== lastPreviewLayoutKey || !preview.querySelector('.preview-page')) {
        const started = performance.now();
        paginatePreview(preview, previewHTML);
        fillTocPageNumbers(preview);
        lastPaginationMs = performance.now() - started;
        lastPreviewLayoutKey = layoutKey;
    }
    refreshCitationChips();
    refreshDetectedLanguages();
    scheduleDocumentStats();

    scheduleAutosave();
}
