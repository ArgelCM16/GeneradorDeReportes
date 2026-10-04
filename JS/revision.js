// Contador de palabras y revisión antes de entregar.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

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
    flushPreview();
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
