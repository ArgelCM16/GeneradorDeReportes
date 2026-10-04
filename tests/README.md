# Pruebas automáticas

Las pruebas abren la app en **Chrome sin interfaz**, le inyectan un script que usa la app como lo haría una persona (agregar bloques, escribir, cambiar el formato, exportar...) y revisan el resultado.

## Requisitos

- **Python 3.9 o más reciente** (sin paquetes extra).
- **Google Chrome** o Chromium. Se busca solo; si no lo encuentra, indica la ruta con la variable `CHROME`.
- Opcional: `pip install python-docx` para revisar más a fondo los archivos de Word (sin él solo se revisa que el ZIP y el XML estén bien).

## Cómo correrlas

Desde la carpeta del proyecto:

```bash
python tests/ejecutar.py                    # todas (unos 30 segundos)
python tests/ejecutar.py formato codigo     # solo algunas
python tests/ejecutar.py --lista            # ver cuáles hay
python tests/ejecutar.py --detalle          # con datos de diagnóstico
```

En GitHub corren solas en cada push a `test` o `main` y en cada Pull Request a `main` (`.github/workflows/pruebas.yml`); el resultado sale como ✅ o ❌ junto al commit.

Al final muestra cuántas revisiones salieron bien y mal; si alguna falla, el programa termina con código 1.

## Qué prueba cada una

| Prueba | Qué revisa |
|---|---|
| `nucleo` | Bloques, vista previa, paginación, índice, portada, guardado |
| `perfil` | Asistente de bienvenida, perfil, matrícula, compañeros, campos del encabezado |
| `respaldo` | Exportar e importar el respaldo |
| `herramientas` | Subir, bajar y duplicar bloques, imágenes, deshacer, plantillas, modo oscuro |
| `parrafos` | Negritas, listas, pegar desde Word, citas, seguridad (HTML malicioso) |
| `formato` | Letra, interlineado, márgenes, tamaño de hoja, números de página |
| `revision` | Contador de palabras y revisión antes de entregar |
| `codigo` | Código con colores, detección del lenguaje, números de línea |
| `rendimiento` | Documentos largos: no se reparten las hojas con cada tecla; nada se pierde al imprimir o cerrar |
| `imagenes` | Imágenes reducidas al subirlas |
| `diseno_computadora` / `diseno_celular` / `barra_celular` | Ocultar la vista previa, diseño en celular |
| `word` | Exportar a Word (.docx) |
| `documentos` | Mis documentos (IndexedDB) |
| `pwa` | App instalable y sin internet (service worker) |

## Cómo funcionan

- Cada prueba es un archivo de `casos/` con un `<script>` que, al cargar la página, hace sus acciones y escribe los resultados en `<pre id="TEST_RESULTS">`, una línea por revisión: `PASS ...` o `FAIL ...`.
- La mayoría se abren como archivo (`file://`) con el **tiempo virtual** de Chrome, que es rápido.
- `documentos`, `pwa` y `rendimiento` se sirven por **http y en tiempo real**: el tiempo virtual no espera a IndexedDB ni al service worker. La página incluye una imagen que el servidor no responde hasta que la prueba termina, así Chrome espera.
- Cada prueba usa un perfil de Chrome nuevo y temporal (con ruta corta: con rutas muy largas la caché de Chrome falla).

## Agregar una prueba

1. Copia una de `casos/` como base. Empieza con `closeOnboarding()` y `saveProfile({ onboardingDone: true })` para que no estorbe el asistente.
2. Usa `ok('qué revisa', condición)` para cada revisión.
3. Agrégala a `TESTS` en `ejecutar.py` (con `'ventana': '390,844'` si es de celular, o `'modo': 'http'` si usa IndexedDB o el service worker).
