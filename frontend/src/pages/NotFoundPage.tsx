import type { FC } from 'react'
import Button from '../components/ui/Button'
import PageSection from '../components/ui/PageSection'
import Surface from '../components/ui/Surface'

type NotFoundPageProps = {
  onNavigateHome: () => void
}

const NotFoundPage: FC<NotFoundPageProps> = ({ onNavigateHome }) => (
  <PageSection aria-labelledby="not-found-title">
    <Surface className="grid gap-4 bg-gradient-to-br from-rose-500/15 via-rose-400/10 to-rose-300/5">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="not-found-title">
        We couldn’t find that page
      </h1>
      <p className="text-base leading-relaxed text-slate-600">
        The link you followed might be out of date or the page may have been moved. Return to the dashboard to continue working
        with your PDF documents.
      </p>
      <Button type="button" onClick={onNavigateHome}>
        Back to home
      </Button>
    </Surface>
  </PageSection>
)

export default NotFoundPage
