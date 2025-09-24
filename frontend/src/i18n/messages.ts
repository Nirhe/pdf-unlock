const messages = {
  'brand.name': 'PDF Lock',
  'brand.tagline': 'Password-protect PDFs in one guided flow',

  'app.skipToContent': 'Skip to main content',
  'app.notFound': 'Not found',
  'app.documentTitle': '{page} | {brand}',
  'app.footer.rights': 'All rights reserved.',

  'nav.home': 'Home',
  'nav.lock': 'Lock',
  'nav.about': 'About',
  'nav.homeAria': '{brand} home',
  'nav.primaryLabel': 'Primary',

  'home.title': 'Password-protect PDFs in one guided flow',
  'home.description':
    'Upload a document, confirm the QuickBooks customer who should receive it, and generate a strong password before the PDF is delivered. {brand} keeps sensitive files protected until payment is complete.',
  'home.ctaPrimary': 'Start locking',
  'home.ctaSecondary': 'Learn how {brand} works',
  'home.strongProtection.title': 'Strong protection',
  'home.strongProtection.copy':
    'We generate complex passwords, encrypt the PDF, and surface the credentials only after the invoice is paid.',
  'home.guidedExperience.title': 'Guided experience',
  'home.guidedExperience.copy':
    'Step-by-step prompts keep you informed while we upload the file, confirm customer details, and secure the document.',
  'home.complianceReady.title': 'Compliance ready',
  'home.complianceReady.copy':
    'Designed for audit trails and retention policies, so your team can share protected PDFs without sacrificing oversight.',

  'about.title': 'Built for secure document collaboration',
  'about.description':
    '{brand} provides a reliable way to add password protection to invoices and statements before they leave your business. Every interaction is designed to be transparent, auditable, and respectful of the people who trust you with their information.',
  'about.why.title': 'Why lock PDFs?',
  'about.why.copy':
    'Finance teams need a simple way to share statements without exposing sensitive data. {brand} encrypts files, sends the password automatically, and confirms delivery only after payment is complete.',
  'about.expect.title': 'What to expect next',
  'about.expect.copy':
    'Upcoming iterations will introduce role-based access, detailed audit logs for each password delivery, and automated retention policies so you can meet internal compliance goals.',
  'about.contribute.title': 'How to contribute',
  'about.contribute.copy':
    'We are actively expanding the locking workflow. Share feedback, report issues, or suggest integrations to help shape the roadmap and make the tool fit real-world teams.',

  'lock.title': 'Lock PDF with Password',
  'lock.description':
    'Protect your PDF with a strong, system-generated password. Upload the document, confirm the customer who should receive it, and we will deliver secure access after payment is confirmed.',
  'lock.upload.title': 'Upload the PDF to protect',
  'lock.upload.description':
    'Drag and drop the PDF you want to secure into the area below or browse to choose a file. We currently accept PDF files with the <strong>.pdf</strong> extension only.',
  'lock.upload.ready': 'Ready to lock {fileName}. Upload a different PDF to replace it.',
  'lock.upload.empty': 'No PDF uploaded yet. Select a file to begin.',
  'lock.customer.title': 'QuickBooks customer lookup',
  'lock.customer.description':
    'Search your connected QuickBooks customers to send the locked document to the right account. Start typing a name or email address to filter the list.',
  'lock.customer.selectorLabel': 'Select a customer',
  'lock.customer.selectorPlaceholder': 'Start typing a customer name or email…',
  'lock.customer.selectorHelper':
    'Customers sync from QuickBooks automatically. Narrow the search to find the right match quickly.',
  'lock.customer.selected':
    'Selected {customerName} ({customerEmail}). They will receive the payment email and password.',
  'lock.customer.empty':
    'No customer selected yet. Choose who should receive the locked PDF.',
  'lock.passwordToggle.label': 'Lock with password',
  'lock.passwordToggle.helper':
    'Encrypts the PDF with a system-generated password before it is sent to your customer.',
  'lock.passwordToggle.ariaLabel': 'Learn how locking with a password works',
  'lock.passwordToggle.tooltip':
    'We generate a strong password, email it to your customer, and display it here after payment.',
  'lock.requiredToggleMessage': 'Enable password protection to continue.',
  'lock.preparation.title': 'Preparation checklist',
  'lock.preparation.confirm':
    'Confirm who should receive the locked PDF once payment clears.',
  'lock.preparation.inform': 'Let your customer know a unique password will arrive in their inbox.',
  'lock.preparation.review':
    'Review your retention policies for storing the encrypted document and password.',
  'lock.nextSteps.title': 'What happens next?',
  'lock.nextSteps.description':
    'We will guide you through uploading the file, generating the secure password, and collecting payment. After the invoice is paid, we email the password to your customer and display it below for quick reference.',
  'lock.cta': 'Lock & Generate Payment Link',
  'lock.progress': 'Locking PDF and creating payment link…',
  'lock.helper':
    'We will generate a payment link, lock the PDF, and share the password automatically.',
  'lock.helper.select': 'Select a PDF and customer to enable locking.',
  'lock.helper.enable':
    'Enable password protection, then select a PDF and customer to continue.',
  'lock.testButton': 'Test lock endpoint',
  'lock.testProgress': 'Testing lock endpoint…',
  'lock.testSuccessWithOutput':
    'Lock endpoint succeeded. Output saved to {outputPath}.',
  'lock.testSuccess': 'Lock endpoint succeeded.',
  'lock.testError': 'Unable to complete the lock endpoint test.',
  'lock.paymentLinkReady':
    'Payment link ready. Share it with your customer to confirm the order.',
  'lock.payNow': 'Pay Now',
  'lock.waiting': 'Waiting for payment confirmation…',
  'lock.success':
    'Payment confirmed. Password sent to the customer and available below.',
  'lock.passwordHeader': 'Password',
  'lock.passwordSubheader':
    'Store this password securely. It has also been emailed to the customer.',
  'lock.error.requestFailed': 'Request failed with status {status}',
  'lock.error.invalidResponse': 'Received an invalid response from the server.',
  'lock.error.missingPaymentLink': 'The server response did not include a payment link.',
  'lock.error.missingInvoiceId': 'The server response did not include an invoice ID.',
  'lock.error.missingInvoiceStatus': 'The server response did not include an invoice status.',
  'lock.error.invalidInvoiceStatusResponse':
    'Received an invalid response while checking the invoice status.',
  'lock.error.sendFailed': 'Unable to send the document.',
  'lock.error.statusFailed': 'Unable to fetch the invoice status.',
} as const

export type Messages = typeof messages
export type MessageKey = keyof Messages

export default messages
