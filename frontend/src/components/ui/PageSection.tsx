import type { ComponentPropsWithoutRef } from 'react'

type PageSectionProps = ComponentPropsWithoutRef<'section'>

const PageSection = ({ className, ...props }: PageSectionProps) => (
  <section
    className={`grid gap-12 text-slate-900${className ? ` ${className}` : ''}`}
    {...props}
  />
)

export default PageSection
