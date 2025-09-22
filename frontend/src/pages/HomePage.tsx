import type { FC } from 'react'
import Button from '../components/ui/Button'
import PageSection from '../components/ui/PageSection'
import Surface from '../components/ui/Surface'

const HomePage: FC = () => (
  <PageSection aria-labelledby="home-title">
    <Surface className="grid gap-5 bg-gradient-to-br from-blue-600/15 via-blue-500/10 to-blue-500/5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">PDF Lock</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="home-title">
        Password-protect PDFs in one guided flow
      </h1>
      <p className="text-lg leading-relaxed text-slate-600">
        Upload a document, confirm the QuickBooks customer who should receive it, and generate a strong password before the PDF
        is delivered. PDF Lock keeps sensitive files protected until payment is complete.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button as="a" href="#/lock">
          Start locking
        </Button>
        <Button as="a" href="#/about" variant="secondary">
          Learn how PDF Lock works
        </Button>
      </div>
    </Surface>

    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="list">
      <Surface as="article" role="listitem" className="grid gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Strong protection</h2>
        <p className="text-base leading-relaxed text-slate-600">
          We generate complex passwords, encrypt the PDF, and surface the credentials only after the invoice is paid.
        </p>
      </Surface>
      <Surface as="article" role="listitem" className="grid gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Guided experience</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Step-by-step prompts keep you informed while we upload the file, confirm customer details, and secure the document.
        </p>
      </Surface>
      <Surface as="article" role="listitem" className="grid gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Compliance ready</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Designed for audit trails and retention policies, so your team can share protected PDFs without sacrificing oversight.
        </p>
      </Surface>
    </div>
  </PageSection>
)

export default HomePage
