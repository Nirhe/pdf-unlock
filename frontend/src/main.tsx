import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ApiProvider } from './api'
import { resolveApiBaseUrl } from './config/resolveApiBaseUrl.js'

const apiBaseUrl = resolveApiBaseUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiProvider baseUrl={apiBaseUrl}>
      <App />
    </ApiProvider>
  </StrictMode>,
)
