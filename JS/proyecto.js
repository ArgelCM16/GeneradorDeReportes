// Guardar y cargar proyecto (JSON).
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// GUARDAR Y CARGAR PROYECTO (JSON)
// ============================================================================

/**
 * Guarda el proyecto completo como archivo JSON
 * Permite al usuario descargar su trabajo y continuarlo después
 */
function saveJSON() {
    try {
        // Convertir el proyecto completo a JSON con formato legible
        const jsonString = buildProjectJSON();

        // Crear Blob
        const blob = new Blob([jsonString], { type: 'application/json' });

        // El archivo se llama como el documento
        const filename = `${getSafeFileName()}.json`;

        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        // Simular click para descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Liberar memoria
        URL.revokeObjectURL(link.href);

        markDocumentSaved();
        console.log('Proyecto guardado:', filename);
        alert('Proyecto guardado exitosamente como ' + filename);

    } catch (error) {
        console.error('Error al guardar proyecto:', error);
        alert('Error al guardar el proyecto. Por favor intenta de nuevo.');
    }
}

/**
 * Reúne todo lo que forma un proyecto: los bloques, el tema, los datos del
 * encabezado y la configuración (universidades, materias, profesores y el
 * vínculo materia → profesor). Así el proyecto se puede abrir en otra
 * computadora o navegador sin perder nada.
 */
function buildProjectData() {
    let headerData = null;
    try {
        headerData = getHeaderData();
    } catch (e) {
        headerData = null;
    }

    return {
        version: '2.1',
        timestamp: new Date().toISOString(),
        theme: document.body.getAttribute('data-theme') || 'generic',
        documentName: getDocumentName(),
        reportData: reportData,
        headerData: headerData,
        citationStyle: getCitationStyle(),
        documentFormat: getDocumentFormat(),
        settings: {
            universities: getUniversities(),
            subjects: getSimpleList('list_subjects'),
            profs: getSimpleList('list_profs'),
            subjectProfMap: getSubjectProfMap(),
            classmates: getClassmates(),
            headerFields: getHeaderFieldConfig(),
            periodType: getPeriodType()
        }
    };
}

/**
 * Integra la configuración de un proyecto con la de este navegador sin borrar
 * nada: añade las universidades, materias, profesores y vínculos que falten.
 * Si algo ya existe aquí, se conserva la versión local.
 */
function mergeProjectSettings(settings) {
    if (!settings || typeof settings !== 'object') return;

    if (Array.isArray(settings.universities)) {
        const universities = getUniversities();
        settings.universities.forEach(u => {
            if (u && u.id && u.name && !universities.some(local => local.id === u.id)) {
                universities.push(u);
            }
        });
        saveUniversities(universities);
    }

    [['list_subjects', settings.subjects], ['list_profs', settings.profs]].forEach(([key, incoming]) => {
        if (!Array.isArray(incoming)) return;
        const list = getSimpleList(key);
        incoming.forEach(item => {
            if (typeof item === 'string' && item.trim() && !list.includes(item)) list.push(item);
        });
        saveSimpleList(key, list);
    });

    // Compañeros: se añaden los que falten
    if (Array.isArray(settings.classmates)) {
        const classmates = getClassmates();
        settings.classmates.forEach(c => {
            if (c && typeof c.name === 'string' && c.name.trim() &&
                !classmates.some(local => local.name === c.name && (local.studentId || '') === (c.studentId || ''))) {
                classmates.push({ name: c.name.trim(), studentId: (c.studentId || '').trim() });
            }
        });
        saveClassmates(classmates);
    }

    // Campos del encabezado y tipo de periodo: solo si aquí no se han configurado
    if (settings.headerFields && typeof settings.headerFields === 'object' && !localStorage.getItem('header_fields')) {
        saveHeaderFieldConfig(settings.headerFields);
    }
    if (PERIOD_TYPES[settings.periodType] && !getProfile().periodType) {
        saveProfile({ ...getProfile(), periodType: settings.periodType });
    }

    if (settings.subjectProfMap && typeof settings.subjectProfMap === 'object') {
        const map = getSubjectProfMap();
        Object.entries(settings.subjectProfMap).forEach(([subject, prof]) => {
            if (!(subject in map) && typeof prof === 'string') map[subject] = prof;
        });
        saveSubjectProfMap(map);
    }
}

