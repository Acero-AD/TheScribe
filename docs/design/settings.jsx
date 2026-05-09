// settings.jsx — minimal grouped list (warm, not iOS-blue)

function SettingsRow({ label, sub, right, isLast, danger }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', minHeight: 56,
      padding: '12px 18px', position: 'relative',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: SBfont.ui, fontSize: 15, color: danger ? '#B83A2B' : SB.ink,
          fontWeight: 500, letterSpacing: -0.1,
        }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontFamily: SBfont.ui, fontSize: 12, color: SB.inkMuted, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        {right}
      </div>
      {!isLast && (
        <div style={{
          position: 'absolute', bottom: 0, left: 18, right: 18,
          height: 1, background: SB.hairline,
        }}/>
      )}
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 46, height: 28, borderRadius: 999, border: 0, padding: 0, cursor: 'pointer',
      background: on ? SB.accent : '#D8D2C5',
      position: 'relative', transition: 'background .2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 20 : 2,
        width: 24, height: 24, borderRadius: 999, background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.18)',
        transition: 'left .2s cubic-bezier(.2,.7,.3,1)',
      }}/>
    </button>
  );
}

function Pill({ children }) {
  return (
    <div style={{
      height: 32, padding: '0 12px', borderRadius: 999,
      display: 'flex', alignItems: 'center', gap: 6,
      background: SB.surfaceAlt,
      fontFamily: SBfont.mono, fontSize: 12, color: SB.ink, fontWeight: 500, letterSpacing: 0.2,
    }}>
      {children}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M5 9l7 7 7-7" stroke={SB.inkMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function ActionButton({ children, danger }) {
  return (
    <button style={{
      height: 32, padding: '0 14px', borderRadius: 999, border: 0, cursor: 'pointer',
      background: danger ? '#F4DCD7' : SB.ink, color: danger ? '#B83A2B' : '#fff',
      fontFamily: SBfont.ui, fontSize: 12, fontWeight: 500, letterSpacing: 0.1,
    }}>{children}</button>
  );
}

function SettingsGroup({ header, children }) {
  return (
    <div style={{ padding: '0 16px', marginTop: 18 }}>
      {header && (
        <div style={{
          fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
          color: SB.inkMuted, padding: '0 6px 6px', fontWeight: 500,
        }}>{header}</div>
      )}
      <div style={{
        background: SB.surface, borderRadius: 22, overflow: 'hidden',
        boxShadow: `0 0 0 1px ${SB.hairline}`,
      }}>{children}</div>
    </div>
  );
}

function SettingsScreen() {
  const [reminder, setReminder] = React.useState(true);
  const [tab, setTab] = React.useState('settings');

  return (
    <PhoneShell>
      <div style={{ padding: '64px 24px 0' }}>
        <div style={{
          fontFamily: SBfont.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase',
          color: SB.inkMuted, fontWeight: 500,
        }}>
          The dial.
        </div>
        <div style={{
          fontFamily: SBfont.display, fontSize: 56, lineHeight: 1, letterSpacing: -0.5,
          color: SB.ink, marginTop: 6,
        }}>
          Settings<span style={{ fontStyle: 'italic', color: SB.accent }}>.</span>
        </div>
      </div>

      <SettingsGroup header="Reminders">
        <SettingsRow
          label="Daily reminder"
          sub="A nudge if you haven't checked in"
          right={<Toggle on={reminder} onClick={() => setReminder(v => !v)}/>}
        />
        <SettingsRow
          label="Time"
          right={<Pill>20:00</Pill>}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup header="Schedule">
        <SettingsRow
          label="Week starts on"
          right={<Pill>Monday</Pill>}
        />
        <SettingsRow
          label="Publishing cadence"
          sub="Adjust your publish-streak window"
          right={<Pill>Weekly</Pill>}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup header="Data">
        <SettingsRow
          label="Export"
          sub="Download CSV of every check-in"
          right={<ActionButton>Export</ActionButton>}
        />
        <SettingsRow
          label="Delete all data"
          sub="Cannot be undone"
          right={<ActionButton danger>Delete</ActionButton>}
          isLast
          danger
        />
      </SettingsGroup>

      {/* footer */}
      <div style={{
        padding: '24px 24px 110px', textAlign: 'center',
        fontFamily: SBfont.display, fontStyle: 'italic', fontSize: 16, color: SB.inkFaint,
      }}>
        “You only measure what you control.”
        <div style={{ fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: SB.inkFaint, marginTop: 6 }}>
          Scoreboard · v1
        </div>
      </div>

      <TabBar active={tab} onChange={setTab}/>
    </PhoneShell>
  );
}

window.SettingsScreen = SettingsScreen;
