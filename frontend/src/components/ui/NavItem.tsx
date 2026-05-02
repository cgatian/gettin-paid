import { Link } from '@tanstack/react-router'
import { css } from 'styled-system/css'
import type { LucideIcon } from 'lucide-react'

const navLinkClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  px: '3',
  py: '2',
  borderRadius: 'card',
  fontSize: 'base',
  color: 'foregroundMuted',
  fontWeight: 'normal',
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'background-color 120ms ease, color 120ms ease',
  userSelect: 'none',
  _hover: {
    bg: 'navHover',
    color: 'foreground',
  },
  '&[data-status="active"]': {
    bg: 'navActive',
    color: 'foreground',
    fontWeight: 'medium',
  },
})

const externalLinkClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  px: '3',
  py: '2',
  borderRadius: 'card',
  fontSize: 'base',
  color: 'foregroundMuted',
  fontWeight: 'normal',
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'background-color 120ms ease, color 120ms ease',
  _hover: {
    bg: 'navHover',
    color: 'foreground',
  },
})

interface NavItemProps {
  to: string
  label: string
  icon: LucideIcon
  external?: boolean
}

export function NavItem({ to, label, icon: Icon, external }: NavItemProps) {
  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={externalLinkClass}>
        <Icon size={16} strokeWidth={1.5} />
        <span>{label}</span>
      </a>
    )
  }

  return (
    <Link to={to} className={navLinkClass}>
      <Icon size={16} strokeWidth={1.5} />
      <span>{label}</span>
    </Link>
  )
}
