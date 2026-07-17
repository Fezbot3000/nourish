import { useEffect, useState } from 'react'
import ScoreRing from './components/ScoreRing.jsx'
import WaterCard from './components/WaterCard.jsx'
import FastCard from './components/FastCard.jsx'
import MealList from './components/MealList.jsx'
import Journal from './components/Journal.jsx'
import CaptureFlow from './components/CaptureFlow.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import Onboarding from './components/Onboarding.jsx'
import { useStore, todayKey, getDay, eraseAll } from './lib/store.js'
import { dayScore, macroTotals, streakCount, scoreWord } from './lib/score.js'
import { calorieTarget, suggestedWaterGoal } from './lib/profile.js'
import { syncAvailable, signIn, signOutUser } from './lib/sync.js'
import { burst } from './lib/confetti.js'

const buzz = (ms = 12) => navigator.vibrate?.(ms)

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Late night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Winding down'
}

function Pillar({ icon, label, value, max, note }) {
  return (
    <div className="pillar" title={note || undefined}>
      <span className="pillar-head">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <span className="pillar-bar">
        <span className="pillar-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </span>
      <span className="pillar-val">
        {value}
        <em>/{max}</em>
      </span>
    </div>
  )
}

function MacroTile({ label, value, unit }) {
  return (
    <div className="macro-tile">
      <span className="macro-value">
        {Math.round(value)}
        <em>{unit}</em>
      </span>
      <span className="macro-label">{label}</span>
    </div>
  )
}

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h2.2l1.4-2.2a1 1 0 0 1 .84-.46h7.12a1 1 0 0 1 .84.46L17.8 8H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8Z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
)

const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
  </svg>
)

const BookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
    <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
  </svg>
)

const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.4a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01A1.7 1.7 0 0 0 10.05 2.5V2.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01c.26.63.87 1.04 1.56 1.04H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.41-1.51 1.04Z" />
  </svg>
)

