import { useState, type FC } from 'react'
import PageSection from '../components/ui/PageSection'
import Surface from '../components/ui/Surface'
import CustomerDropdown from '../components/CustomerDropdown'
import type { QuickBooksCustomer } from '../api'
import PdfUploader from '../components/PdfUploader'

const UnlockPage: FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<QuickBooksCustomer | null>(null)
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)

  return (
    <PageSection aria-labelledby="unlock-title">
      <Surface className="grid gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="unlock-title">
          Unlock a protected PDF
        </h1>
        <p className="text-base leading-relaxed text-slate-600">
          This guided flow will soon let you upload a password-protected PDF, confirm that you own the document, and export an
          unrestricted copy for editing and collaboration.
        </p>
      </Surface>

      <Surface className="grid gap-5">
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold text-slate-900" id="pdf-upload-title">
            Upload your restricted PDF
          </h2>
          <p className="text-base leading-relaxed text-slate-600">
            Drag and drop your locked document into the area below or browse to choose a file. We currently accept PDF files
            with the <strong>.pdf</strong> extension only.
          </p>
        </div>
        <PdfUploader ariaLabelledBy="pdf-upload-title" onFileChange={setSelectedPdf} />
        <p className="text-sm text-slate-600" aria-live="polite">
          {selectedPdf
            ? `Ready to unlock ${selectedPdf.name}. Upload a different PDF to replace it.`
            : 'No PDF uploaded yet. Select a file to begin.'}
        </p>
      </Surface>

      <Surface className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900">QuickBooks customer lookup</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Search your connected QuickBooks customers to prefill invoices or associate uploads with the right account. Start
          typing a name or email address to filter the list.
        </p>
        <CustomerDropdown
          label="Select a customer"
          placeholder="Start typing a customer name or email…"
          helperText="Customers sync from QuickBooks automatically. Narrow the search to find the right match quickly."
          required
          name="qbCustomerId"
          onSelect={setSelectedCustomer}
        />
        <p className="text-sm text-slate-600" aria-live="polite">
          {selectedCustomer
            ? `Selected ${selectedCustomer.name} (${selectedCustomer.email}).`
            : 'No customer selected yet.'}
        </p>
      </Surface>

      <div className="grid gap-6 md:grid-cols-2" role="list">
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Preparation checklist</h2>
          <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-600">
            <li>Locate the original password or owner permissions for the document.</li>
            <li>Confirm that you are authorised to remove restrictions from the PDF.</li>
            <li>
              Decide whether you want to keep metadata, annotations, or digital signatures when exporting the unlocked copy.
            </li>
          </ul>
        </Surface>
        <Surface as="article" role="listitem" className="grid gap-4">
          <h2 className="text-xl font-semibold text-slate-900">What happens next?</h2>
          <p className="text-base leading-relaxed text-slate-600">
            We will guide you through uploading the file, verifying ownership, and choosing the exact restrictions to lift. Expect
            support for bulk operations and automated retention policies soon.
          </p>
        </Surface>
      </div>
    </PageSection>
  )
}

export default UnlockPage
