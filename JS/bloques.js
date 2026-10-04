// ids de bloque, subir/bajar/duplicar e imágenes más ligeras.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// IDS DE BLOQUE, MOVER Y DUPLICAR
// ==========================================

let lastBlockId = 0;

/**
 * id único para un bloque nuevo (antes era Date.now(), que se repetía si se
 * creaban dos bloques en el mismo milisegundo).
 */
function newBlockId() {
    const maxExisting = reportData.reduce((max, b) => Math.max(max, Number(b.id) || 0), 0);
    lastBlockId = Math.max(Date.now(), lastBlockId + 1, maxExisting + 1);
    return lastBlockId;
}

/**
 * Botones de la esquina de cada tarjeta. Funcionan con el dedo (el arrastrar
 * y soltar no funciona en pantallas táctiles).
 */
function buildBlockToolsHTML(block, index) {
    const deleteButton = `<button class="delete-btn" onclick="deleteBlock(${block.id})" title="Eliminar bloque">&times;</button>`;
    // El encabezado va siempre arriba y el índice se acomoda solo después de él
    if (block.type === 'header' || block.type === 'toc') return deleteButton;

    // No se puede subir por encima del encabezado ni del índice
    const fixedBefore = reportData.slice(0, index).every(b => b.type === 'header' || b.type === 'toc');
    const first = index === 0 || fixedBefore;
    const last = index === reportData.length - 1;
    const moveButtons = `
        <button type="button" class="block-tool" onclick="moveBlockBy(${block.id}, -1)" title="Subir" ${first ? 'disabled' : ''}><span class="material-symbols-outlined">arrow_upward</span></button>
        <button type="button" class="block-tool" onclick="moveBlockBy(${block.id}, 1)" title="Bajar" ${last ? 'disabled' : ''}><span class="material-symbols-outlined">arrow_downward</span></button>`;
    const duplicateButton = `<button type="button" class="block-tool" onclick="duplicateBlock(${block.id})" title="Duplicar"><span class="material-symbols-outlined">content_copy</span></button>`;
    return `
        <div class="block-tools">
            ${moveButtons}
            ${duplicateButton}
            ${deleteButton}
        </div>`;
}

/**
 * Mueve un bloque una posición arriba (-1) o abajo (+1).
 */
function moveBlockBy(id, direction) {
    const from = reportData.findIndex(b => b.id === id);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= reportData.length) return;
    if (['header', 'toc'].includes(reportData[to].type) && reportData.slice(0, to + 1).every(b => b.type === 'header' || b.type === 'toc')) return;
    const [block] = reportData.splice(from, 1);
    reportData.splice(to, 0, block);
    render();

    // Mantener la tarjeta a la vista después de moverla
    const cards = document.querySelectorAll('#editor-container .block-card-container');
    const index = reportData.findIndex(b => b.id === id);
    if (cards[index] && cards[index].scrollIntoView) cards[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/**
 * Inserta una copia del bloque justo debajo.
 */
function duplicateBlock(id) {
    const index = reportData.findIndex(b => b.id === id);
    const block = reportData[index];
    if (!block || block.type === 'header' || block.type === 'toc') return;
    const copy = JSON.parse(JSON.stringify(block));
    copy.id = newBlockId();
    reportData.splice(index + 1, 0, copy);
    render();
}

// ==========================================
// IMÁGENES MÁS LIGERAS
// ==========================================

const BLOCK_IMAGE_MAX_SIZE = 1600;

/**
 * Reduce una imagen a maxSize px por lado. Con preferJpeg, las imágenes sin
 * transparencia (fotos, capturas) se guardan como JPEG, que pesa mucho menos.
 * Siempre se queda con la versión más ligera; los SVG no se tocan.
 */
function shrinkImageDataUrl(dataUrl, mimeType, maxSize, preferJpeg = false) {
    return new Promise(resolve => {
        if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
            resolve(dataUrl);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const hasTransparency = () => {
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const step = Math.max(4, Math.floor(data.length / 40000) * 4);
                for (let i = 3; i < data.length; i += step) {
                    if (data[i] < 255) return true;
                }
                return false;
            };

            // Se prueban los formatos posibles y se queda el más ligero
            const candidates = [];
            if (mimeType === 'image/jpeg' || (preferJpeg && !hasTransparency())) {
                candidates.push(canvas.toDataURL('image/jpeg', 0.85));
            }
            if (mimeType !== 'image/jpeg') candidates.push(canvas.toDataURL('image/png'));
            const best = candidates.reduce((a, b) => (b.length < a.length ? b : a));
            // Si ya era pequeña y pesa menos así, se deja la original
            resolve(scale === 1 && dataUrl.length <= best.length ? dataUrl : best);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}