export default function App() {
  const { data, update, user } = useStore()
  const [tab, setTab] = useState('today')
  const [capturing, setCapturing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [toast, setToast] = useState(null)
  const [apiMode, setApiMode] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : { mode: 'demo' }))
      .then((d) => setApiMode(d.mode))
      .catch(() => setApiMode('demo'))
  }, [])

  const key = todayKey()
  const day = getDay(data, key)
  const score = dayScore(data, key)
  const totals = macroTotals(day)
  const streak = streakCount(data)
  const hasActivity = day.meals.length > 0 || day.water > 0
  const firstName = data.profile?.name?.split(' ')[0]
  const target = calorieTarget(data.profile)
  const showOnboarding = !data.onboarded || editingProfile

  function showToast(text) {
    setToast(text)
    clearTimeout(showToast._t)
    showToast._t = setTimeout(() => setToast(null), 2600)
  }

  function setWater(n) {
    const goal = data.settings.waterGoal
    const prev = day.water
    const next = Math.max(0, n)
    update((d) => {
      const dd = (d.days[key] ??= { meals: [], water: 0 })
      dd.water = next
    })
    buzz()
    if (next >= goal && prev < goal) {
      burst()
      showToast('Hydration goal reached 💧')
    }
  }

  function handleLogged(meal) {
    update((d) => {
      const dd = (d.days[key] ??= { meals: [], water: 0 })
      dd.meals.push(meal)
    })
    setCapturing(false)
    buzz(20)
    if (meal.analysis.health_score >= 8) {
      burst()
      showToast(`${meal.analysis.name} — beautiful choice 🌿`)
    } else {
      showToast(`Logged ${meal.analysis.name}`)
    }
  }

  function completeOnboarding(profile) {
    const wasEditing = editingProfile
    update((d) => {
      d.onboarded = true
      d.profile = profile
      if (!wasEditing) d.settings.waterGoal = suggestedWaterGoal(profile)
    })
    setEditingProfile(false)
    if (wasEditing) {
      showToast('Profile updated')
    } else {
      burst()
      showToast(`Welcome, ${profile.name.split(' ')[0]} 🌿`)
    }
  }

  function dismissOnboarding() {
    if (editingProfile) {
      setEditingProfile(false)
    } else {
      update((d) => {
        d.onboarded = true
      })
      showToast('You can set up anytime from Settings')
    }
  }

  function deleteMeal(id) {
    update((d) => {
      const dd = d.days[key]
      if (dd) dd.meals = dd.meals.filter((m) => m.id !== id)
    })
    showToast('Removed')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="greeting">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="date">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="topbar-actions">
          {streak > 0 && (
            <span className="streak-chip" title={`${streak} day${streak > 1 ? 's' : ''} at 70+`}>
              🔥 {streak}
            </span>
          )}
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <GearIcon />
          </button>
        </div>
      </header>

      <main className="content">
        {tab === 'today' ? (
          <div className="today">
            <div className="today-left">
              <section className="card ring-card rise">
                <ScoreRing score={score.total} word={scoreWord(score.total, hasActivity)} />
                <p className="ring-sub">
                  {hasActivity ? 'Your score builds through the day' : 'Snap your first bite to begin'}
                </p>
                <div className="pillars">
                  <Pillar icon="🥗" label="Nourish" value={score.nourish} max={50} />
                  <Pillar icon="💧" label="Hydrate" value={score.hydrate} max={25} />
                  <Pillar icon="⏱️" label="Rhythm" value={score.rhythm} max={25} note={score.rhythmLabel} />
                </div>
              </section>

              <section className="card macros-card rise">
                <div className="macros">
                  <MacroTile label="calories" value={totals.calories} unit="kcal" />
                  <MacroTile label="protein" value={totals.protein} unit="g" />
                  <MacroTile label="carbs" value={totals.carbs} unit="g" />
                  <MacroTile label="fat" value={totals.fat} unit="g" />
                </div>
                {target && (
                  <p className="macros-target">
                    {totals.calories < target
                      ? `${Math.round(target - totals.calories).toLocaleString()} kcal left on your ~${target.toLocaleString()} canvas`
                      : `You've painted your full ~${target.toLocaleString()} kcal canvas today`}
                  </p>
                )}
              </section>
            </div>

            <div className="today-right">
              <WaterCard count={day.water} goal={data.settings.waterGoal} onChange={setWater} />
              <FastCard all={data} />
              <section className="meals-section rise">
                <h2 className="section-title">Today's plate</h2>
                <MealList meals={day.meals} onDelete={deleteMeal} />
              </section>
            </div>
          </div>
        ) : (
          <Journal data={data} />
        )}
      </main>

      <nav className="tabbar">
        <button className={`tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>
          <SunIcon />
          <span>Today</span>
        </button>
        <button
          className="fab"
          onClick={() => {
            buzz()
            setCapturing(true)
          }}
          aria-label="Log a meal"
        >
          <CameraIcon />
        </button>
        <button className={`tab ${tab === 'journal' ? 'active' : ''}`} onClick={() => setTab('journal')}>
          <BookIcon />
          <span>Journal</span>
        </button>
      </nav>

      <CaptureFlow open={capturing} onClose={() => setCapturing(false)} onLogged={handleLogged} profile={data.profile} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={data.settings}
        apiMode={apiMode}
        profileName={data.profile?.name}
        syncAvailable={syncAvailable}
        user={user}
        onSignIn={signIn}
        onSignOut={signOutUser}
        onEditProfile={() => {
          setSettingsOpen(false)
          setEditingProfile(true)
        }}
        onGoal={(g) => update((d) => (d.settings.waterGoal = g))}
        onClearToday={() => {
          // Write an empty day (not a delete) so the reset syncs across devices.
          update((d) => (d.days[key] = { meals: [], water: 0 }))
          setSettingsOpen(false)
          showToast('Today cleared — fresh slate')
        }}
        onEraseAll={() => {
          if (window.confirm('Erase all Nourish data on this device? This cannot be undone.')) eraseAll()
        }}
      />

      {showOnboarding && (
        <Onboarding
          initial={data.profile}
          isEdit={editingProfile}
          onComplete={completeOnboarding}
          onDismiss={dismissOnboarding}
          onSignIn={syncAvailable && !user ? signIn : null}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
