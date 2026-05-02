import { cva } from 'styled-system/css'
import type { HTMLAttributes, ReactNode } from 'react'

const badgeVariants = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 'sm',
    px: '2',
    py: '1',
    fontSize: 'xs',
    fontWeight: 'semibold',
    lineHeight: '1',
    letterSpacing: '0.02em',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  variants: {
    variant: {
      default: {
        bg: 'navActive',
        color: 'foregroundMuted',
        borderColor: 'border',
      },
      green: {
        bg: 'rgba(66,148,110,0.15)',
        color: 'accentGreen',
        borderColor: 'rgba(66,148,110,0.3)',
      },
      purple: {
        bg: 'rgba(133,59,206,0.15)',
        color: 'accent',
        borderColor: 'rgba(133,59,206,0.3)',
      },
      red: {
        bg: 'rgba(192,57,43,0.15)',
        color: 'danger',
        borderColor: 'rgba(192,57,43,0.3)',
      },
    },
  },
  defaultVariants: { variant: 'default' },
})

type BadgeVariant = 'default' | 'green' | 'purple' | 'red'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: ReactNode
}

export function Badge({ variant, children, className, ...props }: BadgeProps) {
  return (
    <span className={badgeVariants({ variant }) + (className ? ` ${className}` : '')} {...props}>
      {children}
    </span>
  )
}
