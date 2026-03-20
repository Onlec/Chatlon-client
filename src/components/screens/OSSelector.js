import React, { useState } from 'react';

const OS_STORAGE_KEY = 'chatlon_os';

function OSSelector() {
  const [hovered, setHovered] = useState(null);

  const selectOS = (os) => {
    localStorage.setItem(OS_STORAGE_KEY, os);
    window.location.reload();
  };

  return (
    <div className="os-selector" data-testid="os-selector">
      <div className="os-selector__panel">
        <div className="os-selector__eyebrow">Chatlon</div>
        <h1 className="os-selector__title">Selecteer uw besturingssysteem</h1>
        <p className="os-selector__copy">
          Uw keuze wordt lokaal onthouden. Voeg <code>?reset-os</code> toe aan de URL om opnieuw te kiezen.
        </p>

        <div className="os-selector__grid">
          <div
            className={`os-option ${hovered === 'dx' ? 'os-option--hovered' : ''}`}
            onMouseEnter={() => setHovered('dx')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => selectOS('dx')}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectOS('dx');
              }
            }}
          >
            <div className="os-option__logo os-option__logo--dx" aria-hidden="true">
              <span className="os-option__dx-flag os-option__dx-flag--green" />
              <span className="os-option__dx-flag os-option__dx-flag--blue" />
              <span className="os-option__dx-flag os-option__dx-flag--red" />
              <span className="os-option__dx-flag os-option__dx-flag--yellow" />
            </div>
            <div className="os-option__name">
              Panes <span className="os-option__accent">dX</span>
            </div>
            <div className="os-option__meta">Macrohard Panes dX</div>
          </div>

          <div
            className={`os-option ${hovered === 'liger' ? 'os-option--hovered' : ''}`}
            onMouseEnter={() => setHovered('liger')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => selectOS('liger')}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectOS('liger');
              }
            }}
          >
            <div className="os-option__logo os-option__logo--liger" aria-hidden="true">
              <span className="os-option__liger-mark">🐯</span>
            </div>
            <div className="os-option__name">Liger OS</div>
            <div className="os-option__meta">Fruitware Liger 10.4</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OSSelector;
