// Párrafos con formato (HTML limpio) y citas.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

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
