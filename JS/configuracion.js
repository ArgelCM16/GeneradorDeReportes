// Panel de Configuración.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

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
