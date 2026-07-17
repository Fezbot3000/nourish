export default function SettingsSheet({
  open,
  onClose,
  settings,
  apiMode,
  profileName,
  onEditProfile,
  onGoal,
  onClearToday,
  onEraseAll,
}) {
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-small" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Settings">
        <header className="sheet-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="setting-row">
          <span>Profile</span>
          <button className="chip chip-on" onClick={onEditProfile}>
            {profileName ? `${profileName} · edit` : 'Set up →'}
          </button>
        </div>

        <div className="setting-row">
          <span>Daily water goal</span>
          <div className="stepper">
            <button onClick={() => onGoal(Math.max(4, settings.waterGoal - 1))} aria-label="Lower goal">
              −
            </button>
            <strong>{settings.waterGoal}</strong>
            <button onClick={() => onGoal(Math.min(16, settings.waterGoal + 1))} aria-label="Raise goal">
              +
            </button>
          </div>
        </div>

        <div className="setting-row">
          <span>AI analysis</span>
          <span className={`chip ${apiMode === 'live' ? 'chip-on' : 'chip-demo'}`}>
            {apiMode === 'live' ? 'live · Claude' : apiMode === 'demo' ? 'demo mode' : '…'}
          </span>
        </div>
        {apiMode === 'demo' && (
          <p className="setting-note">
            Running with sample analyses. Add an <code>ANTHROPIC_API_KEY</code> to <code>.env</code> and restart to
            analyze your real photos.
          </p>
        )}

        <div className="danger-row">
          <button className="ghost-btn danger" onClick={onClearToday}>
            Clear today's log
          </button>
          <button className="ghost-btn danger" onClick={onEraseAll}>
            Erase all data
          </button>
        </div>

        <p className="setting-footer">Nourish · your data never leaves this device (photos are analyzed, not stored remotely)</p>
      </div>
    </div>
  )
}
