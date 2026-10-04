// Arrastrar y soltar bloques.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ============================================================================
// DRAG & DROP - REORDENAR BLOQUES
// ============================================================================

let draggedElement = null;
let draggedIndex = null;

function initializeDragAndDrop() {
    const containers = document.querySelectorAll('.block-card-container');

    containers.forEach((container, index) => {
        container.setAttribute('draggable', 'true');
        container.setAttribute('data-index', index);

        // Al seleccionar texto dentro de un campo, la tarjeta no se arrastra
        container.addEventListener('mousedown', function(e) {
            this.setAttribute('draggable', e.target.closest('.rich-editor, input, textarea, select') ? 'false' : 'true');
        });

        container.addEventListener('dragstart', function(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.getAttribute('data-index'));
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        container.addEventListener('dragend', function(e) {
            draggedIndex = null;
            this.setAttribute('draggable', 'true');
            this.classList.remove('dragging');
            containers.forEach(c => c.classList.remove('drag-over'));
        });

        container.addEventListener('dragover', function(e) {
            e.preventDefault();
            const currentIndex = parseInt(this.getAttribute('data-index'));
            if (currentIndex !== draggedIndex) {
                this.classList.add('drag-over');
            }
            return false;
        });

        container.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });

        container.addEventListener('drop', function(e) {
            // Texto soltado dentro de un campo: lo maneja el navegador
            if (draggedIndex === null) return;
            e.preventDefault();
            const dropIndex = parseInt(this.getAttribute('data-index'));

            if (dropIndex !== draggedIndex) {
                moveBlock(draggedIndex, dropIndex);
            }

            this.classList.remove('drag-over');
            return false;
        });
    });
}

function moveBlock(fromIndex, toIndex) {
    const movedBlock = reportData.splice(fromIndex, 1)[0];
    reportData.splice(toIndex, 0, movedBlock);
    render();
    console.log(`Bloque movido de posición ${fromIndex} a ${toIndex}`);
}
