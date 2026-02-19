import React, { useState } from 'react';
import ModalPane from './ModalPane';

function AddContactWizard({ onClose, onSendRequest, currentUser, contacts }) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Validatie
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) {
        setError('Typ een e-mailadres');
        return;
      }
      if (trimmed === currentUser) {
        setError('U kunt uzelf niet toevoegen');
        return;
      }
      if (contacts.find(c => c.username === trimmed)) {
        setError('Dit contact staat al in uw lijst');
        return;
      }
      // Verstuur het verzoek
      onSendRequest(trimmed);
      setStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  return (
    <ModalPane title="Contact toevoegen" icon="👥" onClose={onClose} width="440px">
        <div className="modal-body add-contact-wizard">
          {/* Stap 1: Methode kiezen */}
          {step === 1 && (
            <div className="wizard-step">
              <div className="wizard-question">
                Hoe wilt u een contact toevoegen?
              </div>
              <div className="wizard-options">
                <label className="wizard-radio">
                  <input
                    type="radio"
                    name="method"
                    value="email"
                    checked={method === 'email'}
                    onChange={() => setMethod('email')}
                  />
                  <span>Via e-mailadres <em>(aanbevolen)</em></span>
                </label>
                <label className="wizard-radio wizard-radio-disabled">
                  <input
                    type="radio"
                    name="method"
                    value="search"
                    disabled
                  />
                  <span>Zoek een contact <em>(niet beschikbaar)</em></span>
                </label>
              </div>
            </div>
          )}

          {/* Stap 2: E-mailadres invoeren */}
          {step === 2 && (
            <div className="wizard-step">
              <div className="wizard-question">
                Typ het volledige e-mailadres van de persoon die u wilt toevoegen:
              </div>
              <input
                type="text"
                className="wizard-email-input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNext();
                }}
                placeholder="naam@coldmail.com"
                autoFocus
              />
              {error && (
                <div className="wizard-error">{error}</div>
              )}
              <div className="wizard-hint">
                Voorbeeld: vriend@coldmail.com
              </div>
            </div>
          )}

          {/* Stap 3: Bevestiging */}
          {step === 3 && (
            <div className="wizard-step">
              <div className="wizard-confirmation">
                <div className="wizard-confirmation-icon">✓</div>
                <div className="wizard-confirmation-title">
                  Contactverzoek verstuurd!
                </div>
                <div className="wizard-confirmation-text">
                  <strong>{email}</strong> is toegevoegd aan uw contactenlijst.
                  Deze persoon verschijnt als 'Offline' totdat het verzoek
                  is geaccepteerd.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard navigatie knoppen */}
        <div className="wizard-actions">
          {step === 1 && (
            <>
              <div className="wizard-actions-spacer"></div>
              <button className="dx-button primary" onClick={handleNext}>
                Volgende &gt;
              </button>
              <button className="dx-button" onClick={onClose}>
                Annuleren
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button className="dx-button" onClick={handleBack}>
                &lt; Vorige
              </button>
              <div className="wizard-actions-spacer"></div>
              <button className="dx-button primary" onClick={handleNext}>
                Volgende &gt;
              </button>
              <button className="dx-button" onClick={onClose}>
                Annuleren
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <div className="wizard-actions-spacer"></div>
              <button className="dx-button primary" onClick={onClose}>
                Voltooien
              </button>
            </>
          )}
        </div>
    </ModalPane>
  );
}

export default AddContactWizard;
