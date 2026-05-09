// app.jsx — design canvas mount

const SCREEN_W = 390;
const SCREEN_H = 844;

function PhoneFrame({ children, label }) {
  // bare-bones iPhone bezel — content fills the whole screen because each
  // screen draws its own status bar.
  return (
    <div data-screen-label={label} style={{
      width: SCREEN_W, height: SCREEN_H, borderRadius: 50,
      background: '#0E0E10', padding: 6, position: 'relative',
      boxShadow: '0 50px 120px -20px rgba(20,15,10,.35), 0 0 0 1px rgba(0,0,0,.08)',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden',
        position: 'relative', background: SB.bg,
      }}>
        {children}
        {/* dynamic island */}
        <div style={{
          position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
          width: 122, height: 36, borderRadius: 22, background: '#000', zIndex: 50,
        }}/>
      </div>
    </div>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="main" title="Scoreboard" subtitle="Four screens for a private, two-question habit tracker.">
        <DCArtboard id="today"      label="Today"      width={SCREEN_W + 12} height={SCREEN_H + 12}>
          <PhoneFrame label="Today"><TodayScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="history"    label="History"    width={SCREEN_W + 12} height={SCREEN_H + 12}>
          <PhoneFrame label="History"><HistoryScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="reflection" label="Reflection" width={SCREEN_W + 12} height={SCREEN_H + 12}>
          <PhoneFrame label="Reflection"><ReflectionScreen/></PhoneFrame>
        </DCArtboard>
        <DCArtboard id="settings"   label="Settings"   width={SCREEN_W + 12} height={SCREEN_H + 12}>
          <PhoneFrame label="Settings"><SettingsScreen/></PhoneFrame>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
