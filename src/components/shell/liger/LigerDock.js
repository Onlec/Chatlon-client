import React, { useState } from 'react';

function renderIcon(icon, label) {
  if (typeof icon === 'string' && (icon.endsWith('.ico') || icon.endsWith('.png'))) {
    return <img src={icon} alt={label} />;
  }
  return <span>{icon}</span>;
}

function LigerDock({ items = [] }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="liger-dock-container">
      <div className="liger-dock">
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={`liger-dock__item${hovered === index ? ' liger-dock__item--hovered' : ''}${item.isRunning ? ' liger-dock__item--running' : ''}${item.isActive ? ' liger-dock__item--active' : ''}`}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onClick={item.onClick}
            title={item.label}
          >
            <div className="liger-dock__icon">
              {renderIcon(item.icon, item.label)}
            </div>
            <div className="liger-dock__label">{item.label}</div>
            {item.isRunning && <div className="liger-dock__dot" />}
          </button>
        ))}

        <div className="liger-dock__separator" />

        <div className="liger-dock__item liger-dock__item--static" aria-hidden="true">
          <div className="liger-dock__icon"><span>{'\u{1F5D1}\uFE0F'}</span></div>
          <div className="liger-dock__label">Prullenmand</div>
        </div>
      </div>
    </div>
  );
}

export default LigerDock;
