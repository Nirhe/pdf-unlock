import type { FC } from 'react'
import PageSection from '../components/ui/PageSection'
import Surface from '../components/ui/Surface'

const AboutPage: FC = () => (
  <PageSection aria-labelledby="about-title">
    <Surface className="grid gap-4">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="about-title">
        Built for secure document collaboration
      </h1>
      <p className="text-base leading-relaxed text-slate-600">
        PDF Lock provides a reliable way to add password protection to invoices and statements before they leave your business.
        Every interaction is designed to be transparent, auditable, and respectful of the people who trust you with their
        information.
      </p>
    </Surface>

    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="list">
      <Surface as="article" role="listitem" className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">Why lock PDFs?</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Finance teams need a simple way to share statements without exposing sensitive data. PDF Lock encrypts files, sends the
          password automatically, and confirms delivery only after payment is complete.
        </p>
      </Surface>
      <Surface as="article" role="listitem" className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">What to expect next</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Upcoming iterations will introduce role-based access, detailed audit logs for each password delivery, and automated
          retention policies so you can meet internal compliance goals.
        </p>
      </Surface>
      <Surface as="article" role="listitem" className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">How to contribute</h2>
        <p className="text-base leading-relaxed text-slate-600">
          We are actively expanding the locking workflow. Share feedback, report issues, or suggest integrations to help shape
          the roadmap and make the tool fit real-world teams.
        </p>
      </Surface>
    </div>
  </PageSection>
)

export default AboutPage
