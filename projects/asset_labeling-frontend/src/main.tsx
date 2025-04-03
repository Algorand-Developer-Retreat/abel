import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './Assets'
import './styles/main.css'
import ErrorBoundary from './layout/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App appId={BigInt(import.meta.env.VITE_APP_ID || 1n)} />
    </ErrorBoundary>
  </React.StrictMode>,
)
