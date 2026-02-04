```markdown
NEW_FILE_CONTENT:
# 📋 Chatlon Architecture - Claude Development Reference

## 🎯 Primary Modification Targets

| File | Priority | Lines | Claude Focus | Modification Frequency |
|------|----------|-------|--------------|----------------------|
| `src/App.js` | ⭐ HIGHEST | ~350 | Desktop shell, auth, window manager | High |
| `src/paneConfig.js` | ⭐ HIGH | ~80 | New pane registration | Medium |
| `src/gun.js` | ⭐ HIGH | ~40 | Database config, networking | Low |
| `src/App.css` | ⭐ MEDIUM | ~1000+ | UI styling, XP theme | Medium |
| `src/components/` | 🔧 MEDIUM | Varies | Individual pane logic | Medium |
| `src/hooks/` | 🔧 LOW | ~100 each | React state management | Low |

## 🏗️ Code Modification Workflow

### Single-File Changes (Preferred):
```markdown
## 📂 Proposed Change

**File**: src/ComponentName.js
**Scope**: [Bug fix / Feature addition / Refactor]
**Impact**: [Low / Medium / High]

### Modification Required:
**Line 42**:
- **Current**: `const windowsRef = useRef(null);`
- **Replace with**: `const panesRef = useRef(null);`
- **Reason**: Branding consistency

**Ready to apply?** (Y/N)
```

### Multi-File Changes:
1. **List ALL affected files first**
2. **Show detailed changes for each file**
3. **Get explicit approval before proceeding**
4. **Update CHANGELOG.md with entry**

## 🗂️ Component Architecture

### Core System Files:
```
src/App.js - CENTRAL HUB
├── Window Manager (state: panes, conversations)
├── Authentication (Gun SEA integration)
├── Desktop Shell (taskbar, start menu, desktop)
├── Toast System (notifications)
└── Hooks Integration (all custom hooks)

src/paneConfig.js - PANE REGISTRY
└── Centralized configuration for all window types

src/gun.js - DATA LAYER
└── Single Gun instance shared across all components

src/App.css - UI LAYER
└── Complete XP styling system
```

### Pane Components Pattern:
```javascript
// Standard pane structure
function MyPane({ /* minimal props */ }) {
  // Local state only - no global state management
  const [localState, setLocalState] = useState();
  
  // Gun subscriptions with cleanup
  useEffect(() => {
    const node = gun.get('path');
    node.on(callback);
    return () => node.off();
  }, []);

  return (
    <div className="my-pane-container">
      {/* Standard menubar */}
      <div className="my-pane-menubar">...</div>
      {/* Main content */}
      <div className="my-pane-content">...</div>
    </div>
  );
}
```

## 📊 Gun.js Data Schema

### Current Schema (LOCKED - Do not modify without documentation):

#### Private User Data:
```
user.get('contacts/{username}') - Contact list
user.get('personalMessage') - Status message
user.get('notepad') - Notepad content
user.get('sentRequests/{id}') - Sent friend requests
```

#### Public Shared Data:
```
gun.get('friendRequests/{username}/{id}') - Incoming friend requests
gun.get('contactSync/{username}/{contact}') - Contact synchronization
gun.get('CHAT_{user1}_{user2}') - Private messages (alphabetically sorted)
gun.get('NUDGE_{chatRoomId}') - Nudge signals
gun.get('TYPING_{chatRoomId}') - Typing indicators
gun.get('presence/{username}') - Presence/status heartbeat
```

### Schema Modification Rules:
- ❌ **NEVER** change existing paths without updating this document
- ❌ **NEVER** assume paths exist - always check data validity
- ✅ **ALWAYS** use consistent ID generation (e.g., getChatRoomId)
- ✅ **ALWAYS** include timestamps for message ordering

## 🔧 Adding New Features

### New Pane Type:
1. **Create component**: `src/NewPane.js`
2. **Add CSS section**: In `src/App.css` 
3. **Register pane**: In `src/paneConfig.js`
4. **Test integration**: Open via desktop icon

### New Gun Schema Path:
1. **Document purpose**: Why this path is needed
2. **Update this file**: Add to schema table above
3. **Consider privacy**: Private (`user.get`) vs Public (`gun.get`)
4. **Test data flow**: Write and read operations

### New Message Type:
1. **Extend message structure**: Add fields to existing schema
2. **Update rendering**: In ConversationPane.js
3. **Consider backwards compatibility**: Handle missing fields

## 🚨 Critical Architecture Rules

### DO NOT:
- Create new Gun instances (use `import { gun, user } from './gun'`)
- Manage window state outside App.js
- Use external state management (Redux, Zustand, etc.)
- Add CSS frameworks (Tailwind, Bootstrap, etc.)
- Split App.css into multiple files
- Use TypeScript (project is pure JavaScript)
- Add complex build tools (project uses Create React App)

### DO:
- **Read existing patterns** before implementing new features
- **Use refs for Gun callback values** (avoid stale closures)
- **Clean up Gun subscriptions** with useEffect return functions
- **Follow XP visual guidelines** in all styling
- **Maintain single CSS file** architecture
- **Use functional components** with hooks (no classes)

## 📱 Window Management System

### Window State Structure:
```javascript
// In App.js state
panes: {
  [paneName]: {
    isOpen: boolean,
    isMinimized: boolean,
    isMaximized: boolean,
    position: { x: number, y: number },
    size: { width: number, height: number }
  }
}

