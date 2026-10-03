# CLAUDE.md

Guía del proyecto para Claude Code (y para cualquier persona que vaya a modificarlo).
Para el estado actual, las decisiones tomadas y los planes, lee también [contexto.md](contexto.md).

## Reglas de trabajo

- **Responde siempre en español.** Los comentarios del código, los textos de la interfaz y los mensajes de commit también van en español.
- Rama de trabajo: **`test`**. La rama por defecto (la que muestra GitHub) es **`main`**; los cambios pasan a `main` cuando el usuario lo pide.
- Haz commit o push solo cuando el usuario lo pida.
- Si el usuario pide un cambio "solo de diseño", no toques la lógica de `JS/script.js`: los estilos del rediseño viven en `CSS/redesign.css`.
- Después de cambiar algo, pruébalo en Chrome sin interfaz (ver [Cómo probar](#cómo-probar)).
- **Si cambia qué datos usa la app o con qué servicios se conecta** (nuevos recursos externos, analítica, otro permiso de Google...), actualiza `privacidad.html` (y `terminos.html` si aplica) junto con su fecha de "Última actualización".
- **Si cambias `CSS/*.css` o `JS/script.js`, sube el número `?v=` de sus enlaces en `index.html`** (los tres llevan el mismo). GitHub Pages deja que el navegador guarde esos archivos hasta 10 minutos; sin cambiar el número, el navegador puede mezclar el HTML nuevo con CSS o JS viejos y la página se ve rota.

## Qué es

**Generador de Reportes Académicos**: una aplicación web que corre 100% en el navegador (sin servidor ni build) para armar reportes escolares con bloques (encabezado, título, párrafo, código, imagen, tabla, referencia IEEE, declaración de uso de IA). A la derecha muestra una vista previa en tiempo real que se imprime como PDF.

- Autor original: Jorge Javier Pedrozo Romero. Modificado por: Argel Alberto Cano Morales.
- Repositorio: `https://github.com/ArgelCM16/GeneradorDeReportes`.
- Versión actual: **2.2.0** (aparece en los créditos de `index.html`, en la marca de la barra lateral y en la insignia del `README.md`).

## Estructura

```
index.html          Página única: barra lateral (<nav class="toolbox">), editor (.editor-pane) y vista previa (.preview-pane)
CSS/style.css       Estilos base y temas de las universidades por defecto
CSS/redesign.css    Rediseño visual (Google Stitch). Se carga DESPUÉS de style.css y lo sobrescribe
CSS/legal.css       Estilos de las páginas legales
terminos.html       Términos y condiciones (enlazado en los créditos de la barra lateral)
privacidad.html     Política de privacidad (URL pública que pide Google para la pantalla de permisos de Drive)
JS/script.js        Toda la lógica (un solo archivo, sin módulos ni dependencias)
ASSETS/             Favicon e imágenes
EXAMPLES/           PDF y TXT de ejemplo
SCREENSHOTS/        GIF/MP4 para el README
README.md           Documentación para usuarios
contexto.md         Estado actual, historial de decisiones y planes (colaboración en vivo)
```

No hay `package.json`, ni npm, ni pruebas en el repositorio. Recursos externos: Google Fonts (Plus Jakarta Sans y Material Symbols) y Google Identity Services (solo para Google Drive).

## Cómo funciona `JS/script.js`

### Estado

- `reportData` (arreglo global): los bloques del reporte, en orden. Se guarda en `localStorage` con `scheduleAutosave()` → `saveToLocalStorage()` (espera de 500 ms) y se restaura al cargar la página con `loadFromLocalStorage()`.
- Cada bloque es un objeto `{ id, type, content, ... }`. El `id` es `Date.now()` (ver [Cuidados](#cuidados-y-trampas-conocidas)). Campos extra según el tipo:
  - `image`: `caption`; la imagen va en `content` como data URL (base64).
  - `table`: `columns` (1-6), `tableData` (matriz; la fila 0 son los encabezados) y `caption`.
  - `ref`: `refType` (`web` | `book` | `article`) y `refData { author, title, source, year, url }`.
  - `ai`: `aiUsed` (`'no'` | `'yes'`) y `aiData { name, aiTool, date, purpose, prompt, attachments, rawResponse }`.
  - `toc` (índice): `content` = título del índice (vacío = "Índice"). Lista los bloques `title` y `subtitle` con texto, con su número de página. Solo puede haber uno, y `placeTocAfterHeader()` (al inicio de `render()`) lo coloca siempre justo después del encabezado (o al principio si no hay encabezado), aunque se arrastre a otro lado.
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

### Exportación

- PDF: `window.print()` más las reglas `@media print` (ocultan la barra lateral y el editor).
- TXT: `exportTXT()`.

## Estilos

- `style.css` define los temas con `body[data-theme="..."]` y las variables `--primary`, `--secondary` y `--accent`. Para universidades personalizadas, `changeTheme` pone esas variables en línea sobre el `<body>`.
- `redesign.css` reproduce la pantalla "Rediseño Completo" de Stitch. Define `--ui-accent` **sobre `body`** (no sobre `:root`) para que siga al tema; con el tema `generic` usa el naranja `#f97316`. Usa `color-mix()` y `:has()`.
- Estructura de `index.html` (solo presentación; las funciones siguen buscando los mismos ids):
  - Barra lateral `.toolbox`: `.sidebar-scroll` (marca, selector de tema, `.blocks-grid` en 2 columnas, Declaración de IA, Almacenamiento/Drive, proyecto JSON y créditos) y `.sidebar-footer` fijo (TXT, Configuración e Imprimir).
  - Editor: `.editor-pane` = `.editor-toolbar` (título, `#editor-uni-label` y pastilla de guardado) + `#editor-container`.
  - Vista previa: `.preview-pane` = `.preview-toolbar` + `.preview-scroll` (dentro, la hoja `#preview-container`) + `.preview-footer`.
- `changeTheme()` también actualiza `#header-uni-badge` (insignia de la tarjeta del encabezado, con `getUniShortName()`) y `#editor-uni-label`.
- En `index.html` las hojas de Google Fonts (Material Symbols) se cargan **antes** que `style.css` y `redesign.css`; si van después, pisan el tamaño y el `display` de los íconos (así se descentraba el logo).
- Con el tema UPY el acento es su color primario (morado), no el secundario.
- Tarjetas: el primer `<label>` hijo directo de `.block-card` es la cabecera; el CSS le antepone el asa de arrastre y el texto "Bloque:". Los campos llevan `.field-label` o `.header-field label` encima. Los íconos dentro de los campos del encabezado son imágenes de fondo en CSS.
- Las hojas `.preview-page` tienen tamaño real; en pantalla solo se escalan con el zoom. `style.css` tiene las reglas de impresión que ocultan `.editor-pane`, `.preview-toolbar` y `.preview-footer`. Si tocas la vista previa, revisa también la impresión: imprime a PDF con Chrome sin interfaz y compara el número de páginas con las `.preview-page` de la vista previa.
- Para volver al diseño anterior basta con quitar el `<link>` de `redesign.css` en `index.html` (la estructura base de `style.css` sigue funcionando).

## Cómo probar

No hay pruebas en el repositorio. Lo que ha funcionado es Chrome sin interfaz:

1. Copia `index.html` a una carpeta temporal cambiando las rutas `CSS/` y `JS/` por rutas absolutas `file:///...`.
2. Antes de `</body>`, agrega un `<script>` que al cargar ejecute las acciones (`addBlock`, `openSettingsModal`, `dispatchEvent(new Event('input'))`...), revise los resultados y los escriba en un `<pre id="TEST_RESULTS">`. Sustituye `alert`, `confirm` y `prompt` por funciones falsas.
3. Ejecuta `chrome.exe --headless=new --allow-file-access-from-files --user-data-dir=<temporal> --virtual-time-budget=6000 --dump-dom <archivo>` y lee el `<pre>`.
4. Para ver cómo se ve: `--screenshot=<png> --window-size=1440,900`.
5. Para la impresión: `--print-to-pdf=<archivo>` y cuenta las páginas del PDF (`/Type /Page`); deben ser las mismas que `.preview-page` en la vista previa. **Oculta el `<pre id="TEST_RESULTS">`** antes de imprimir (`#TEST_RESULTS{display:none}`), o saldrá como una hoja extra.
6. Proyecto de prueba completo: `EXAMPLES/PROYECTO-PRUEBA-COMPLETO.json` (se carga con "Cargar Proyecto").
7. **El asistente de bienvenida se abre solo** en un navegador limpio: en las pruebas llama a `closeOnboarding()` y guarda `saveProfile({ onboardingDone: true })` antes de probar otras cosas (o úsalo a propósito para probar el asistente).

Chrome está en `C:\Program Files\Google\Chrome\Application\chrome.exe`.

## Cuidados y trampas conocidas

- **ids con `Date.now()`**: si se crean dos bloques en el mismo milisegundo (solo pasa en pruebas automáticas), comparten id. En las pruebas, asigna ids únicos a mano.
- **`.block-card > label`** (hijo directo) es el título de cada tarjeta; `redesign.css` lo pone en mayúsculas.
- Los finales de línea de la copia de trabajo son LF (git los convierte). Al editar con scripts, escribe en UTF-8 con `\n`.
- **README**: el árbol de carpetas usa espacios duros (`│` + dos U+00A0 + espacio). Ya hubo una corrupción con texto UTF-16 pegado al final del README que hacía que GitHub lo mostrara como texto plano; si GitHub lo muestra así otra vez, busca bytes nulos.
- En Windows, `python3` es el de Windows: usa rutas `C:\...` (o `cygpath -w`) y abre los archivos con `encoding='utf-8'`. Los heredocs largos en bash a veces fallan; es más seguro escribir el script en un archivo y ejecutarlo.

## Herramientas externas

- **Google Stitch** (MCP `stitch`, configurado solo en local para este proyecto): proyecto "Project Redesign Initiative" (id `14228064238792232703`), de donde salió el rediseño. La API key está en la configuración local de Claude y **nunca debe ir al repositorio**.
