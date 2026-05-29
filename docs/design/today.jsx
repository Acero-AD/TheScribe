// today.jsx — Today / Home screen for The Scribe

function TodayScreen() {
  const [wroteToday, setWroteToday] = React.useState(true);
  const [publishedWeek, setPublishedWeek] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [tab, setTab] = React.useState('today');

  // streak math (display only)
  const dayStreak  = wroteToday ? 12 : 11;
  const weekStreak = publishedWeek ? 4 : 3;

  return (
    <PhoneShell>
      {/* date row */}
      <div style={{ paddingTop: 64, padding: '64px 24px 0' }}>
        <div style={{
          fontFamily: SBfont.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase',
          color: SB.inkMuted, fontWeight: 500,
        }}>
          MON · APR 28 · 2026
        </div>
        <div style={{
          fontFamily: SBfont.display, fontSize: 56, lineHeight: 1, letterSpacing: -0.5,
          color: SB.ink, marginTop: 6,
        }}>
          Today<span style={{ fontStyle: 'italic', color: SB.accent }}>.</span>
        </div>
        <div style={{ fontFamily: SBfont.ui, fontSize: 14, color: SB.inkMuted, marginTop: 8, lineHeight: 1.45, maxWidth: 280 }}>
          Two questions. Both within your control.
        </div>
      </div>

      {/* card 1 — daily write */}
      <div style={{ padding: '20px 16px 0' }}>
        <div onClick={() => setWroteToday(v => !v)} style={{
          background: wroteToday ? SB.accent : SB.surface,
          color: wroteToday ? '#fff' : SB.ink,
          borderRadius: 26, padding: '20px 22px',
          boxShadow: wroteToday
            ? `0 18px 40px -20px ${SB.accentDeep}cc, inset 0 0 0 1px ${SB.accentDeep}`
            : `0 1px 0 ${SB.hairline} inset, 0 12px 30px -16px rgba(0,0,0,.16), 0 0 0 1px ${SB.hairline}`,
          cursor: 'pointer',
          transition: 'all .25s cubic-bezier(.2,.7,.3,1)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Tag tone={wroteToday ? 'green' : 'ink'}>Daily</Tag>
            <span style={{
              fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
              color: wroteToday ? 'rgba(255,255,255,.7)' : SB.inkFaint,
            }}>
              {wroteToday ? 'Logged · 9:14' : 'Tap to log'}
            </span>
          </div>

          <div style={{
            fontFamily: SBfont.display, fontSize: 34, lineHeight: 1.05,
            marginTop: 18, fontStyle: 'italic',
            letterSpacing: -0.3,
          }}>
            Did&nbsp;you&nbsp;write today?
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22 }}>
            <div>
              <div style={{
                fontFamily: SBfont.mono, fontSize: 56, lineHeight: 0.9, fontWeight: 500,
                letterSpacing: -2, color: wroteToday ? '#fff' : SB.ink,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {String(dayStreak).padStart(2,'0')}
              </div>
              <div style={{
                fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
                color: wroteToday ? 'rgba(255,255,255,.75)' : SB.inkMuted, marginTop: 6, fontWeight: 500,
              }}>
                Day streak
              </div>
            </div>
            <CheckCircle checked={wroteToday} size={56}/>
          </div>
        </div>
      </div>

      {/* card 2 — weekly publish */}
      <div style={{ padding: '12px 16px 0' }}>
        <div onClick={() => setPublishedWeek(v => !v)} style={{
          background: publishedWeek ? SB.surface : SB.surface,
          borderRadius: 22, padding: '16px 18px',
          boxShadow: `0 1px 0 ${SB.hairline} inset, 0 0 0 1px ${SB.hairline}`,
          display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
          transition: 'all .25s',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Tag tone={publishedWeek ? 'green' : 'ink'}>Weekly</Tag>
            <div style={{
              fontFamily: SBfont.display, fontSize: 22, lineHeight: 1.15, fontStyle: 'italic',
              marginTop: 6, color: SB.ink, letterSpacing: -0.2,
            }}>
              Did you publish this week?
            </div>
            <div style={{
              fontFamily: SBfont.mono, fontSize: 11, color: SB.inkMuted, marginTop: 6, letterSpacing: 0.4,
            }}>
              <span style={{ fontWeight: 600, color: SB.ink, fontSize: 13 }}>
                {String(weekStreak).padStart(2,'0')}
              </span>
              <span style={{ marginLeft: 6, textTransform: 'uppercase', letterSpacing: 1.2 }}>Week streak</span>
            </div>
          </div>
          <CheckCircle checked={publishedWeek} size={48}/>
        </div>
      </div>

      {/* note */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: 'transparent', borderRadius: 22,
          boxShadow: `0 0 0 1px ${SB.hairline}`,
          padding: '14px 16px',
        }}>
          <div style={{
            fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
            color: SB.inkMuted, marginBottom: 8, fontWeight: 500,
          }}>
            Today's note <span style={{ color: SB.inkFaint, marginLeft: 4 }}>· optional</span>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What did you write about?"
            rows={2}
            style={{
              width: '100%', resize: 'none', border: 0, outline: 0, background: 'transparent',
              fontFamily: SBfont.display, fontStyle: 'italic',
              fontSize: 19, lineHeight: 1.35, color: SB.ink, letterSpacing: -0.1,
              padding: 0,
            }}
          />
        </div>
      </div>

      <TabBar active={tab} onChange={setTab}/>
    </PhoneShell>
  );
}

window.TodayScreen = TodayScreen;
