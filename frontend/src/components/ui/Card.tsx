import { css, cx } from 'styled-system/css'
import type { HTMLAttributes, ReactNode } from 'react'

const cardBase = css({
  bg: 'surface',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'card',
  overflow: 'hidden',
  transition: 'border-color 120ms ease',
})

const cardInteractive = css({
  cursor: 'pointer',
  _hover: { borderColor: 'borderSubtle' },
})

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
}

export function Card({ children, interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cx(cardBase, interactive ? cardInteractive : undefined, className)}
      {...props}
    >
      {children}
    </div>
  )
}

export const cardHeader = css({
  px: '4',
  py: '3',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'border',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

export const cardBody = css({
  p: '4',
})
