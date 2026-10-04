// Perfil, campos del encabezado y compañeros.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

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
