import { useCallback } from 'react'
import { SB, SBfont } from '../lib/tokens'
import { ScreenHeader } from '../components/ScreenHeader'
import { TabBar } from '../components/TabBar'
import { SettingsGroup } from '../components/SettingsGroup'
import { SettingsRow } from '../components/SettingsRow'
import { useCurrentUser } from '../auth/AuthContext'
import { useAutoSaveField } from '../hooks/useAutoSaveField'
import { patchSettings } from '../api/settings'
import type {
  CurrentUser,
  PublishingCadence,
  UserSettings,
  WeekStartsOn,
} from '../auth/types'

const DEFAULT_SETTINGS: UserSettings = {
  week_starts_on: 1,
  publishing_cadence: 'weekly',
  timezone: null,
}

export function SettingsScreen() {
  const { user, setUser } = useCurrentUser()
  const settings = user?.settings ?? DEFAULT_SETTINGS

  const syncUser = useCallback(
    (updated: UserSettings) => {
      if (!user) return
      const next: CurrentUser = { ...user, settings: updated }
      setUser(next)
    },
    [user, setUser],
  )

  const saveWeekStartsOn = useCallback(
    async (value: WeekStartsOn) => {
      const updated = await patchSettings({ week_starts_on: value })
      syncUser(updated)
    },
    [syncUser],
  )

  const saveCadence = useCallback(
    async (value: PublishingCadence) => {
      const updated = await patchSettings({ publishing_cadence: value })
      syncUser(updated)
    },
    [syncUser],
  )

  const weekStart = useAutoSaveField<WeekStartsOn>(settings.week_starts_on, saveWeekStartsOn)
  const cadence = useAutoSaveField<PublishingCadence>(settings.publishing_cadence, saveCadence)

  return (
    <main
      style={{
        minHeight: '100vh',
        background: SB.bg,
        color: SB.ink,
        fontFamily: SBfont.ui,
        paddingBottom: 120,
        position: 'relative',
      }}
    >
      <ScreenHeader eyebrow="The dial." title="Settings" />

      <SettingsGroup header="Schedule">
        <SettingsRow
          label="Week starts on"
          error={weekStart.error}
          errorMessage="Couldn't save the week start."
          right={
            <PillSelect
              ariaLabel="Week starts on"
              value={String(weekStart.displayed)}
              onChange={(v) => weekStart.setLocal(Number(v) as WeekStartsOn)}
              options={[
                { value: '0', label: 'Sunday' },
                { value: '1', label: 'Monday' },
              ]}
            />
          }
        />
        <SettingsRow
          label="Publishing cadence"
          sub="Adjust your publish-streak window"
          isLast
          error={cadence.error}
          errorMessage="Couldn't save the cadence."
          right={
            <PillSelect
              ariaLabel="Publishing cadence"
              value={cadence.displayed}
              onChange={(v) => cadence.setLocal(v as PublishingCadence)}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Bi-weekly' },
              ]}
            />
          }
        />
      </SettingsGroup>

      <TabBar />
    </main>
  )
}

interface PillSelectProps {
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<{ value: string; label: string }>
}

function PillSelect({ ariaLabel, value, onChange, options }: PillSelectProps) {
  return (
    <span style={pillShellStyle}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          border: 0,
          background: 'transparent',
          fontFamily: SBfont.mono,
          fontSize: 12,
          color: SB.ink,
          fontWeight: 500,
          letterSpacing: 0.2,
          padding: 0,
          paddingRight: 18,
          outline: 0,
          cursor: 'pointer',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Chevron />
    </span>
  )
}

function Chevron() {
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      style={{ marginLeft: 4, position: 'absolute', right: 12 }}
    >
      <path
        d="M5 9l7 7 7-7"
        stroke={SB.inkMuted}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const pillShellStyle: React.CSSProperties = {
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  display: 'inline-flex',
  alignItems: 'center',
  background: SB.surfaceAlt,
  position: 'relative',
}
