import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { useHashRouter } from './hooks/useHashRouter'
import AboutPage from './pages/AboutPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import LockPage from './pages/LockPage'

type RouteDefinition = {
  path: string
  label: string
  element: ReactNode
}

const routes: RouteDefinition[] = [
  { path: '/', label: 'Home', element: <HomePage /> },
  { path: '/unlock', label: 'Lock', element: <LockPage /> },
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
  const navLinkBase =
    'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 md:px-5'

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-200 via-slate-50 to-white text-slate-900">
      <a
        className="absolute left-4 top-4 -translate-x-[120%] -translate-y-[120%] rounded-full bg-blue-600 px-4 py-2 font-semibold text-slate-50 shadow-lg shadow-blue-600/40 transition-transform duration-150 focus-visible:translate-x-0 focus-visible:translate-y-0 focus-visible:outline-none"
        href="#main-content"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-6 bg-slate-900/95 px-6 py-4 text-slate-50 shadow-lg shadow-slate-900/30 backdrop-blur sm:px-10">
        <a
          className="inline-flex items-center gap-2 text-lg font-semibold uppercase tracking-[0.12em] text-slate-50 transition-transform duration-150 hover:-translate-y-0.5"
          href="#/"
          aria-label="PDF Unlock home"
        >
          <span className="text-2xl" aria-hidden="true">
            🔓
          </span>
          <span className="hidden text-sm tracking-[0.3em] sm:inline">PDF Unlock</span>
        </a>
        <nav className="ml-auto" aria-label="Primary">
          <ul className="flex flex-wrap items-center gap-3">
            {routes.map((route) => (
              <li key={route.path}>
                <a
                  href={`#${route.path}`}
                  className={`${navLinkBase} ${
                    path === route.path
                      ? 'bg-slate-50/20 text-white shadow-floating'
                      : 'text-slate-200 hover:bg-slate-50/10 hover:text-white'
                  }`}
                  aria-current={path === route.path ? 'page' : undefined}
                >
                  {route.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main
        className="flex flex-1 justify-center px-4 py-12 sm:px-8 lg:px-12"
        id="main-content"
        tabIndex={-1}
      >
        <div className="w-full max-w-5xl">{mainContent}</div>
      </main>
      <footer className="border-t border-slate-200/60 bg-white/80 px-4 py-6 text-center text-sm text-slate-500 shadow-inner sm:px-8 lg:px-12">
        <p>© {currentYear} PDF Unlock. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
