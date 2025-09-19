import type { FC } from 'react'
import Button from '../components/ui/Button'
import PageSection from '../components/ui/PageSection'
import Surface from '../components/ui/Surface'

const HomePage: FC = () => (
  <PageSection aria-labelledby="home-title">
    <Surface className="grid gap-5 bg-gradient-to-br from-blue-600/15 via-blue-500/10 to-blue-500/5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">PDF Unlock</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl" id="home-title">
        Effortless PDF unlocking for every workflow
      </h1>
      <p className="text-lg leading-relaxed text-slate-600">
        Securely remove passwords and usage restrictions from your PDF documents. Upload a file, choose the unlock options that
        fit your needs, and download the document in seconds.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button as="a" href="#/unlock">
          Start unlocking
        </Button>
        <Button as="a" href="#/about" variant="secondary">
          Learn about the project
        </Button>
      </div>
    </Surface>

    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="list">
      <Surface as="article" role="listitem" className="grid gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Privacy first</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Files stay on your device while we prepare the unlocking workflow. Nothing is stored on external servers.
        </p>
      </Surface>
      <Surface as="article" role="listitem" className="grid gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Guided experience</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Step-by-step prompts walk you through decrypting a file, making the process approachable even if you are new to PDFs.
        </p>
      </Surface>
      <Surface as="article" role="listitem" className="grid gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Productivity ready</h2>
        <p className="text-base leading-relaxed text-slate-600">
          Coming soon: integrations with your favourite cloud providers to streamline team workflows and archive unlocked
          documents automatically.
        </p>
      </Surface>
    </div>
  </PageSection>
)

export default HomePage
