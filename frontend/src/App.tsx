import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { useTranslations, type MessageKey } from './i18n/useTranslations.js'
import { useHashRouter } from './hooks/useHashRouter'
import AboutPage from './pages/AboutPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import LockPage from './pages/LockPage'

type RouteDefinition = {
  path: string
  labelKey: MessageKey
  element: ReactNode
}

const routes: RouteDefinition[] = [
  { path: '/', labelKey: 'nav.home', element: <HomePage /> },
  { path: '/lock', labelKey: 'nav.lock', element: <LockPage /> },
  { path: '/about', labelKey: 'nav.about', element: <AboutPage /> },
]

function App() {
  const { path, rawPath, navigate } = useHashRouter()
  const { t } = useTranslations()

  const activeRoute = useMemo(
    () => routes.find((route) => route.path === path),
    [path],
  )

  useEffect(() => {
    if (rawPath === '/unlock') {
      navigate('/lock')
    }
  }, [rawPath, navigate])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const pageLabel = activeRoute ? t(activeRoute.labelKey) : t('app.notFound')
    document.title = t('app.documentTitle', {
      page: pageLabel,
      brand: t('brand.name'),
    })
  }, [activeRoute, t])

  const mainContent = activeRoute?.element ?? (
    <NotFoundPage onNavigateHome={() => navigate('/')} />
  )
  const currentYear = new Date().getFullYear()
  const navLinkBase =
    'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 md:px-5'
  const brandName = t('brand.name')

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-200 via-slate-50 to-white text-slate-900">
      <a
        className="absolute left-4 top-4 -translate-x-[120%] -translate-y-[120%] rounded-full bg-blue-600 px-4 py-2 font-semibold text-slate-50 shadow-lg shadow-blue-600/40 transition-transform duration-150 focus-visible:translate-x-0 focus-visible:translate-y-0 focus-visible:outline-none"
        href="#main-content"
      >
        {t('app.skipToContent')}
      </a>
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-6 bg-slate-900/95 px-6 py-4 text-slate-50 shadow-lg shadow-slate-900/30 backdrop-blur sm:px-10">
        <a
          className="inline-flex items-center gap-2 text-lg font-semibold uppercase tracking-[0.12em] text-slate-50 transition-transform duration-150 hover:-translate-y-0.5"
          href="#/"
          aria-label={t('nav.homeAria', { brand: brandName })}
        >
          <span className="text-2xl" aria-hidden="true">
            🔒
          </span>
          <span className="hidden text-sm tracking-[0.3em] sm:inline">{brandName}</span>
        </a>
        <nav className="ml-auto" aria-label={t('nav.primaryLabel')}>
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
                  {t(route.labelKey)}
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
        <p>
          © {currentYear} {brandName}. {t('app.footer.rights')}
        </p>
      </footer>
    </div>
  )
}

export default App
