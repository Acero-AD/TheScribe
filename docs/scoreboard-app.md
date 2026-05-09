# Scoreboard — App Design Document

## The Idea

Most content creators fail not because they lack talent or ideas, but because they measure themselves against things they can't control — views, followers, engagement. The feedback loop is broken: you do the work, the algorithm decides the result, and you feel either lucky or defeated. Neither feeling teaches you anything.

The essay *The Ride Is the Point* captures the real mechanic: growth happens through consistent, honest effort over time. The discovery comes from doing, not from waiting until you're ready. But knowing this isn't enough — you need a system that reinforces it daily.

**Scoreboard** is a private, distraction-free tracker built around a single principle: you only measure what you control. Two questions per day. A streak that tells the truth. Nothing else.

---

## Main Objective

Give the writer/creator a daily ritual that keeps them honest without becoming another source of anxiety.

The scoreboard must:

- Make showing up feel like winning, regardless of external results
- Be fast enough that using it never becomes the task (under 30 seconds per check-in)
- Create a visible history of effort that compounds into motivation over time
- Stay private — no social layer, no sharing, no comparison to others

The app is not a productivity tool. It is a commitment device.

---

## Core Principles

**Binary only.** No ratings, no scores, no "how well did you do it". Each question has two possible states: done or not done. This removes the temptation to grade yourself and keeps the bar achievable every single day.

**You control the metrics.** Did I write today? Did I publish this week? These are the only two questions that matter at launch. Both are 100% within the user's control, independent of any external platform or algorithm.

**Streaks tell the truth.** A streak is honest in a way that view counts are not. If it breaks, you broke it. If it holds, you held it. No excuses, no noise.

**The note anchors the habit.** A single optional sentence per day — what you wrote about, what shifted — makes the check-in feel real. It also creates a searchable log of your intellectual evolution over time.

---

## Screens

### 1. Today (Home)

The default screen. Opens here every time.

```
┌─────────────────────────────────────────┐
│  Monday, April 28                       │
│                                         │
│  ┌─────────────────┐ ┌───────────────┐  │
│  │                 │ │               │  │
│  │  Did I write    │ │  Did I publish│  │
│  │  today?         │ │  this week?   │  │
│  │                 │ │               │  │
│  │  [ Check in ]   │ │  [ Check in ] │  │
│  └─────────────────┘ └───────────────┘  │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │  12         │   │  3              │  │
│  │  day streak │   │  week streak    │  │
│  └─────────────┘   └─────────────────┘  │
│                                         │
│  Today's note                           │
│  ┌───────────────────────────────────┐  │
│  │ What did you write about?         │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Behaviour:**
- Check-in cards toggle on tap — done state shows a checkmark and changes background color
- Streak numbers update immediately on check-in
- Note field auto-saves on blur
- Writing streak is daily; publishing streak is weekly
- If writing check-in is missed for the day, streak resets to 0 the following morning

---

### 2. History

A visual record of the past. Accessible from a tab or nav link.

```
┌─────────────────────────────────────────┐
│  History                                │
│                                         │
│  April 2026                             │
│                                         │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun      │
│  [ ]  [W]  [W]  [W]  [B]  [ ]  [W]     │
│  [W]  [W]  [W]  [B]  [W]  [W]  [ ]     │
│  [W]  [B]  [W]  [W]  [W]  [ ]  [ ]     │
│  [W]  [W]  [W]  [ ]  ·    ·    ·       │
│                                         │
│  Legend                                 │
│  [ ]  No activity                       │
│  [W]  Wrote                             │
│  [B]  Wrote + published that week       │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  April 18   "Started the essay on       │
│              content and analysis       │
│              paralysis"                 │
│                                         │
│  April 19   "Rewrote the landing.       │
│              Cleaner now."              │
│                                         │
└─────────────────────────────────────────┘
```

**Behaviour:**
- Calendar grid shows past 3 months by default
- Tapping a day with a note shows the note inline below the calendar
- Published weeks are visually distinct (accent border on the whole week column or a dot above)
- No editing past check-ins — what happened, happened

---

### 3. Reflection (Weekly)

Appears on Sunday evening (or whenever the user opens the app on the last day of their week).

```
┌─────────────────────────────────────────┐
│  Week 17 wrap-up                        │
│                                         │
│  You wrote 5 of 7 days                  │
│  You published this week                │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  What worked this week?                 │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  What are you carrying into next week?  │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│              [ Done ]                   │
│                                         │
└─────────────────────────────────────────┘
```

**Behaviour:**
- Triggered once per week, not a persistent tab
- Two open text fields — no prompts beyond the questions shown
- Saved as a weekly reflection entry, viewable in History
- Can be skipped without penalty

---

### 4. Settings

Minimal. Configuration only.

```
┌─────────────────────────────────────────┐
│  Settings                               │
│                                         │
│  Daily reminder                         │
│  [ Toggle ]  20:00                      │
│                                         │
│  Week starts on                         │
│  [ Monday ▾ ]                           │
│                                         │
│  Publishing cadence                     │
│  [ Weekly ▾ ]   (Weekly / Bi-weekly)    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Export data           [ Export CSV ]   │
│                                         │
│  Delete all data       [ Delete ]       │
│                                         │
└─────────────────────────────────────────┘
```

---

## Data Model

```
User
├── id
├── created_at
└── settings
    ├── reminder_time        (HH:MM or null)
    ├── week_starts_on       (0 = Sunday, 1 = Monday)
    └── publishing_cadence   (weekly | biweekly)

