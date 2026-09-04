import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React Error Boundary]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-500 font-bold text-xl">
              +
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">DEATurnos HomeCare</h2>
              <p className="text-slate-400 text-sm">
                Se detectó una sesión previa desactualizada en la memoria caché del navegador.
              </p>
            </div>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => caches.delete(name));
                    });
                  }
                } catch (e) {}
                this.setState({ hasError: false, error: null });
                window.location.replace('/');
              }}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl shadow-lg shadow-pink-600/30 transition-all duration-200"
            >
              Reiniciar Sesión y Cargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
