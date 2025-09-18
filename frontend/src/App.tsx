import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import './App.css'
import { useHashRouter } from './hooks/useHashRouter'
import AboutPage from './pages/AboutPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import UnlockPage from './pages/UnlockPage'

type RouteDefinition = {
  path: string
  label: string
  element: ReactNode
}

const routes: RouteDefinition[] = [
  { path: '/', label: 'Home', element: <HomePage /> },
  { path: '/unlock', label: 'Unlock', element: <UnlockPage /> },
  { path: '/about', label: 'About', element: <AboutPage /> },
]

function App() {
  const { path, navigate } = useHashRouter()

  const activeRoute = useMemo(
    () => routes.find((route) => route.path === path),
    [path],
  )

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const pageLabel = activeRoute?.label ?? 'Not found'
    document.title = `${pageLabel} | PDF Unlock`
  }, [activeRoute])

  const mainContent = activeRoute?.element ?? (
    <NotFoundPage onNavigateHome={() => navigate('/')} />
  )
  const currentYear = new Date().getFullYear()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="app-header">
        <a className="brand" href="#/" aria-label="PDF Unlock home">
          <span className="brand-icon" aria-hidden="true">
            🔓
          </span>
          <span className="brand-label">PDF Unlock</span>
        </a>
        <nav className="app-nav" aria-label="Primary">
          <ul className="nav-list">
            {routes.map((route) => (
              <li key={route.path}>
                <a
                  href={`#${route.path}`}
                  className={`nav-link${path === route.path ? ' nav-link-active' : ''}`}
                  aria-current={path === route.path ? 'page' : undefined}
                >
                  {route.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="app-main" id="main-content" tabIndex={-1}>
        {mainContent}
      </main>
      <footer className="app-footer">
        <p>© {currentYear} PDF Unlock. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
