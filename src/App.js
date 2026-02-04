import React, { useState, useEffect, useRef } from 'react';
import Pane from './Pane'; 
import LoginScreen from './LoginScreen';
import ConversationPane from './ConversationPane';
import BootSequence from './BootSequence';
import ToastNotification from './ToastNotification';
import { gun, user } from './gun';
import { paneConfig, getInitialPaneState } from './paneConfig';
import './App.css';

function App() {
  const [hasBooted, setHasBooted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [isStartOpen, setIsStartOpen] = useState(false);
  
  // Generiek pane management
  const [panes, setPanes] = useState(getInitialPaneState());
  const [paneOrder, setPaneOrder] = useState([]);
  const [activePane, setActivePane] = useState(null);
  const [savedSizes, setSavedSizes] = useState({}); // Onthoud pane groottes per sessie
  const [savedPositions, setSavedPositions] = useState({}); // Onthoud pane posities per sessie
  const [cascadeOffset, setCascadeOffset] = useState(0); // Voor getrapt openen
  const [conversations, setConversations] = useState({}); // Dynamische conversation panes
  const conversationsRef = useRef({}); // Ref voor real-time access
  const activePaneRef = useRef(null); // Ref voor real-time access
  
  // Sync refs wanneer state verandert
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  
  useEffect(() => {
    activePaneRef.current = activePane;
  }, [activePane]);
  
  const [toasts, setToasts] = useState([]); // Toast notificaties
  const [messageListeners, setMessageListeners] = useState({}); // Tracking van message listeners
  const messageListenersRef = useRef({}); // Ref voor synchrone access
  const [friendRequestListener, setFriendRequestListener] = useState(null); // Tracking van friend request listener
  const [shownToasts, setShownToasts] = useState(new Set()); // Track welke toasts al getoond zijn
  const shownToastsRef = useRef(new Set()); // Ref voor synchrone duplicate check

  // Sync messageListeners ref
  useEffect(() => {
    messageListenersRef.current = messageListeners;
  }, [messageListeners]);

  useEffect(() => {
    console.log('[App] useEffect running, checking user.is:', !!user.is);
    
    // Simple check functie
    const initializeUser = () => {
      if (user.is && user.is.alias) {
        console.log('[App] User is logged in:', user.is.alias);
        setIsLoggedIn(true);
        setCurrentUser(user.is.alias);
        setTimeout(() => openPane('contacts'), 100);
        setupMessageListeners();
        setupFriendRequestListener();
        return true;
      }
      return false;
    };
    
    // Probeer direct
    if (initializeUser()) {
      return;
    }
    
    // Anders poll elke 100ms voor max 2 seconden
    console.log('[App] Waiting for Gun auth...');
    let attempts = 0;
    const pollInterval = setInterval(() => {
      attempts++;
      if (initializeUser() || attempts > 20) {
        clearInterval(pollInterval);
        if (attempts > 20) {
          console.log('[App] Auth timeout - showing login screen');
        }
      }
    }, 100);
    
    return () => clearInterval(pollInterval);
  }, []);

  const setupFriendRequestListener = () => {
    if (!user.is) return;
    
    const currentUsername = user.is.alias;
    const listenerStartTime = Date.now();
    
    console.log('[App] Setting up friend request listener for:', currentUsername);
    
    // Luister naar nieuwe vriendenverzoeken in public space
    gun.get('friendRequests').get(currentUsername).map().on((requestData, requestId) => {
      console.log('[App] Friend request data received:', requestData?.from, requestData?.status);
      
      if (requestData && requestData.from && requestData.status === 'pending') {
        const requestTimestamp = requestData.timestamp || 0;
        
        // Check of verzoek VOOR listener start was (oude verzoeken)
        if (requestTimestamp < listenerStartTime) {
          console.log('[App] Old friend request (before listener start), skipping');
          return;
        }
        
        console.log('[App] NEW friend request, checking if already shown');
        
        // Check duplicate met timestamp
        const toastKey = `friendreq_${requestData.from}_${requestTimestamp}`;
        
        if (shownToastsRef.current.has(toastKey)) {
          console.log('[App] Friend request toast already shown, skipping');
          return;
        }
        
        // Markeer als getoond
        shownToastsRef.current.add(toastKey);
        console.log('[App] Showing friend request toast');
        
        // Toon toast notificatie
        showToast({
          from: requestData.from,
          message: 'wil je toevoegen als contact',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${requestData.from}`,
          type: 'friendRequest',
          requestId: requestId
        });
      }
    });
  };

  const setupMessageListeners = () => {
    if (!user.is) return;
    
    const currentUsername = user.is.alias;
    
    console.log('[App] Setting up session-based message listeners for:', currentUsername);
    
    // Luister naar contactenlijst
    user.get('contacts').map().on((contactData) => {
      if (contactData && contactData.status === 'accepted') {
        const contactName = contactData.username;
        const pairId = getContactPairId(currentUsername, contactName);
        
        // Als we AL een listener hebben voor dit contact pair, SKIP!
        if (messageListenersRef.current[pairId]) {
          console.log('[App] Session listener already exists for:', pairId);
          return;
        }
        
        console.log('[App] Setting up NEW session listener for:', pairId);
        
        // Luister naar de ACTIVE_SESSIONS node voor dit contact pair
        let currentSessionListener = null;
        
        gun.get('ACTIVE_SESSIONS').get(pairId).on((sessionData) => {
          if (!sessionData || !sessionData.sessionId) {
            console.log('[App] No active session for:', pairId);
            // Cleanup oude listener als sessie dood is
            if (currentSessionListener) {
              currentSessionListener();
              currentSessionListener = null;
            }
            return;
          }
          
          const activeSessionId = sessionData.sessionId;
          
          // Parse openBy van JSON string
          let openBy = [];
          try {
            openBy = sessionData.openBy ? JSON.parse(sessionData.openBy) : [];
          } catch (e) {
            // Fallback voor oude data
            openBy = Array.isArray(sessionData.openBy) ? sessionData.openBy : [sessionData.openBy];
          }
          
          console.log('[App] Active session for', pairId, ':', activeSessionId);
          console.log('[App] Session open by:', openBy);
          
          // Cleanup oude session listener als er een nieuwe sessie is
          if (currentSessionListener) {
            console.log('[App] Cleaning up old session listener');
            currentSessionListener();
          }
          
          // Timestamp wanneer DEZE listener start (voor deze specifieke sessie)
          const thisListenerStartTime = Date.now();
          console.log('[App] Session listener start time:', new Date(thisListenerStartTime));
          
          // Setup nieuwe listener voor deze actieve sessie
          const chatNode = gun.get(activeSessionId);
          
          chatNode.map().on((data, id) => {
            // VEILIGHEIDSCHECK 1: Valideer data
            if (!data || !data.content || !data.sender || !data.timeRef) {
              return;
            }
            
            // VEILIGHEIDSCHECK 2: Voorkom self-messaging
            const currentUser = user.is?.alias;
            if (!currentUser || data.sender === currentUser) {
              return;
            }
            
            // VEILIGHEIDSCHECK 3: Alleen berichten van het juiste contact
            if (data.sender !== contactName) {
              return;
            }
            
            const messageTimestamp = data.timeRef;
            
            console.log('[App] Message in session', activeSessionId, 'from:', contactName, 'timestamp:', new Date(messageTimestamp));
            
            // Check of bericht VOOR deze listener start was (oude berichten)
            if (messageTimestamp < thisListenerStartTime) {
              console.log('[App] Old message (before this session listener start), skipping toast');
              return;
            }
            
            console.log('[App] NEW message received from:', contactName, 'in session');
            
            // Check of conversation venster open en in focus is
            const convId = `conv_${contactName}`;
            const conv = conversationsRef.current[convId];
            
            const isConvOpen = conv && conv.isOpen && !conv.isMinimized;
            const isConvActive = activePaneRef.current === convId;
            
            // Toon toast ALLEEN als chat NIET BEIDE open EN actief is
            const shouldShowToast = !(isConvOpen && isConvActive);
            
            console.log('[App] shouldShowToast:', shouldShowToast, '(isConvOpen:', isConvOpen, ', isConvActive:', isConvActive, ')');
            
            if (shouldShowToast) {
              console.log('[App] âœ… Showing toast for message from:', contactName);
              
              // DUPLICATE CHECK: Gebruik timestamp + contactName + sessionId
              const toastKey = `${contactName}_${messageTimestamp}_${activeSessionId}`;
              
              if (shownToastsRef.current.has(toastKey)) {
                console.log('[App] Toast for this message already shown, skipping');
                return;
              }
              
              // Markeer als getoond
              shownToastsRef.current.add(toastKey);
              
              showToast({
                from: contactName,
                message: data.content,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactName}`,
                contactName: contactName,
                type: 'message',
                messageId: id,
                sessionId: activeSessionId
              });
            } else {
              console.log('[App] âŒ Skipping toast - conversation is open AND active');
            }
          });
          
          // Store cleanup function
          currentSessionListener = () => {
            chatNode.off();
          };
        });
        
        // Markeer dat we een listener hebben voor dit contact pair
        setMessageListeners(prev => {
          const updated = {
            ...prev,
            [pairId]: true
          };
          messageListenersRef.current = updated;
          return updated;
        });
      }
    });
  };

  const getContactPairId = (user1, user2) => {
    const sorted = [user1, user2].sort();
    return `${sorted[0]}_${sorted[1]}`;
  };

  const getChatRoomId = (user1, user2) => {
    const sorted = [user1, user2].sort();
    return `CHAT_${sorted[0]}_${sorted[1]}`;
  };

  const showToast = (toastData) => {
    console.log('[App] showToast called:', toastData.from, toastData.type);
    
    // De duplicate check is al gedaan in de message listener
    // Hier hoeven we alleen nog de toast toe te voegen
    const toastId = `toast_${Date.now()}_${Math.random()}`;
    
    console.log('[App] Adding toast:', toastId);
    
    // Speel notificatie geluid
    new Audio('/nudge.mp3').play().catch(() => {}); 
    
    setToasts(prev => {
      console.log('[App] Toasts before:', prev.length);
      const newToasts = [...prev, {
        id: toastId,
        ...toastData
      }];
      console.log('[App] Toasts after:', newToasts.length);
      return newToasts;
    });
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const handleToastClick = (toast) => {
    if (toast.type === 'message') {
      // Open conversation met contact
      openConversation(toast.contactName);
    } else if (toast.type === 'friendRequest') {
      // Open contactenlijst zodat gebruiker het verzoek kan zien
      openPane('contacts');
    }
  };

  const handleLoginSuccess = (username) => {
    console.log('[App] Login success:', username);
    setIsLoggedIn(true);
    setCurrentUser(username);
    
    // Start listeners NA succesvolle login
    setTimeout(() => {
      console.log('[App] Starting listeners after login...');
      setupMessageListeners();
      setupFriendRequestListener();
    }, 500);
  };

  const handleLogoff = () => {
    user.leave();
    setIsLoggedIn(false);
    setCurrentUser('');
    setPanes(getInitialPaneState());
    setPaneOrder([]);
    setActivePane(null);
    window.location.reload();
  };

  // Generieke pane functies
  const openPane = (paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isOpen: true, isMinimized: false }
    }));
    setIsStartOpen(false);
    if (!paneOrder.includes(paneName)) {
      setPaneOrder([...paneOrder, paneName]);
    }
    setActivePane(paneName);
    
    // Als er geen opgeslagen positie is, gebruik cascade offset
    if (!savedPositions[paneName]) {
      setCascadeOffset(prev => (prev + 30) % 150); // Reset na 5 vensters
    }
  };

  const closePane = (paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { isOpen: false, isMinimized: false, isMaximized: false }
    }));
    setPaneOrder(prev => prev.filter(p => p !== paneName));
    if (activePane === paneName) {
      const remaining = paneOrder.filter(p => p !== paneName);
      setActivePane(remaining[remaining.length - 1] || null);
    }
  };

  const minimizePane = (paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMinimized: true }
    }));
  };

  const toggleMaximizePane = (paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMaximized: !prev[paneName].isMaximized }
    }));
  };

  const focusPane = (paneName) => {
    setActivePane(paneName);
  };

  const handleTaskbarClick = (paneName) => {
    // Check of het een conversation is
    if (paneName.startsWith('conv_')) {
      const conv = conversations[paneName];
      if (!conv) return;
      
      if (conv.isMinimized) {
        setConversations(prev => ({
          ...prev,
          [paneName]: { ...prev[paneName], isMinimized: false }
        }));
        setActivePane(paneName);
      } else if (activePane === paneName) {
        minimizeConversation(paneName);
      } else {
        setActivePane(paneName);
      }
      return;
    }

    // Normale pane
    const pane = panes[paneName];
    if (!pane) return;
    
    if (pane.isMinimized) {
      setPanes(prev => ({
        ...prev,
        [paneName]: { ...prev[paneName], isMinimized: false }
      }));
      setActivePane(paneName);
    } else if (activePane === paneName) {
      minimizePane(paneName);
    } else {
      setActivePane(paneName);
    }
  };

  const getZIndex = (paneName) => {
    if (activePane === paneName) return 1000;
    const index = paneOrder.indexOf(paneName);
    return 100 + index;
  };

  const handleSizeChange = (paneName, newSize) => {
    setSavedSizes(prev => ({
      ...prev,
      [paneName]: newSize
    }));
  };

  const handlePositionChange = (paneName, newPosition) => {
    setSavedPositions(prev => ({
      ...prev,
      [paneName]: newPosition
    }));
  };

  const getInitialPosition = (paneName) => {
    // Als er een opgeslagen positie is, gebruik die
    if (savedPositions[paneName]) {
      return savedPositions[paneName];
    }
    // Anders gebruik cascade offset
    return {
      left: 100 + cascadeOffset,
      top: 50 + cascadeOffset
    };
  };

  // Open een conversation met een contact
  const openConversation = (contactName) => {
    const convId = `conv_${contactName}`;
    
    console.log('[App] Opening conversation with:', contactName);
    
    // Als conversation niet bestaat, voeg toe aan conversations state
    if (!conversations[convId]) {
      setConversations(prev => ({
        ...prev,
        [convId]: {
          contactName,
          isOpen: true,
          isMinimized: false,
          isMaximized: false
        }
      }));
      
      // Voeg toe aan pane order
      if (!paneOrder.includes(convId)) {
        setPaneOrder([...paneOrder, convId]);
      }
      
      // Increment cascade offset
      if (!savedPositions[convId]) {
        setCascadeOffset(prev => (prev + 30) % 150);
      }
    } else {
      // Als het al bestaat, open en focus
      setConversations(prev => ({
        ...prev,
        [convId]: { ...prev[convId], isOpen: true, isMinimized: false }
      }));
    }
    
    setActivePane(convId);
    
    console.log('[App] Conversation opened, conversations state:', conversations);
  };

  const closeConversation = (convId) => {
    console.log('[App] Closing conversation:', convId);
    setConversations(prev => {
      const updated = { ...prev };
      delete updated[convId];
      console.log('[App] Conversations after close:', updated);
      return updated;
    });
    setPaneOrder(prev => prev.filter(p => p !== convId));
    if (activePane === convId) {
      const remaining = paneOrder.filter(p => p !== convId);
      setActivePane(remaining[remaining.length - 1] || null);
    }
  };

  const minimizeConversation = (convId) => {
    console.log('[App] Minimizing conversation:', convId);
    setConversations(prev => {
      const updated = {
        ...prev,
        [convId]: { ...prev[convId], isMinimized: true }
      };
      console.log('[App] Conversations after minimize:', updated);
      return updated;
    });
  };

  const toggleMaximizeConversation = (convId) => {
    setConversations(prev => ({
      ...prev,
      [convId]: { ...prev[convId], isMaximized: !prev[convId].isMaximized }
    }));
  };

  if (!hasBooted) {
    return <BootSequence onBootComplete={() => setHasBooted(true)} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="desktop" onClick={() => setIsStartOpen(false)}>
      <div className="shortcuts-area">
        {Object.entries(paneConfig).map(([paneName, config]) => (
          <div key={paneName} className="shortcut" onDoubleClick={() => openPane(paneName)}>
            {config.desktopIcon.endsWith('.ico') || config.desktopIcon.endsWith('.png') ? (
              <img src={config.desktopIcon} alt={config.desktopLabel} className="shortcut-icon" />
            ) : (
              <span className="shortcut-icon" style={{ fontSize: '32px' }}>{config.desktopIcon}</span>
            )}
            <span className="shortcut-label">{config.desktopLabel}</span>
          </div>
        ))}
      </div>

      <div className="pane-layer">
        {/* Normale panes */}
        {Object.entries(paneConfig).map(([paneName, config]) => {
          const pane = panes[paneName];
          if (!pane.isOpen) return null;

          const Component = config.component;
          
          return (
            <div key={paneName} style={{ display: pane.isMinimized ? 'none' : 'block' }}>
              <Pane 
                title={config.title}
                type={paneName}
                isMaximized={pane.isMaximized}
                onMaximize={() => toggleMaximizePane(paneName)}
                onClose={() => closePane(paneName)}
                onMinimize={() => minimizePane(paneName)}
                onFocus={() => focusPane(paneName)}
                zIndex={getZIndex(paneName)}
                savedSize={savedSizes[paneName]}
                onSizeChange={(newSize) => handleSizeChange(paneName, newSize)}
                initialPosition={getInitialPosition(paneName)}
                onPositionChange={(newPosition) => handlePositionChange(paneName, newPosition)}
              >
                {paneName === 'contacts' ? (
                  <Component onOpenConversation={openConversation} />
                ) : (
                  <Component />
                )}
              </Pane>
            </div>
          );
        })}

        {/* Dynamische conversation panes */}
        {Object.entries(conversations).map(([convId, conv]) => {
          if (!conv.isOpen) return null;
          
          return (
            <div key={convId} style={{ display: conv.isMinimized ? 'none' : 'block' }}>
              <Pane 
                title={`Gesprek met ${conv.contactName}`}
                type="conversation"
                isMaximized={conv.isMaximized}
                onMaximize={() => toggleMaximizeConversation(convId)}
                onClose={() => closeConversation(convId)}
                onMinimize={() => minimizeConversation(convId)}
                onFocus={() => focusPane(convId)}
                zIndex={getZIndex(convId)}
                savedSize={savedSizes[convId]}
                onSizeChange={(newSize) => handleSizeChange(convId, newSize)}
                initialPosition={getInitialPosition(convId)}
                onPositionChange={(newPosition) => handlePositionChange(convId, newPosition)}
              >
                <ConversationPane contactName={conv.contactName} />
              </Pane>
            </div>
          );
        })}
      </div>

      {isStartOpen && (
        <div className="start-menu" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-header">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser}`} alt="user" className="start-user-img" />
            <span className="start-user-name">{currentUser}</span>
          </div>
          <div className="start-menu-main">
            <div className="start-left-col">
              {Object.entries(paneConfig).map(([paneName, config]) => (
                <div key={paneName} className="start-item" onClick={() => openPane(paneName)}>
                  {config.desktopIcon.endsWith('.ico') || config.desktopIcon.endsWith('.png') ? (
                    <img src={config.desktopIcon} alt="icon" style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>{config.desktopIcon}</span>
                  )}
                  <span>{config.desktopLabel}</span>
                </div>
              ))}
            </div>
            <div className="start-right-col">
              <div className="start-item-gray">My Documents</div>
              <div className="start-item-gray">My Computer</div>
            </div>
          </div>
          <div className="start-menu-footer">
             <button className="logoff-btn" onClick={handleLogoff}>Log Off</button>
          </div>
        </div>
      )}

      <div className="taskbar">
        <button className={`start-btn ${isStartOpen ? 'pressed' : ''}`} onClick={(e) => { e.stopPropagation(); setIsStartOpen(!isStartOpen); }}>
          <span className="start-icon">ðŸªŸ</span> Start
        </button>
        <div className="taskbar-items">
          {paneOrder.map((paneName) => {
            // Check of het een conversation is
            if (paneName.startsWith('conv_')) {
              const conv = conversations[paneName];
              if (!conv) return null;

              return (
                <div 
                  key={paneName}
                  className={`taskbar-tab ${!conv.isMinimized && activePane === paneName ? 'active' : ''}`} 
                  onClick={() => handleTaskbarClick(paneName)}
                >
                  <span className="taskbar-icon">ðŸ’¬</span> {conv.contactName}
                </div>
              );
            }

            // Normale pane
            const pane = panes[paneName];
            const config = paneConfig[paneName];
            if (!pane || !pane.isOpen) return null;

            return (
              <div 
                key={paneName}
                className={`taskbar-tab ${!pane.isMinimized && activePane === paneName ? 'active' : ''}`} 
                onClick={() => handleTaskbarClick(paneName)}
              >
                <span className="taskbar-icon">{config.icon}</span> {config.label}
              </div>
            );
          })}
        </div>
        <div className="systray">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      {/* Toast notificaties */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={removeToast}
            onClick={handleToastClick}
          />
        ))}
      </div>
    </div>
  );
}

export default App;