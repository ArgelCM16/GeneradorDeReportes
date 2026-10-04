// Portada y formato de las referencias (IEEE / APA).
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

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