DailyLog
├── id
├── date                     (YYYY-MM-DD, unique)
├── wrote                    (boolean)
└── note                     (text, nullable)

WeekLog
├── id
├── week_key                 (YYYY-WNN, unique)
└── published                (boolean)

WeeklyReflection
├── id
├── week_key                 (YYYY-WNN)
├── what_worked              (text, nullable)
└── carrying_forward         (text, nullable)
```

---

## Streak Logic

```
Writing streak
  - Increment: user checks "wrote today" on date D
  - Reset: D-1 has no write check-in (checked at D open)
  - Grace period: none — yesterday counts or it doesn't

Publishing streak
  - Increment: user checks "published" in week W
  - Reset: week W-1 has no publish check-in
  - Measured in full weeks, not days
```

---

## Tech Considerations

This is a simple app. Resist the urge to over-engineer it.

**Option A — Web app (recommended for first version)**
- Framework: Rails or any lightweight backend you're comfortable with
- Frontend: Hotwire/Turbo for fast interactions without a full SPA
- Auth: magic link or passphrase — no OAuth complexity at launch
- Storage: SQLite is sufficient for a single-user or small-user app
- Hosting: Fly.io or Railway, zero config

**Option B — Local-first / no backend**
- Pure frontend with localStorage or IndexedDB
- PWA with install prompt so it feels native on mobile
- No account needed — data lives on device
- Export to CSV covers backup

**Mobile first.** The check-in should work in two taps from the home screen. Design for thumb reach. No landscape layout needed at v1.

**No accounts at v1 if possible.** The fastest path to using the app is no signup. Local-first removes that friction entirely. Add sync later if you need it.

---

## What This App Is Not

- Not a journaling app — the note field is one sentence, not a diary
- Not a social app — no sharing, no profiles, no leaderboards
- Not a goal-setting app — no targets, no percentages, no "you're 70% there"
- Not an analytics dashboard — no graphs of engagement, reach, or growth

The scoreboard only measures inputs, never outputs. That is the whole product.

---

## V1 Scope

| Feature                     | V1  | Later |
|-----------------------------|-----|-------|
| Daily write check-in        | ✓   |       |
| Weekly publish check-in     | ✓   |       |
| Streak counters             | ✓   |       |
| Daily note                  | ✓   |       |
| Calendar history view       | ✓   |       |
| Daily reminder notification | ✓   |       |
| Weekly reflection           |     | ✓     |
| Data export (CSV)           |     | ✓     |
| Multi-device sync           |     | ✓     |
| Custom questions            |     | ✓     |
| Public accountability mode  |     | ✓     |
