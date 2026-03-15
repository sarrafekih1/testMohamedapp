// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.tsx'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )


// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Import des styles SONAM
import './styles/sonam.css'

// ================================
// POLYFILLS & CONFIGURATIONS
// ================================

// Support des navigateurs plus anciens pour les features modernes
if (typeof global === 'undefined') {
  (window as any).global = window
}

// Configuration console pour production
if (import.meta.env.PROD) {
  console.log = () => {}
  console.warn = () => {}
  console.error = () => {}
}

// ================================
// CONFIGURATION ERROR BOUNDARY
// ================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erreur React:', error, errorInfo)
    
    // En production, vous pourriez envoyer l'erreur à un service de monitoring
    if (import.meta.env.PROD) {
      // Exemple: Sentry.captureException(error)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-light p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-semibold text-text-primary mb-2">
              Une erreur s'est produite
            </h1>
            
            <p className="text-text-secondary mb-6">
              L'application a rencontré une erreur inattendue. Veuillez rafraîchir la page.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="bg-sonam-primary hover:bg-sonam-active text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Rafraîchir la page
            </button>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left bg-gray-100 p-4 rounded text-sm">
                <summary className="cursor-pointer font-medium mb-2">
                  Détails de l'erreur (dev only)
                </summary>
                <pre className="whitespace-pre-wrap text-red-600">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ================================
// RENDU PRINCIPAL
// ================================

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

// ================================
// SERVICE WORKER (OPTIONNEL)
// ================================

// Enregistrer le service worker pour le cache offline
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

// ================================
// CONFIGURATION GLOBALE
// ================================

// Configuration des timeouts par défaut
declare global {
  interface Window {
    __SONAM_CONFIG__: {
      version: string
      build: string
      apiUrl: string
    }
  }
}

// Configuration globale SONAM
window.__SONAM_CONFIG__ = {
  version: '1.0.0',
  build: import.meta.env.VITE_BUILD_ID || 'dev',
  apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
}

// Logging pour debugging
if (import.meta.env.DEV) {
  console.log('🚀 SONAM RAG Client démarré')
  console.log('📊 Configuration:', window.__SONAM_CONFIG__)
  console.log('🌍 Environnement:', import.meta.env.MODE)
}
