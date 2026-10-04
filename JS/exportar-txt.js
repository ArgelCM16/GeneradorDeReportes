// Exportar a TXT.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// FUNCIONES DE EXPORTACIÓN
// ============================================================================

/**
 * Exporta el reporte como archivo de texto plano
 */
function exportTXT() {
    let textContent = "";
    let figureCount = 0;
    let tableCount = 0;
    let refCount = 0;

    textContent += "=".repeat(60) + "\n";
    textContent += "REPORTE ACADÉMICO - EXPORTACIÓN TXT\n";
    textContent += "=".repeat(60) + "\n\n";

    // 1. Obtener los datos del encabezado desde el LocalStorage
    const savedHeader = getHeaderData() || {};

    reportData.forEach(block => {
        switch(block.type) {
            case 'header': {
                // La institución se deriva del tema/universidad seleccionado, no de savedHeader
                const exportThemeId = (localStorage.getItem('selectedTheme') || 'generic').replace(/['"]+/g, '');
                const exportUni = getUniversityById(exportThemeId) || getUniversityById('generic') || {};
                const show = key => isHeaderFieldShown(key);
                const lbl = key => getHeaderFieldLabel(key, 'preview');
                const people = getHeaderPeople(savedHeader);
                const peopleText = people
                    .map(p => p.name + (show('studentId') && p.id ? ` (${p.id})` : ''))
                    .join(', ');

                if (savedHeader.coverMode) {
                    textContent += `PORTADA\n`;
                    textContent += `-`.repeat(40) + "\n";
                    if (show('institution') && exportUni.id && exportUni.id !== 'generic') textContent += `${exportUni.name}\n`;
                    if (show('career') && savedHeader.career) textContent += `${savedHeader.career}\n`;
                    textContent += `\n${(savedHeader.taskName || '').trim() || '[Nombre de la tarea]'}\n\n`;
                    if (show('subject') && savedHeader.subject) textContent += `${lbl('subject')}: ${savedHeader.subject}\n`;
                    if (show('prof') && savedHeader.prof) textContent += `${lbl('prof')}: ${savedHeader.prof}\n`;
                    textContent += `${savedHeader.isTeam ? 'Integrantes' : 'Alumno'}: ${peopleText || 'N/A'}\n`;
                    if (show('group') && savedHeader.group) textContent += `${lbl('group')}: ${savedHeader.group}\n`;
                    if (show('term') && savedHeader.term) textContent += `${lbl('term')}: ${formatTerm(savedHeader.term)}\n`;
                    if (show('date') && savedHeader.date) textContent += `${formatLongDate(savedHeader.date)}\n`;
                    textContent += `\n`;
                    break;
                }

                textContent += `DATOS DEL ESTUDIANTE\n`;
                textContent += `-`.repeat(40) + "\n";
                if (show('institution')) textContent += `${lbl('institution')}: ${exportUni.name || 'N/A'}\n`;
                if (show('career') && savedHeader.career) textContent += `${lbl('career')}: ${savedHeader.career}\n`;
                if (show('subject')) textContent += `${lbl('subject')}: ${savedHeader.subject || 'N/A'}${show('term') ? ` (${formatTerm(savedHeader.term) || 'N/A'})` : ''}\n`;
                else if (show('term') && savedHeader.term) textContent += `${lbl('term')}: ${formatTerm(savedHeader.term)}\n`;
                if (show('prof')) textContent += `${lbl('prof')}: ${savedHeader.prof || 'N/A'}\n`;
                textContent += `${savedHeader.isTeam ? 'Integrantes' : 'Alumno'}: ${peopleText || 'N/A'}${show('group') ? ` | ${lbl('group')}: ${savedHeader.group || 'N/A'}` : ''}\n`;
                if (show('date')) textContent += `${lbl('date')}: ${savedHeader.date || 'N/A'}\n`;
                textContent += `\n`;
                break;
            }

            case 'toc': {
                textContent += `${((block.content || '').trim() || 'Índice').toUpperCase()}\n`;
                textContent += `-`.repeat(40) + "\n";
                reportData.forEach(b => {
                    if ((b.type === 'title' || b.type === 'subtitle') && (b.content || '').trim()) {
                        textContent += `${b.type === 'subtitle' ? '    ' : ''}${b.content.trim()}\n`;
                    }
                });
                textContent += `\n`;
                break;
            }

            case 'title':
                textContent += `\n${"=".repeat(60)}\n`;
                textContent += `${block.content.toUpperCase()}\n`;
                textContent += `${"=".repeat(60)}\n\n`;
                break;
            
            case 'subtitle':
                textContent += `\n${"-".repeat(40)}\n`;
                textContent += `${block.content}\n`;
                textContent += `${"-".repeat(40)}\n\n`;
                break;
            
            case 'text':
                textContent += `${richHtmlToPlainText(getRichHtml(block))}\n\n`;
                break;
            
            case 'code':
                textContent += `\n[INICIO DE CÓDIGO]\n`;
                textContent += `${"-".repeat(40)}\n`;
                textContent += `${block.content}\n`;
                textContent += `${"-".repeat(40)}\n`;
                textContent += `[FIN DE CÓDIGO]\n\n`;
                break;
            
            case 'image':
                figureCount++;
                textContent += `\n[FIGURA ${figureCount}]\n`;
                textContent += `Descripción: ${block.caption || 'Sin descripción'}\n`;
                textContent += `(La imagen no puede ser exportada a formato TXT)\n\n`;
                break;
            
            case 'table':
                tableCount++;
                textContent += `\n[TABLA ${tableCount}]\n`;
                textContent += `${"-".repeat(60)}\n`;
                
                if (block.tableData && block.tableData.length > 0) {
                    const cols = block.columns || block.tableData[0].length;
                    const colWidths = [];
                    const MAX_COL_WIDTH = 30;
                
                    for (let col = 0; col < cols; col++) {
                        let maxWidth = 10;
                        for (let row = 0; row < block.tableData.length; row++) {
                            const cellContent = String(block.tableData[row][col] || '');
                            maxWidth = Math.max(maxWidth, Math.min(cellContent.length, MAX_COL_WIDTH));
                        }
                        colWidths.push(maxWidth);
                    }
                
                    const wrapText = (text, width) => {
                        const lines = [];
                        const str = String(text || '');
                        for (let i = 0; i < str.length; i += width) {
                            lines.push(str.substring(i, i + width));
                        }
                        return lines.length > 0 ? lines : [''];
                    };
                
                    const pad = (str, width) => {
                        return str + ' '.repeat(Math.max(0, width - str.length));
                    };
                
                    for (let row = 0; row < block.tableData.length; row++) {
                        const cellLines = [];
                        let maxLinesInRow = 1;
                
                        for (let col = 0; col < cols; col++) {
                            const wrapped = wrapText(block.tableData[row][col], colWidths[col]);
                            cellLines.push(wrapped);
                            maxLinesInRow = Math.max(maxLinesInRow, wrapped.length);
                        }
                
                        for (let l = 0; l < maxLinesInRow; l++) {
                            let line = '| ';
                            for (let col = 0; col < cols; col++) {
                                const content = cellLines[col][l] || '';
                                line += pad(content, colWidths[col]) + ' | ';
                            }
                            textContent += line + '\n';
                        }

                        let separator = '+-';
                        for (let col = 0; col < cols; col++) {
                            separator += '-'.repeat(colWidths[col]) + '-+-';
                        }
                        textContent += separator + '\n';
                    }
                }
                
                textContent += `${"-".repeat(60)}\n`;
                textContent += `Descripción: ${block.caption || 'Sin descripción'}\n\n`;
                break;
            
            case 'ref':
                if (block.refData) {
                    refCount++;
                    const { author, title, source, year, url } = block.refData;
                    if (getCitationStyle() === 'apa') {
                        textContent += `\n${formatAPAReference(block.refType, author, title, source, year, url, false)}\n`;
                        break;
                    }
                    textContent += `\n[${refCount}] `;
                    
                    if (block.refType === 'book') {
                        textContent += `${author}, "${title}". ${source}, ${year}.`;
                    } else if (block.refType === 'web') {
                        textContent += `${author}, "${title}", ${source}, ${year}. [En línea]. Disponible: ${url}`;
                    } else {
                        textContent += `${author}, "${title}", ${source}, ${year}.`;
                    }
                    textContent += `\n`;
                }
                break;
            
            case 'ai':
                if (block.aiData) {
                    const ai = block.aiData;
                    // Nombre(s) del alumno tomados del encabezado
                    const studentName = getHeaderStudentName(savedHeader) || '[Nombre del estudiante]';
                    
                    textContent += `\n${"=".repeat(60)}\n`;
                    textContent += `DECLARACIÓN DE USO DE INTELIGENCIA ARTIFICIAL\n`;
                    textContent += `${"=".repeat(60)}\n\n`;
                    
                    if (block.aiUsed === 'no') {
                        const declarantName = ai.name || studentName;
                        textContent += `Yo, ${declarantName}, declaro que NO he utilizado herramientas de\n`;
                        textContent += `Inteligencia Artificial para la elaboración de este trabajo académico.\n\n`;
                        textContent += `Afirmo que cuento con evidencias físicas y/o digitales que demuestran\n`;
                        textContent += `mi autoría, incluyendo: documentos manuscritos, materiales impresos con\n`;
                        textContent += `anotaciones o subrayado, historial de versiones de documentos electrónicos,\n`;
                        textContent += `o commits en repositorios de código.\n\n`;
                        textContent += `Reconozco que el profesor se reserva el derecho de solicitar dichas\n`;
                        textContent += `evidencias cuando existan sospechas o se detecten conductas que atenten\n`;
                        textContent += `contra la integridad académica.\n\n`;
                    } else {
                        textContent += `Estudiante: ${ai.name || studentName}\n`;
                        textContent += `IA utilizada: ${ai.aiTool}\n`;
                        textContent += `Fecha: ${ai.date}\n`;
                        textContent += `Propósito: ${ai.purpose}\n\n`;
                        textContent += `Prompt utilizado:\n`;
                        textContent += `${"-".repeat(40)}\n`;
                        textContent += `${ai.prompt}\n`;
                        textContent += `${"-".repeat(40)}\n\n`;
                        if (ai.attachments) {
                            textContent += `Archivos suministrados: ${ai.attachments}\n\n`;
                        }
                        textContent += `Respuesta en crudo:\n`;
                        textContent += `${"-".repeat(40)}\n`;
                        textContent += `${ai.rawResponse}\n`;
                        textContent += `${"-".repeat(40)}\n\n`;
                    }
                }
                break;
        }
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${getSafeFileName()}.txt`;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
}
