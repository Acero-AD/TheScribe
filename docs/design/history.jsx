// history.jsx — calendar grid + note log

function HistoryScreen() {
  const [tab, setTab] = React.useState('history');
  const [selected, setSelected] = React.useState(18); // April 18

  // April 2026 starts on Wednesday. 30 days. Add leading 2 blanks.
  const monthStart = 3; // 0=Mon..6=Sun. Wed = 2 in Mon-first
  // Use Mon-first (per spec).
  const lead = monthStart - 1; // Wed (3) - Mon (1) = 2 leading blanks
  const days = 30;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Activity map — pseudo data showing the pattern from the spec
  // 'W' = wrote, 'B' = wrote+published-week, '' = none
  const activity = {};
  // Week 1 (lead = empty Mon Tue, Wed=1)
  // From spec mock-up: [_, W, W, W, B, _, W]
  ['_', 'W', 'W', 'W', 'B', '_', 'W'].forEach((v, i) => { if (i >= 2 && v !== '_') activity[i - 2 + 1] = v; });
  ['W', 'W', 'W', 'B', 'W', 'W', '_'].forEach((v, i) => { const d = 6 + i; if (v !== '_') activity[d] = v; });
  ['W', 'B', 'W', 'W', 'W', '_', '_'].forEach((v, i) => { const d = 13 + i; if (v !== '_') activity[d] = v; });
  ['W', 'W', 'W', '_'].forEach((v, i) => { const d = 20 + i; if (v !== '_') activity[d] = v; });
  // Future days 24-30 left empty.

  const notes = {
    18: '"Started the essay on content and analysis paralysis."',
    19: '"Rewrote the landing. Cleaner now."',
    21: '"Three pages on systems vs goals. Felt clear."',
    23: '"Cut 600 words. Better."',
  };

  // weeks (rows) where 'B' appears — for the "published" ribbon
  const publishedWeeks = new Set();
  Object.entries(activity).forEach(([day, v]) => {
    if (v === 'B') {
      const idx = (lead + (+day - 1));
      publishedWeeks.add(Math.floor(idx / 7));
    }
  });

  const dayHeads = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <PhoneShell>
      <div style={{ padding: '64px 24px 0' }}>
        <div style={{
          fontFamily: SBfont.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase',
          color: SB.inkMuted, fontWeight: 500,
        }}>
          The record.
        </div>
        <div style={{
          fontFamily: SBfont.display, fontSize: 56, lineHeight: 1, letterSpacing: -0.5,
          color: SB.ink, marginTop: 6,
        }}>
          History<span style={{ fontStyle: 'italic', color: SB.accent }}>.</span>
        </div>
      </div>

      {/* streak chips */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, background: SB.surface, borderRadius: 18, padding: '12px 14px',
          boxShadow: `0 0 0 1px ${SB.hairline}`,
        }}>
          <div style={{ fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: SB.inkMuted, fontWeight: 500 }}>Current</div>
          <div style={{ fontFamily: SBfont.mono, fontSize: 28, fontWeight: 500, color: SB.ink, letterSpacing: -1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            12<span style={{ fontSize: 12, color: SB.inkMuted, marginLeft: 4, letterSpacing: 0 }}>days</span>
          </div>
        </div>
        <div style={{
          flex: 1, background: SB.surface, borderRadius: 18, padding: '12px 14px',
          boxShadow: `0 0 0 1px ${SB.hairline}`,
        }}>
          <div style={{ fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: SB.inkMuted, fontWeight: 500 }}>Best</div>
          <div style={{ fontFamily: SBfont.mono, fontSize: 28, fontWeight: 500, color: SB.ink, letterSpacing: -1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            23<span style={{ fontSize: 12, color: SB.inkMuted, marginLeft: 4, letterSpacing: 0 }}>days</span>
          </div>
        </div>
        <div style={{
          flex: 1, background: SB.accent, borderRadius: 18, padding: '12px 14px',
          color: '#fff',
        }}>
          <div style={{ fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.8, fontWeight: 500 }}>Published</div>
          <div style={{ fontFamily: SBfont.mono, fontSize: 28, fontWeight: 500, letterSpacing: -1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            03<span style={{ fontSize: 12, opacity: 0.8, marginLeft: 4, letterSpacing: 0 }}>wks</span>
          </div>
        </div>
      </div>

      {/* calendar */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: SB.surface, borderRadius: 24, padding: '18px 18px 14px',
          boxShadow: `0 0 0 1px ${SB.hairline}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: SBfont.display, fontSize: 22, fontStyle: 'italic', letterSpacing: -0.2 }}>
              April <span style={{ color: SB.inkMuted, fontStyle: 'normal', fontFamily: SBfont.mono, fontSize: 14 }}>2026</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['‹','›'].map((c,i) => (
                <button key={i} style={{
                  width: 30, height: 30, borderRadius: 999, border: 0, cursor: 'pointer',
                  background: 'transparent', boxShadow: `inset 0 0 0 1px ${SB.hairline2}`,
                  fontFamily: SBfont.ui, fontSize: 16, color: SB.inkMuted,
                }}>{c}</button>
              ))}
            </div>
          </div>

          {/* day-of-week heads */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
            {dayHeads.map((d, i) => (
              <div key={i} style={{
                textAlign: 'center', fontFamily: SBfont.mono, fontSize: 10,
                color: i >= 5 ? SB.inkFaint : SB.inkMuted, fontWeight: 500,
                letterSpacing: 0.6,
              }}>{d}</div>
            ))}
          </div>

          {/* grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, position: 'relative' }}>
            {cells.map((d, idx) => {
              const v = d ? activity[d] : null;
              const isSel = d === selected;
              const isFuture = d && d > 23;
              return (
                <button
                  key={idx}
                  onClick={() => d && setSelected(d)}
                  style={{
                    aspectRatio: '1 / 1', border: 0, padding: 0, cursor: d ? 'pointer' : 'default',
                    background: 'transparent',
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 12,
                    boxShadow: isSel ? `inset 0 0 0 1.5px ${SB.ink}` : 'none',
                  }}
                >
                  {!d && null}
                  {d && (
                    <div style={{
                      position: 'absolute', inset: 4, borderRadius: 9,
                      background: v === 'B' ? SB.accent : v === 'W' ? SB.accentSoft : 'transparent',
                      boxShadow: v === 'B'
                        ? `inset 0 0 0 2px ${SB.accent}, 0 0 0 2px ${SB.surface}, 0 0 0 3.5px ${SB.accent}`
                        : v === 'W' ? 'none'
                        : `inset 0 0 0 1px ${SB.hairline}`,
                      opacity: isFuture && !v ? 0.35 : 1,
                      transition: 'all .15s',
                    }}/>
                  )}
                  {d && (
                    <span style={{
                      position: 'relative',
                      fontFamily: SBfont.mono, fontSize: 12, fontWeight: 500,
                      color: v === 'B' ? '#fff' : v === 'W' ? SB.accentInk : isFuture ? SB.inkFaint : SB.ink,
                      letterSpacing: -0.2,
                    }}>{d}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* legend */}
          <div style={{
            display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12,
            paddingTop: 12, borderTop: `1px solid ${SB.hairline}`,
          }}>
            {[
              { c: 'transparent', bd: SB.hairline2, label: 'No activity' },
              { c: SB.accentSoft, bd: 'transparent', label: 'Wrote' },
              { c: SB.accent,     bd: SB.accent,    label: 'Published wk', ring: true },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 4, background: l.c,
                  boxShadow: l.ring
                    ? `0 0 0 1.5px ${SB.surface}, 0 0 0 3px ${SB.accent}`
                    : l.bd !== 'transparent' ? `inset 0 0 0 1px ${l.bd}` : 'none',
                }}/>
                <span style={{ fontFamily: SBfont.mono, fontSize: 9.5, color: SB.inkMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* selected note + recent */}
      <div style={{ padding: '16px 24px 110px' }}>
        <div style={{ fontFamily: SBfont.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: SB.inkMuted, fontWeight: 500, marginBottom: 8 }}>
          April {selected}
        </div>
        <div style={{
          fontFamily: SBfont.display, fontStyle: 'italic', fontSize: 22, lineHeight: 1.3,
          color: notes[selected] ? SB.ink : SB.inkFaint, letterSpacing: -0.1,
        }}>
          {notes[selected] || '— no note —'}
        </div>

        <div style={{ borderTop: `1px solid ${SB.hairline}`, marginTop: 18, paddingTop: 14 }}>
          {Object.entries(notes).filter(([d]) => +d !== selected).map(([d, n]) => (
            <div key={d} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: `1px solid ${SB.hairline}` }}>
              <div style={{ fontFamily: SBfont.mono, fontSize: 11, color: SB.inkMuted, width: 56, flexShrink: 0, paddingTop: 3 }}>
                APR {String(d).padStart(2, '0')}
              </div>
              <div style={{ fontFamily: SBfont.display, fontStyle: 'italic', fontSize: 17, color: SB.ink, lineHeight: 1.35 }}>
                {n}
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active={tab} onChange={setTab}/>
    </PhoneShell>
  );
}

window.HistoryScreen = HistoryScreen;
