// Plantillas.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// PLANTILLAS
// ==========================================

const TEMPLATES = [
    {
        id: 'practica',
        name: 'Reporte de práctica',
        icon: 'science',
        description: 'Para prácticas de laboratorio o de taller.',
        blocks: [
            { type: 'toc' },
            { type: 'title', content: 'Reporte de práctica' },
            { type: 'subtitle', content: 'Introducción' },
            { type: 'text', hint: 'Explica el tema de la práctica y por qué es importante.' },
            { type: 'subtitle', content: 'Objetivo' },
            { type: 'text', hint: '¿Qué se busca lograr con esta práctica?' },
            { type: 'subtitle', content: 'Marco teórico' },
            { type: 'text', hint: 'Conceptos y fundamentos necesarios para entender la práctica.' },
            { type: 'subtitle', content: 'Materiales y equipo' },
            { type: 'text', hint: 'Lista de materiales, herramientas, software y equipo utilizado.' },
            { type: 'subtitle', content: 'Desarrollo' },
            { type: 'text', hint: 'Describe paso a paso el procedimiento que seguiste.' },
            { type: 'subtitle', content: 'Resultados' },
            { type: 'table', caption: 'Resultados obtenidos' },
            { type: 'text', hint: 'Analiza e interpreta los resultados.' },
            { type: 'subtitle', content: 'Conclusiones' },
            { type: 'text', hint: '¿Se cumplió el objetivo? ¿Qué aprendiste?' },
            { type: 'subtitle', content: 'Referencias' },
            { type: 'ref' },
            { type: 'ai' }
        ]
    },
    {
        id: 'ensayo',
        name: 'Ensayo',
        icon: 'edit_note',
        description: 'Texto argumentativo con introducción, desarrollo y conclusión.',
        blocks: [
            { type: 'title', content: 'Título del ensayo' },
            { type: 'subtitle', content: 'Introducción' },
            { type: 'text', hint: 'Presenta el tema y plantea tu tesis o postura.' },
            { type: 'subtitle', content: 'Desarrollo' },
            { type: 'text', hint: 'Primer argumento con su evidencia.' },
            { type: 'text', hint: 'Segundo argumento con su evidencia.' },
            { type: 'text', hint: 'Contraargumento y tu respuesta.' },
            { type: 'subtitle', content: 'Conclusión' },
            { type: 'text', hint: 'Retoma tu tesis y cierra con una reflexión.' },
            { type: 'subtitle', content: 'Referencias' },
            { type: 'ref' }
        ]
    },
    {
        id: 'investigacion',
        name: 'Trabajo de investigación',
        icon: 'travel_explore',
        description: 'Estructura formal con planteamiento, metodología y resultados.',
        blocks: [
            { type: 'toc' },
            { type: 'title', content: 'Título de la investigación' },
            { type: 'subtitle', content: 'Resumen' },
            { type: 'text', hint: 'Resume en un párrafo el problema, el método y los resultados.' },
            { type: 'subtitle', content: 'Introducción' },
            { type: 'text', hint: 'Contexto del tema.' },
            { type: 'subtitle', content: 'Planteamiento del problema' },
            { type: 'text', hint: '¿Qué problema se estudia y por qué?' },
            { type: 'subtitle', content: 'Justificación' },
            { type: 'text', hint: '¿Por qué es importante investigarlo?' },
            { type: 'subtitle', content: 'Objetivos' },
            { type: 'text', hint: 'Objetivo general y objetivos específicos.' },
            { type: 'subtitle', content: 'Marco teórico' },
            { type: 'text', hint: 'Teorías, conceptos y estudios previos.' },
            { type: 'subtitle', content: 'Metodología' },
            { type: 'text', hint: 'Tipo de investigación, población, instrumentos y procedimiento.' },
            { type: 'subtitle', content: 'Resultados' },
            { type: 'text', hint: 'Presenta lo que encontraste.' },
            { type: 'subtitle', content: 'Conclusiones' },
            { type: 'text', hint: 'Responde a los objetivos planteados.' },
            { type: 'subtitle', content: 'Referencias' },
            { type: 'ref' },
            { type: 'ai' }
        ]
    },
    {
        id: 'proyecto',
        name: 'Proyecto de programación',
        icon: 'code',
        description: 'Documentación de un programa o sistema, con código y pruebas.',
        blocks: [
            { type: 'toc' },
            { type: 'title', content: 'Nombre del proyecto' },
            { type: 'subtitle', content: 'Descripción' },
            { type: 'text', hint: '¿Qué hace el programa y para quién es?' },
            { type: 'subtitle', content: 'Requisitos' },
            { type: 'text', hint: 'Requisitos funcionales y no funcionales.' },
            { type: 'subtitle', content: 'Diseño' },
            { type: 'text', hint: 'Arquitectura, diagramas y decisiones de diseño.' },
            { type: 'image', caption: 'Diagrama del sistema' },
            { type: 'subtitle', content: 'Implementación' },
            { type: 'text', hint: 'Explica las partes principales del código.' },
            { type: 'code' },
            { type: 'subtitle', content: 'Pruebas' },
            { type: 'table', caption: 'Casos de prueba' },
            { type: 'subtitle', content: 'Conclusiones' },
            { type: 'text', hint: 'Resultados, dificultades y mejoras posibles.' },
            { type: 'subtitle', content: 'Referencias' },
            { type: 'ref' },
            { type: 'ai' }
        ]
    }
];

