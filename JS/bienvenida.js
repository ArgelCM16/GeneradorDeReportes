// Asistente de bienvenida.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// ASISTENTE DE BIENVENIDA (primera vez que se abre la app)
// ============================================================================

const ONBOARDING_STEPS = [
    { title: 'Tus datos', optional: false },
    { title: 'Tu escuela', optional: false },
    { title: 'Tu encabezado', optional: false },
    { title: 'Materias y profesores', optional: true },
    { title: 'Compañeros de clase', optional: true }
];

let onboardingState = null;

function openOnboarding() {
    closeOnboarding();
    const p = getProfile();
    const h = getHeaderData() || {};
    // Si ya había datos en el encabezado, se proponen como punto de partida
    onboardingState = {
        step: 0,
        profile: {
            fullName: p.fullName || ((h.names || [])[0] || '').trim(),
            studentId: p.studentId || ((h.studentIds || [])[0] || ''),
            career: p.career || h.career || '',
            group: p.group || h.group || '',
            period: p.period || h.term || '',
            periodType: getPeriodType()
        },
        subjects: [{ subject: '', prof: '' }],
        classmates: [{ name: '', studentId: '' }]
    };

    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay onboarding-overlay';
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = '<div class="university-modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"></div>';
    document.body.appendChild(overlay);
    renderOnboardingStep();
}

function closeOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.remove();
    onboardingState = null;
}

/**
 * Guarda en el estado lo que hay escrito en el paso actual.
 */
function collectOnboardingStep() {
    const modal = document.querySelector('#onboarding-overlay .onboarding-modal');
    if (!modal || !onboardingState) return;
    const step = onboardingState.step;
    if (step === 0 || step === 1) {
        onboardingState.profile = { ...onboardingState.profile, ...readProfileForm(modal) };
    } else if (step === 3) {
        onboardingState.subjects = Array.from(modal.querySelectorAll('.onboarding-row')).map(row => ({
            subject: row.querySelector('.ob-subject').value.trim(),
            prof: row.querySelector('.ob-prof').value.trim()
        }));
    } else if (step === 4) {
        onboardingState.classmates = Array.from(modal.querySelectorAll('.onboarding-row')).map(row => ({
            name: row.querySelector('.ob-name').value.trim(),
            studentId: row.querySelector('.ob-id').value.trim()
        }));
    }
}

