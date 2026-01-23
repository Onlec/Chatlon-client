import './App.css'
import { useEffect, useState, useReducer, useRef } from 'react'
import Gun from 'gun'
import 'gun/sea' // Nodig voor Auth/User functies


// Initialiseer Gun en de User buiten de component
const gun = Gun({
  peers: ['http://localhost:5050/gun']
})
const userAuth = gun.user().recall({storage: true})

const currentState = { messages: [] }

const reducer = (state, message) => {
  return { messages: [...state.messages, message] }
}

function App() {
  const [messageText, setMessageText] = useState('')
  const [state, dispatch] = useReducer(reducer, currentState)
  const messagesEndRef = useRef(null)
  
  
  // States voor login
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  

  useEffect(() => {
    // Luister naar berichten
    const messagesRef = gun.get('MESSAGES')
    messagesRef.map().on(m => {
      if(m) {
        dispatch({
          sender: m.sender,
          avatar: m.avatar,
          content: m.content,
          timestamp: m.timestamp
        })
      }
    })

    // Check of de gebruiker nog ingelogd is
    if (userAuth.is) {
      setIsLoggedIn(true)
    }
  }, [])


  useEffect(() => {
    scrollToBottom()
  }, [state.messages])

  // AUTH FUNCTIES
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
      // Gebruik een stabiele avatar op basis van de gebruikersnaam
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

  // --- RENDERING ---

  if (!isLoggedIn) {
    return (
      <div className="chat-container login-mode">
        <div className="chat-header">Chatlon Messenger - Aanmelden</div>
        <div className="chat-login-body">
          <div className="chat-logo-placeholder">👤</div>
          <input placeholder="Gebruikersnaam" onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Wachtwoord" onChange={e => setPassword(e.target.value)} />
          <div className="chat-login-buttons">
            <button onClick={handleLogin}>Aanmelden</button>
            <button onClick={handleSignUp} className="chat-secondary-btn">Registreren</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span className="chat-username">Aangemeld als: {username || userAuth.is?.alias}</span>
        <button className="chat-logout-btn" onClick={handleLogout}>X</button>
      </div>

      <div className="chat-window-layout">
        <main className="chat-main-section">
          <div className='messages'>
            {newMessagesArray().map((msg, index) => (
              <div key={index} className='chat-message'>
                <span className='chat-message-sender'>{msg.sender} zegt:</span>
                <div className='chat-message-content'>{msg.content}</div>
              </div>
            ))}
            {/* Dit is het ankerpunt voor het scrollen */}
            <div ref={messagesEndRef} />
          </div>
          <div className='chat-input-area'>
            <textarea 
              placeholder='Typ een bericht...' 
              onChange={e => setMessageText(e.target.value)} 
              value={messageText}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); // Dit stopt de nieuwe regel/enter!
                  sendMessage();
                }
              }}
            />
            <button className="chat-send-btn" onClick={sendMessage}>Verzenden</button>
          </div>
        </main>

        <aside className="chat-sidebar-right">
          <div className="chat-display-picture-container">
            <img 
              src={newMessagesArray()[newMessagesArray().length - 1]?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || userAuth.is?.alias}`} 
              alt="avatar" 
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App