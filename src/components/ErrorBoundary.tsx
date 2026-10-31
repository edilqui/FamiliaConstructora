import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Evita la pantalla en blanco: si una pantalla falla al renderizar, el usuario
// ve un mensaje y puede recargar o volver al inicio.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error al mostrar la pantalla:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" className="min-h-screen bg-gray-50 flex items-center justify-center px-8 text-center">
        <div className="max-w-sm">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Esta pantalla tuvo un problema</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">Tus datos no se perdieron. Recarga la página o vuelve al inicio.</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <RefreshCw className="w-4 h-4" /> Recargar
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
