import React from 'react';

function DXBrand() {
  return (
    <div className="xp-brand-layout xp-login-brand-layout xp-logoff-brand-layout">
      <div className="xp-brand-left">
        <span className="xp-brand-microsoft">Macrohard</span>
        <span className="xp-brand-windows">
          Panes<span className="xp-brand-xp">dX</span>
        </span>
      </div>
      <div className="xp-brand-right">
        <div className="xp-boot-logo">
          <div className="xp-logo-stripe xp-stripe-green" />
          <div className="xp-logo-stripe xp-stripe-blue" />
          <div className="xp-logo-stripe xp-stripe-red" />
        </div>
      </div>
    </div>
  );
}

function LigerBrand({ mode }) {
  return (
    <div className={`liger-transition__brand liger-transition__brand--${mode}`}>
      <div className="liger-transition__logo" aria-hidden="true">🐯</div>
      <div className="liger-transition__wordmark">Liger</div>
    </div>
  );
}

function SystemTransitionScreen({
  variant = 'dx',
  mode = 'welcome',
  fadingOut = false,
  onPowerOn
}) {
  if (variant === 'liger') {
    const title = mode === 'welcome'
      ? 'Welkom'
      : mode === 'logoff'
        ? 'Sessie wordt afgesloten'
        : 'Liger is uitgeschakeld';
    const subtitle = mode === 'welcome'
      ? 'Het bureaublad wordt geladen.'
      : mode === 'logoff'
        ? 'Uw sessie wordt veilig beëindigd.'
        : 'Druk op de aan/uit-knop om opnieuw te starten.';

    return (
      <div
        className={`liger-system-transition liger-system-transition--${mode}${fadingOut ? ' liger-system-transition--fade-out' : ''}`}
      >
        <div className="liger-system-transition__topbar">
          <span>Liger OS</span>
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="liger-system-transition__main">
          <LigerBrand mode={mode} />
          <div className="liger-system-transition__title">{title}</div>
          <div className="liger-system-transition__subtitle">{subtitle}</div>
          {mode === 'shutdown' && (
            <button
              type="button"
              className="liger-system-transition__power"
              onClick={onPowerOn}
            >
              <span aria-hidden="true">{'\u23FB'}</span>
              <span>Schakel in</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'welcome') {
    return (
      <div className={`xp-login xp-post-login-welcome${fadingOut ? ' xp-post-login-welcome--fade-out' : ''}`}>
        <div className="xp-top-bar" />
        <div className="xp-main xp-post-login-welcome-main">
          <div className="xp-post-login-welcome-title">Welkom</div>
        </div>
        <div className="xp-bottom-bar" />
      </div>
    );
  }

  if (mode === 'shutdown') {
    return (
      <div className="xp-login xp-shutdown-screen">
        <div className="xp-top-bar" />
        <div className="xp-main xp-shutdown-main">
          <DXBrand />
          <div className="xp-shutdown-message-line">De computer is uitgeschakeld.</div>
          <div className="xp-shutdown-actions">
            <button type="button" className="power-on-button" onClick={onPowerOn}>
              <span className="power-on-icon">{'\u23FB'}</span>
            </button>
            <div className="power-on-hint">Druk op de aan/uit-knop om de computer te starten</div>
          </div>
        </div>
        <div className="xp-bottom-bar">
          <div className="xp-bottom-strip" />
        </div>
      </div>
    );
  }

  return (
    <div className="xp-login xp-logoff-screen">
      <div className="xp-top-bar" />
      <div className="xp-main xp-logoff-main">
        <DXBrand />
        <div className="xp-logoff-message-line">Aan het uitloggen...</div>
      </div>
      <div className="xp-bottom-bar" />
    </div>
  );
}

export default SystemTransitionScreen;
