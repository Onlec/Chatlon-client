import React, { useState } from 'react';

function renderIcon(icon, label) {
  if (typeof icon === 'string' && (icon.endsWith('.ico') || icon.endsWith('.png'))) {
    return <img src={icon} alt={label} />;
  }
  return <span>{icon}</span>;
}

function DockItem({ item, itemKey, onHover, onLeave, hovered }) {
  return (
    <button
      key={item.key}
      type="button"
      className={`liger-dock__item${hovered ? ' liger-dock__item--hovered' : ''}${item.isRunning ? ' liger-dock__item--running' : ''}${item.isActive ? ' liger-dock__item--active' : ''}${item.isMinimized ? ' liger-dock__item--minimized' : ''}`}
      onMouseEnter={() => onHover(itemKey)}
      onMouseLeave={onLeave}
      onClick={item.onClick}
      title={item.label}
    >
      <div className="liger-dock__icon">
        {renderIcon(item.icon, item.label)}
        {item.badge && (
          <div className="liger-dock__badge">
            {item.badge > 9 ? '9+' : item.badge}
          </div>
        )}
      </div>
      <div className="liger-dock__label">{item.label}</div>
      {item.isRunning && <div className="liger-dock__dot" />}
    </button>
  );
}

function LigerDock({ appItems = [], minimizedItems = [] }) {
  const [hovered, setHovered] = useState(null);
  const hasMinimizedItems = minimizedItems.length > 0;

  return (
    <div className="liger-dock-container">
      <div className="liger-dock">
        {appItems.map((item) => (
          <DockItem
            key={item.key}
            item={item}
            itemKey={`app-${item.key}`}
            hovered={hovered === `app-${item.key}`}
            onHover={setHovered}
            onLeave={() => setHovered(null)}
          />
        ))}

        {hasMinimizedItems && (
          <>
            <div className="liger-dock__separator liger-dock__separator--minimized" />
            {minimizedItems.map((item) => (
              <DockItem
                key={item.key}
                item={{ ...item, isMinimized: true }}
                itemKey={`min-${item.key}`}
                hovered={hovered === `min-${item.key}`}
                onHover={setHovered}
                onLeave={() => setHovered(null)}
              />
            ))}
          </>
        )}

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
