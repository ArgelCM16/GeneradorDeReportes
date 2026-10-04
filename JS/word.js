// Exportar a Word (.docx).
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// EXPORTAR A WORD (.docx)
// Un .docx es un ZIP con archivos XML (WordprocessingML). Se arma aquí mismo,
// sin librerías: zipFiles() junta los archivos (sin comprimir) y las
// funciones docx* escriben el XML. Usa el formato del documento (letra,
// interlineado, márgenes, hoja) y los colores de la universidad. El índice es
// un campo de Word: trae los números de página de la vista previa y Word
// ofrece actualizarlos al abrir.
// ==========================================

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * ZIP sin compresión. files: [{ name, data: Uint8Array | string }]
 */
function zipFiles(files, mimeType = 'application/zip') {
    const encoder = new TextEncoder();
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    const parts = [];
    const central = [];
    let offset = 0;

    files.forEach(file => {
        const name = encoder.encode(file.name);
        const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
        const crc = crc32(data);

        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true);
        local.setUint16(6, 0x0800, true); // nombres en UTF-8
        local.setUint16(8, 0, true);      // sin compresión
        local.setUint16(10, dosTime, true);
        local.setUint16(12, dosDate, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, data.length, true);
        local.setUint32(22, data.length, true);
        local.setUint16(26, name.length, true);
        local.setUint16(28, 0, true);
        parts.push(new Uint8Array(local.buffer), name, data);

        const entry = new DataView(new ArrayBuffer(46));
        entry.setUint32(0, 0x02014b50, true);
        entry.setUint16(4, 20, true);
        entry.setUint16(6, 20, true);
        entry.setUint16(8, 0x0800, true);
        entry.setUint16(10, 0, true);
        entry.setUint16(12, dosTime, true);
        entry.setUint16(14, dosDate, true);
        entry.setUint32(16, crc, true);
        entry.setUint32(20, data.length, true);
        entry.setUint32(24, data.length, true);
        entry.setUint16(28, name.length, true);
        entry.setUint32(42, offset, true);
        central.push(new Uint8Array(entry.buffer), name);

        offset += 30 + name.length + data.length;
    });

    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: mimeType });
}

