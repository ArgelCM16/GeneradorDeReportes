// Zoom, ancho y ocultar la vista previa; diseño para celular.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// ZOOM DE LA VISTA PREVIA (solo pantalla; no afecta la impresión)
// Las hojas son de tamaño real (8.5 in de ancho), así que por defecto se
// ajustan al ancho del panel ("fit"). Con − y + se pasa a un nivel fijo y
// con clic en el porcentaje se vuelve a ajustar al ancho.
// ==========================================

const PREVIEW_ZOOM_LEVELS = [0.25, 0.33, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5];
const PAGE_WIDTH_PX = 816; // 8.5 in a 96 dpi

function getPreviewZoom() {
    const stored = localStorage.getItem('previewZoom');
    const z = parseFloat(stored);
    return PREVIEW_ZOOM_LEVELS.includes(z) ? z : 'fit';
}

/**
 * Zoom con el que cabe una hoja completa a lo ancho del panel.
 */
function getFitZoom() {
    const scroller = document.querySelector('.preview-scroll');
    if (!scroller || !scroller.clientWidth) return 0.5;
    const style = getComputedStyle(scroller);
    const available = scroller.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return Math.max(0.2, Math.min(1.5, available / getPageWidthPx()));
}

function getEffectiveZoom() {
    const z = getPreviewZoom();
    return z === 'fit' ? getFitZoom() : z;
}

/**
 * @param {number|'fit'} zoom
 */
function setPreviewZoom(zoom) {
    const value = PREVIEW_ZOOM_LEVELS.includes(zoom) ? zoom : 'fit';
    localStorage.setItem('previewZoom', String(value));
    applyPreviewZoom();
}

function applyPreviewZoom() {
    const z = getEffectiveZoom();
    const preview = document.getElementById('preview-container');
    if (preview) preview.style.setProperty('--preview-zoom', z);
    const label = document.getElementById('preview-zoom-label');
    if (label) {
        label.textContent = `${Math.round(z * 100)}%`;
        label.title = getPreviewZoom() === 'fit' ? 'Ajustado al ancho' : 'Clic para ajustar al ancho';
    }
}

/**
 * Sube (+1) o baja (-1) un nivel de zoom a partir del zoom actual.
 */
function changePreviewZoom(direction) {
    const current = getEffectiveZoom();
    const levels = PREVIEW_ZOOM_LEVELS;
    let next;
    if (direction > 0) {
        next = levels.find(l => l > current + 0.001) || levels[levels.length - 1];
    } else {
        next = [...levels].reverse().find(l => l < current - 0.001) || levels[0];
    }
    setPreviewZoom(next);
}

document.addEventListener('DOMContentLoaded', applyPreviewZoom);
window.addEventListener('resize', () => {
    if (getPreviewZoom() === 'fit') applyPreviewZoom();
});

// ==========================================
// ANCHO DE LA VISTA PREVIA
// El divisor entre el editor y la vista previa se arrastra para cambiar su
// ancho (doble clic = tamaño normal). El botón de la barra de la vista previa
// la agranda de un clic. El ancho elegido se recuerda.
// ==========================================

const PREVIEW_MIN_WIDTH = 320;   // ancho mínimo de la vista previa
const EDITOR_MIN_WIDTH = 380;    // lo que siempre le queda al editor
const PREVIEW_EXPANDED_RATIO = 0.6;

function getPreviewWidthLimits() {
    const workspace = document.querySelector('.workspace');
    const total = workspace ? workspace.clientWidth : window.innerWidth;
    return { min: PREVIEW_MIN_WIDTH, max: Math.max(PREVIEW_MIN_WIDTH, total - EDITOR_MIN_WIDTH), total };
}

/**
 * Aplica un ancho (en px) a la vista previa, o `null` para volver al del CSS.
 * @param {number|null} width
 * @param {boolean} save - guardarlo para la próxima vez
 */
function setPreviewWidth(width, save = true) {
    const pane = document.getElementById('preview-pane');
    if (!pane) return;

    if (width === null) {
        pane.style.flex = '';
        if (save) localStorage.removeItem('previewWidth');
    } else {
        const { min, max } = getPreviewWidthLimits();
        const w = Math.round(Math.min(max, Math.max(min, width)));
        pane.style.flex = `0 0 ${w}px`;
        if (save) localStorage.setItem('previewWidth', String(w));
    }

    updatePreviewExpandButton();
    // Si el zoom está en "ajustar al ancho", la hoja se agranda con el panel
    if (getPreviewZoom() === 'fit') applyPreviewZoom();
}

function isPreviewExpanded() {
    const pane = document.getElementById('preview-pane');
    const { total } = getPreviewWidthLimits();
    return !!pane && pane.getBoundingClientRect().width >= total * (PREVIEW_EXPANDED_RATIO - 0.05);
}

function togglePreviewExpanded() {
    if (isPreviewExpanded()) {
        setPreviewWidth(null);
    } else {
        setPreviewWidth(getPreviewWidthLimits().total * PREVIEW_EXPANDED_RATIO);
    }
}

function updatePreviewExpandButton() {
    const expanded = isPreviewExpanded();
    const icon = document.getElementById('preview-expand-icon');
    if (icon) icon.textContent = expanded ? 'close_fullscreen' : 'open_in_full';
    const btn = document.getElementById('preview-expand-btn');
    if (btn) btn.title = expanded ? 'Tamaño normal' : 'Agrandar vista previa';
}

