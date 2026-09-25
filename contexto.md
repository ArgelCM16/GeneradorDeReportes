# Contexto del proyecto

Estado actual, decisiones tomadas y planes del **Generador de Reportes Académicos**.
La explicación técnica del código está en [CLAUDE.md](CLAUDE.md).

Última actualización: 24 de septiembre de 2026.

---

## Estado actual (versión 2.1.0)

- Rama de trabajo: `test`. La rama `main` todavía **no** tiene los cambios de la 2.1.0 (falta el Pull Request de `test` a `main`).
- Todo funciona sin servidor. Google Drive es opcional y requiere servir la página por http(s).

### Qué se hizo en la versión 2.1.0

| Cambio | Detalle |
|---|---|
| Panel de Configuración | Botón en la barra lateral con pestañas para universidades, materias y profesores. Reemplazó los botones sueltos ➕ ✏️ 🗑️ que había junto al tema y a cada lista |
| Autoguardado del encabezado | Se quitaron los botones 💾 y ✏️ y el bloqueo del formulario; solo queda "🧹 Limpiar" |
| Vínculo materia → profesor | Cada materia puede tener un profesor; al elegirla en el encabezado, su profesor se selecciona solo |
| Etiquetas en el encabezado | Cada campo lleva su etiqueta arriba (Grupo, Materia, Profesor...) |
| El proyecto guarda todo | El JSON y Google Drive incluyen el encabezado y la configuración; al cargar se añade lo que falte sin sobrescribir lo local |
| Logos ligeros | Se reducen a 400 px por lado al subirlos; si el navegador se queda sin espacio, se avisa |
| Rediseño visual | Hecho con Google Stitch ("Project Redesign Initiative") y aplicado en `CSS/redesign.css` sin tocar la lógica |
| Correcciones | Nombre del alumno en la Declaración de IA; "Cuatrimestre" duplicado; encabezados de tabla mal marcados; README corrupto (texto UTF-16 al final) |

### Decisiones de diseño que conviene respetar

- **El rediseño va en un archivo aparte** (`redesign.css`) para poder revertirlo quitando una línea de `index.html`.
- **El color de acento de la interfaz sigue a la universidad** (`--secondary`); con el tema genérico se usa el naranja de Stitch.
- **Al cargar un proyecto, lo local gana**: se añaden universidades, materias, profesores y vínculos que falten, pero nunca se sobrescriben ni se borran los existentes.
- **Las materias, profesores y universidades son personales** (de cada navegador); el encabezado del reporte es del proyecto.

### Pendientes conocidos

- Crear el Pull Request de `test` a `main`.
- Cambiar la API key de Google Stitch (quedó escrita en una conversación).
- Los ids de bloque usan `Date.now()`; convendría cambiarlos por `crypto.randomUUID()` (obligatorio antes de la colaboración en vivo).
- En móvil funciona, pero con detalles visuales.

---

## Próxima función: colaboración en vivo (Nivel 1)

Estado: **en planeación** (aprobada la idea; falta crear el proyecto de Firebase y elegir el modo de acceso).

### Objetivo

Que los integrantes de un equipo trabajen **el mismo reporte al mismo tiempo desde distintas computadoras**, cada quien en sus bloques, y vean los cambios de los demás en uno o dos segundos.

### Cómo se vería para el usuario

1. **Sin compartir, todo sigue igual que hoy** (sin cuenta ni internet).
2. Botón **"Compartir"**: sube el reporte a la nube y da un enlace, por ejemplo `.../index.html?proyecto=k7x2p9`.
3. Los compañeros abren el enlace, **inician sesión con Google** y ven el mismo reporte.
4. Al editar un bloque, los demás ven **"✏️ Ana está editando"** y ese bloque queda bloqueado para ellos; los otros bloques siguen libres.
5. Arriba se muestra **quién está conectado** ("👤 Tú, Ana, Luis · 3 conectados").
6. Agregar, eliminar y reordenar bloques se refleja para todos.
7. Cualquiera puede exportar (PDF, TXT, Drive).

