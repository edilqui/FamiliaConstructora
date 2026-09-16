import { useNavigate } from 'react-router-dom';

/**
 * Botón "atrás" unificado: vuelve a la pantalla desde la que se llegó si hay
 * historial dentro de la app; si se entró directo (enlace, recarga, PWA),
 * navega a la ruta padre indicada como fallback.
 */
export function useSmartBack(fallback: string) {
  const navigate = useNavigate();
  return () => {
    // React Router guarda su índice de historial en history.state.idx
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}
