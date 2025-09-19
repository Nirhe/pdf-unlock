import type { ComponentPropsWithoutRef, ElementType } from 'react'

type SurfaceProps<C extends ElementType> = {
  as?: C
  className?: string
} & Omit<ComponentPropsWithoutRef<C>, 'as' | 'className'>

const Surface = <C extends ElementType = 'div'>({ as, className, ...props }: SurfaceProps<C>) => {
  const Component = as ?? 'div'
  const baseClasses =
    'rounded-3xl border border-slate-200/50 bg-white/90 p-6 shadow-floating backdrop-blur-sm sm:p-8'

  return <Component className={`${baseClasses}${className ? ` ${className}` : ''}`} {...props} />
}

export default Surface