function renderOnboardingStep() {
    const modal = document.querySelector('#onboarding-overlay .onboarding-modal');
    if (!modal || !onboardingState) return;
    const state = onboardingState;
    const step = ONBOARDING_STEPS[state.step];
    const isLast = state.step === ONBOARDING_STEPS.length - 1;

    let body = '';
    if (state.step === 0) {
        body = `
            <p class="onboarding-lead">Antes de empezar, guardemos tus datos para que tus reportes se llenen solos. Todo se queda en este navegador.</p>
            ${profileFormHTML(state.profile, ['personal'])}`;
    } else if (state.step === 1) {
        body = `
            <p class="onboarding-lead">¿Dónde estudias? Esto aparece en el encabezado y en la portada.</p>
            ${profileFormHTML(state.profile, ['school'])}`;
    } else if (state.step === 2) {
        body = '<div id="onboarding-fields"></div>';
    } else if (state.step === 3) {
        body = `
            <p class="onboarding-lead">Si quieres, da de alta tus materias y quién las imparte. Al elegir la materia en un reporte, el profesor se llena solo. También puedes hacerlo después en ⚙️ Configuración.</p>
            <div class="onboarding-rows">
                ${state.subjects.map(r => `
                    <div class="onboarding-row">
                        <input type="text" class="ob-subject" placeholder="Materia" value="${escapeAttr(r.subject)}">
                        <input type="text" class="ob-prof" placeholder="Profesor (opcional)" value="${escapeAttr(r.prof)}">
                    </div>`).join('')}
            </div>
            <button type="button" class="link-btn" id="onboarding-add-row">➕ Agregar otra materia</button>`;
    } else if (state.step === 4) {
        body = `
            <p class="onboarding-lead">Si haces tareas en equipo, guarda a tus compañeros con su matrícula y luego solo los eliges de una lista. También puedes hacerlo después.</p>
            <div class="onboarding-rows">
                ${state.classmates.map(r => `
                    <div class="onboarding-row">
                        <input type="text" class="ob-name" placeholder="Nombre completo" value="${escapeAttr(r.name)}">
                        <input type="text" class="ob-id" placeholder="Matrícula" value="${escapeAttr(r.studentId)}">
                    </div>`).join('')}
            </div>
            <button type="button" class="link-btn" id="onboarding-add-row">➕ Agregar otro compañero</button>`;
    }

    modal.innerHTML = `
        <div class="onboarding-progress" aria-label="Paso ${state.step + 1} de ${ONBOARDING_STEPS.length}">
            ${ONBOARDING_STEPS.map((s, i) => `<span class="onboarding-dot${i === state.step ? ' is-current' : ''}${i < state.step ? ' is-done' : ''}" title="${escapeAttr(s.title)}"></span>`).join('')}
        </div>
        <p class="onboarding-step-count">Paso ${state.step + 1} de ${ONBOARDING_STEPS.length}${step.optional ? ' · opcional' : ''}</p>
        <h3 id="onboarding-title">${state.step === 0 ? '👋 ¡Bienvenido!' : escapeHtml(step.title)}</h3>
        ${body}
        <p id="onboarding-error" class="settings-error"></p>
        <div class="onboarding-actions">
            ${state.step === 0
                ? '<button type="button" class="link-btn" id="onboarding-later">Configurar después</button>'
                : '<button type="button" class="action-btn" id="onboarding-back">← Atrás</button>'}
            <span class="onboarding-spacer"></span>
            ${step.optional ? '<button type="button" class="action-btn" id="onboarding-skip">Omitir</button>' : ''}
            <button type="button" class="action-btn save-btn" id="onboarding-next">${isLast ? '✓ Terminar' : 'Siguiente →'}</button>
        </div>`;

    if (state.step === 0 || state.step === 1) {
        bindProfileForm(modal, collectOnboardingStep);
    }
    if (state.step === 2) {
        renderHeaderFieldsEditor(modal.querySelector('#onboarding-fields'));
    }

    const addRow = modal.querySelector('#onboarding-add-row');
    if (addRow) addRow.addEventListener('click', () => {
        collectOnboardingStep();
        if (state.step === 3) state.subjects.push({ subject: '', prof: '' });
        else state.classmates.push({ name: '', studentId: '' });
        renderOnboardingStep();
        const rows = document.querySelectorAll('#onboarding-overlay .onboarding-row');
        const last = rows[rows.length - 1];
        if (last) last.querySelector('input').focus();
    });

    const later = modal.querySelector('#onboarding-later');
    if (later) later.addEventListener('click', () => {
        saveProfile({ ...getProfile(), onboardingDone: true });
        closeOnboarding();
    });
    const back = modal.querySelector('#onboarding-back');
    if (back) back.addEventListener('click', () => {
        collectOnboardingStep();
        state.step--;
        renderOnboardingStep();
    });
    const skip = modal.querySelector('#onboarding-skip');
    if (skip) skip.addEventListener('click', () => {
        if (state.step === 3) state.subjects = [];
        if (state.step === 4) state.classmates = [];
        goToNextOnboardingStep(false);
    });
    modal.querySelector('#onboarding-next').addEventListener('click', () => goToNextOnboardingStep(true));

    const firstInput = modal.querySelector('input[type="text"]');
    if (firstInput && state.step !== 2) firstInput.focus();
}

function goToNextOnboardingStep(collect) {
    const state = onboardingState;
    if (!state) return;
    if (collect) collectOnboardingStep();

    if (state.step === 0 && !state.profile.fullName) {
        const error = document.getElementById('onboarding-error');
        if (error) error.textContent = 'Escribe tu nombre completo para continuar.';
        const input = document.getElementById('profile-fullname');
        if (input) input.focus();
        return;
    }

    // Se guarda el avance en cada paso (así, por ejemplo, el paso del
    // encabezado ya usa el tipo de periodo que se acaba de elegir)
    saveProfile({ ...getProfile(), ...state.profile });

    if (state.step < ONBOARDING_STEPS.length - 1) {
        state.step++;
        renderOnboardingStep();
    } else {
        finishOnboarding();
    }
}

function finishOnboarding() {
    const state = onboardingState;
    if (!state) return;

    saveProfile({ ...getProfile(), ...state.profile, onboardingDone: true });

    state.subjects.filter(r => r.subject).forEach(r => {
        addListItem('list_subjects', r.subject);
        if (r.prof) {
            addListItem('list_profs', r.prof);
            setSubjectProf(r.subject, r.prof);
        }
    });
    state.classmates.filter(r => r.name).forEach(r => addClassmate(r.name, r.studentId));

    closeOnboarding();

    // El primer documento ya empieza con el encabezado lleno
    const header = getHeaderData();
    if (header && !getHeaderStudentName(header)) {
        applyProfileToHeader();
    } else if (!reportData.length) {
        addBlock('header');
    } else {
        render();
    }
}

// La primera vez que se abre la app, se muestra el asistente
document.addEventListener('DOMContentLoaded', function() {
    if (!getProfile().onboardingDone) openOnboarding();
});
