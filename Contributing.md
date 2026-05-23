# Guía de Contribución

Gracias por tu interés en contribuir al Generador de Reportes Académicos.

## Cómo Contribuir

### 1. Fork del Repositorio
Haz un fork del proyecto a tu cuenta de GitHub.

### 2. Clona tu Fork
```bash
git clone https://github.com/TU_USUARIO/generador-reportes-academicos.git
cd generador-reportes-academicos
```

### 3. Crea una Rama
```bash
git checkout -b feature/nueva-funcionalidad
```

### 4. Realiza tus Cambios
- Mantén el código limpio y documentado
- Sigue las convenciones de estilo existentes
- Prueba tus cambios antes de hacer commit

### 5. Commit
```bash
git add .
git commit -m "feat: descripción breve del cambio"
```

**Formato de commits:**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (CSS)
- `refactor:` Refactorización de código
- `test:` Agregando pruebas
- `chore:` Mantenimiento

### 6. Push
```bash
git push origin feature/nueva-funcionalidad
```

### 7. Pull Request
Crea un Pull Request en GitHub describiendo tus cambios detalladamente.

---

## Áreas de Contribución

### Código
- Nuevos bloques de contenido
- Mejoras de rendimiento
- Corrección de bugs
- Optimizaciones de exportación

### Diseño
- Nuevos temas institucionales
- Mejoras de UI/UX
- Responsive design
- Accesibilidad

### Documentación
- Corrección de errores
- Nuevos tutoriales
- Traducciones
- Ejemplos de uso

### Pruebas
- Casos de prueba
- Reportes de bugs
- Sugerencias de mejora

---

## Checklist antes de PR

- [ ] El código funciona correctamente
- [ ] No hay errores en la consola del navegador
- [ ] La exportación PDF funciona
- [ ] La exportación TXT funciona
- [ ] El código está documentado con comentarios
- [ ] Se mantiene el estilo minimalista
- [ ] Es compatible con Chrome, Firefox, Safari
- [ ] Los cambios no rompen funcionalidad existente

---

## Guía de Estilo

### JavaScript
- Usar ES6+ cuando sea posible
- Nombres descriptivos de variables y funciones
- Comentarios en español
- Funciones documentadas con JSDoc

Ejemplo:
```javascript
/**
 * Actualiza el contenido de una celda de la tabla
 * @param {number} id - ID del bloque de tabla
 * @param {number} row - Índice de fila
 * @param {number} col - Índice de columna
 * @param {string} value - Nuevo valor
 */
function updateTableCell(id, row, col, value) {
    // Implementación
}
```

### CSS
- Variables CSS para colores de tema
- Nomenclatura en inglés para clases
- Comentarios descriptivos para secciones
- Mobile-first cuando sea posible

Ejemplo:
```css
/* ============================================================================
   NOMBRE DE LA SECCIÓN
   ============================================================================ */
.clase-descriptiva {
    /* Comentario si es necesario */
    property: value;
}
```

### HTML
- Semántico
- Atributos descriptivos
- Indentación consistente

---

## No Contribuir

Por favor **NO** envíes pull requests que:
- Agreguen código malicioso
- Requieran backend o servidor
- Agreguen dependencias externas innecesarias (jQuery, Bootstrap, etc.)
- Cambien la arquitectura fundamental sin discusión previa
- Rompan compatibilidad con navegadores soportados

---

## Reportar Bugs

Si encuentras un bug:

1. Verifica que no esté ya reportado en [Issues](https://github.com/JorgeTSW/generador-reportes-academicos/issues)
2. Crea un nuevo Issue con:
   - Título descriptivo
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Capturas de pantalla si aplica
   - Navegador y versión

---

## Sugerir Funcionalidades

Para sugerir nuevas funcionalidades:

1. Abre un Issue con la etiqueta `enhancement`
2. Describe la funcionalidad detalladamente
3. Explica el caso de uso
4. Si es posible, propón una implementación

---

## Preguntas

Si tienes dudas sobre cómo contribuir:
- Abre un Issue con la etiqueta `question`
- Revisa Issues cerrados por si alguien ya preguntó lo mismo

---

## Código de Conducta

### Nuestro Compromiso

Este proyecto está comprometido con proporcionar un ambiente acogedor y libre de acoso para todos, independientemente de:
- Edad
- Experiencia
- Educación
- Apariencia física
- Nacionalidad
- Religión
- Orientación sexual

### Comportamiento Esperado

- Uso de lenguaje acogedor e inclusivo
- Respeto a diferentes puntos de vista
- Aceptación de crítica constructiva
- Enfoque en lo mejor para la comunidad

### Comportamiento Inaceptable

- Uso de lenguaje o imágenes sexualizadas
- Comentarios insultantes o despectivos
- Acoso público o privado
- Publicar información privada de otros

---

## Licencia

Al contribuir, aceptas que tu código se distribuya bajo la licencia MIT del proyecto.

---

## Agradecimientos

Gracias por ayudar a mejorar este proyecto.

**Desarrolladores que han contribuido:**
- Jorge Javier Pedrozo Romero (Creador)

---

**Última actualización:** Enero 2026