/**
 * Crea un bloque completo a partir de la definición de la plantilla.
 */
function createBlockFromTemplate(def) {
    const block = createBlock(def.type);
    if (def.content !== undefined) block.content = def.content;
    if (def.hint) block.hint = def.hint;
    if (def.caption !== undefined) block.caption = def.caption;
    return block;
}

/**
 * Aplica una plantilla. Conserva el encabezado (y lo agrega si no hay).
 * @param {'append'|'replace'} mode
 */
function applyTemplate(templateId, mode = 'append') {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    let header = reportData.find(b => b.type === 'header');
    const hasToc = reportData.some(b => b.type === 'toc');
    let base = mode === 'replace' ? (header ? [header] : []) : [...reportData];
    reportData = base;

    if (!header) {
        header = createBlockFromTemplate({ type: 'header' });
        reportData.unshift(header);
    }

    template.blocks.forEach(def => {
        if (def.type === 'toc' && (mode === 'append' && hasToc)) return;
        reportData.push(createBlockFromTemplate(def));
    });

    closeTemplatesModal();
    if (isMobileLayout()) setMobileView('editor');
    render();
    const editor = document.getElementById('editor-container');
    if (editor) editor.scrollTop = 0;
}

function openTemplatesModal() {
    closeTemplatesModal();
    const hasContent = reportData.some(b => b.type !== 'header');
    const overlay = document.createElement('div');
    overlay.className = 'university-modal-overlay';
    overlay.id = 'templates-modal-overlay';
    overlay.innerHTML = `
        <div class="university-modal templates-modal">
            <h3>📋 Plantillas</h3>
            <p class="settings-hint">Arma de un clic la estructura típica de un trabajo. Tu encabezado se conserva; solo tienes que llenar los párrafos (cada uno trae una pista de qué escribir).</p>
            ${hasContent ? `
                <div class="template-mode">
                    <span>Ya tienes contenido:</span>
                    <label><input type="radio" name="template-mode" value="append" checked> Agregar al final</label>
                    <label><input type="radio" name="template-mode" value="replace"> Reemplazar el documento</label>
                </div>` : ''}
            <div class="template-grid">
                ${TEMPLATES.map(t => `
                    <button type="button" class="template-card" data-template="${t.id}">
                        <span class="template-icon material-symbols-outlined">${t.icon}</span>
                        <span class="template-name">${escapeHtml(t.name)}</span>
                        <span class="template-desc">${escapeHtml(t.description)}</span>
                        <span class="template-sections">${escapeHtml(t.blocks.filter(b => b.type === 'subtitle').map(b => b.content).join(' · '))}</span>
                    </button>`).join('')}
            </div>
            <div class="university-modal-actions">
                <button type="button" class="action-btn" onclick="closeTemplatesModal()">Cerrar</button>
            </div>
        </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeTemplatesModal(); });
    overlay.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const modeInput = overlay.querySelector('input[name="template-mode"]:checked');
            const mode = modeInput ? modeInput.value : 'append';
            if (mode === 'replace' && !confirm('¿Reemplazar el contenido del documento por la plantilla? (Tu encabezado se conserva y puedes deshacerlo con Ctrl+Z.)')) return;
            applyTemplate(card.dataset.template, mode);
        });
    });
    document.body.appendChild(overlay);
}

function closeTemplatesModal() {
    const overlay = document.getElementById('templates-modal-overlay');
    if (overlay) overlay.remove();
}