### Cómo funciona por dentro

```
  Navegador A ──┐                          ┌── Navegador B
                ├──►  Firebase Firestore ◄──┤
  Navegador C ──┘   projects/{projectId}    └── ...
                    ├─ (documento)  tema, encabezado, dueño, miembros
                    ├─ blocks/{blockId}   un documento por bloque + campo "order"
                    ├─ locks/{blockId}    { uid, name, expiresAt }
                    └─ presence/{uid}     { name, photo, lastSeen }
```

- **Un documento por bloque**: dos personas editando bloques distintos nunca se pisan. Además, cada bloque tiene su propio límite de 1 MB en Firestore.
- **Guardado con espera de ~500 ms** mientras se escribe (no con cada letra). Los cambios llegan a los demás con `onSnapshot`.
- **Bloqueo por bloque**: al enfocar un bloque se escribe `locks/{blockId}`. Se libera al salir del bloque o, si pasan ~30 s sin actividad o se cierra la pestaña, por `expiresAt`, para que nada quede trabado.
- **Presencia**: cada navegador actualiza `presence/{uid}.lastSeen` periódicamente; se muestran los que tengan actividad reciente.
- **Sin conexión**: la persistencia sin conexión de Firestore guarda los cambios y los envía al reconectar.

### Qué se comparte y qué no

| Se comparte (del reporte) | Sigue siendo personal (del navegador) |
|---|---|
| Bloques y su orden | Lista de materias y profesores |
| Datos del encabezado (integrantes, grupo, materia...) | Universidades personalizadas |
| Universidad o tema del reporte | Preferencias |

### Imágenes

Se comprimen automáticamente (como los logos) y viajan dentro de su propio documento de bloque. Así no hace falta Firebase Storage, que requiere activar el plan de pago.

### Cambios necesarios en el código actual

- **Actualizar solo el bloque que cambió**, en lugar de `render()` completo, para no perder el cursor cuando llegan cambios de otros.
- **ids únicos** (`crypto.randomUUID()`) en lugar de `Date.now()`.
- **Mover el encabezado** de `localStorage` (`global_header_data`) al documento del proyecto cuando el reporte esté compartido.
- Capa de sincronización separada (por ejemplo `JS/collab.js`) para no mezclarla con la lógica actual.

### Costo

Plan gratuito de Firebase (Spark): unas 20,000 escrituras y 50,000 lecturas al día, de sobra para equipos escolares.

### Límites (aceptados)

- **Dos personas no pueden escribir en el mismo bloque al mismo tiempo** (eso sería el Nivel 2, tipo Google Docs, con Yjs).
- Para colaborar se necesita internet y servir la página por http(s).
- Cada persona inicia sesión con Google.

### Etapas

1. **Compartir y sincronizar**: inicio de sesión con Google, botón "Compartir", abrir por enlace y sincronizar bloques, orden, encabezado y tema.
2. **Trabajo en equipo**: bloqueo por bloque y lista de conectados.
3. **Detalles**: compresión de imágenes, aviso de conexión perdida y "Dejar de compartir".

Cada etapa debe quedar funcionando y probada antes de pasar a la siguiente.

### Decisiones pendientes (las toma el usuario)

- **Modo de acceso**:
  - **A)** cualquiera con el enlace que inicie sesión con Google (más simple);
  - **B)** solo los correos que invite el dueño (más seguro).
- **Proyecto de Firebase**: crearlo (puede ser el mismo proyecto de Google Cloud que ya usa Google Drive). Pasos:
  1. Agregar una app web.
  2. Activar el inicio de sesión con Google.
  3. Crear la base de datos Firestore.
  4. Agregar el dominio (GitHub Pages o localhost) a los dominios autorizados.
  5. Copiar la configuración web.

  Esa configuración es pública; la seguridad se define con reglas de Firestore.

### Alternativa descartada por ahora: Nivel 2

Edición simultánea dentro del mismo bloque con cursores de colores (Yjs más un servidor de sincronización). Descartada por el esfuerzo (reescribir buena parte del editor); queda para la versión 3.0.
