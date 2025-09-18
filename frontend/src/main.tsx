import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ApiProvider } from './api'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiProvider baseUrl={apiBaseUrl}>
      <App />
    </ApiProvider>
  </StrictMode>,
)
