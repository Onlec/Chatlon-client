import React, { useEffect, useState, useReducer, useRef } from 'react'
import Gun from 'gun'
import 'gun/sea'

const gun = Gun({
  peers: [process.env.REACT_APP_GUN_URL]
})
const userAuth = gun.user().recall({ storage: true })

const currentState = { messages: [] }

const reducer = (state, message) => {
  return { messages: [...state.messages, message] }
}

function ChatWindow() {
  const [messageText, setMessageText] = useState('')
  const [state, dispatch] = useReducer(reducer, currentState)
  const messagesEndRef = useRef(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // State voor de nudge en cooldown
  const [isShaking, setIsShaking] = useState(false)
  const [lastNudgeTime, setLastNudgeTime] = useState(0)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const messagesRef = gun.get('MESSAGES')
    messagesRef.map().on(m => {
      if (m) {
        dispatch({
          sender: m.sender,
          avatar: m.avatar,
          content: m.content,
          timestamp: m.timestamp
        })
      }
    })

    if (userAuth.is) {
      setIsLoggedIn(true)
    }
  }, [])

  // --- OPGESCHOONDE LISTENER VOOR NUDGES ---
  useEffect(() => {
    // We gebruiken geen variabele (zoals nudgeRef) om unused-var errors te voorkomen
    gun.get('CHAT_NUDGES').get('time').on((data) => {
      if (!data) return

      // Speel het legendarische MSN geluid af
      const audio = new Audio('/nudge.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log("Audio play blocked:", e))

      setIsShaking(true)

      // Stop de shake na 600ms (voor de echte MSN feel)
      setTimeout(() => {
        setIsShaking(false)
      }, 600)
    })

    return () => gun.get('CHAT_NUDGES').get('time').off()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [state.messages])

  // --- VERBETERDE VERZENDFUNCTIE VOOR NUDGE ---
  const sendNudge = () => {
    const now = Date.now()
    // Cooldown van 5 seconden om spam te voorkomen
    if (now - lastNudgeTime < 5000) {
      return // Je zou hier eventueel een melding kunnen tonen
    }

    setLastNudgeTime(now)
    gun.get('CHAT_NUDGES').put({ time: now })
  }

  const handleSignUp = () => {
    userAuth.create(username, password, (ack) => {
      if (ack.err) alert(ack.err)
      else handleLogin()
    })
  }

  const handleLogin = () => {
    userAuth.auth(username, password, (ack) => {
      if (ack.err) alert(ack.err)
      else setIsLoggedIn(true)
    })
  }

  const handleLogout = () => {
    userAuth.leave()
    setIsLoggedIn(false)
    window.location.reload()
  }

  const sendMessage = () => {
    if (!messageText.trim()) return
    const messagesRef = gun.get('MESSAGES')

    const messageObject = {
      sender: username || userAuth.is?.alias,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || userAuth.is?.alias}`,
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    messagesRef.set(messageObject)
    setMessageText('')
  }

  const newMessagesArray = () => {
    return state.messages.filter((value, index) => {
      const _value = JSON.stringify(value)
      return index === state.messages.findIndex(obj => JSON.stringify(obj) === _value)
    })
  }

  if (!isLoggedIn) {
    return (
      <div className="chat-login-container">
        <div className="chat-login-body">
          <div className="chat-logo-placeholder">👤</div>
          <input className="xp-input" placeholder="Gebruikersnaam" onChange={e => setUsername(e.target.value)} />
          <input className="xp-input" type="password" placeholder="Wachtwoord" onChange={e => setPassword(e.target.value)} />
          <div className="chat-login-buttons">
            <button className="xp-button" onClick={handleLogin}>Aanmelden</button>
            <button onClick={handleSignUp} className="xp-button chat-secondary-btn">Registreren</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    /* nudge-active zorgt voor de shake animatie vanuit App.css */
    <div className={`chat-main-wrapper ${isShaking ? 'nudge-active' : ''}`}>
      <div className="chat-info-bar">
        <span>Aangemeld als: <strong>{username || userAuth.is?.alias}</strong></span>
        <button className="chat-logout-small" onClick={handleLogout}>Afmelden</button>
      </div>

      <div className="chat-layout">
        <div className="chat-messages-area">
          {newMessagesArray().map((msg, index) => (
            <div key={index} className="chat-msg-row">
              <span className="chat-msg-sender">{msg.sender}:</span>
              <span className="chat-msg-text">{msg.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <aside className="chat-sidebar">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username || userAuth.is?.alias}`}
            alt="avatar"
            className="chat-avatar-img"
          />
          <button
            className="xp-button nudge-btn"
            onClick={sendNudge}
            style={{ 
              marginTop: '10px', 
              width: '100%',
              opacity: (Date.now() - lastNudgeTime < 5000) ? 0.6 : 1 
            }}
          >
            Nudge!
          </button>
        </aside>
      </div>

      <div className="chat-input-section">
        <textarea
          placeholder="Typ een bericht..."
          value={messageText}
          onChange={e => setMessageText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button className="xp-button" onClick={sendMessage}>Verzenden</button>
      </div>
    </div>
  )
}

export default ChatWindow;