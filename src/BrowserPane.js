import React, { useState, useEffect, useRef } from 'react';
import { log } from './utils/debug';

function BrowserPane() {
  const [url, setUrl] = useState('http://www.yoctol.com');
  const [inputUrl, setInputUrl] = useState('http://www.yoctol.com');
  const [popups, setPopups] = useState([]);
  const [nextPopupId, setNextPopupId] = useState(0);
  const contentRef = useRef(null);

  const bookmarks = [
    { name: 'Napster', url: 'http://www.napster.com' },
    { name: 'Kazaa', url: 'http://www.kazaa.com' },
    { name: 'MSN Messenger', url: 'http://messenger.msn.com' },
    { name: 'MySpace', url: 'http://www.myspace.com' },
    { name: 'AltaVista', url: 'http://www.altavista.com' },
    { name: 'Ask Jeeves', url: 'http://www.askjeeves.com' },
    { name: 'GeoCities', url: 'http://www.geocities.com' },
    { name: 'Newgrounds', url: 'http://www.newgrounds.com' }
  ];

  const popupMessages = [
    {
      title: '🎉 GEFELICITEERD!!!',
      content: 'U bent onze 1.000.000ste bezoeker! Klik hier om uw GRATIS iPod te claimen!',
      buttons: ['CLAIM NU!', 'KLIK HIER']
    },
    {
      title: '⚠️ VIRUS WAARSCHUWING',
      content: 'Uw computer is geïnfecteerd met 47 virussen! Download nu gratis virusscanner!',
      buttons: ['DOWNLOAD NU', 'SCAN PC']
    },
    {
      title: '💰 GELD VERDIENEN',
      content: 'Verdien €5000 per week vanuit huis! Geen ervaring nodig!',
      buttons: ['MEER INFO', 'JA GRAAG!']
    },
    {
      title: '🔞 HOT SINGLES',
      content: '23 singles in uw buurt willen u ontmoeten! Klik om te chatten!',
      buttons: ['BEKIJK PROFIEL', 'CHAT NU']
    },
    {
      title: '🎰 CASINO ONLINE',
      content: 'Speel nu en ontvang €100 GRATIS bonus! Geen storting vereist!',
      buttons: ['SPEEL NU', 'CLAIM BONUS']
    },
    {
      title: '📧 U HEEFT POST',
      content: 'U heeft 1 nieuw bericht van Microsoft Support. Lees nu!',
      buttons: ['LEES BERICHT', 'OPENEN']
    },
    {
      title: '🎁 GRATIS AANBIEDING',
      content: 'Test onze nieuwe toolbar GRATIS! Inclusief weersverwachting en emoticons!',
      buttons: ['INSTALLEER', 'GRATIS TRIAL']
    },
    {
      title: '⚡ VERTRAAGDE PC?',
      content: 'Maak uw PC 300% sneller met deze ene simpele truc!',
      buttons: ['LEER MEER', 'OPTIMALISEER NU']
    }
  ];

  const createPopup = () => {
    const popup = popupMessages[Math.floor(Math.random() * popupMessages.length)];
    const newPopup = {
      id: nextPopupId,
      ...popup,
      left: Math.random() * 400 + 100,
      top: Math.random() * 300 + 50
    };
    setPopups(prev => [...prev, newPopup]);
    setNextPopupId(prev => prev + 1);
  };

  const tryClosePopup = (id) => {
    // 70% kans dat er 2 nieuwe popups komen bij sluiten
    if (Math.random() > 0.3) {
      setTimeout(() => createPopup(), 100);
      setTimeout(() => createPopup(), 200);
    }
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  const handleContentClick = (e) => {
    // Voorkom dat clicks op de popup knoppen extra popups triggeren
    if (e.target.closest('.browser-popup')) {
      return;
    }
    
    // Elke click in de content area spawnt een popup
    createPopup();
  };

  const handleBookmarkClick = (bookmark) => {
    setUrl(bookmark.url);
    setInputUrl(bookmark.url);
    // Bookmark clicks spawnen ook popups!
    createPopup();
  };

  const handleGo = () => {
    setUrl(inputUrl);
    createPopup(); // Navigeren spawnt popup
  };

  const handleSearch = (e) => {
    e.preventDefault();
    createPopup(); // Zoeken spawnt popup
  };

  return (
    <div className="browser-container">
      {/* Menubar */}
      <div className="browser-menubar">
        <span className="browser-menu-item">Bestand</span>
        <span className="browser-menu-item">Bewerken</span>
        <span className="browser-menu-item">Beeld</span>
        <span className="browser-menu-item">Favorieten</span>
        <span className="browser-menu-item">Extra</span>
        <span className="browser-menu-item">Help</span>
      </div>

      {/* Toolbar */}
      <div className="browser-toolbar">
        <button className="browser-nav-btn" onClick={() => createPopup()} title="Terug">
          ◀
        </button>
        <button className="browser-nav-btn" onClick={() => createPopup()} title="Vooruit">
          ▶
        </button>
        <button className="browser-nav-btn" onClick={() => createPopup()} title="Stop">
          ✕
        </button>
        <button className="browser-nav-btn" onClick={() => createPopup()} title="Vernieuwen">
          ↻
        </button>
        <button className="browser-nav-btn" onClick={() => createPopup()} title="Startpagina">
          🏠
        </button>
        
        <div className="browser-address-bar">
          <span className="browser-address-label">Adres</span>
          <input 
            type="text" 
            className="browser-address-input"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
          />
          <button className="browser-go-btn" onClick={handleGo}>
            Start
          </button>
        </div>
      </div>

      {/* Bookmarks bar */}
      <div className="browser-bookmarks-bar">
        <span className="browser-bookmarks-label">Favorieten:</span>
        {bookmarks.map((bookmark, index) => (
          <button 
            key={index}
            className="browser-bookmark-btn"
            onClick={() => handleBookmarkClick(bookmark)}
          >
            📄 {bookmark.name}
          </button>
        ))}
      </div>

      {/* Browser content */}
      <div 
        className="browser-content" 
        ref={contentRef}
        onClick={handleContentClick}
      >
        {/* Yoctol Search Page */}
        <div className="yoctol-page">
          <div className="yoctol-header">
            <img 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'%3E%3Ctext x='10' y='50' font-family='Arial' font-size='42' font-weight='bold' fill='%234285f4'%3EY%3C/text%3E%3Ctext x='35' y='50' font-family='Arial' font-size='42' font-weight='bold' fill='%23ea4335'%3Eo%3C/text%3E%3Ctext x='60' y='50' font-family='Arial' font-size='42' font-weight='bold' fill='%23fbbc04'%3Ec%3C/text%3E%3Ctext x='85' y='50' font-family='Arial' font-size='42' font-weight='bold' fill='%234285f4'%3Et%3C/text%3E%3Ctext x='105' y='50' font-family='Arial' font-size='42' font-weight='bold' fill='%2334a853'%3Eo%3C/text%3E%3Ctext x='130' y='50' font-family='Arial' font-size='42' font-weight='bold' fill='%23ea4335'%3El%3C/text%3E%3C/svg%3E" 
              alt="Yoctol" 
              className="yoctol-logo"
            />
          </div>

          <form className="yoctol-search-form" onSubmit={handleSearch}>
            <input 
              type="text" 
              className="yoctol-search-input"
              placeholder="Doorzoek het web..."
            />
            <div className="yoctol-buttons">
              <button type="submit" className="yoctol-btn">Yoctol zoeken</button>
              <button type="button" className="yoctol-btn" onClick={handleSearch}>
                Geluk testen
              </button>
            </div>
          </form>

          <div className="yoctol-links">
            <a href="#" onClick={(e) => { e.preventDefault(); createPopup(); }}>
              Zoeken uitgebreid
            </a>
            {' - '}
            <a href="#" onClick={(e) => { e.preventDefault(); createPopup(); }}>
              Voorkeuren
            </a>
            {' - '}
            <a href="#" onClick={(e) => { e.preventDefault(); createPopup(); }}>
              Taalvarianten
            </a>
          </div>

          <div className="yoctol-services">
            <div className="yoctol-service-box">
              <h3>Adverteren met Yoctol</h3>
              <p>Bereik miljoenen gebruikers</p>
              <a href="#" onClick={(e) => { e.preventDefault(); createPopup(); }}>
                Meer informatie »
              </a>
            </div>
            <div className="yoctol-service-box">
              <h3>Zakelijke oplossingen</h3>
              <p>Zoektechnologie voor bedrijven</p>
              <a href="#" onClick={(e) => { e.preventDefault(); createPopup(); }}>
                Lees meer »
              </a>
            </div>
            <div className="yoctol-service-box">
              <h3>Over Yoctol</h3>
              <p>Onze missie en visie</p>
              <a href="#" onClick={(e) => { e.preventDefault(); createPopup(); }}>
                Ontdek meer »
              </a>
            </div>
          </div>

          <div className="yoctol-footer">
            © 2001 Yoctol Inc. - <a href="#" onClick={(e) => { e.preventDefault(); createPopup(); }}>Privacy</a>
          </div>

          {/* Annoying banner ad */}
          <div className="yoctol-banner-ad" onClick={() => createPopup()}>
            <marquee>🎉 KLIK HIER voor GRATIS SCREENSAVERS en CURSORS! 🎉</marquee>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="browser-status-bar">
        <div className="browser-status-text">Gereed</div>
        <div className="browser-status-zone">
          🔒 Internet | 🖥️ Lokaal intranet
        </div>
      </div>

      {/* Annoying popups */}
      {popups.map((popup) => (
        <div 
          key={popup.id}
          className="browser-popup"
          style={{
            left: popup.left,
            top: popup.top
          }}
        >
          <div className="browser-popup-header">
            <span className="browser-popup-title">⚠️ {popup.title}</span>
            <button 
              className="browser-popup-close"
              onClick={() => tryClosePopup(popup.id)}
            >
              ✕
            </button>
          </div>
          <div className="browser-popup-content">
            <p>{popup.content}</p>
            <div className="browser-popup-buttons">
              {popup.buttons.map((btnText, idx) => (
                <button 
                  key={idx}
                  className="browser-popup-btn"
                  onClick={() => {
                    createPopup();
                    createPopup();
                  }}
                >
                  {btnText}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BrowserPane;