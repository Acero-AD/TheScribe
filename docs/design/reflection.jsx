// reflection.jsx — Sunday weekly wrap-up sheet

function ReflectionScreen() {
  const [worked, setWorked] = React.useState('');
  const [forward, setForward] = React.useState('');

  return (
    <PhoneShell bg={SB.ink}>
      {/* mock background of the Today screen, dimmed (so the sheet feels modal) */}
      <div style={{
        position: 'absolute', inset: 0, background: SB.bg,
        opacity: 0.18, pointerEvents: 'none',
      }}/>
      {/* the sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 80,
        background: SB.bg,
        borderTopLeftRadius: 36, borderTopRightRadius: 36,
        boxShadow: `0 -20px 60px -20px rgba(0,0,0,.5)`,
        padding: '14px 24px 24px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* sheet grabber */}
        <div style={{
          alignSelf: 'center', width: 40, height: 4, borderRadius: 999,
          background: SB.hairline2, marginBottom: 18,
        }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tag tone="amber">Sunday wrap-up</Tag>
          <button style={{
            border: 0, background: 'transparent', cursor: 'pointer',
            fontFamily: SBfont.ui, fontSize: 13, color: SB.inkMuted,
          }}>Skip</button>
        </div>

        <div style={{
          fontFamily: SBfont.display, fontSize: 44, lineHeight: 1.02, letterSpacing: -0.5,
          marginTop: 14, color: SB.ink,
        }}>
          Week 17,<br/>
          <span style={{ fontStyle: 'italic', color: SB.accent }}>logged.</span>
        </div>

        {/* stat rows */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{
            background: SB.surface, borderRadius: 20, padding: '14px 16px',
            boxShadow: `0 0 0 1px ${SB.hairline}`,
          }}>
            <div style={{ fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: SB.inkMuted, fontWeight: 500 }}>Wrote</div>
            <div style={{ fontFamily: SBfont.mono, fontSize: 32, lineHeight: 1, fontWeight: 500, marginTop: 6, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
              5<span style={{ color: SB.inkFaint }}>/7</span>
            </div>
            <div style={{ fontFamily: SBfont.ui, fontSize: 11, color: SB.inkMuted, marginTop: 4 }}>days</div>
          </div>
          <div style={{
            background: SB.accent, color: '#fff', borderRadius: 20, padding: '14px 16px',
          }}>
            <div style={{ fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.8, fontWeight: 500 }}>Published</div>
            <div style={{ fontFamily: SBfont.display, fontStyle: 'italic', fontSize: 30, marginTop: 6, lineHeight: 1, letterSpacing: -0.4 }}>
              Yes.
            </div>
            <div style={{ fontFamily: SBfont.ui, fontSize: 11, opacity: 0.85, marginTop: 4 }}>4-week streak</div>
          </div>
        </div>

        {/* prompt 1 */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: SBfont.display, fontStyle: 'italic', fontSize: 19, color: SB.ink, marginBottom: 8, letterSpacing: -0.1 }}>
            What worked this week?
          </div>
          <textarea
            value={worked}
            onChange={e => setWorked(e.target.value)}
            placeholder="A line, a paragraph — whatever's true."
            rows={2}
            style={{
              width: '100%', resize: 'none', border: 0, outline: 0,
              background: SB.surface, borderRadius: 16, padding: '12px 14px',
              fontFamily: SBfont.ui, fontSize: 14, color: SB.ink, lineHeight: 1.45,
              boxShadow: `0 0 0 1px ${SB.hairline}`,
            }}
          />
        </div>

        {/* prompt 2 */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: SBfont.display, fontStyle: 'italic', fontSize: 19, color: SB.ink, marginBottom: 8, letterSpacing: -0.1 }}>
            What are you carrying into next week?
          </div>
          <textarea
            value={forward}
            onChange={e => setForward(e.target.value)}
            placeholder="One thing."
            rows={2}
            style={{
              width: '100%', resize: 'none', border: 0, outline: 0,
              background: SB.surface, borderRadius: 16, padding: '12px 14px',
              fontFamily: SBfont.ui, fontSize: 14, color: SB.ink, lineHeight: 1.45,
              boxShadow: `0 0 0 1px ${SB.hairline}`,
            }}
          />
        </div>

        <div style={{ flex: 1 }}/>

        {/* primary action */}
        <button style={{
          height: 56, borderRadius: 999, border: 0, cursor: 'pointer',
          background: SB.ink, color: '#fff',
          fontFamily: SBfont.ui, fontSize: 15, fontWeight: 500, letterSpacing: -0.1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 14px 30px -14px rgba(0,0,0,.5)`,
          marginBottom: 18,
        }}>
          Save reflection
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </PhoneShell>
  );
}

window.ReflectionScreen = ReflectionScreen;
