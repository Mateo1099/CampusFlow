import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import SentryErrorFallback from './components/ui/SentryErrorFallback.jsx'
import './index.css'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN

if (sentryDsn && typeof sentryDsn === 'string' && sentryDsn.trim() !== '') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={({ error, resetError, eventId }) => (
      <SentryErrorFallback error={error} resetError={resetError} eventId={eventId} />
    )}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)

