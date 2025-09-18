import './App.css'

type WorkflowStep = {
  id: number
  title: string
  description: string
  highlight?: boolean
}

type Stakeholder = {
  name: string
  label: string
  description: string
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 1,
    title: 'Select Customer & PDF',
    description:
      'Choose the customer record from QuickBooks and upload the PDF that should be sent through the secure workflow.',
  },
  {
    id: 2,
    title: 'Lock PDF',
    description:
      'Generate an 8-digit access code, lock the PDF, and keep it hidden until the associated payment has been approved.',
  },
  {
    id: 3,
    title: 'Send Unlock Request',
    description:
      'Email the customer a payment link, notify the under processor, and route the document for unlocking once payment clears.',
    highlight: true,
  },
] as const

const stakeholders: Stakeholder[] = [
  {
    name: 'Alon',
    label: 'Initiator',
    description:
      'Creates PDFs that need to be distributed securely to customers through the application.',
  },
  {
    name: 'Under Processor',
    label: 'Automation',
    description:
      'Receives unlock requests from the backend and ensures the right agent handles each payment.',
  },
  {
    name: 'Customer',
    label: 'Recipient',
    description:
      'Completes the QuickBooks payment and receives the unlocked document once approved.',
  },
] as const

const projectFeatures = [
  'User interface for selecting a customer and a PDF file that should be sent.',
  'Functionality of generating a random 8-digit code that will be shown to the customer only after the payment has been approved by QuickBooks.',
  'Functionality of sending an email to a specific customer with the PDF file and a link to the QuickBooks payment page.',
] as const

const quickbooksIntegrations = [
  'Receiving customers via their QuickBooks ID, name, and email address.',
  'Getting the status of the payment page for a specific customer and payment request.',
  'Updating the QuickBooks customer record with the auto-generated password.',
  'Adding the auto-generated password that will be presented to the user after the payment has been processed and approved.',
] as const

const generalProcess = [
  'As part of our software development cycle, we start by creating clear software design documents which will be reviewed with the client before the implementation phase will start. During and after the software implementation phase we will provide several versions of early stage product releases to receive customer feedback as early as possible and to make sure the end product will meet the customer\'s expectations.',
  'Any changes that will be required during the intermediate releases will be assessed and discussed. If they present a change in scope they might need to be implemented instead of other requirements or will require additional payment. No changes that will require additional payments will be implemented without the written consent of the client.',
] as const

function App() {
  return (
    <div className="app">
      <header className="hero">
        <div className="hero__content">
          <div className="hero__top">
            <div className="hero__brand">
              <div className="hero__logo">VIS2</div>
              <div>
                <span className="hero__company">VIS2MIS</span>
                <p className="hero__tagline">The source of the record</p>
              </div>
            </div>
            <div className="hero__contact">
              <a href="mailto:info@vis2mis.com">info@vis2mis.com</a>
              <a href="https://www.vis2mis.com" target="_blank" rel="noreferrer">
                www.vis2mis.com
              </a>
            </div>
          </div>
          <div className="hero__body">
            <span className="hero__pill">Custom customer application</span>
            <h1 className="hero__title">Alon's Application</h1>
            <p className="hero__subtitle">
              A secure workflow that locks PDFs until payment is received and automates updates in QuickBooks.
            </p>
            <div className="hero__actions">
              <a className="hero__cta" href="#project-details">
                Explore the project scope
              </a>
              <span className="hero__note">Design preview · Implementation ready</span>
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="section section--description" id="description">
          <div className="section__header">
            <h2>Description</h2>
            <p>
              The custom application that will be developed will perform the tasks described in the workflow and deliver a
              polished experience for customers, operators, and processors.
            </p>
          </div>
          <div className="workflow">
            <div className="workflow__intro">
              <h3>Customer Application Workflow</h3>
              <p>
                Every request begins with Alon generating a PDF. The application then guides the team through a structured
                locking and payment process before releasing the document to the customer.
              </p>
            </div>
            <div className="workflow__grid">
              {workflowSteps.map((step) => (
                <article
                  key={step.id}
                  className={`step-card${step.highlight ? ' step-card--highlight' : ''}`}
                >
                  <div className="step-card__number">{step.id}</div>
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
            <p className="workflow__note">Key stakeholders that collaborate within the workflow:</p>
            <div className="workflow__roles">
              {stakeholders.map((stakeholder) => (
                <div key={stakeholder.name} className="stakeholder-card">
                  <span className="stakeholder-card__label">{stakeholder.label}</span>
                  <h5>{stakeholder.name}</h5>
                  <p>{stakeholder.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--project" id="project-details">
          <div className="section__header">
            <h2>Project Details</h2>
            <p>The custom application that will be developed will include the following features:</p>
          </div>
          <div className="project-lists">
            <ul className="feature-list">
              {projectFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="feature-panel">
              <h3>QuickBooks Integrations</h3>
              <ul>
                {quickbooksIntegrations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section section--process">
          <div className="section__header">
            <h2>General Process</h2>
            <p>
              Our delivery model emphasizes collaboration, transparency, and incremental releases to incorporate feedback and
              guarantee a compliant final product.
            </p>
          </div>
          <div className="process-timeline">
            {generalProcess.map((paragraph, index) => (
              <article key={paragraph} className="process-timeline__item">
                <div className="process-timeline__badge">{index + 1}</div>
                <p>{paragraph}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
