import { useEffect, useRef } from 'react';

interface ModalEntry {
  close: () => void;
  closedByPop: boolean;
}

// Pila global de modales abiertos: el atrás del sistema cierra solo el de arriba.
const modalStack: ModalEntry[] = [];
let listenerAttached = false;
// Cuando un modal se cierra con la X/backdrop consumimos su entrada de historial
// con history.back(); ese popstate es nuestro y NO debe cerrar otro modal.
let suppressPops = 0;
let afterSettled: (() => void)[] = [];

function attachListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener('popstate', () => {
    if (suppressPops > 0) {
      suppressPops--;
      if (suppressPops === 0) {
        const pending = afterSettled;
        afterSettled = [];
        pending.forEach((run) => run());
      }
      return;
    }
    const top = modalStack[modalStack.length - 1];
    if (top) {
      top.closedByPop = true;
      modalStack.pop();
      top.close();
    }
  });
}

/**
 * Abre lo siguiente solo cuando el historial del modal anterior ya se consumió:
 * un pushState mientras history.back() está pendiente puede cancelar ese retroceso
 * y dejar el atrás del sistema desfasado.
 */
export function runAfterModalClosed(run: () => void) {
  setTimeout(() => {
    if (suppressPops > 0) afterSettled.push(run);
    else run();
  }, 0);
}

/**
 * Integra un modal/bottom sheet con el historial del navegador para que el
 * botón (o gesto) de atrás del sistema lo cierre, en lugar de navegar de
 * página o cerrar la PWA perdiendo lo que el usuario estaba escribiendo.
 *
 * Uso: useModalHistory(isOpen, onClose)
 * Soporta modales anidados (formulario → calculadora): el atrás cierra
 * primero el más reciente.
 */
export function useModalHistory(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    attachListener();

    const entry: ModalEntry = {
      close: () => onCloseRef.current(),
      closedByPop: false,
    };
    modalStack.push(entry);
    window.history.pushState({ ...window.history.state, modal: modalStack.length }, '');

    return () => {
      if (entry.closedByPop) return;
      // Cerrado con la X o el backdrop: retirar de la pila y consumir la
      // entrada de historial que este modal había empujado, suprimiendo el
      // popstate resultante para no cerrar el modal que quede debajo.
      const index = modalStack.indexOf(entry);
      if (index !== -1) modalStack.splice(index, 1);
      if (window.history.state?.modal) {
        suppressPops++;
        window.history.back();
      }
    };
  }, [isOpen]);
}