conversations: {
  [convId]: {
    isOpen: boolean,
    isMinimized: boolean,
    isMaximized: boolean,
    contactName: string,
    position: { x: number, y: number },
    size: { width: number, height: number }
  }
}
```

### Window Operations:
- **Open**: Update state + add to paneOrder
- **Close**: Remove from state + paneOrder
- **Focus**: Move to end of paneOrder array
- **Minimize**: Set isMinimized flag
- **Maximize**: Set isMaximized flag + full viewport size

## 🎨 XP Styling System

### Core Design Tokens:
```css
/* Title bars */
background: linear-gradient(to right, #0058e6 0%, #2596f3 100%);

/* Window chrome */
background: #ECE9D8;
border: 1px solid #7F9DB9;

/* Buttons */
background: linear-gradient(to bottom, #ECE9D8 0%, #F5F4F2 50%, #ECE9D8 100%);
border: 1px solid;
border-color: #FFFFFF #808080 #808080 #FFFFFF;

/* Typography */
font-family: 'Tahoma', 'MS Sans Serif', sans-serif;
font-size: 11px; /* UI elements */
font-size: 12px; /* Chat messages */
```

### Component Styling Pattern:
1. **Container class**: `.component-container`
2. **Menubar class**: `.component-menubar` 
3. **Content class**: `.component-content`
4. **Element classes**: `.component-button`, `.component-input`, etc.

## 🐛 Common Issues & Solutions

### Stale Closure in Gun Callbacks:
```javascript
// ❌ Wrong: uses stale state
useEffect(() => {
  gun.get('path').on((data) => {
    console.log(someState); // Stale!
  });
}, []);

// ✅ Correct: uses ref
const someStateRef = useRef();
useEffect(() => {
  someStateRef.current = someState;
}, [someState]);

useEffect(() => {
  gun.get('path').on((data) => {
    console.log(someStateRef.current); // Fresh!
  });
}, []);
```

### Memory Leaks from Gun Subscriptions:
```javascript
// ❌ Wrong: no cleanup
useEffect(() => {
  gun.get('path').on(callback);
}, []);

// ✅ Correct: with cleanup
useEffect(() => {
  const node = gun.get('path');
  node.on(callback);
  return () => node.off();
}, []);
```

### Window Position Reset:
```javascript
// ✅ Correct: use hasInitialized ref
const hasInitialized = useRef(false);
const [position, setPosition] = useState(initialPosition);

useEffect(() => {
  if (!hasInitialized.current) {
    hasInitialized.current = true;
    return;
  }
  // Safe to update position now
}, [position]);
```

## 📈 Performance Considerations

### Gun.js Optimization:
- Use `.get()` for single values, `.map()` for collections
- Minimize subscription scope (specific paths vs broad listeners)
- Clean up subscriptions to prevent memory leaks
- Batch related operations when possible

### React Optimization:
- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references
- Avoid unnecessary re-renders with proper dependency arrays
- Keep component state minimal and local

### CSS Performance:
- Single CSS file reduces HTTP requests
- Use class-based styling vs inline styles
- Minimize complex selectors and deep nesting
- Leverage CSS cascade effectively

## 📚 Further Reading

- **USAGE.md** - User-facing feature documentation
- **CONTRIBUTING.md** - Development workflow and rules
- **KNOWN_ISSUES.md** - Current bugs and their status
- **CHANGELOG.md** - Version history and changes
- **SESSION_LOG.md** - AI session notes and context

---

*This document is the authoritative technical reference for Claude development sessions.*
```

---