function initPaneResizer() {
    const resizer = document.getElementById('pane-resizer');
    const pane = document.getElementById('preview-pane');
    if (!resizer || !pane) return;

    // Ancho guardado de la vez anterior
    const saved = parseFloat(localStorage.getItem('previewWidth'));
    if (saved) setPreviewWidth(saved, false);
    else updatePreviewExpandButton();

    resizer.addEventListener('pointerdown', event => {
        event.preventDefault();
        try { resizer.setPointerCapture(event.pointerId); } catch (e) { /* sin captura también funciona */ }
        document.body.classList.add('is-resizing-panes');

        // La vista previa está a la derecha: su ancho = borde derecho - cursor
        const right = pane.getBoundingClientRect().right;
        const onMove = e => setPreviewWidth(right - e.clientX, false);
        const onUp = e => {
            try { resizer.releasePointerCapture(e.pointerId); } catch (err) { /* ya liberado */ }
            resizer.removeEventListener('pointermove', onMove);
            resizer.removeEventListener('pointerup', onUp);
            resizer.removeEventListener('pointercancel', onUp);
            document.body.classList.remove('is-resizing-panes');
            setPreviewWidth(pane.getBoundingClientRect().width); // guardar
        };
        resizer.addEventListener('pointermove', onMove);
        resizer.addEventListener('pointerup', onUp);
        resizer.addEventListener('pointercancel', onUp);
    });

    resizer.addEventListener('dblclick', () => setPreviewWidth(null));

    // Con teclado: flechas para ajustar de 40 en 40 px
    resizer.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const width = pane.getBoundingClientRect().width;
        setPreviewWidth(width + (event.key === 'ArrowLeft' ? 40 : -40));
    });

    // Si la ventana se achica, que el editor no quede aplastado
    window.addEventListener('resize', () => {
        const stored = parseFloat(localStorage.getItem('previewWidth'));
        if (stored) setPreviewWidth(stored, false);
        else updatePreviewExpandButton();
    });
}

document.addEventListener('DOMContentLoaded', initPaneResizer);

// ==========================================
// MOSTRAR / OCULTAR LA VISTA PREVIA Y DISEÑO PARA CELULAR
// En computadora la vista previa se puede ocultar por completo (el editor
// ocupa todo el ancho). En celular hay un menú lateral que se abre con ☰ y
// dos pestañas abajo para cambiar entre el editor y la vista previa.
//
// OJO: la vista previa oculta NO lleva display:none; se saca de la pantalla
// con CSS para que se siga midiendo y paginando (si no, el índice tendría
// números equivocados y la impresión saldría mal).
// ==========================================

const MOBILE_QUERY = '(max-width: 768px)';

function isMobileLayout() {
    return window.matchMedia(MOBILE_QUERY).matches;
}

function isPreviewHidden() {
    return localStorage.getItem('previewHidden') === '1';
}

/**
 * Oculta o muestra la vista previa en computadora (se recuerda).
 */
function setPreviewHidden(hidden) {
    localStorage.setItem('previewHidden', hidden ? '1' : '0');
    applyPreviewVisibility();
}

function togglePreviewVisible() {
    if (isMobileLayout()) {
        setMobileView(document.body.classList.contains('mobile-view-preview') ? 'editor' : 'preview');
        return;
    }
    setPreviewHidden(!isPreviewHidden());
}

function applyPreviewVisibility() {
    const hidden = isPreviewHidden();
    document.body.classList.toggle('preview-is-hidden', hidden);

    const icon = document.getElementById('preview-toggle-icon');
    if (icon) icon.textContent = hidden ? 'visibility' : 'visibility_off';
    const label = document.getElementById('preview-toggle-label');
    if (label) label.textContent = hidden ? 'Mostrar vista previa' : 'Ocultar vista previa';
    const btn = document.getElementById('preview-toggle-btn');
    if (btn) {
        btn.title = hidden ? 'Mostrar la vista previa' : 'Ocultar la vista previa para que el editor ocupe todo el ancho';
        btn.classList.toggle('is-active', hidden);
    }

    if (getPreviewZoom() === 'fit') applyPreviewZoom();
}

/**
 * Celular: muestra el editor o la vista previa (ocupan toda la pantalla).
 * @param {'editor'|'preview'} view
 */
function setMobileView(view) {
    const showPreview = view === 'preview';
    document.body.classList.toggle('mobile-view-preview', showPreview);
    document.querySelectorAll('.mobile-tabs button').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.view === view);
    });
    if (showPreview && getPreviewZoom() === 'fit') applyPreviewZoom();
}

/**
 * Celular: abre o cierra el menú lateral.
 * @param {boolean} [open] - sin valor, alterna
 */
function toggleSidebar(open) {
    const shouldOpen = typeof open === 'boolean' ? open : !document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', shouldOpen);
}

document.addEventListener('DOMContentLoaded', function() {
    applyPreviewVisibility();

    // Celular: al usar un botón del menú, el menú se cierra; si fue para
    // agregar un bloque, se vuelve al editor para verlo.
    const toolbox = document.querySelector('.toolbox');
    if (toolbox) {
        toolbox.addEventListener('click', event => {
            if (!isMobileLayout()) return;
            const button = event.target.closest('button');
            if (!button || button.classList.contains('drive-help-btn')) return;
            if (button.closest('.blocks-grid') || button.classList.contains('btn-ai')) setMobileView('editor');
            toggleSidebar(false);
        });
    }

    // Al pasar de celular a computadora (o al revés) se limpia el estado del otro modo
    window.matchMedia(MOBILE_QUERY).addEventListener('change', e => {
        if (!e.matches) {
            toggleSidebar(false);
            setMobileView('editor');
        }
        if (getPreviewZoom() === 'fit') applyPreviewZoom();
    });
});
