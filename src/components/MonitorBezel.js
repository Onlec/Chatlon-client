import React from 'react';
import { useBezel } from '../contexts/BezelContext';

function MonitorBezel({ os, children }) {
  const { bezel } = useBezel();

  if (!bezel.bezelEnabled) return children;

  const isDX = os !== 'liger';

  return (
    <div className={`monitor-surround ${isDX ? 'monitor-dx' : 'monitor-liger'}`}>
      <div className="monitor-shell">
        <div className="monitor-brand">
          {isDX ? 'ViewSonic' : 'Fruitware Studio Display'}
        </div>
        <div className={`monitor-screen-wrap ${bezel.crtCurve ? 'crt-curve' : ''}`}>
          <div className="monitor-screen">
            <div className="monitor-screen-content">
              {children}
              {bezel.crtScanlines && <div className="bezel-scanlines" />}
            </div>
          </div>
        </div>
        <div className="monitor-bottom-decor">
          <div className="monitor-led" />
          {isDX && (
            <div className="monitor-buttons">
              <div className="monitor-btn" />
              <div className="monitor-btn" />
              <div className="monitor-btn" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonitorBezel;
