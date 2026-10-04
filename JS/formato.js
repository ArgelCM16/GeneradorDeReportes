// Formato del documento (letra, interlineado, márgenes, hoja...).
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

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
