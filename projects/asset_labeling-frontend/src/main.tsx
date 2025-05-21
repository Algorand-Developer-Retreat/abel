import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './Assets'
import './styles/main.css'
import ErrorBoundary from './layout/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App id={BigInt(import.meta.env.VITE_APP_ID || 2914159523n)} />
    </ErrorBoundary>
  </React.StrictMode>,
)
