import type { FC } from 'react'

const AboutPage: FC = () => (
  <section className="page" aria-labelledby="about-title">
    <div className="page-header surface">
      <h1 id="about-title">Built for secure document collaboration</h1>
      <p>
        The PDF Unlock project focuses on transparent tooling for handling sensitive files.
        We believe removing restrictions should be simple, auditable, and respectful of the
        people who own the documents.
      </p>
    </div>

    <div className="info-grid" role="list">
      <article className="info-card surface" role="listitem">
        <h2>Why unlock PDFs?</h2>
        <p>
          Password-protected documents help keep information secure, yet the same controls can
          slow down collaboration. Providing a safe, user-friendly way to remove those locks
          keeps teams moving without compromising trust.
        </p>
      </article>
      <article className="info-card surface" role="listitem">
        <h2>What to expect next</h2>
        <p>
          Upcoming iterations will introduce role-based access, audit logs for every unlock
          operation, and automated clean-up routines so you can meet internal compliance goals.
        </p>
      </article>
      <article className="info-card surface" role="listitem">
        <h2>How to contribute</h2>
        <p>
          We are actively drafting the core unlocking workflow. Share feedback, report issues,
          or suggest integrations to help shape the roadmap and make the tool fit real-world
          teams.
        </p>
      </article>
    </div>
  </section>
)

export default AboutPage
