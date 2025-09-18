import type { FC } from 'react'

type NotFoundPageProps = {
  onNavigateHome: () => void
}

const NotFoundPage: FC<NotFoundPageProps> = ({ onNavigateHome }) => (
  <section className="page" aria-labelledby="not-found-title">
    <div className="page-hero surface">
      <h1 id="not-found-title">We couldn’t find that page</h1>
      <p>
        The link you followed might be out of date or the page may have been moved. Return to
        the dashboard to continue working with your PDF documents.
      </p>
      <button type="button" className="primary-button" onClick={onNavigateHome}>
        Back to home
      </button>
    </div>
  </section>
)

export default NotFoundPage
