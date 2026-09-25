# CLAUDE.md

Guía del proyecto para Claude Code (y para cualquier persona que vaya a modificarlo).
Para el estado actual, las decisiones tomadas y los planes, lee también [contexto.md](contexto.md).

## Reglas de trabajo

- **Responde siempre en español.** Los comentarios del código, los textos de la interfaz y los mensajes de commit también van en español.
- Rama de trabajo: **`test`**. La rama por defecto (la que muestra GitHub) es **`main`**; los cambios pasan a `main` cuando el usuario lo pide.
- Haz commit o push solo cuando el usuario lo pida.
- Si el usuario pide un cambio "solo de diseño", no toques la lógica de `JS/script.js`: los estilos del rediseño viven en `CSS/redesign.css`.
- Después de cambiar algo, pruébalo en Chrome sin interfaz (ver [Cómo probar](#cómo-probar)).

## Qué es

**Generador de Reportes Académicos**: una aplicación web que corre 100% en el navegador (sin servidor ni build) para armar reportes escolares con bloques (encabezado, título, párrafo, código, imagen, tabla, referencia IEEE, declaración de uso de IA). A la derecha muestra una vista previa en tiempo real que se imprime como PDF.

- Autor original: Jorge Javier Pedrozo Romero. Modificado por: Argel Alberto Cano Morales.
- Repositorio: `https://github.com/ArgelCM16/GeneradorDeReportes`.
- Versión actual: **2.1.0** (aparece en los créditos de `index.html` y en la insignia del `README.md`).

## Estructura

```
index.html          Página única: barra lateral (<nav class="toolbox">), editor y vista previa
CSS/style.css       Estilos base y temas de las universidades por defecto
CSS/redesign.css    Rediseño visual (Google Stitch). Se carga DESPUÉS de style.css y lo sobrescribe
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
  - `header`: tiene un `hData` heredado que **ya no se usa**. Los datos reales del encabezado viven en `localStorage` (`global_header_data`).

### Claves de `localStorage`

| Clave | Contenido |
|---|---|
| `reportData` | Los bloques del reporte |
| `global_header_data` | Datos del encabezado: `{ names[], isTeam, group, subject, prof, term, date, includeLogo }`. Los datos antiguos pueden traer `name` en lugar de `names` |
| `selectedTheme` | id de la universidad seleccionada |
| `list_universities` | Universidades: `{ id, name, builtin, color { primary, secondary, accent }, logoLeft, logoRight }` (logos en data URL) |
| `list_subjects` / `list_profs` | Arreglos de texto con las materias y los profesores |
| `subject_prof_map` | Vínculo `{ "materia": "profesor" }` |

### Renderizado

- `render()` = `renderEditor()` + `renderPreview()` + `initializeDragAndDrop()`.
- **`renderEditor()` reemplaza todo el HTML del editor** (`innerHTML`), así que se pierde el foco. Por eso los campos del encabezado no llaman a `render()`, sino solo a `renderPreview()`.
- `renderPreview()` hace dos cosas:
  1. Llama primero a `persistHeaderFromDOM()`, que es el **autoguardado del encabezado**: lee el formulario del encabezado en pantalla y lo guarda en `global_header_data`.
  2. Genera la vista previa (`#preview-container`). Para el encabezado lee directamente del DOM si la tarjeta está en pantalla.
- Cada tipo de bloque tiene su `render<Tipo>Editor(block, deleteBtn)`, que devuelve un string de HTML. Todo texto del usuario pasa por `escapeHtml()` / `escapeAttr()` (protección XSS). Mantén esa regla.

### Encabezado (`renderHeaderEditor`)

- La tarjeta tiene el id `header-card-main`. Campos: nombres (`.student-name-input`, dentro de `#team-members-container`), `#header-group`, `#select-subject-main`, `#select-prof-main`, `#header-inst-display` (solo lectura; sale de la universidad seleccionada), `#header-term` y `#header-date`, además de las casillas `#check-include-logo` y `#check-is-team`.
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

- `buildProjectData()` / `buildProjectJSON()`: `{ version: '2.1', timestamp, theme, reportData, headerData, settings: { universities, subjects, profs, subjectProfMap } }`.
- `applyProjectData(data)`: primero integra la configuración con `mergeProjectSettings` (solo **añade** lo que falta; lo local nunca se sobrescribe), luego restaura el encabezado, los bloques y el tema. Los proyectos antiguos (versión `2.0`, sin `headerData` ni `settings`) siguen funcionando.
- Lo usan `saveJSON` / `loadJSON` (archivo) y `saveProjectToDrive` / `loadProjectFromDrive` (Drive).

### Google Drive

- OAuth con Google Identity Services, permiso `drive.file` (solo los archivos que crea la app). El Client ID está en `GOOGLE_DRIVE_CLIENT_ID`.
- **Solo funciona sirviendo la página por http(s)** (GitHub Pages o Live Server); con `file://` no funciona.

### Exportación

- PDF: `window.print()` más las reglas `@media print` (ocultan la barra lateral y el editor).
- TXT: `exportTXT()`.

## Estilos

- `style.css` define los temas con `body[data-theme="..."]` y las variables `--primary`, `--secondary` y `--accent`. Para universidades personalizadas, `changeTheme` pone esas variables en línea sobre el `<body>`.
- `redesign.css` define `--ui-accent` **sobre `body`** (no sobre `:root`) para que siga al tema; con el tema `generic` usa el naranja `#f97316`. Usa `color-mix()`.
- La vista previa se ve como "hoja de papel" gracias a un borde gris grueso en `#preview-container`. En `@media print` ese borde se quita: si tocas la vista previa, revisa también la impresión.
- Para volver al diseño anterior basta con quitar el `<link>` de `redesign.css` en `index.html`.

## Cómo probar

No hay pruebas en el repositorio. Lo que ha funcionado es Chrome sin interfaz:

1. Copia `index.html` a una carpeta temporal cambiando las rutas `CSS/` y `JS/` por rutas absolutas `file:///...`.
2. Antes de `</body>`, agrega un `<script>` que al cargar ejecute las acciones (`addBlock`, `openSettingsModal`, `dispatchEvent(new Event('input'))`...), revise los resultados y los escriba en un `<pre id="TEST_RESULTS">`. Sustituye `alert`, `confirm` y `prompt` por funciones falsas.
3. Ejecuta `chrome.exe --headless=new --allow-file-access-from-files --user-data-dir=<temporal> --virtual-time-budget=6000 --dump-dom <archivo>` y lee el `<pre>`.
4. Para ver cómo se ve: `--screenshot=<png> --window-size=1440,900`.
5. Para la impresión: copia los CSS cambiando `@media print` por `@media all` y toma una captura.

Chrome está en `C:\Program Files\Google\Chrome\Application\chrome.exe`.

## Cuidados y trampas conocidas

- **ids con `Date.now()`**: si se crean dos bloques en el mismo milisegundo (solo pasa en pruebas automáticas), comparten id. En las pruebas, asigna ids únicos a mano.
- **`persistHeaderFromDOM` y la vista previa leen Grupo y Cuatrimestre por posición** (`.grid-inputs input[type="text"]`, sin contar nombres ni institución). Si agregas otro input de texto en `.grid-inputs`, revisa ese orden.
- **`.block-card > label`** (hijo directo) es el título de cada tarjeta; `redesign.css` lo pone en mayúsculas.
- Los finales de línea de la copia de trabajo son LF (git los convierte). Al editar con scripts, escribe en UTF-8 con `\n`.
- **README**: el árbol de carpetas usa espacios duros (`│` + dos U+00A0 + espacio). Ya hubo una corrupción con texto UTF-16 pegado al final del README que hacía que GitHub lo mostrara como texto plano; si GitHub lo muestra así otra vez, busca bytes nulos.
- En Windows, `python3` es el de Windows: usa rutas `C:\...` (o `cygpath -w`) y abre los archivos con `encoding='utf-8'`. Los heredocs largos en bash a veces fallan; es más seguro escribir el script en un archivo y ejecutarlo.

## Herramientas externas

- **Google Stitch** (MCP `stitch`, configurado solo en local para este proyecto): proyecto "Project Redesign Initiative" (id `14228064238792232703`), de donde salió el rediseño. La API key está en la configuración local de Claude y **nunca debe ir al repositorio**.