function xmlText(text) {
    return String(text === undefined || text === null ? '' : text)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Color de la universidad en hexadecimal para Word ("1E3A8A").
 */
function docxColor(color, fallback) {
    const value = String(color || '').trim();
    let m = /^#?([0-9a-f]{6})$/i.exec(value);
    if (m) return m[1].toUpperCase();
    m = /^#?([0-9a-f]{3})$/i.exec(value);
    if (m) return m[1].split('').map(c => c + c).join('').toUpperCase();
    return fallback;
}

function docxRunProps(props) {
    let x = '';
    if (props.font) x += `<w:rFonts w:ascii="${xmlText(props.font)}" w:hAnsi="${xmlText(props.font)}" w:cs="${xmlText(props.font)}"/>`;
    if (props.b) x += '<w:b/><w:bCs/>';
    if (props.i) x += '<w:i/><w:iCs/>';
    if (props.color) x += `<w:color w:val="${props.color}"/>`;
    if (props.size) x += `<w:sz w:val="${Math.round(props.size * 2)}"/><w:szCs w:val="${Math.round(props.size * 2)}"/>`;
    if (props.u) x += '<w:u w:val="single"/>';
    return x ? `<w:rPr>${x}</w:rPr>` : '';
}

/**
 * Un "run" de texto con formato. \n = salto de línea, \t = tabulador.
 */
function docxRun(text, props = {}) {
    const inner = String(text === undefined || text === null ? '' : text).split('\n').map((line, i) =>
        (i ? '<w:br/>' : '') + line.split('\t').map((piece, j) =>
            (j ? '<w:tab/>' : '') + (piece ? `<w:t xml:space="preserve">${xmlText(piece)}</w:t>` : '')).join('')).join('');
    return inner ? `<w:r>${docxRunProps(props)}${inner}</w:r>` : '';
}

function docxParagraph(content, o = {}) {
    let pPr = '';
    if (o.style) pPr += `<w:pStyle w:val="${o.style}"/>`;
    if (o.keepNext) pPr += '<w:keepNext/>';
    if (o.numId) pPr += `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${o.numId}"/></w:numPr>`;
    if (o.borderBottom) pPr += `<w:pBdr><w:bottom w:val="single" w:sz="${o.borderBottom.size || 8}" w:space="4" w:color="${o.borderBottom.color}"/></w:pBdr>`;
    if (o.tabs) pPr += `<w:tabs>${o.tabs.map(t => `<w:tab w:val="${t.val}"${t.leader ? ` w:leader="${t.leader}"` : ''} w:pos="${t.pos}"/>`).join('')}</w:tabs>`;
    if (o.spacing) {
        const sp = o.spacing;
        pPr += `<w:spacing${sp.before !== undefined ? ` w:before="${sp.before}"` : ''}${sp.after !== undefined ? ` w:after="${sp.after}"` : ''}${sp.line !== undefined ? ` w:line="${sp.line}" w:lineRule="auto"` : ''}/>`;
    }
    if (o.ind) {
        const ind = o.ind;
        pPr += `<w:ind${ind.left !== undefined ? ` w:left="${ind.left}"` : ''}${ind.hanging !== undefined ? ` w:hanging="${ind.hanging}"` : ''}${ind.firstLine !== undefined ? ` w:firstLine="${ind.firstLine}"` : ''}/>`;
    }
    if (o.align) pPr += `<w:jc w:val="${o.align}"/>`;
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${content || ''}</w:p>`;
}

/**
 * HTML de una línea (negritas, cursivas, subrayado, <br> y citas) -> runs.
 */
function docxRunsFromHtml(html, base = {}) {
    const doc = document.implementation.createHTMLDocument('');
    const root = doc.createElement('div');
    root.innerHTML = String(html || '').trim();
    const walk = (node, props) => Array.from(node.childNodes).map(n => {
        if (n.nodeType === 3) return docxRun(n.nodeValue.replace(/\s+/g, ' '), props);
        if (n.nodeType !== 1) return '';
        if (n.tagName === 'BR') return '<w:r><w:br/></w:r>';
        if (n.hasAttribute('data-cite')) return docxRun(getCitationText(n.getAttribute('data-cite')), props);
        const next = { ...props };
        if (n.tagName === 'B' || n.tagName === 'STRONG') next.b = true;
        if (n.tagName === 'I' || n.tagName === 'EM') next.i = true;
        if (n.tagName === 'U') next.u = true;
        return walk(n, next);
    }).join('');
    return walk(root, base);
}

/**
 * Bytes, tipo y medidas de una imagen (data URL o dirección web). Los
 * formatos que Word no abre (SVG, WebP...) se pasan a PNG. null si no se
 * pudo leer (por ejemplo, un logo de otro sitio que no lo permite).
 */
async function loadImageForDocx(src) {
    if (!src) return null;
    try {
        let blob;
        const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(src);
        if (match) {
            const raw = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xFF;
            blob = new Blob([bytes], { type: match[1] || 'image/png' });
        } else {
            const response = await fetch(src, { mode: 'cors' });
            if (!response.ok) return null;
            blob = await response.blob();
        }
        const url = URL.createObjectURL(blob);
        try {
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = url;
            });
            const w = img.naturalWidth || 300;
            const h = img.naturalHeight || 150;
            let type = blob.type;
            if (!['image/png', 'image/jpeg', 'image/gif'].includes(type)) {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (!blob) return null;
                type = 'image/png';
            }
            return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: type === 'image/jpeg' ? 'jpeg' : type.split('/')[1], w, h };
        } finally {
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        return null;
    }
}

/**
 * Arma el .docx del documento actual (Blob). Lo usa exportDOCX().
 */
async function buildDocx() {
    const f = getDocumentFormat();
    const paper = PAPER_SIZES[f.paper];
    const font = DOC_FONTS[f.font].word;
    const size = f.size;
    const pageW = Math.round(paper.w * 1440);
    const pageH = Math.round(paper.h * 1440);
    const margin = Math.round(f.margin * 566.93);
    const contentW = pageW - 2 * margin;           // twips
    const contentEmu = contentW * 635;             // 1 twip = 635 EMU
    const maxImageEmu = 6480000;                   // 18 cm, como en la hoja
    const bodyAlign = f.align === 'justify' ? 'both' : 'left';
    const bodyInd = f.indent ? { firstLine: 720 } : null;

    const themeId = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
    const uni = getUniversityById(themeId) || getUniversityById('generic') || {};
    const colors = uni.color || {};
    const primary = docxColor(colors.primary, '1F2937');
    const secondary = docxColor(colors.secondary, '6B7280');

    // ---------- Imágenes ----------
    const media = [];
    let drawingId = 0;
    const imageRun = async (src, maxW, maxH) => {
        const image = await loadImageForDocx(src);
        if (!image) return '';
        const n = media.length + 1;
        media.push({ name: `word/media/image${n}.${image.ext}`, data: image.bytes, ext: image.ext, rid: `rIdImg${n}` });
        let cx = image.w * 9525;
        let cy = image.h * 9525;
        const scale = Math.min(1, maxW / cx, maxH / cy);
        cx = Math.round(cx * scale);
        cy = Math.round(cy * scale);
        drawingId++;
        return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
            `<wp:docPr id="${drawingId}" name="Imagen ${drawingId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
            `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>` +
            `<pic:nvPicPr><pic:cNvPr id="${drawingId}" name="image${n}.${image.ext}"/><pic:cNvPicPr/></pic:nvPicPr>` +
            `<pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
            `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
            `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    };

    // ---------- Listas ----------
    const orderedLists = []; // un numId por lista numerada (cada una empieza en 1)

    // ---------- Contenido ----------
    const body = [];
    const header = getHeaderData() || {};
    const show = key => isHeaderFieldShown(key);
    const lbl = key => getHeaderFieldLabel(key, 'preview');
    const labelRun = text => docxRun(text, { b: true });
    const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    let hasCover = false;
    let hasToc = false;
    let figure = 0;
    let table = 0;
    let refNumber = 0;
    const tocAnchors = getTocAnchors();
    const preview = document.getElementById('preview-container');
    const tocPage = anchor => {
        const target = preview && preview.querySelector(`[data-toc-anchor="${anchor}"]`);
        const page = target && target.closest('.preview-page');
        return page ? page.dataset.page : '';
    };

    const logosParagraph = async (alignCenter) => {
        if (!header.includeLogo || !(uni.logoLeft || uni.logoRight)) return '';
        const left = uni.logoLeft ? await imageRun(uni.logoLeft, 952500, 762000) : '';
        const right = uni.logoRight ? await imageRun(uni.logoRight, 952500, 762000) : '';
        if (!left && !right) return '';
        return docxParagraph(`${left}<w:r><w:tab/></w:r>${right}`, {
            tabs: [{ val: 'right', pos: contentW }], spacing: { after: 240 }, align: alignCenter ? undefined : undefined
        });
    };

    for (const block of reportData) {
        switch (block.type) {
            case 'header': {
                const people = getHeaderPeople(header);
                const showIds = show('studentId');
                if (header.coverMode) {
                    hasCover = true;
                    const center = { align: 'center', spacing: { after: 120 } };
                    body.push(await logosParagraph(true));
                    if (show('institution') && uni.id !== 'generic' && uni.name) {
                        body.push(docxParagraph(docxRun(uni.name, { b: true, color: primary, size: size * 1.4 }), { align: 'center', spacing: { before: 600, after: 120 } }));
                    }
                    if (show('career') && header.career) body.push(docxParagraph(docxRun(header.career, { size: size * 1.15 }), center));
                    const task = String(header.taskName || '').trim() || '[Nombre de la tarea]';
                    body.push(docxParagraph(docxRun(task, { b: true, color: primary, size: size * 2.2 }), { align: 'center', spacing: { before: 2400, after: 2400, line: 240 } }));
                    const row = (key, value) => (show(key) && value)
                        ? body.push(docxParagraph(labelRun(`${lbl(key)}: `) + docxRun(value), center)) : null;
                    row('subject', header.subject);
                    row('prof', header.prof);
                    if (header.isTeam) {
                        body.push(docxParagraph(labelRun('Integrantes:'), center));
                        (people.length ? people : [{ name: '[Nombre del alumno]', id: '' }]).forEach(person => {
                            body.push(docxParagraph(docxRun(person.name + (showIds && person.id ? ` (${person.id})` : '')), { align: 'center', spacing: { after: 40 } }));
                        });
                    } else {
                        const person = people[0] || { name: '[Nombre del alumno]', id: '' };
                        body.push(docxParagraph(labelRun('Alumno: ') + docxRun(person.name), center));
                        if (showIds && person.id) body.push(docxParagraph(labelRun(`${lbl('studentId')}: `) + docxRun(person.id), center));
                    }
                    row('group', header.group);
                    row('term', formatTerm(header.term));
                    if (show('date') && header.date) body.push(docxParagraph(docxRun(formatLongDate(header.date)), { align: 'center', spacing: { before: 1800 } }));
                    body.push(pageBreak);
                    break;
                }

                const line = { spacing: { after: 60, line: 276 } };
                body.push(await logosParagraph(false));
                if (show('institution')) body.push(docxParagraph(labelRun(`${lbl('institution')}: `) + docxRun(uni.name || ''), line));
                if (show('career') && header.career) body.push(docxParagraph(labelRun(`${lbl('career')}: `) + docxRun(header.career), line));
                const termText = show('term') && header.term ? formatTerm(header.term) : '';
                if (show('subject')) body.push(docxParagraph(labelRun(`${lbl('subject')}: `) + docxRun(`${header.subject || ''}${termText ? ` (${termText})` : ''}`), line));
                else if (termText) body.push(docxParagraph(labelRun(`${lbl('term')}: `) + docxRun(termText), line));
                if (show('prof')) body.push(docxParagraph(labelRun(`${lbl('prof')}: `) + docxRun(header.prof || ''), line));
                let peopleRuns;
                if (header.isTeam) {
                    peopleRuns = labelRun('Integrantes: ') + docxRun(people.map(p => p.name + (showIds && p.id ? ` (${p.id})` : '')).join(', '));
                } else {
                    const person = people[0] || { name: '', id: '' };
                    peopleRuns = labelRun('Alumno: ') + docxRun(person.name) +
                        (showIds && person.id ? docxRun(' | ') + labelRun(`${lbl('studentId')}: `) + docxRun(person.id) : '');
                }
                if (show('group') && header.group) peopleRuns += docxRun(' | ') + labelRun(`${lbl('group')}: `) + docxRun(header.group);
                body.push(docxParagraph(peopleRuns, line));
                if (show('date')) body.push(docxParagraph(labelRun(`${lbl('date')}: `) + docxRun(header.date || ''), line));
                body.push(docxParagraph('', { borderBottom: { color: primary, size: 12 }, spacing: { after: 360 } }));
                break;
            }

            case 'toc': {
                hasToc = true;
                body.push(docxParagraph(docxRun((block.content || '').trim() || 'Índice', { b: true, color: primary, size: size * 1.6 }), { align: 'center', spacing: { after: 360 } }));
                const entries = reportData.filter(b => tocAnchors.has(b.id));
                const tabs = [{ val: 'right', leader: 'dot', pos: contentW }];
                const begin = '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>';
                const end = '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
                if (!entries.length) {
                    body.push(docxParagraph(begin + docxRun('Agrega títulos o subtítulos y actualiza el índice.', { i: true }) + end));
                } else {
                    entries.forEach((entry, i) => {
                        const runs = docxRun(entry.content.trim()) + '<w:r><w:tab/></w:r>' + docxRun(tocPage(tocAnchors.get(entry.id)));
                        body.push(docxParagraph((i === 0 ? begin : '') + runs + (i === entries.length - 1 ? end : ''), {
                            style: entry.type === 'title' ? 'TOC1' : 'TOC2', tabs
                        }));
                    });
                }
                body.push(pageBreak);
                break;
            }

            case 'title':
                body.push(docxParagraph(docxRun(block.content || ''), { style: 'Heading1' }));
                break;

            case 'subtitle':
                body.push(docxParagraph(docxRun(block.content || ''), { style: 'Heading2' }));
                break;

            case 'text': {
                const doc = document.implementation.createHTMLDocument('');
                const root = doc.createElement('div');
                root.innerHTML = getRichHtml(block);
                Array.from(root.children).forEach(el => {
                    if (el.tagName === 'UL' || el.tagName === 'OL') {
                        let numId = 1;
                        if (el.tagName === 'OL') {
                            numId = 2 + orderedLists.length;
                            orderedLists.push(numId);
                        }
                        Array.from(el.children).forEach(li => {
                            body.push(docxParagraph(docxRunsFromHtml(li.innerHTML), { numId, align: bodyAlign, spacing: { after: 80 } }));
                        });
                    } else {
                        body.push(docxParagraph(docxRunsFromHtml(el.innerHTML), { align: bodyAlign, ind: bodyInd }));
                    }
                });
                break;
            }

            case 'image': {
                figure++;
                const picture = block.content ? await imageRun(block.content, contentEmu, maxImageEmu) : '';
                body.push(docxParagraph(picture || docxRun('[Imagen no seleccionada]', { i: true }), { align: 'center', keepNext: true, spacing: { before: 240, after: 120 } }));
                body.push(docxParagraph(docxRun(`Figura ${figure}: `, { b: true }) + docxRun(block.caption || ''), { style: 'Caption', align: 'center' }));
                break;
            }

            case 'table': {
                table++;
                const data = block.tableData || [];
                if (!data.length) break;
                const cols = Math.max(1, Math.min(6, block.columns || (data[0] || []).length || 1));
                const colW = Math.floor(contentW / cols);
                const cell = (text, isHeader, last) => `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>` +
                    (isHeader ? '<w:tcBorders><w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/></w:tcBorders>' : '') +
                    `<w:vAlign w:val="center"/></w:tcPr>` +
                    docxParagraph(docxRun(text, { size: size * (isHeader ? 0.9 : 0.85) }), { align: 'center', spacing: { before: 60, after: 60, line: 260 } }) + '</w:tc>';
                const rows = data.map((row, r) => {
                    const cells = [];
                    for (let c = 0; c < cols; c++) cells.push(cell((row || [])[c] || '', r === 0, r === data.length - 1));
                    return `<w:tr>${r === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>'}${cells.join('')}</w:tr>`;
                }).join('');
                body.push(`<w:tbl><w:tblPr><w:tblW w:w="${contentW}" w:type="dxa"/><w:jc w:val="center"/>` +
                    `<w:tblBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/></w:tblBorders>` +
                    `<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar>` +
                    `<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr>` +
                    `<w:tblGrid>${Array.from({ length: cols }, () => `<w:gridCol w:w="${colW}"/>`).join('')}</w:tblGrid>${rows}</w:tbl>`);
                body.push(docxParagraph(docxRun(`Tabla ${table}: `, { b: true }) + docxRun(block.caption || ''), { style: 'Caption' }));
                break;
            }

            case 'code': {
                const lines = codeTokenLines(block.content, getCodeLanguage(block));
                const digits = String(lines.length).length;
                lines.forEach((tokens, i) => {
                    const number = block.lineNumbers ? docxRun(String(i + 1).padStart(digits, ' ') + '  ', { color: '94A3B8' }) : '';
                    const runs = tokens.map(token => docxRun(token.v.replace(/\t/g, '    '), {
                        color: CODE_TOKEN_COLORS[token.t], i: token.t === 'com'
                    })).join('');
                    body.push(docxParagraph(number + runs, {
                        style: 'Codigo', spacing: i === 0 ? { before: 240 } : (i === lines.length - 1 ? { after: 240 } : undefined)
                    }));
                });
                break;
            }

            case 'ref': {
                if (!block.refData) break;
                refNumber++;
                const r = block.refData;
                if (getCitationStyle() === 'apa') {
                    body.push(docxParagraph(docxRunsFromHtml(formatAPAReference(block.refType, r.author, r.title, r.source, r.year, r.url)), {
                        ind: { left: 720, hanging: 720 }, align: 'left', spacing: { after: 160 }
                    }));
                } else {
                    body.push(docxParagraph(docxRun(`[${refNumber}]`, { b: true, color: primary }) + '<w:r><w:tab/></w:r>' +
                        docxRunsFromHtml(formatIEEEReference(block.refType, r.author, r.title, r.source, r.year, r.url)), {
                        tabs: [{ val: 'left', pos: 720 }], ind: { left: 720, hanging: 720 }, align: 'left', spacing: { after: 160 }
                    }));
                }
                break;
            }

            case 'ai': {
                if (!block.aiData) break;
                const ai = block.aiData;
                const studentName = getHeaderStudentName(header) || '[Nombre del estudiante]';
                if (block.aiUsed === 'no') {
                    const name = ai.name || studentName;
                    body.push(docxParagraph(docxRunsFromHtml(`Yo, <b>${escapeHtml(name)}</b>, declaro que <b>NO</b> he utilizado herramientas de Inteligencia Artificial para la elaboración de este trabajo académico. Afirmo que cuento con evidencias físicas y/o digitales que demuestran mi autoría, incluyendo pero no limitándose a: documentos manuscritos, materiales impresos con anotaciones o subrayado, historial de versiones de documentos electrónicos, o commits en repositorios de código.`), { align: bodyAlign, spacing: { before: 480 } }));
                    body.push(docxParagraph(docxRun('Reconozco y acepto que el profesor se reserva el derecho de solicitar dichas evidencias en cualquier momento, especialmente cuando existan sospechas o se detecten conductas que atenten contra la integridad académica, tales como plagio o uso no reportado de herramientas de IA.'), { align: bodyAlign }));
                } else {
                    const line = (label, value) => body.push(docxParagraph(labelRun(`${label}: `) + docxRun(value || ''), { spacing: { after: 80 } }));
                    line('Nombre del estudiante', ai.name || studentName);
                    line('IA utilizada', ai.aiTool);
                    line('Fecha de uso', ai.date);
                    line('Propósito', ai.purpose);
                    body.push(docxParagraph(labelRun('Prompt utilizado:'), { spacing: { before: 240, after: 80 }, keepNext: true }));
                    String(ai.prompt || '').split('\n').forEach(l => body.push(docxParagraph(docxRun(l), { style: 'Codigo' })));
                    if (ai.attachments) line('Archivos suministrados', ai.attachments);
                    body.push(docxParagraph(labelRun('Respuesta en crudo (raw):'), { spacing: { before: 240, after: 80 }, keepNext: true }));
                    String(ai.rawResponse || '').split('\n').forEach(l => body.push(docxParagraph(docxRun(l), { style: 'Codigo' })));
                }
                break;
            }
        }
    }

    const sectPr = `<w:sectPr>${f.pageNumbers ? '<w:footerReference w:type="default" r:id="rIdFooter1"/>' : ''}` +
        `<w:pgSz w:w="${pageW}" w:h="${pageH}"/>` +
        `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="708" w:footer="567" w:gutter="0"/>` +
        `${hasCover ? '<w:titlePg/>' : ''}</w:sectPr>`;

    const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        `<w:body>${body.filter(Boolean).join('')}${sectPr}</w:body></w:document>`;

    const half = n => Math.round(n * 2);
    const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${xmlText(font)}" w:hAnsi="${xmlText(font)}" w:eastAsia="${xmlText(font)}" w:cs="${xmlText(font)}"/>` +
        `<w:sz w:val="${half(size)}"/><w:szCs w:val="${half(size)}"/><w:lang w:val="es-MX" w:eastAsia="es-MX" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>` +
        `<w:pPrDefault><w:pPr><w:spacing w:after="240" w:line="${Math.round(f.lineHeight * 240)}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
        '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>' +
        `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>` +
        `<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="480" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr>` +
        `<w:rPr><w:b/><w:bCs/><w:color w:val="${primary}"/><w:sz w:val="${half(size * 2.2)}"/><w:szCs w:val="${half(size * 2.2)}"/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:unhideWhenUsed/><w:qFormat/>` +
        `<w:pPr><w:keepNext/><w:keepLines/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="${secondary}"/></w:pBdr><w:spacing w:before="360" w:after="200" w:line="240" w:lineRule="auto"/><w:outlineLvl w:val="1"/></w:pPr>` +
        `<w:rPr><w:b/><w:bCs/><w:color w:val="${primary}"/><w:sz w:val="${half(size * 1.5)}"/><w:szCs w:val="${half(size * 1.5)}"/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="35"/><w:unhideWhenUsed/><w:qFormat/>` +
        `<w:pPr><w:spacing w:before="120" w:after="360" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="6C757D"/><w:sz w:val="${half(size * 0.9)}"/><w:szCs w:val="${half(size * 0.9)}"/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:customStyle="1" w:styleId="Codigo"><w:name w:val="Código"/><w:basedOn w:val="Normal"/><w:qFormat/>` +
        `<w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="${secondary}"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F8F9FA"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="240"/><w:jc w:val="left"/></w:pPr>` +
        `<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Courier New"/><w:noProof/><w:sz w:val="${half(size * 0.8)}"/><w:szCs w:val="${half(size * 0.8)}"/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/>` +
        `<w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:b/><w:bCs/></w:rPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="TOC2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/>` +
        `<w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/><w:ind w:left="440"/></w:pPr></w:style>` +
        `<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/>` +
        `<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="64748B"/><w:sz w:val="${half(size * 0.85)}"/><w:szCs w:val="${half(size * 0.85)}"/></w:rPr></w:style>` +
        '</w:styles>';

    const lvl = (fmt, text) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>`;
    const numberingXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>${lvl('bullet', '•')}</w:abstractNum>` +
        `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>${lvl('decimal', '%1.')}</w:abstractNum>` +
        '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
        orderedLists.map(id => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('') +
        '</w:numbering>';

    const settingsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:defaultTabStop w:val="708"/>' + (hasToc ? '<w:updateFields w:val="true"/>' : '') +
        '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
        '</w:settings>';

    const footerXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' +
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';

    const rel = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
    const documentRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        rel('rIdStyles', 'styles', 'styles.xml') + rel('rIdNumbering', 'numbering', 'numbering.xml') +
        rel('rIdSettings', 'settings', 'settings.xml') + rel('rIdFooter1', 'footer', 'footer1.xml') +
        media.map(m => rel(m.rid, 'image', m.name.replace('word/', ''))).join('') +
        '</Relationships>';

    const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '</Relationships>';

    const authors = getHeaderPeople(header).map(person => person.name).join(', ');
    const nowIso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const coreXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        `<dc:title>${xmlText(getDocumentName() || DEFAULT_DOCUMENT_NAME)}</dc:title><dc:creator>${xmlText(authors)}</dc:creator>` +
        `<dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>` +
        '</cp:coreProperties>';

    const exts = Array.from(new Set(media.map(m => m.ext)));
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        exts.map(ext => `<Default Extension="${ext}" ContentType="image/${ext}"/>`).join('') +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '</Types>';

    return zipFiles([
        { name: '[Content_Types].xml', data: contentTypes },
        { name: '_rels/.rels', data: rootRels },
        { name: 'docProps/core.xml', data: coreXml },
        { name: 'word/document.xml', data: documentXml },
        { name: 'word/styles.xml', data: stylesXml },
        { name: 'word/numbering.xml', data: numberingXml },
        { name: 'word/settings.xml', data: settingsXml },
        { name: 'word/footer1.xml', data: footerXml },
        { name: 'word/_rels/document.xml.rels', data: documentRels },
        ...media.map(m => ({ name: m.name, data: m.data }))
    ], DOCX_MIME);
}

/**
 * Botón "Word": descarga el documento como .docx.
 */
async function exportDOCX() {
    const buttons = document.querySelectorAll('.btn-word, .preview-docx-link');
    buttons.forEach(b => { b.disabled = true; });
    try {
        renderPreview(); // números de página del índice al día
        const blob = await buildDocx();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${getSafeFileName()}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (error) {
        console.error('Error al exportar a Word:', error);
        alert('No se pudo crear el archivo de Word: ' + error.message);
    } finally {
        buttons.forEach(b => { b.disabled = false; });
    }
}
