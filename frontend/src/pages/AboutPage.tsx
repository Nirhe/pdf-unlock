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
        The PDF Unlock project focuses on transparent tooling for handling sensitive files. We believe removing restrictions
        should be simple, auditable, and respectful of the people who own the documents.
      </p>
    </Surface>

    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="list">
      <Surface as="article" role="listitem" className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">Why unlock PDFs?</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Password-protected documents help keep information secure, yet the same controls can slow down collaboration. Providing
          a safe, user-friendly way to remove those locks keeps teams moving without compromising trust.
        </p>
      </Surface>
      <Surface as="article" role="listitem" className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">What to expect next</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Upcoming iterations will introduce role-based access, audit logs for every unlock operation, and automated clean-up
          routines so you can meet internal compliance goals.
        </p>
      </Surface>
      <Surface as="article" role="listitem" className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">How to contribute</h2>
        <p className="text-base leading-relaxed text-slate-600">
          We are actively drafting the core unlocking workflow. Share feedback, report issues, or suggest integrations to help
          shape the roadmap and make the tool fit real-world teams.
        </p>
      </Surface>
    </div>
  </PageSection>
)

export default AboutPage
