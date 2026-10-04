// Reparto del documento en hojas (paginatePreview).
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// VISTA PREVIA EN PÁGINAS REALES
// El documento se reparte en hojas tamaño carta (8.5 x 11 in, márgenes de
// 2 cm) y se imprime exactamente así: lo que se ve es lo que sale en el PDF.
// Los párrafos, el código y las tablas largas se parten entre páginas; lo
// que no se puede partir (una imagen, un encabezado) pasa completo a la
// siguiente hoja.
// ==========================================

// Tamaño natural de las imágenes ya cargadas (src -> { w, h }). Sirve para
// que la imagen ocupe su alto real desde antes de terminar de cargar; si no,
// mide 0 al paginar, "cabe" en cualquier lado y luego desborda la hoja.
const previewImageSizes = new Map();
let repaginateTimer = null;

function paginatePreview(container, html) {
    // Al rearmar las hojas el panel se vacía un momento; guardamos la posición
    // de desplazamiento para que no brinque al inicio mientras se escribe.
    const scroller = container.closest('.preview-scroll');
    const scrollTop = scroller ? scroller.scrollTop : 0;
    const scrollLeft = scroller ? scroller.scrollLeft : 0;
    container.style.minHeight = container.offsetHeight + 'px';

    const source = document.createElement('div');
    source.innerHTML = html;
    container.innerHTML = '';

    // Imágenes: con tamaño conocido se les pone width/height (el navegador
    // reserva su alto); las nuevas se miden al cargar y se repagina una vez.
    const unknownImages = [];
    source.querySelectorAll('img').forEach(img => {
        const size = previewImageSizes.get(img.getAttribute('src'));
        if (size) {
            img.setAttribute('width', size.w);
            img.setAttribute('height', size.h);
        } else {
            unknownImages.push(img);
        }
    });

    let pageEl = null;
    let body = null;
    let pageNumber = 0;
    let forceNewPage = false;

    const startPage = (isCover = false) => {
        pageNumber++;
        pageEl = document.createElement('div');
        pageEl.className = 'preview-page' + (isCover ? ' is-cover-page' : '');
        pageEl.dataset.page = pageNumber;
        body = document.createElement('div');
        body.className = 'preview-page-body';
        pageEl.appendChild(body);
        if (!isCover) {
            const num = document.createElement('div');
            num.className = 'preview-page-number';
            num.textContent = pageNumber;
            pageEl.appendChild(num);
        }
        container.appendChild(pageEl);
        forceNewPage = false;
    };

    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    const isEmpty = () => body.childElementCount === 0;

    // Intenta poner en `parent` la mayor parte de `el` que quepa.
    // Devuelve: el mismo `el` si no cupo nada, el resto que falta, o null.
    const splitToFit = (el, parent) => {
        if (el.matches('p.p-text')) return splitInline(el, parent);
        if (el.matches('pre')) return splitPre(el, parent);
        if (el.matches('.preview-table-container')) return splitTable(el, parent);
        if (el.dataset.split === 'children') return splitChildren(el, parent);
        return el;
    };

    // Parte un elemento de texto por palabras (o líneas), con búsqueda binaria.
    const splitByTokens = (el, parent, separator, getTextNode) => {
        const target = getTextNode(el);
        const tokens = target.textContent.split(separator);
        if (tokens.length < 2) return el;

        const build = count => {
            const clone = el.cloneNode(true);
            getTextNode(clone).textContent = tokens.slice(0, count).join(separator);
            return clone;
        };

        let low = 0;
        let high = tokens.length - 1;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const trial = build(mid);
            parent.appendChild(trial);
            const ok = fits();
            parent.removeChild(trial);
            if (ok) low = mid; else high = mid - 1;
        }
        if (low === 0) return el;

        const first = build(low);
        first.classList.add('p-split-start');
        parent.appendChild(first);

        const rest = el.cloneNode(true);
        getTextNode(rest).textContent = tokens.slice(low).join(separator);
        rest.classList.add('p-split-rest');
        return rest;
    };

    // Párrafo (con o sin formato): se corta después de un espacio o de un
    // salto de línea, con búsqueda binaria; Range conserva las negritas,
    // cursivas y citas de cada parte.
    const splitInline = (el, parent) => {
        const points = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === 1) {
                if (node.tagName === 'BR') {
                    const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
                    points.push({ node: node.parentNode, offset: index + 1 });
                }
                continue;
            }
            if (node.parentElement && node.parentElement.closest('.p-cite')) continue; // las citas no se parten
            const text = node.nodeValue;
            for (let i = 0; i < text.length - 1; i++) {
                if (text[i] === ' ') points.push({ node, offset: i + 1 });
            }
        }
        if (!points.length) return el;

        const part = (fromStart, point) => {
            const range = document.createRange();
            if (fromStart) {
                range.setStart(el, 0);
                range.setEnd(point.node, point.offset);
            } else {
                range.setStart(point.node, point.offset);
                range.setEnd(el, el.childNodes.length);
            }
            const clone = el.cloneNode(false);
            clone.appendChild(range.cloneContents());
            return clone;
        };

        let low = 0;
        let high = points.length;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const trial = part(true, points[mid - 1]);
            parent.appendChild(trial);
            const ok = fits();
            parent.removeChild(trial);
            if (ok) low = mid; else high = mid - 1;
        }
        if (low === 0) return el;

        const first = part(true, points[low - 1]);
        first.classList.add('p-split-start');
        parent.appendChild(first);

        const rest = part(false, points[low - 1]);
        if (!rest.textContent.trim()) return null;
        rest.classList.add('p-split-rest');
        return rest;
    };

    // Código con colores: cada línea es un <span class="code-line">
    const splitCodeLines = (el, parent) => {
        const lines = Array.from(el.querySelector('code').children);
        if (lines.length < 2) return el;
        const start = parseInt(el.dataset.startLine, 10) || 1;
        const build = (from, to) => {
            const clone = el.cloneNode(true);
            const code = clone.querySelector('code');
            Array.from(code.children).forEach((line, i) => { if (i < from || i >= to) line.remove(); });
            clone.dataset.startLine = String(start + from);
            code.style.counterReset = `code-line ${start + from - 1}`;
            return clone;
        };
        let low = 0;
        let high = lines.length - 1;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const trial = build(0, mid);
            parent.appendChild(trial);
            const ok = fits();
            parent.removeChild(trial);
            if (ok) low = mid; else high = mid - 1;
        }
        if (low === 0) return el;
        const first = build(0, low);
        first.classList.add('p-split-start');
        parent.appendChild(first);
        const rest = build(low, lines.length);
        rest.classList.add('p-split-rest');
        return rest;
    };

    const splitPre = (el, parent) => {
        const codeEl = el.querySelector('code');
        if (codeEl && codeEl.firstElementChild && codeEl.firstElementChild.classList.contains('code-line')) return splitCodeLines(el, parent);
        const inner = el.firstElementChild && el.firstElementChild.tagName === 'CODE';
        return splitByTokens(el, parent, '\n', node => inner ? node.firstElementChild : node);
    };

    // Tabla: se reparten las filas; el encabezado se repite y la descripción
    // va solo en la última parte.
    const splitTable = (el, parent) => {
        const rows = el.querySelectorAll('tbody tr');
        if (rows.length < 2) return el;

        const build = (start, end, withCaption) => {
            const clone = el.cloneNode(true);
            const cloneRows = clone.querySelectorAll('tbody tr');
            cloneRows.forEach((row, i) => { if (i < start || i >= end) row.remove(); });
            if (!withCaption) {
                const caption = clone.querySelector('.table-caption');
                if (caption) caption.remove();
            }
            return clone;
        };

        let low = 0;
        let high = rows.length - 1;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const trial = build(0, mid, false);
            parent.appendChild(trial);
            const ok = fits();
            parent.removeChild(trial);
            if (ok) low = mid; else high = mid - 1;
        }
        if (low === 0) return el;

        parent.appendChild(build(0, low, false));
        return build(low, rows.length, true);
    };

    // Contenedores (índice, declaración de IA): se reparten sus hijos.
    const splitChildren = (el, parent) => {
        const first = el.cloneNode(false);
        parent.appendChild(first);
        const kids = Array.from(el.children);
        let index = 0;
        let remainderChild = null;

        for (; index < kids.length; index++) {
            first.appendChild(kids[index]);
            if (fits()) continue;
            first.removeChild(kids[index]);
            const rest = splitToFit(kids[index], first);
            if (rest !== kids[index]) {
                remainderChild = rest;
                index++;
            }
            break;
        }

        if (first.children.length === 0) {
            parent.removeChild(first);
            return el;
        }
        if (index >= kids.length && !remainderChild) return null;

        const rest = el.cloneNode(false);
        if (remainderChild) rest.appendChild(remainderChild);
        kids.slice(index).forEach(kid => rest.appendChild(kid));
        // Lista numerada partida: la continuación sigue la numeración
        if (el.tagName === 'OL') {
            const placed = first.children.length - (remainderChild ? 1 : 0);
            rest.setAttribute('start', (parseInt(el.getAttribute('start'), 10) || 1) + placed);
            rest.classList.add('p-split-rest');
        }
        return rest;
    };

    const place = el => {
        body.appendChild(el);
        if (fits()) return;
        body.removeChild(el);

        const rest = splitToFit(el, body);
        if (rest === el) {
            if (isEmpty()) {
                // No cabe ni en una hoja vacía y no se puede partir: se deja así.
                body.appendChild(el);
                return;
            }
            startPage();
            place(el);
            return;
        }
        if (rest) {
            startPage();
            place(rest);
        }
    };

    Array.from(source.children).forEach(el => {
        const isCover = el.classList.contains('p-cover');
        const pageBreak = el.dataset.pageBreak || '';
        const breakBefore = isCover || pageBreak === 'before' || pageBreak === 'both';
        const breakAfter = isCover || pageBreak === 'after' || pageBreak === 'both';

        if (!body || forceNewPage || (breakBefore && !isEmpty())) {
            startPage(isCover);
        } else if (isCover) {
            // La hoja actual está vacía: se vuelve la hoja de portada
            pageEl.classList.add('is-cover-page');
            const num = pageEl.querySelector('.preview-page-number');
            if (num) num.remove();
        }

        place(el);
        if (breakAfter) forceNewPage = true;
    });

    // Documento vacío: una hoja en blanco
    if (!body) startPage();

    container.style.minHeight = '';
    if (scroller) {
        scroller.scrollTop = scrollTop;
        scroller.scrollLeft = scrollLeft;
    }

    // Cuando terminen de cargar las imágenes nuevas, se guardan sus medidas
    // y se vuelve a paginar (la siguiente vez ya se conocen: no hay ciclo).
    unknownImages.forEach(img => {
        const remember = () => {
            if (!img.naturalWidth || !img.naturalHeight) return;
            previewImageSizes.set(img.getAttribute('src'), { w: img.naturalWidth, h: img.naturalHeight });
            clearTimeout(repaginateTimer);
            repaginateTimer = setTimeout(renderPreview, 30);
        };
        if (img.complete) remember();
        else img.addEventListener('load', remember, { once: true });
    });
}
