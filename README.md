# Generador de Reportes Académicos

> Herramienta web profesional para crear reportes académicos con vista previa en tiempo real

![Versión](https://img.shields.io/badge/versión-2.0.0-blue)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)
![Estado](https://img.shields.io/badge/estado-activo-success)

---

## Descripción

Aplicación web 100% cliente para generar documentos académicos profesionales con múltiples tipos de bloques: encabezados, títulos, párrafos, código, imágenes, **tablas**, referencias IEEE y **declaración de uso de IA**.

### Características Principales

- **Guardar y Cargar Proyectos**: Sistema completo para guardar trabajo en JSON y continuarlo después
- **9 Tipos de Bloques**: Encabezado, Título, Subtítulo, Párrafo, Código, Imagen, Tabla, Referencia, Declaración IA
- **3 Temas Institucionales**: TSW, UPY, UPP con paletas personalizadas
- **Tablas Profesionales**: Grid visual de 1-6 columnas con diseño académico
- **Declaración de IA**: Sistema completo para documentar uso de herramientas de IA
- **Exportación Triple**: PDF (impresión), TXT y JSON (proyecto completo)
- **Seguro**: Protección XSS completa
- **Responsive**: Funciona en desktop, tablet y móvil
- **Sin Backend**: Todo en el navegador, sin servidor

---

## Guardar y Cargar Proyectos

### Funcionalidad de Persistencia:
- **Guardar Proyecto**: Exporta el trabajo completo como archivo JSON
- **Cargar Proyecto**: Restaura proyectos guardados previamente
- **Formato**: JSON con todos los bloques, tema y metadatos
- **Nombre automático**: `reporte_YYYY-MM-DD_HH-MM.json`

### Casos de Uso:
- **Trabajo en múltiples sesiones**: Guarda y continúa después
- **Respaldo**: Mantén versiones de tu trabajo
- **Colaboración**: Comparte proyectos con compañeros
- **Recuperación**: No pierdas datos si se cierra el navegador

### Características:
- Validación de archivos JSON
- Confirmación antes de sobrescribir trabajo actual
- Restauración completa de bloques y tema
- Manejo robusto de errores
- Timestamp automático

---

## Demo en Vivo

**GitHub Pages:** [https://JorgeTSW.github.io/generador-reportes-academicos/](https://JorgeTSW.github.io/generador-reportes-academicos/)

---

## Capturas de Pantalla

### Drag & Drop Feature

![Drag and Drop](./SCREENSHOTS/Drag-Drop-Feature.gif)

### Save & Load Feature

![Drag and Drop](./SCREENSHOTS/Save-Load-Feature.gif)

---

## Temas Disponibles

### TSW - Tecnológico de Software
- Azul Oscuro (#2C2E5C) + Cyan (#00B8E6)
- Estilo moderno y tecnológico

### UPY - Universidad Politécnica de Yucatán
- Morado (#5B1F8C) + Oro (#F5A623)
- Elegante y distintivo

### UPP - Universidad Privada de la Península
- Azul Fuerte (#0047AB) + Rojo (#E31E24)
- Clásico y profesional

---

## Instalación

### Opción 1: Uso Directo (Sin Instalación)

1. Descarga el proyecto:
```bash
git clone https://github.com/JorgeTSW/generador-reportes-academicos.git
```

2. Abre `index.html` en tu navegador

No requiere instalación de dependencias.

### Opción 2: GitHub Pages

Simplemente visita: [https://JorgeTSW.github.io/generador-reportes-academicos/](https://JorgeTSW.github.io/generador-reportes-academicos/)

---

## Uso Rápido

### 1. Seleccionar Tema
Usa el selector en la parte superior de la barra lateral para elegir tu institución.

### 2. Agregar Bloques
Click en los botones de la barra lateral:
- **Encabezado** - Datos del estudiante
- **Título** - Título del reporte
- **Subtítulo** - Secciones
- **Párrafo** - Texto
- **Código** - Snippets de código
- **Imagen** - Imágenes con descripción
- **Tabla** - Tablas de 1-6 columnas
- **Referencia** - Bibliografía IEEE
- **Declaración IA** - Declaración de uso de IA

### 3. Exportar
- **Imprimir PDF** - Ctrl+P
- **Guardar TXT** - Botón "Guardar TXT"
- **Guardar Proyecto** - Botón "Guardar Proyecto" (JSON)
- **Cargar Proyecto** - Botón "Cargar Proyecto" (JSON)

---

## Sistema de Tablas

### Características:
- **1 a 6 columnas** configurables
- **Grid visual** tipo Excel
- **Agregar/eliminar filas** dinámicamente
- **Numeración automática** (Tabla 1, 2, 3...)
- **Descripción/caption**
- **Word-wrap** en headers y contenido
- **Estilo académico formal**

### Ejemplo:
```
Columnas: 3

┏━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━┓
┃ Header1 ┃ Header2 ┃ Header3 ┃
┣━━━━━━━━━╋━━━━━━━━━╋━━━━━━━━━┫
┃ Dato1   ┃ Dato2   ┃ Dato3   ┃
┗━━━━━━━━━┻━━━━━━━━━┻━━━━━━━━━┛

Tabla 1: Descripción de la tabla
```

---

## Declaración de IA

Sistema completo para cumplir con políticas de integridad académica.

### Opción "NO usé IA":
- Disclaimer automático
- Campo de nombre individual (para equipos)
- Compromiso documentado

### Opción "SÍ usé IA":
- Nombre del estudiante
- IA utilizada (ChatGPT, Claude, Gemini, etc.)
- Fecha de uso
- Propósito
- Prompt completo
- Archivos adjuntos
- Respuesta en crudo (raw)

---

## Estructura del Proyecto

```
generador-reportes-academicos/
├── ASSETS
│   └── favicon.png
├── Contributing.md
├── CSS
│   └── style.css		# Estilos con temas
├── DOCS
├── EXAMPLES			# Carpeta con ejemplos de documentos generados
│   ├── EJEMPLO.pdf
│   └── EJEMPLO.txt
├── index.html			# Aplicación principal
├── JS
│   └── script.js		# Lógica de la aplicación
├── LICENSE
├── README.md
└── SCREENSHOTS			# Carpeta con Screenshots
    ├── S1.png
    ├── S2.png
    └── S3.png
```

---

## Tecnologías

- **HTML5** - Estructura
- **CSS3** - Estilos (Variables CSS, Grid, Flexbox)
- **JavaScript (ES6+)** - Lógica
- **LocalStorage** - Persistencia del tema

### Sin Dependencias Externas
- Sin frameworks
- Sin librerías
- Sin npm
- Sin backend

---

## Seguridad

- Sanitización completa de inputs con `escapeHtml()`
- Protección de atributos con `escapeAttr()`
- Prevención de XSS (Cross-Site Scripting)
- Imágenes Base64 seguras

---

## Compatibilidad

### Navegadores:
- Chrome/Edge 90+

### Dispositivos:
- Desktop (óptimo)
- Tablet
- Móvil (funcional, pero tiene bugs visuales)

---

## Casos de Uso

### Académico:
- Reportes de laboratorio
- Tareas y trabajos
- Proyectos finales
- Investigaciones

### Profesional:
- Documentación técnica
- Reportes de análisis
- Especificaciones
- Manuales

---

## Contribuir

Las contribuciones son bienvenidas.

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

Ver [Contributing.md](Contributing.md) para más detalles.

---

## Reportar Problemas

Si encuentras un bug o tienes una sugerencia:

1. Ve a [Issues](https://github.com/JorgeTSW/generador-reportes-academicos/issues)
2. Click en "New Issue"
3. Describe el problema o sugerencia

---

## Declaración de Uso de Inteligencia Artificial

Este proyecto fue desarrollado con asistencia de herramientas de inteligencia artificial, conforme a las siguientes especificaciones:

### Proceso de Desarrollo:

1. **Estructura Básica (Sin IA)**
   - Idea original
   - HTML base sin estilos CSS
   - Funcionalidades básicas JS del generador
   - Estructura de archivos y organización inicial

2. **Complejización de la Lógica (Claude Sonnet 4.5)**
   - Implementación del sistema de bloques
   - Lógica de exportación PDF/TXT
   - Sistema de tablas con grid visual
   - Gestión de estado y renderizado
   - Protección XSS y sanitización

3. **Personalización y Debug de CSS (Gemini 2.0 Flash)**
   - Sistema de temas institucionales
   - Estilos responsive\*
   - Optimización de tablas académicas
   - Corrección de bugs visuales
   - Ajustes de impresión

### Declaración del Autor:

**Todos los códigos generados por IA fueron exhaustivamente revisados, modificados y adaptados por el autor del proyecto.** El uso de IA fue como herramienta de asistencia en el desarrollo, manteniendo el control total sobre la arquitectura, decisiones de diseño y calidad del código final.

**Autor:** Jorge Javier Pedrozo Romero

---

## Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

## Autor

**Jorge Javier Pedrozo Romero**

- GitHub: [@JorgeTSW](https://github.com/JorgeTSW)
- Email: jorge.pedroza@tecdesoftware.edu.mx
- Institución: Tecnológico de Software

---

## Agradecimientos

- Inspirado en las necesidades de estudiantes de ingeniería
- Diseñado para cumplir con estándares académicos
- Creado para la comunidad educativa

---

## Estadísticas del Proyecto

![GitHub stars](https://img.shields.io/github/stars/JorgeTSW/generador-reportes-academicos?style=social)
![GitHub forks](https://img.shields.io/github/forks/JorgeTSW/generador-reportes-academicos?style=social)
![GitHub issues](https://img.shields.io/github/issues/JorgeTSW/generador-reportes-academicos)

---

## Roadmap

### Versión 2.0.0 (Actual)
- [x] Sistema de guardar/cargar proyectos en JSON
- [x] Persistencia completa del estado
- [x] Validación y manejo de errores robusto

### Versión 3.0 (Futuro)
- [ ] Sincronización con Google Drive
- [ ] Editor colaborativo en tiempo real
- [ ] Sistema de versiones integrado

---

## Si te Gusta este Proyecto

Dale una estrella en GitHub para apoyar el desarrollo.

**Compártelo con tus compañeros.**

---

<div align="center">

**Hecho por Jorge Pedrozo**

[Volver arriba](#generador-de-reportes-académicos)

</div>
#   G e n e r a d o r D e R e p o r t e s  
 