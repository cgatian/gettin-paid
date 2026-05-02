import { css } from 'styled-system/css'
import { Archive, FilePlus, Info } from 'lucide-react'
import { NavItem } from '#/components/ui/NavItem'

const sidebarClass = css({
  w: 'sidebar',
  flexShrink: '0',
  h: '100vh',
  display: 'flex',
  flexDir: 'column',
  overflow: 'hidden',
  pt: '10',
})

const logoAreaClass = css({
  h: '12',
  display: 'flex',
  alignItems: 'center',
  px: '4',
  flexShrink: '0',
})

const logoClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  textDecoration: 'none',
  color: 'foreground',
})

const logoIconClass = css({
  w: '6',
  h: '6',
  bg: 'accent',
  borderRadius: 'sm',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'xs',
  fontWeight: 'bold',
  color: 'foreground',
  flexShrink: '0',
})

const logoTextClass = css({
  fontSize: 'base',
  fontWeight: 'semibold',
  color: 'foreground',
  letterSpacing: '-0.01em',
})

const navClass = css({
  flex: '1',
  overflowY: 'auto',
  px: '2',
  py: '2',
  display: 'flex',
  flexDir: 'column',
  gap: '1',
})

const dividerClass = css({
  h: '1px',
  bg: 'border',
  mx: '3',
  my: '2',
  flexShrink: '0',
})

const navSectionClass = css({
  display: 'flex',
  flexDir: 'column',
  gap: '1',
})

export function Sidebar() {
  return (
    <aside className={sidebarClass}>
      <div className={logoAreaClass}>
        <a href="/" className={logoClass}>
          <div className={logoIconClass}>
            <span>G</span>
          </div>
          <span className={logoTextClass}>Gettin&apos; Paid</span>
        </a>
      </div>

      <nav className={navClass}>
        <div className={navSectionClass}>
          <NavItem to="/inventory" label="Inventory" icon={Archive} />
          <NavItem to="/inventory/add" label="Add Game" icon={FilePlus} />
          <NavItem to="/about" label="About" icon={Info} />
        </div>

        <div className={dividerClass} />
      </nav>
    </aside>
  )
}
