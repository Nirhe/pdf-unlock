import type { FC } from 'react'

const HomePage: FC = () => (
  <section className="page" aria-labelledby="home-title">
    <div className="page-hero surface">
      <p className="page-eyebrow">PDF Unlock</p>
      <h1 id="home-title">Effortless PDF unlocking for every workflow</h1>
      <p className="page-lead">
        Securely remove passwords and usage restrictions from your PDF documents. Upload
        a file, choose the unlock options that fit your needs, and download the document in
        seconds.
      </p>
      <div className="action-row">
        <a className="primary-button" href="#/unlock">
          Start unlocking
        </a>
        <a className="secondary-button" href="#/about">
          Learn about the project
        </a>
      </div>
    </div>

    <div className="feature-grid" role="list">
      <article className="feature-card surface" role="listitem">
        <h2>Privacy first</h2>
        <p>
          Files stay on your device while we prepare the unlocking workflow. Nothing is
          stored on external servers.
        </p>
      </article>
      <article className="feature-card surface" role="listitem">
        <h2>Guided experience</h2>
        <p>
          Step-by-step prompts walk you through decrypting a file, making the process
          approachable even if you are new to PDFs.
        </p>
      </article>
      <article className="feature-card surface" role="listitem">
        <h2>Productivity ready</h2>
        <p>
          Coming soon: integrations with your favourite cloud providers to streamline team
          workflows and archive unlocked documents automatically.
        </p>
      </article>
    </div>
  </section>
)

export default HomePage
