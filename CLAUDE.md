# CLAUDE.md

Guía del proyecto para Claude Code (y para cualquier persona que vaya a modificarlo).
Para el estado actual, las decisiones tomadas y los planes, lee también [contexto.md](contexto.md).

## Reglas de trabajo

- **Responde siempre en español.** Los comentarios del código, los textos de la interfaz y los mensajes de commit también van en español.
- Rama de trabajo: **`test`**. La rama por defecto (la que muestra GitHub) es **`main`**; los cambios pasan a `main` cuando el usuario lo pide.
- Haz commit o push solo cuando el usuario lo pida.
- Si el usuario pide un cambio "solo de diseño", no toques la lógica de `JS/script.js`: los estilos del rediseño viven en `CSS/redesign.css`.
- Después de cambiar algo, corre las pruebas: `python tests/ejecutar.py` (ver [Cómo probar](#cómo-probar)). Si agregas una función, agrega su prueba en `tests/casos/`.
- **Si cambia qué datos usa la app o con qué servicios se conecta** (nuevos recursos externos, analítica, otro permiso de Google...), actualiza `privacidad.html` (y `terminos.html` si aplica) junto con su fecha de "Última actualización".
- **Si cambias `CSS/*.css` o `JS/script.js`, sube el número `?v=` de sus enlaces en `index.html`** (los tres llevan el mismo, y `legal.css` en `terminos.html` y `privacidad.html` también) **y pon el mismo número en `VERSION` de `sw.js`**. GitHub Pages deja que el navegador guarde esos archivos hasta 10 minutos y el service worker los guarda sin límite; sin cambiar los dos números, el navegador puede mezclar el HTML nuevo con CSS o JS viejos y la página se ve rota (o se queda con la versión vieja).

## Qué es

**Generador de Reportes Académicos**: una aplicación web que corre 100% en el navegador (sin servidor ni build) para armar reportes escolares con bloques (encabezado, título, párrafo, código, imagen, tabla, referencia IEEE, declaración de uso de IA). A la derecha muestra una vista previa en tiempo real que se imprime como PDF.

- Autor original: Jorge Javier Pedrozo Romero. Modificado por: Argel Alberto Cano Morales.
- Repositorio: `https://github.com/ArgelCM16/GeneradorDeReportes`.
- Versión actual: **2.5.0** (aparece en los créditos de `index.html`, en la marca de la barra lateral y en la insignia del `README.md`).

## Estructura

```
index.html          Página única: barra lateral (<nav class="toolbox">), editor (.editor-pane) y vista previa (.preview-pane)
CSS/style.css       Estilos base y temas de las universidades por defecto
CSS/redesign.css    Rediseño visual (Google Stitch). Se carga DESPUÉS de style.css y lo sobrescribe
CSS/legal.css       Estilos de las páginas legales
terminos.html       Términos y condiciones (enlazado en los créditos de la barra lateral)
privacidad.html     Política de privacidad (URL pública que pide Google para la pantalla de permisos de Drive)
JS/script.js        Toda la lógica (un solo archivo, sin módulos ni dependencias)
manifest.json       Manifiesto de la app instalable (PWA): nombre, colores e íconos
sw.js               Service worker: guarda los archivos de la app para que funcione sin internet
ASSETS/             Logo "Generador CM": favicon, íconos de la app (icon-192, icon-512, icon-maskable-512 y apple-touch-icon) e imágenes
EXAMPLES/           PDF y TXT de ejemplo
SCREENSHOTS/        GIF/MP4 para el README
tests/              Pruebas automáticas: ejecutar.py (corre todo), casos/*.html (una prueba por archivo), revisar_word.py
README.md           Documentación para usuarios
contexto.md         Estado actual, historial de decisiones y planes (colaboración en vivo)
```

No hay `package.json` ni npm. Las pruebas están en `tests/` (solo necesitan Python y Chrome). Recursos externos: Google Fonts (Plus Jakarta Sans y Material Symbols) y Google Identity Services (solo para Google Drive).

## Cómo funciona `JS/script.js`

### Estado

- `reportData` (arreglo global): los bloques del reporte, en orden. Se guarda en `localStorage` con `scheduleAutosave()` → `saveToLocalStorage()` (espera de 500 ms) y se restaura al cargar la página con `loadFromLocalStorage()`.
- Cada bloque es un objeto `{ id, type, content, ... }`. El `id` lo da `newBlockId()` (un número único: `Date.now()` o uno más que el mayor que ya existe). Los bloques nuevos se crean con `createBlock(type)`, que pone todos los campos del tipo; `addBlock(type)` lo agrega y dibuja. Campos extra según el tipo:
  - `image`: `caption`; la imagen va en `content` como data URL (base64).
  - `code`: `language` (`auto` o una clave de `CODE_LANGUAGES`) y `lineNumbers` (true/false).
  - `table`: `columns` (1-6), `tableData` (matriz; la fila 0 son los encabezados) y `caption`.
  - `ref`: `refType` (`web` | `book` | `article`) y `refData { author, title, source, year, url }`.
  - `ai`: `aiUsed` (`'no'` | `'yes'`) y `aiData { name, aiTool, date, purpose, prompt, attachments, rawResponse }`.
  - `toc` (índice): `content` = título del índice (vacío = "Índice"). Lista los bloques `title` y `subtitle` con texto, con su número de página. Solo puede haber uno, y `placeTocAfterHeader()` (al inicio de `render()`) lo coloca siempre justo después del encabezado (o al principio si no hay encabezado), aunque se arrastre a otro lado.
  - `text`: `format: 'html'` y `content` con HTML limpio (ver [Párrafos con formato](#párrafos-con-formato-y-citas)); sin `format`, `content` es texto plano antiguo y se convierte al dibujar. `hint` opcional (lo ponen las plantillas): es el texto de ayuda del párrafo vacío.
  - `header`: tiene un `hData` heredado que **ya no se usa**. Los datos reales del encabezado viven en `localStorage` (`global_header_data`).

### Claves de `localStorage`

| Clave | Contenido |
|---|---|
| `reportData` | Los bloques del reporte |
| `global_header_data` | Datos del encabezado: `{ names[], studentIds[], isTeam, group, subject, prof, career, term, date, includeLogo, coverMode, taskName }` (`studentIds` va en paralelo a `names`). Los datos antiguos pueden traer `name` en lugar de `names` |
| `selectedTheme` | id de la universidad seleccionada |
| `list_universities` | Universidades: `{ id, name, builtin, color { primary, secondary, accent }, logoLeft, logoRight }` (logos en data URL) |
| `list_subjects` / `list_profs` | Arreglos de texto con las materias y los profesores |
| `subject_prof_map` | Vínculo `{ "materia": "profesor" }` |
| `user_profile` | Perfil: `{ fullName, studentId, career, group, period, periodType, onboardingDone }`; `periodType` es `cuatrimestre`, `semestre` o `anio` |
| `header_fields` | Campos del encabezado: `{ institution, career, subject, prof, studentId, group, term, date }`, cada uno `{ show, label }` (`label` vacío = nombre de siempre) |
| `list_classmates` | Compañeros: `[{ name, studentId }]` |
| `documentName` | Nombre del documento (vacío = "Reporte sin título") |
| `autosaveEnabled` | `'0'` si el autoguardado está desactivado (por defecto activo) |
| `previewWidth` | Ancho (px) elegido para la vista previa; sin valor = el del CSS (460 px) |
| `previewHidden` | `'1'` si la vista previa está oculta (computadora) |
| `citationStyle` | Formato de las referencias: `ieee` (por defecto) o `apa` |
| `previewZoom` | Zoom de la vista previa: `fit` (ajustar al ancho, por defecto) o un nivel de 0.25 a 1.5; solo pantalla |
| `colorScheme` | Modo de la interfaz: `light`, `dark` o sin valor (`auto`, sigue al sistema) |
| `documentFormat` | Formato del documento abierto: `{ font, size, lineHeight, margin, paper, align, indent, pageNumbers }` |
| `defaultDocumentFormat` | Formato para los documentos nuevos (botón "Usar en mis documentos nuevos") |
| `currentDocumentId` | id del documento abierto en Mis documentos (`doc-...`) |

Además, **Mis documentos** vive en IndexedDB (base `generador-reportes`, almacenes `meta` y `data`), no en localStorage.

### Documento: nombre, autoguardado y "Nuevo"

- **Nunca leas ni escribas `global_header_data` directo**: usa `getHeaderData()` / `setHeaderData()`. Con el autoguardado activo usan el almacenamiento del navegador (como siempre); desactivado, usan la memoria (`headerDataMemory`) y no escriben nada.
- `isAutosaveEnabled()` / `setAutosaveEnabled()` / `toggleAutosave()` (la pastilla de la barra del editor es el interruptor). Sin autoguardado, `saveToLocalStorage()` no escribe los bloques. Al volver a activarlo se guarda de inmediato lo que haya en pantalla.
- Cambios sin guardar: `markDocumentSaved()` guarda una "foto" del documento (`getDocumentSnapshot()`: bloques + encabezado + nombre); `hasUnsavedChanges()` la compara. Se marca como guardado al cargar la página, al guardar el JSON o en Drive, al cargar un proyecto y con "Nuevo". Sin autoguardado y con cambios, la pastilla dice "Cambios sin guardar" y el navegador avisa antes de cerrar (`beforeunload`).
- Nombre del documento: `setDocumentName()` / `getDocumentName()` (input `#document-name` en la barra del editor). También es el título de la pestaña (`document.title`), que el navegador usa como nombre del PDF al imprimir. `getSafeFileName()` lo limpia para usarlo en los archivos JSON, TXT y Drive. Se guarda en el proyecto (`documentName`); al cargar un proyecto viejo se toma del nombre del archivo.
- `newDocument()` (botón "Nuevo"): pide confirmación y borra bloques, encabezado, nombre y el archivo de Drive activo. Conserva universidades, materias, profesores y el tema.

### Perfil, campos del encabezado y compañeros

- **Asistente de bienvenida** (`openOnboarding()`): se abre solo si `user_profile.onboardingDone` no es `true`. Pasos: datos personales (nombre obligatorio), escuela (universidad = tema, carrera, grupo, periodo y tipo de periodo), campos del encabezado y, opcionales, materias/profesores y compañeros. Guarda el perfil en cada paso; al terminar da de alta las listas y, si no hay bloques, agrega el encabezado ya lleno. "Configurar después" solo marca `onboardingDone`. Se puede reabrir desde Configuración → Mi perfil.
- **Perfil** (`getProfile` / `saveProfile`): `getHeaderDefaultsFromProfile()` llena el encabezado cuando no hay datos (documento nuevo). Cambiar el encabezado de un documento no cambia el perfil; `applyProfileToHeader()` ("Usar en el encabezado actual") los copia a mano.
- **Tipo de periodo**: `getPeriodType()` / `getPeriodWord()`; `formatTerm()` usa esa palabra ("7" → "7° Semestre").
- **Campos del encabezado**: `HEADER_FIELDS`, `getHeaderFieldConfig()`, `isHeaderFieldShown(key)`, `getHeaderFieldLabel(key, 'editor'|'preview')`. El editor oculta los campos apagados (`data-field`), y la vista previa, la portada y el TXT los omiten. `renderHeaderFieldsEditor(container)` es el editor de campos (pestaña "Encabezado" y paso 3 del asistente).
- **Matrícula**: cada `.member-row` tiene `.student-name-input` y `.student-id-input` (`buildMemberRowHTML()`). `getHeaderPeople(headerData)` devuelve `[{ name, id }]` sin filas vacías.
- **Compañeros**: `getClassmates`, `addClassmate`, `editClassmate`, `deleteClassmate`. En modo equipo, el `<select id="classmate-picker">` llama a `addClassmateToTeam()` (llena la primera fila vacía o agrega una; no repite).
- **Configuración** tiene 7 pestañas: `profile`, `header_fields`, `universities`, `list_subjects`, `list_profs`, `classmates` y `backup` (se abre en `profile`).
- **Respaldo** (pestaña `backup`): `buildBackupData(includeDocument)` / `exportBackup()` descargan un `.json` `{ app, type: 'backup', version, exportedAt, settings, document }`. `settings` lleva tal cual los valores del navegador de las claves de `BACKUP_KEYS`; `document` (opcional) lleva `documentName`, `reportData` y `headerData` tomados de la pantalla. `importBackupFromFile()` muestra un resumen (`describeBackup()`), pide confirmación y llama a `importBackupData()`, que **reemplaza** esas claves y, si lo trae, el documento. Si agregas una clave nueva de configuración en el navegador, agrégala a `BACKUP_KEYS`.
- El proyecto guarda `classmates`, `headerFields` y `periodType` en `settings`; al cargarlo se añaden los compañeros que falten, y los campos y el tipo de periodo solo se aplican si aquí no se han configurado.

### Renderizado

- `render()` = `renderEditor()` + `renderPreview()` + `initializeDragAndDrop()`.
- **`renderEditor()` reemplaza todo el HTML del editor** (`innerHTML`), así que se pierde el foco. Por eso los campos del encabezado no llaman a `render()`, sino solo a `renderPreview()`.
- `renderPreview()` hace dos cosas:
  1. Llama primero a `persistHeaderFromDOM()`, que es el **autoguardado del encabezado**: lee el formulario del encabezado en pantalla y lo guarda en `global_header_data`.
  2. Genera la vista previa (`#preview-container`). Para el encabezado lee directamente del DOM si la tarjeta está en pantalla.
- Cada tipo de bloque tiene su `render<Tipo>Editor(block, deleteBtn)`, que devuelve un string de HTML. Todo texto del usuario pasa por `escapeHtml()` / `escapeAttr()` (protección XSS). Mantén esa regla.

### Encabezado (`renderHeaderEditor`)

- La tarjeta tiene el id `header-card-main`. Campos: nombres (`.student-name-input`, dentro de `#team-members-container`), `#header-task-name` (solo visible en modo portada), `#header-group`, `#select-subject-main`, `#select-prof-main`, `#header-inst-display` (solo lectura; sale de la universidad seleccionada), `#header-career`, `#header-term` y `#header-date`, además de las casillas `#check-include-logo` y `#check-is-team`.
- `readHeaderFromDOM(card)` lee todos los campos **por id**; la usan el autoguardado y la vista previa. Si agregas un campo, agrégalo ahí.
- **Modo portada**: el botón "Hacer portada" (`toggleCoverMode()`) no agrega un bloque; cambia `data-cover-mode` de la tarjeta y el encabezado se dibuja como portada de hoja completa (`renderCoverPreview()`), con el nombre de la tarea y todos los datos del encabezado. "Volver a encabezado" regresa al formato normal. Al imprimir, la portada sale en su propia hoja. Los bloques `cover` de una versión de prueba anterior se descartan al cargar.
- Cada campo va dentro de un `.header-field` con su `<label>`.
- No hay botones de guardar ni editar: se guarda solo. `clearHeaderData()` ("Limpiar") borra los datos.
- Modo equipo: `toggleTeamMode`, `addTeamMember`, `removeTeamMember`.
- `formatTerm()` evita duplicar la palabra "Cuatrimestre". `getHeaderStudentName()` devuelve el nombre del alumno o de todos los integrantes; lo usa la Declaración de IA.

### Universidades, materias y profesores

- Universidades por defecto en `DEFAULT_UNIVERSITIES` (`generic`, `upy`, `tsw`, `upp`); `generic` no se puede eliminar.
- Funciones: `getUniversities`, `saveUniversities` (devuelve `false` si no hay espacio), `changeTheme(id)` (aplica `--primary`, `--secondary` y `--accent` como estilo en línea del `<body>`) y `renderThemeSelector`.
- Modal de universidad: `openUniversityModal(editId?)` y `saveUniversityFromModal`. Los logos se reducen a 400 px con `shrinkLogoDataUrl()`.
- Materias y profesores: la tabla `SIMPLE_LISTS` los relaciona con su `<select>` del encabezado. Funciones: `addListItem`, `editListItem`, `deleteListItem` y `refreshHeaderSelect`.
- Vínculo materia → profesor: `getSubjectProfMap`, `setSubjectProf`, `renameInSubjectProfMap` (lo mantiene al renombrar o eliminar) y `onHeaderSubjectChange` (al elegir la materia, selecciona su profesor).
- **Panel de Configuración** (`openSettingsModal(tab)`): pestañas `universities`, `list_subjects` y `list_profs`; se vuelve a dibujar con `refreshSettingsModal()`.

### Proyecto (guardar y cargar)

- `buildProjectData()` / `buildProjectJSON()`: `{ version: '2.1', timestamp, theme, documentName, reportData, headerData, citationStyle, settings: { universities, subjects, profs, subjectProfMap } }`.
- `applyProjectData(data)`: primero integra la configuración con `mergeProjectSettings` (solo **añade** lo que falta; lo local nunca se sobrescribe), luego restaura el encabezado, los bloques y el tema. Los proyectos antiguos (versión `2.0`, sin `headerData` ni `settings`) siguen funcionando.
- Lo usan `saveJSON` / `loadJSON` (archivo) y `saveProjectToDrive` / `loadProjectFromDrive` (Drive).

### Google Drive

- OAuth con Google Identity Services, permiso `drive.file` (solo los archivos que crea la app). El Client ID está en `GOOGLE_DRIVE_CLIENT_ID`.
- **Solo funciona sirviendo la página por http(s)** (GitHub Pages o Live Server); con `file://` no funciona.

### Referencias, zoom y exportación

- Formato de referencias: `getCitationStyle()` / `setCitationStyle()`. IEEE numera (`.p-ref-ieee`); APA 7 usa `formatAPAReference()` (sin número y con sangría francesa, `.p-ref-apa`). Se elige desde la etiqueta de la tarjeta de referencia y aplica a todo el documento, incluido el TXT.
- Zoom: `setPreviewZoom('fit' | nivel)` / `changePreviewZoom(±1)` ponen la variable `--preview-zoom`, que solo se usa dentro de `@media screen`. `fit` calcula el zoom para que una hoja de 816 px quepa en el panel.

### Vista previa en páginas reales (lo que se ve es lo que se imprime)

- `renderPreview()` arma el HTML del documento y `paginatePreview()` lo reparte en hojas `.preview-page` tamaño carta (8.5 × 11 in, `padding: 2cm`, número de página abajo). Se imprimen tal cual: `@page { margin: 0 }` y un salto de página por hoja.
- Para saber si algo cabe, mide `body.scrollHeight` contra `clientHeight` de `.preview-page-body`. Se parten entre hojas: párrafos `.p-text` sin etiquetas internas (por palabras), `pre` (por líneas), tablas (por filas; se repite el encabezado y la descripción va al final) y contenedores con `data-split="children"` (índice, declaración de IA). Lo demás pasa completo a la siguiente hoja.
- `data-page-break="before|after|both"` fuerza saltos de página. El índice usa `after`: con portada queda solo en la hoja 2; con encabezado normal queda debajo del encabezado en la hoja 1; en ambos casos el contenido empieza en la hoja siguiente. La portada (`.p-cover`) va sola en su hoja y sin número.
- Después de paginar, `fillTocPageNumbers()` pone a cada entrada del índice la página donde quedó su título (`data-toc-ref` → `data-toc-anchor`).
- Como se repagina con cada tecla, `paginatePreview()` conserva la posición de desplazamiento del panel.
- Imágenes: al paginar, una imagen que no ha terminado de cargar mide 0 de alto. `previewImageSizes` guarda el tamaño de cada imagen ya cargada (se le pone `width`/`height` para reservar su alto) y, cuando carga una imagen nueva, se repagina una vez. Además, en la hoja se limitan a `max-height: 18cm`.
- Ancho de la vista previa: el divisor `#pane-resizer` (entre `.editor-pane` y `#preview-pane`) se arrastra con eventos de puntero; también responde a las flechas y el doble clic lo regresa al tamaño normal. `setPreviewWidth(px | null)` limita el ancho a mínimo 320 px y deja al editor al menos 380 px. `togglePreviewExpanded()` (botón de la barra de la vista previa) alterna entre el 60% del espacio y el tamaño normal. Si el zoom está en `fit`, la hoja se reajusta al cambiar el ancho.

### Ocultar la vista previa y diseño para celular

- Computadora: `setPreviewHidden(true|false)` / `togglePreviewVisible()` (botón "Ocultar/Mostrar vista previa" de la barra del editor y la ✕ de la barra de la vista previa). Pone la clase `preview-is-hidden` en `<body>`.
- Celular (`isMobileLayout()`, hasta 768 px): la barra lateral es un cajón (`toggleSidebar()`, botón ☰ `#mobile-menu-btn`, fondo `.sidebar-backdrop`) y abajo están las pestañas `.mobile-tabs` (`setMobileView('editor'|'preview')`, clase `mobile-view-preview` en `<body>`). Al usar un botón del menú en celular, el menú se cierra; si fue un bloque, vuelve al editor.
- **La vista previa oculta nunca lleva `display: none`**: se saca de la pantalla (`position: fixed; left: -100000px; visibility: hidden`) para que se siga paginando y el índice tenga números correctos. En `@media print` se regresa a su lugar.
- Clases de apoyo: `.mobile-only` y `.desktop-only`.
- Al probar en Chrome sin interfaz, la ventana no baja de ~500 px de ancho: para el diseño de celular usa `--window-size=390,844` (queda en ~504 px, que sigue siendo celular) y toma capturas a 504 px de ancho.

### Párrafos con formato y citas

- El contenido de un párrafo es HTML limpio: solo `<p>`, `<ul>`/`<ol>`/`<li>`, `<b>`, `<i>`, `<u>`, `<br>` y `<span data-cite="id">`. **Todo lo que entra pasa por `sanitizeRichHtml()`** (lo escrito, lo pegado y los proyectos cargados); `normalizeTextBlocks()` (al inicio de `render()`) limpia todos los párrafos y convierte los de texto plano (`plainToRichHtml()`). `getRichHtml(block)` devuelve el HTML limpio (con memoria `richSanitizeCache`).
- Editor: `renderTextEditor()` dibuja la barra (`richCommand(btn, cmd)` con `document.execCommand`) y un `contenteditable` `.rich-editor` (`data-block-id`); `oninput` → `updateRichText(editor)`. Al pegar se limpia (evento `paste`). `richSavedRanges` guarda dónde estaba el cursor para los botones. `updateContent()` en un párrafo recibe texto plano (quita `format`).
- Salidas: `richHtmlForPreview()` (clases `.p-text`, `.p-list` con `data-split="children"` y `.p-cite`), `richHtmlForEditor()` (citas como `.cite-chip` no editables), `richHtmlToPlainText()` (TXT, contador, revisión) y `docxRunsFromHtml()` (Word).
- Citas: `getReferenceBlocks()` (el número IEEE es la posición del bloque de referencia), `getCitationText(id)` ([1] o (Pérez, 2020) con `getAPACitationAuthor()`), `openCitationPicker(button, blockId)` / `insertCitation()`. `refreshCitationChips()` (al final de `renderPreview()`) actualiza las etiquetas del editor.
- Paginación: los `.p-text` (con o sin formato) se parten con `splitInline()` usando `Range.cloneContents()` (conserva negritas y no parte las citas); una `<ol>` partida sigue la numeración con `start`.

### Formato del documento

- `getDocumentFormat()` / `setDocumentFormat(format, redraw)` / `normalizeDocumentFormat()`; opciones en `DOC_FONTS`, `PAPER_SIZES`, `DOC_FONT_SIZES`, `DOC_LINE_HEIGHTS`, `DOC_MARGINS`, y `DOCUMENT_FORMAT_PRESETS` (predeterminado, APA 7, Formal). Es del documento (como el nombre: en memoria y, con autoguardado, en `documentFormat`), va en el proyecto, el respaldo, Mis documentos y el deshacer.
- `applyDocumentFormat()` pone variables CSS en `#preview-container` (`--doc-font`, `--doc-size`, `--doc-line`, `--doc-margin`, `--doc-page-w`, `--doc-page-h`, `--doc-align`, `--doc-indent`...) y el `@page` de la impresión en `<style id="doc-page-style">`. `getPageWidthPx()` lo usa el zoom "ajustar".
- Ventana: `openFormatModal()` (botón de la barra lateral y "Aa" de la vista previa).

### Contador de palabras y revisión

- `countDocumentWords()` (títulos, párrafos, tablas y descripciones; no cuenta encabezado, índice, código, referencias ni declaración de IA) y `updateDocumentStats()` (barra `.editor-statusbar`, con espera de 250 ms desde `renderPreview()`).
- `getDocumentIssues()` devuelve `{ level: 'error'|'warn'|'info', message, blockId }`; `openReviewModal(forPrint)` los lista y "Ir" usa `goToBlock()`. **Para imprimir usa `printDocument()`** (no `window.print()`): si hay errores o avisos, primero muestra la revisión. Ctrl+P también pasa por ahí.

### Exportar a Word

- `exportDOCX()` → `buildDocx()`: arma el `.docx` sin librerías. `zipFiles()` (ZIP sin compresión con `crc32()`), y XML con `docxParagraph()`, `docxRun()`, `docxRunsFromHtml()`. Imágenes con `loadImageForDocx()` (SVG/WebP → PNG; un logo de otro sitio que no permite leerlo se omite).
- Estilos de Word: `Heading1` (título) y `Heading2` (subtítulo), para que el índice sea un campo TOC de Word (trae los números de la vista previa y `updateFields` hace que Word ofrezca actualizarlo), `Caption`, `Codigo`, `TOC1`/`TOC2` y `Footer` (número de página).
- Si cambias cómo se ve un bloque en la hoja, revisa también `buildDocx()` y `exportTXT()`.

### Mis documentos

- IndexedDB (`openLibraryDb()`, `libraryTransaction(mode, fn)`): `meta` (lo que muestra la lista) y `data` (`{ id, encoding: 'gzip'|'none', payload }`, comprimido con `CompressionStream`).
- `saveCurrentDocumentToLibrary()` toma la "foto" (`buildLibraryPayload()`) en el momento y la escribe en cola; no reescribe si no cambió (`libraryLastSaved`). Se llama desde el autoguardado (`scheduleLibrarySave()`, 1.5 s) y antes de cambiar de documento. Solo guarda con el autoguardado activo (o con `{ force: true }`).
- `startNewLibraryDocument()` guarda el actual y da un id nuevo: lo usan `newDocument()`, `applyProjectData()` (cargar proyecto o Drive) e `importBackupData()` con documento. `applyLibraryDocument()` / `openLibraryDocument()`, `duplicateLibraryDocument()`, `renameLibraryDocument()`, `deleteLibraryDocument()`, `downloadLibraryDocument()`. Al cambiar de documento se reinicia el deshacer (`resetUndoHistory()`).
- Respaldo: `exportBackup(includeDocument, includeLibrary)` agrega `library: [{ meta, data }]`; `importLibraryDocuments()` los restaura.
- Ventana: `openLibraryModal()` (botón 📁 de la barra del editor y "Mis documentos" de la barra lateral). `showToast()` muestra avisos breves.

### Código con colores

- `CODE_LANGUAGES` (lenguajes con sus palabras clave), `detectCodeLanguage(code)`, `getCodeLanguage(block)` (el elegido o el detectado) y `tokenizeCode(code, lang)` → `[{ t, v }]` (`t`: `kw`, `str`, `com`, `num`, `fn`, `type`, `tag`, `attr`, `var`, `pre` o vacío). HTML y CSS tienen su propio tokenizador (`tokenizeMarkup`, `tokenizeCss`).
- Hoja: `renderCodePreview(block)` → `<pre class="code-preview">` con un `<span class="code-line">` por línea y clases `.tok-*` (colores en `style.css`). La paginación lo parte por líneas (`splitCodeLines`) y, con números de línea, la continuación sigue la cuenta (`counter-reset`).
- Word: `codeTokenLines()` + `CODE_TOKEN_COLORS`. El TXT sale sin colores.

### Tarjetas: subir, bajar y duplicar

- `buildBlockToolsHTML(block, index)` arma la esquina de cada tarjeta: ↑ ↓ (`moveBlockBy(id, ±1)`), Duplicar (`duplicateBlock(id)`, copia profunda con id nuevo, justo debajo) y ×. Funcionan con el dedo (el arrastrar y soltar no funciona en pantallas táctiles).
- El encabezado y el índice solo llevan la ×: no se mueven (el índice lo acomoda `placeTocAfterHeader()`) ni se duplican, y ningún bloque se puede subir por encima de ellos.

### Imágenes

- `handleImage()` reduce cada imagen con `shrinkImageDataUrl(dataUrl, mime, BLOCK_IMAGE_MAX_SIZE = 1600, preferJpeg)`: la deja en 1600 px como máximo y prueba JPEG (calidad 0.85, solo si no tiene transparencia) y PNG; se queda con la más ligera. Los SVG y GIF no se tocan. Una foto de 5 MB queda en unos 400 KB, así el `localStorage` (≈5 MB) alcanza para varias.

### Deshacer / rehacer

- `undoHistory { past, future, current }` guarda "fotos" del documento (`captureDocumentState()`: bloques, encabezado y nombre, en JSON). Máximo 60 y unos 25 millones de caracteres en total (las fotos incluyen las imágenes).
- Lo que se escribe se agrupa: `scheduleAutosave()` llama a `scheduleHistoryRecord()` (espera de 400 ms). Cada `render()` (agregar, mover, borrar, plantilla...) guarda su paso de inmediato con `recordHistory()`.
- `undo()` / `redo()` restauran con `applyDocumentState()`; durante 700 ms no se registra nada para no guardar la restauración como un cambio nuevo. Botones `#undo-btn` / `#redo-btn` en la barra del editor (`updateUndoButtons()`).
- Teclado: Ctrl/⌘+Z, Ctrl+Y y Ctrl+Shift+Z, **solo fuera de un campo de texto** (dentro de un campo deshace el navegador lo escrito) y sin ventanas abiertas.

### Plantillas

- `TEMPLATES` (práctica, ensayo, investigación, proyecto de programación): cada una es una lista de `{ type, content?, hint?, caption? }`. `openTemplatesModal()` muestra las tarjetas (botón "Usar una plantilla" de la barra lateral); si el documento ya tiene contenido, pregunta si agregar al final o reemplazar.
- `applyTemplate(id, 'append'|'replace')` conserva el encabezado (lo agrega si no hay) y no repite el índice. Se puede deshacer con Ctrl+Z.

### Modo oscuro

- `getColorScheme()` / `isDarkMode()` / `applyColorScheme()` / `toggleColorScheme()` (botón 🌙/☀️ `#color-scheme-btn` de la barra del editor). Pone la clase `theme-dark` en `<body>` y cambia el `meta theme-color`.
- Solo cambia la interfaz: en `redesign.css` invierte la escala `--ui-slate-*` y define `--ui-surface` y `--ui-field`. La barra lateral, las pestañas del celular y las hojas de la vista previa conservan la paleta original, así **las hojas siguen blancas y la impresión no cambia**.

### App instalable (PWA) y sin internet

- `manifest.json` + `sw.js`. `registerServiceWorker()` lo registra al cargar, **solo por http(s)** (con `file://` no hace nada).
- `sw.js` guarda los archivos de la app al instalarse (lista `APP_FILES`, con el `?v=`), responde las páginas primero de internet (y sin conexión, de la copia) y los demás archivos y las fuentes de Google al instante desde la copia, actualizándolos por detrás. Nunca guarda llamadas a Google Drive ni datos del usuario. Al cambiar `VERSION` se descarga todo de nuevo y se borra la copia vieja.
- El botón "Instalar la app" (`#install-app-btn`) aparece solo cuando el navegador lanza `beforeinstallprompt` (`installApp()`).

### Exportación

- PDF: `window.print()` más las reglas `@media print` (ocultan la barra lateral y el editor).
- TXT: `exportTXT()`.

## Estilos

- `style.css` define los temas con `body[data-theme="..."]` y las variables `--primary`, `--secondary` y `--accent`. Para universidades personalizadas, `changeTheme` pone esas variables en línea sobre el `<body>`.
- `redesign.css` reproduce la pantalla "Rediseño Completo" de Stitch. Define `--ui-accent` **sobre `body`** (no sobre `:root`) para que siga al tema; con el tema `generic` usa el naranja `#f97316`. Usa `color-mix()` y `:has()`.
- Estructura de `index.html` (solo presentación; las funciones siguen buscando los mismos ids):
  - Barra lateral `.toolbox`: `.sidebar-scroll` (marca, selector de tema, `.blocks-grid` en 2 columnas, Declaración de IA, Almacenamiento/Drive, proyecto JSON y créditos) y `.sidebar-footer` fijo (TXT, Configuración e Imprimir).
  - Editor: `.editor-pane` = `.editor-toolbar` (nombre del documento, `#editor-uni-label`, deshacer/rehacer, Nuevo, ocultar vista previa, pastilla de guardado y modo oscuro) + `#editor-container`. `.editor-pane` es un contenedor (`container-type: inline-size`): si mide menos de 980 px, los botones de la barra se quedan solo con su ícono.
  - Vista previa: `.preview-pane` = `.preview-toolbar` + `.preview-scroll` (dentro, la hoja `#preview-container`) + `.preview-footer`.
- `changeTheme()` también actualiza `#header-uni-badge` (insignia de la tarjeta del encabezado, con `getUniShortName()`) y `#editor-uni-label`.
- En `index.html` las hojas de Google Fonts (Material Symbols) se cargan **antes** que `style.css` y `redesign.css`; si van después, pisan el tamaño y el `display` de los íconos (así se descentraba el logo).
- Con el tema UPY el acento es su color primario (morado), no el secundario.
- Tarjetas: el primer `<label>` hijo directo de `.block-card` es la cabecera; el CSS le antepone el asa de arrastre y el texto "Bloque:". Los campos llevan `.field-label` o `.header-field label` encima. Los íconos dentro de los campos del encabezado son imágenes de fondo en CSS.
- Las hojas `.preview-page` tienen tamaño real; en pantalla solo se escalan con el zoom. `style.css` tiene las reglas de impresión que ocultan `.editor-pane`, `.preview-toolbar` y `.preview-footer`. Si tocas la vista previa, revisa también la impresión: imprime a PDF con Chrome sin interfaz y compara el número de páginas con las `.preview-page` de la vista previa.
- Para volver al diseño anterior basta con quitar el `<link>` de `redesign.css` en `index.html` (la estructura base de `style.css` sigue funcionando).

## Cómo probar

**Pruebas automáticas** (detalles en [tests/README.md](tests/README.md)):

```bash
python tests/ejecutar.py                 # todas (~30 s)
python tests/ejecutar.py formato codigo  # solo algunas
```

- Cada prueba es un `tests/casos/<nombre>.html` con un `<script>` que se inyecta antes de `</body>` de `index.html`, hace acciones (`addBlock`, `render`, `dispatchEvent(new Event('input'))`...) y escribe `PASS`/`FAIL` en `<pre id="TEST_RESULTS">`. Sustituye `alert`, `confirm` y `prompt` por funciones falsas.
- **El asistente de bienvenida se abre solo**: empieza con `closeOnboarding()` y `saveProfile({ onboardingDone: true })`.
- Modo `archivo` (por defecto): `file://` con `--virtual-time-budget` (rápido). Las transiciones CSS no avanzan: desactívalas con `*{transition:none !important}` si mides algo animado. La ventana no baja de ~504 px de ancho (con `390,844` sigue siendo diseño de celular).
- Modo `http`: para **IndexedDB (Mis documentos) y el service worker**, que el tiempo virtual no espera. `ejecutar.py` sirve una copia de la app y retiene el evento `load` con una imagen que el servidor no responde hasta que aparece `#TEST_RESULTS`.
- Usa perfiles de Chrome con **ruta corta** (`ejecutar.py` lo hace): con rutas largas la caché de Chrome falla con "Unexpected internal error".
- Esperas: en modo archivo el tiempo es virtual y una lectura de archivo (`FileReader`) puede tardar "más" que un `wait()` fijo; espera a que pase la condición (ver `waitFor` en `respaldo.html`).
- **Word**: `revisar_word.py` revisa los .docx que entrega `casos/word.html` (base64 en `<pre id="DOCX_FILES">`); con `python-docx` instalado revisa más a fondo.

**Ver e imprimir** (a mano, con Chrome sin interfaz):

- Captura: `chrome --headless=new --screenshot=<png> --window-size=1440,900 <página>`.
- Impresión: `--print-to-pdf=<archivo>` y cuenta las páginas (`/Type /Page`); deben ser las mismas que `.preview-page`. Oculta el `<pre id="TEST_RESULTS">` antes de imprimir.
- Proyecto de prueba completo: `EXAMPLES/PROYECTO-PRUEBA-COMPLETO.json` (se carga con "Cargar Proyecto").

Chrome está en `C:\Program Files\Google\Chrome\Application\chrome.exe`.

## Cuidados y trampas conocidas

- **ids de bloque**: crea los bloques con `createBlock()` / `addBlock()` (usan `newBlockId()`); si armas bloques a mano en una prueba, ponles ids distintos.
- **`render()` guarda un paso de deshacer**: si una función dibuja todo varias veces seguidas, cada `render()` será un paso. Para cambios que deben deshacerse juntos, modifica `reportData` y llama a `render()` una sola vez.
- **`.block-card > label`** (hijo directo) es el título de cada tarjeta; `redesign.css` lo pone en mayúsculas.
- Los finales de línea de la copia de trabajo son LF (git los convierte). Al editar con scripts, escribe en UTF-8 con `\n`.
- **README**: el árbol de carpetas usa espacios duros (`│` + dos U+00A0 + espacio). Ya hubo una corrupción con texto UTF-16 pegado al final del README que hacía que GitHub lo mostrara como texto plano; si GitHub lo muestra así otra vez, busca bytes nulos.
- En Windows, `python3` es el de Windows: usa rutas `C:\...` (o `cygpath -w`) y abre los archivos con `encoding='utf-8'`. Los heredocs largos en bash a veces fallan; es más seguro escribir el script en un archivo y ejecutarlo.

## Herramientas externas

- **Google Stitch** (MCP `stitch`, configurado solo en local para este proyecto): proyecto "Project Redesign Initiative" (id `14228064238792232703`), de donde salió el rediseño. La API key está en la configuración local de Claude y **nunca debe ir al repositorio**.