/**
 * Aplica un proyecto ya leído (de un archivo o de Google Drive).
 * Los proyectos antiguos (sin headerData/settings) siguen funcionando igual.
 */
function applyProjectData(projectData, fallbackName = '') {
    if (!projectData.reportData || !Array.isArray(projectData.reportData)) {
        throw new Error('Formato de archivo inválido');
    }

    // El proyecto se abre como un documento más de "Mis documentos"
    startNewLibraryDocument();

    // Primero la configuración: el tema del proyecto puede ser una
    // universidad personalizada que todavía no existe en este navegador.
    mergeProjectSettings(projectData.settings);

    if (projectData.headerData && typeof projectData.headerData === 'object') {
        setHeaderData(projectData.headerData);
    }

    if (projectData.citationStyle === 'apa' || projectData.citationStyle === 'ieee') {
        localStorage.setItem('citationStyle', projectData.citationStyle);
    }

    reportData = projectData.reportData;
    setDocumentFormat(projectData.documentFormat || getDefaultDocumentFormat(), false);

    renderThemeSelector();
    if (projectData.theme) {
        changeTheme(projectData.theme);
    }

    setDocumentName(projectData.documentName || fallbackName.replace(/\.json$/i, ''));
    render();
    markDocumentSaved();
    resetUndoHistory();
}

/**
 * Carga un proyecto desde un archivo JSON
 * @param {HTMLInputElement} input - Input file que contiene el JSON
 */
function loadJSON(input) {
    const file = input.files[0];

    if (!file) {
        return;
    }

    // Verificar que sea un archivo JSON
    if (!file.name.endsWith('.json')) {
        alert('Por favor selecciona un archivo JSON válido.');
        input.value = ''; // Limpiar input
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            // Parsear JSON
            const projectData = JSON.parse(e.target.result);

            // Validar estructura básica
            if (!projectData.reportData || !Array.isArray(projectData.reportData)) {
                throw new Error('Formato de archivo inválido');
            }

            // Confirmar carga (advertir que se perderá el trabajo actual)
            const hasCurrentData = reportData.length > 0 && !canKeepInLibrary();
            if (hasCurrentData) {
                const confirm = window.confirm(
                    '¿Estás seguro de cargar este proyecto?\n\n' +
                    'Se perderá el trabajo actual no guardado.\n\n' +
                    'Recomendación: Guarda tu proyecto actual antes de continuar.'
                );

                if (!confirm) {
                    input.value = ''; // Limpiar input
                    return;
                }
            }

            // Cargar bloques, encabezado, configuración y tema
            applyProjectData(projectData, file.name);

            // Limpiar input para permitir cargar el mismo archivo de nuevo
            input.value = '';

            console.log('Proyecto cargado exitosamente');
            console.log('- Versión:', projectData.version);
            console.log('- Fecha guardado:', projectData.timestamp);
            console.log('- Bloques cargados:', reportData.length);

            alert(
                'Proyecto cargado exitosamente\n\n' +
                `Bloques: ${reportData.length}\n` +
                `Tema: ${projectData.theme || 'generic'}`
            );

        } catch (error) {
            console.error('Error al cargar proyecto:', error);
            alert(
                'Error al cargar el proyecto\n\n' +
                'El archivo puede estar corrupto o tener un formato incorrecto.\n\n' +
                'Error: ' + error.message
            );
            input.value = ''; // Limpiar input
        }
    };

    reader.onerror = function() {
        alert('Error al leer el archivo. Por favor intenta de nuevo.');
        input.value = ''; // Limpiar input
    };

    // Leer archivo como texto
    reader.readAsText(file);
}
