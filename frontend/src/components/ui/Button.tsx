import type { ComponentPropsWithoutRef, ElementType } from 'react'

type ButtonProps<C extends ElementType> = {
  as?: C
  variant?: 'primary' | 'secondary'
  className?: string
} & Omit<ComponentPropsWithoutRef<C>, 'as' | 'className'>

const Button = <C extends ElementType = 'button'>({
  as,
  variant = 'primary',
  className,
  ...props
}: ButtonProps<C>) => {
  const Component = as ?? 'button'
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
  const variantClasses =
    variant === 'secondary'
      ? 'border border-blue-500/40 bg-blue-500/10 text-blue-600 shadow-sm hover:bg-blue-500/15 focus-visible:outline-blue-400'
      : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-floating hover:from-blue-500 hover:to-blue-500 hover:shadow-lg focus-visible:outline-blue-200'

  const composedClassName = `${baseClasses} ${variantClasses}${className ? ` ${className}` : ''}`

  return <Component className={composedClassName} {...props} />
}

export default Button
