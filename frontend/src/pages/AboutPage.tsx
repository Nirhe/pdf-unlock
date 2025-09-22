import type { FC } from 'react'
import PageSection from '../components/ui/PageSection'
import Surface from '../components/ui/Surface'
import { useTranslations } from '../i18n/useTranslations.js'

const AboutPage: FC = () => {
  const { t } = useTranslations()
  const brandName = t('brand.name')

  return (
    <PageSection aria-labelledby="about-title">
      <Surface className="grid gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="about-title">
          {t('about.title')}
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          {t('about.description', { brand: brandName })}
        </p>
      </Surface>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="list">
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">{t('about.why.title')}</h2>
          <p className="text-base leading-relaxed text-slate-600">
            {t('about.why.copy', { brand: brandName })}
          </p>
        </Surface>
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">{t('about.expect.title')}</h2>
          <p className="text-base leading-relaxed text-slate-600">{t('about.expect.copy')}</p>
        </Surface>
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">{t('about.contribute.title')}</h2>
          <p className="text-base leading-relaxed text-slate-600">{t('about.contribute.copy')}</p>
        </Surface>
      </div>
    </PageSection>
  )
}

export default AboutPage
