import { NavLink } from 'react-router-dom'
import { SB, SBfont } from '../lib/tokens'

const tabs = [
  { to: '/', label: 'Today' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
] as const

export function TabBar() {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 28,
        background: SB.surface,
        borderRadius: 999,
        padding: 6,
        display: 'flex',
        gap: 4,
        boxShadow: `0 1px 0 ${SB.hairline} inset, 0 12px 30px -12px rgba(0,0,0,.18), 0 0 0 1px ${SB.hairline}`,
        zIndex: 30,
        maxWidth: 360,
        margin: '0 auto',
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          style={({ isActive }) => ({
            flex: 1,
            height: 44,
            borderRadius: 999,
            border: 0,
            cursor: 'pointer',
            background: isActive ? SB.ink : 'transparent',
            color: isActive ? '#fff' : SB.inkMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontFamily: SBfont.ui,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'background .18s, color .18s',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
