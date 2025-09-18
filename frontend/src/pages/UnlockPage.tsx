import type { FC } from 'react'

const UnlockPage: FC = () => (
  <section className="page" aria-labelledby="unlock-title">
    <div className="page-header surface">
      <h1 id="unlock-title">Unlock a protected PDF</h1>
      <p>
        This guided flow will soon let you upload a password-protected PDF, confirm that you
        own the document, and export an unrestricted copy for editing and collaboration.
      </p>
    </div>

    <div className="placeholder-card surface" role="status" aria-live="polite">
      <p className="page-lead">
        The unlocking form is on its way. In the meantime, review the preparation checklist
        below so you are ready when the uploader arrives.
      </p>
    </div>

    <div className="info-grid" role="list">
      <article className="info-card surface" role="listitem">
        <h2>Preparation checklist</h2>
        <ul className="bullet-list">
          <li>Locate the original password or owner permissions for the document.</li>
          <li>Confirm that you are authorised to remove restrictions from the PDF.</li>
          <li>
            Decide whether you want to keep metadata, annotations, or digital signatures when
            exporting the unlocked copy.
          </li>
        </ul>
      </article>
      <article className="info-card surface" role="listitem">
        <h2>What happens next?</h2>
        <p>
          We will guide you through uploading the file, verifying ownership, and choosing the
          exact restrictions to lift. Expect support for bulk operations and automated
          retention policies soon.
        </p>
      </article>
    </div>
  </section>
)

export default UnlockPage
