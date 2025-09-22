import type { FC } from 'react'
import Button from '../components/ui/Button'
import PageSection from '../components/ui/PageSection'
import Surface from '../components/ui/Surface'
import { useTranslations } from '../i18n/useTranslations.js'

const HomePage: FC = () => {
  const { t } = useTranslations()
  const brandName = t('brand.name')

  return (
    <PageSection aria-labelledby="home-title">
      <Surface className="grid gap-5 bg-gradient-to-br from-blue-600/15 via-blue-500/10 to-blue-500/5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{brandName}</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="home-title">
          {t('home.title')}
        </h1>
        <p className="text-lg leading-relaxed text-slate-600">
          {t('home.description', { brand: brandName })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button as="a" href="#/lock">
            {t('home.ctaPrimary')}
          </Button>
          <Button as="a" href="#/about" variant="secondary">
            {t('home.ctaSecondary', { brand: brandName })}
          </Button>
        </div>
      </Surface>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="list">
        <Surface as="article" role="listitem" className="grid gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{t('home.strongProtection.title')}</h2>
          <p className="text-base leading-relaxed text-slate-600">{t('home.strongProtection.copy')}</p>
        </Surface>
        <Surface as="article" role="listitem" className="grid gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{t('home.guidedExperience.title')}</h2>
          <p className="text-base leading-relaxed text-slate-600">{t('home.guidedExperience.copy')}</p>
        </Surface>
        <Surface as="article" role="listitem" className="grid gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{t('home.complianceReady.title')}</h2>
          <p className="text-base leading-relaxed text-slate-600">{t('home.complianceReady.copy')}</p>
        </Surface>
      </div>
    </PageSection>
  )
}

export default HomePage
