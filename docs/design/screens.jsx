// screens.jsx — Scoreboard, four iOS screens.
// Modern · fun · minimalist. Warm cream + a single confident green.
// Type: Instrument Serif (display, italic) · Geist (UI) · JetBrains Mono (numbers).

const SB = {
  bg:        '#F2EEE5',
  surface:   '#FFFDF8',
  surfaceAlt:'#E9E2D3',
  ink:       '#1A1714',
  inkMuted:  '#6B635A',
  inkFaint:  '#A8A097',
  hairline:  'rgba(26,23,20,0.08)',
  hairline2: 'rgba(26,23,20,0.16)',
  accent:    '#2EA168',
  accentDeep:'#1F7A4D',
  accentInk: '#0E3F26',
  accentSoft:'#DCEDDF',
  amber:     '#C97B2A',
};

const SBfont = {
  display: '"Instrument Serif", Georgia, "Times New Roman", serif',
  ui:      '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono:    '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
};

// ─────────────────────────────────────────────────────────────
// Tiny primitives
// ─────────────────────────────────────────────────────────────
function CheckCircle({ checked, size = 56, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 999, border: 0, padding: 0, cursor: 'pointer',
      background: checked ? SB.accent : SB.surface,
      boxShadow: checked
        ? `inset 0 0 0 1.5px ${SB.accentDeep}, 0 6px 16px -6px ${SB.accentDeep}55`
        : `inset 0 0 0 1.5px ${SB.hairline2}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .18s cubic-bezier(.2,.7,.3,1)',
      transform: checked ? 'scale(1.0)' : 'scale(1)',
    }}>
      <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none">
        <path d="M5 12.5l4.5 4.5L19 7"
          stroke={checked ? '#fff' : SB.inkFaint}
          strokeWidth={checked ? 3 : 2}
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: checked ? 0 : 30,
            transition: 'stroke-dashoffset .35s ease, stroke .2s, stroke-width .2s',
          }}
        />
      </svg>
    </button>
  );
}

function Tag({ children, tone = 'ink' }) {
  const palette = {
    ink:   { bg: 'transparent', fg: SB.inkMuted, bd: SB.hairline2 },
    green: { bg: SB.accentSoft, fg: SB.accentInk, bd: 'transparent' },
    amber: { bg: '#F4E5C9',     fg: '#5A3D0D',   bd: 'transparent' },
  }[tone];
  return (
    <span style={{
      fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
      padding: '4px 8px', borderRadius: 999,
      background: palette.bg, color: palette.fg,
      boxShadow: palette.bd !== 'transparent' ? `inset 0 0 0 1px ${palette.bd}` : 'none',
      fontWeight: 500,
    }}>{children}</span>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'today',    label: 'Today',    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.5" fill="currentColor"/>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      </svg>
    )},
    { id: 'history',  label: 'History',  icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M3.5 10h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    )},
    { id: 'settings', label: 'Settings', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    )},
  ];
  return (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 28,
      background: SB.surface,
      borderRadius: 999, padding: 6,
      display: 'flex', gap: 4,
      boxShadow: `0 1px 0 ${SB.hairline} inset, 0 12px 30px -12px rgba(0,0,0,.18), 0 0 0 1px ${SB.hairline}`,
      zIndex: 30,
    }}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange && onChange(t.id)} style={{
            flex: 1, height: 44, borderRadius: 999, border: 0, cursor: 'pointer',
            background: on ? SB.ink : 'transparent',
            color: on ? '#fff' : SB.inkMuted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: SBfont.ui, fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
            transition: 'background .18s, color .18s',
          }}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Phone status bar + dynamic island, drawn once per screen so each screen is self-contained.
function PhoneTop({ time = '9:41', dark = false }) {
  const c = dark ? '#fff' : SB.ink;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 54, zIndex: 40,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 28px 8px', pointerEvents: 'none',
    }}>
      <span style={{ fontFamily: '-apple-system, "SF Pro", system-ui', fontSize: 17, fontWeight: 600, color: c }}>{time}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c}/>
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c}/>
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c}/>
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c}/>
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={c}/>
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill={c}/>
          <circle cx="8.5" cy="10.5" r="1.5" fill={c}/>
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none"/>
          <rect x="2" y="2" width="20" height="9" rx="2" fill={c}/>
        </svg>
      </div>
    </div>
  );
}
function HomeIndicator({ dark = false }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 34, zIndex: 60,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8,
      pointerEvents: 'none',
    }}>
      <div style={{ width: 134, height: 5, borderRadius: 999, background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(26,23,20,0.28)' }}/>
    </div>
  );
}

// Shell every screen lives inside.
function PhoneShell({ children, bg = SB.bg }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg, color: SB.ink,
      fontFamily: SBfont.ui, position: 'relative', overflow: 'hidden',
    }}>
      <PhoneTop/>
      {children}
      <HomeIndicator/>
    </div>
  );
}

Object.assign(window, { SB, SBfont, CheckCircle, Tag, TabBar, PhoneShell, PhoneTop, HomeIndicator });
