# Contributing to Chatlon

This project supports human and AI contributors.

**Consistency is more important than cleverness.**

---

## Branding Rules (Critical)

**NEVER use trademarked names in code, UI, or documentation:**

| ❌ Don't Use | ✅ Use Instead |
|-------------|----------------|
| Windows | Panes |
| XP | dX |
| Microsoft | Macrohard |
| MSN / MSN Messenger | Chatlon / chat |

This applies to:
- Variable names
- CSS class names
- Comments
- UI text
- Documentation

---

## Project Philosophy

Chatlon aims to faithfully recreate the Panes dX / classic chat messenger experience. Every contribution should ask:

> "Would this feel at home in 2004?"

If the answer is no, reconsider the approach.

---

## Structure Rules

### Do NOT without approval:

- Rename or move files/folders
- Add new npm dependencies
- Change Gun.js data schema paths
- Modify the window manager core
- Change authentication flow
- Add new state management libraries

### Safe to modify:

- Bug fixes in existing components
- New emoticons in `emoticons.js`
- New pane types (following existing pattern)
- CSS refinements within XP style
- Documentation updates

---

## File Organization

```
src/
├── App.js              # DO NOT split - central orchestrator
├── App.css             # Single CSS file - keep organized by section
├── gun.js              # Single Gun instance - DO NOT duplicate
├── paneConfig.js       # Add new panes here
├── Pane.js             # Generic window - rarely needs changes
├── [Feature]Pane.js    # Feature-specific windows
├── emoticons.js        # Emoticon definitions
└── ToastNotification.js
```

**Rule:** One component per file. No barrel exports. Direct imports only.

---

## React Rules

### Component Style

```javascript
// ✅ CORRECT: Functional component with hooks
function MyPane({ someProp }) {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Setup
    return () => { /* Cleanup */ };
  }, [dependencies]);
  
  return (
    <div className="my-pane-container">
      {/* JSX */}
    </div>
  );
}

export default MyPane;
```

```javascript
// ❌ WRONG: Class component
class MyPane extends React.Component { }

// ❌ WRONG: Arrow function export
const MyPane = () => { };
export default MyPane;
```

### State Management

```javascript
// ✅ CORRECT: useState for UI state
const [isOpen, setIsOpen] = useState(false);

// ✅ CORRECT: useReducer for complex state
const [state, dispatch] = useReducer(reducer, initialState);

// ✅ CORRECT: useRef for mutable values in callbacks
const lastValueRef = useRef(initialValue);

// ❌ WRONG: External state libraries
import { useStore } from 'zustand';
```

### Gun.js Subscriptions

```javascript
// ✅ CORRECT: Subscribe and cleanup
useEffect(() => {
  const node = gun.get('some/path');
  
  node.on((data, key) => {
    // Handle data
  });
  
  return () => node.off(); // REQUIRED cleanup
}, []);

// ❌ WRONG: No cleanup
useEffect(() => {
  gun.get('some/path').on((data) => { });
  // Missing cleanup!
}, []);
```

### Refs for Callbacks

```javascript
// ✅ CORRECT: Use ref for values accessed in Gun callbacks
const conversationsRef = useRef({});

useEffect(() => {
  conversationsRef.current = conversations;
}, [conversations]);

// In Gun callback:
gun.get('path').on((data) => {
  const current = conversationsRef.current; // Fresh value
});

// ❌ WRONG: Stale closure
gun.get('path').on((data) => {
  console.log(conversations); // Stale!
});
```

---

## Styling Rules

### Panes dX Visual Language

```css
/* ✅ CORRECT: Panes dX-style button */
.dx-button {
  background: linear-gradient(to bottom, #ECE9D8 0%, #F5F4F2 50%, #ECE9D8 100%);
  border: 1px solid;
  border-color: #FFFFFF #808080 #808080 #FFFFFF;
  border-radius: 3px;
  font-family: 'Tahoma', 'MS Sans Serif', sans-serif;
  font-size: 11px;
}

/* ❌ WRONG: Modern flat button */
.button {
  background: #007bff;
  border: none;
  border-radius: 8px;
}
```

### Color Palette

| Use | Color | Hex |
|-----|-------|-----|
| Title bar | Blue gradient | `#0058e6` → `#2596f3` |
| Window background | Warm gray | `#ECE9D8` |
| Content background | White | `#FFFFFF` |
| Borders | Blue-gray | `#7F9DB9` |
| Online status | Green | `#7AC142` |
| Away status | Yellow | `#FFB900` |
| Busy status | Red | `#E74856` |
| Offline status | Gray | `#8C8C8C` |

### Typography

```css
font-family: 'Tahoma', 'MS Sans Serif', 'Microsoft Sans Serif', sans-serif;
font-size: 11px; /* Default for UI elements */
font-size: 12px; /* Chat messages */
font-size: 13px; /* Notepad, larger text */
```

### Forbidden Styles

- ❌ No Tailwind CSS
- ❌ No CSS-in-JS (styled-components, emotion)
- ❌ No CSS modules
- ❌ No flexbox gap (use margins for authenticity where needed)
- ❌ No modern shadows (`box-shadow: 0 4px 6px`)
- ❌ No rounded corners > 8px
- ❌ No glassmorphism / blur effects
- ❌ No neumorphism
- ❌ No dark mode
- ❌ No references to Windows/XP/Microsoft/MSN in class names or comments

---

## Gun.js Rules

### Schema Changes

**NEVER** change Gun paths without updating ARCHITECTURE.md and notifying all contributors.

Current paths (locked):
```
user.get('contacts')
user.get('personalMessage')
user.get('notepad')
gun.get('friendRequests/{username}')
gun.get('contactSync/{username}')
gun.get('CHAT_{user1}_{user2}')
gun.get('NUDGE_{chatRoomId}')
gun.get('TYPING_{chatRoomId}')
```

### Writing Data

```javascript
// ✅ CORRECT: Include timestamp for ordering
gun.get(chatRoomId).set({
  sender: username,
  content: message,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  timeRef: Date.now() // Unix ms for sorting
});

// ❌ WRONG: Missing timeRef
gun.get(chatRoomId).set({
  sender: username,
  content: message
});
```

### Reading Data

```javascript
// ✅ CORRECT: Always check data exists
node.on((data, id) => {
  if (data && data.content) {
    // Safe to use
  }
});

// ❌ WRONG: No null check
node.on((data, id) => {
  console.log(data.content); // May crash!
});
```

---

## AI Coding Rules (Critical)

### Output Format

```javascript
// ✅ CORRECT: Full file with imports
import React, { useState, useEffect } from 'react';
import { gun, user } from './gun';

function MyComponent() {
  // ... complete implementation
}

export default MyComponent;
```

```javascript
// ❌ WRONG: Partial snippet
// Just add this to the component:
const [value, setValue] = useState(null);
```

### File Changes

- ✅ Always output the **complete file** when making changes
- ✅ Include **all imports** at the top
- ✅ Include the **export statement**
- ❌ Never output "// ... rest of file unchanged"
- ❌ Never output just the changed function
- ❌ Never assume the reader will merge snippets

### Before Making Changes

Ask yourself:
1. Does this change the Gun schema? → Document in ARCHITECTURE.md
2. Does this add a dependency? → Get approval first
3. Does this change window management? → Get approval first
4. Does this look like modern UI? → Reconsider

### When Uncertain

```
"I'm considering [change]. This would affect [components/data/styling].
Should I proceed, or would you prefer a different approach?"
```

---

## Adding a New Pane Type

### Step 1: Create the Component

```javascript
// src/MyNewPane.js
import React from 'react';

function MyNewPane() {
  return (
    <div className="mynew-container">
      {/* Panes dX-style menubar */}
      <div className="mynew-menubar">
        <span className="mynew-menu-item">Bestand</span>
        <span className="mynew-menu-item">Bewerken</span>
        <span className="mynew-menu-item">Help</span>
      </div>
      
      {/* Content */}
      <div className="mynew-content">
        {/* Your content here */}
      </div>
    </div>
  );
}

export default MyNewPane;
```

### Step 2: Add CSS (in App.css)

```css
/* --- XX. MY NEW PANE --- */

.mynew-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ECE9D8;
  font-family: 'Tahoma', 'MS Sans Serif', sans-serif;
}

.mynew-menubar {
  background: #ECE9D8;
  border-bottom: 1px solid #919B9C;
  display: flex;
  gap: 2px;
  padding: 2px 4px;
  font-size: 11px;
  flex-shrink: 0;
}

/* ... more styles ... */
```

### Step 3: Register in paneConfig.js

```javascript
import MyNewPane from './MyNewPane';

const paneConfig = {
  // ... existing panes ...
  
  mynew: {
    title: 'My New App',
    icon: '🆕',
    component: MyNewPane,
    label: 'My New',
    defaultSize: { width: 400, height: 300 },
    minSize: { width: 300, height: 200 },
    desktopIcon: '🆕',
    desktopLabel: 'My New App'
  }
};
```

That's it! The window manager handles the rest automatically.

NEW_BLOCK:
## AI Development Rules (Critical)

### Claude-Specific Workflow

#### Response Format for Code Changes:
```markdown
## 📂 File Analysis: src/example.js

**Scope**: [Single line / Multiple lines / New feature]
**Impact**: [Low / Medium / High]
**Testing needed**: [Manual test steps]

### Changes Required:

**Line 42**:
- **Current**: `const oldCode = true;`
- **New**: `const newCode = false;`  
- **Reason**: [Brief explanation]

**Line 58** (if multiple changes):
- **Current**: `// old comment`
- **New**: `// updated comment`
- **Reason**: [Brief explanation]

### Dependencies:
- [ ] Update tests (if any)
- [ ] Update documentation (if schema change)
- [ ] Manual testing required

**Ready to proceed?** (Y/N)
```

#### For New Features:
```markdown
## 🆕 Feature Implementation Plan

**Component**: NewFeaturePane.js
**Integration**: Add to paneConfig.js
**Styling**: Add section to App.css

### Files to Create:
1. **src/NewFeaturePane.js** - Main component logic
2. **CSS section** - In App.css under "/* XX. NEW FEATURE */"

### Files to Modify:
1. **src/paneConfig.js** - Register new pane type
2. **ARCHITECTURE.md** - Document any new Gun schema paths

### Implementation Order:
1. Create component with basic structure
2. Add CSS styling following XP guidelines
3. Register in paneConfig.js
4. Test desktop icon and window operations

**Proceed with implementation?** (Y/N)
```

### Multi-AI Collaboration Rules

#### Claude (Code Generation):
- **Primary role**: Writing and modifying JavaScript/CSS code
- **Output style**: Line-specific changes, complete new files only when necessary
- **Always**: Search project knowledge before coding
- **Never**: Output partial snippets or "// ... rest unchanged"

#### ChatGPT/Gemini (Debugging & Testing):
- **Primary role**: Error resolution, testing, optimization
- **Input**: Receives Claude's changes + context
- **Focus**: Runtime issues, browser compatibility, edge cases
- **Handoff format**: Complete file changes + test scenarios

#### Human (Coordination):  
- **Role**: Reviews all proposed changes, sets priorities
- **Approves**: Multi-file modifications before implementation
- **Documents**: Final decisions in CHANGELOG.md
- **Manages**: KNOWN_ISSUES.md priority queue

### AI Handoff Protocol

1. **Claude completes modification** → Provides exact changes + reasoning
2. **Human reviews and approves** → May request adjustments
3. **Claude applies changes** → Updates files with approved modifications  
4. **If issues arise** → Hand off to ChatGPT/Gemini with context
5. **Final documentation** → Update CHANGELOG.md with details

### Code Quality Standards for AI

#### Always Required:
- [ ] Gun subscriptions have cleanup (`return () => node.off()`)
- [ ] Refs used for values accessed in Gun callbacks  
- [ ] XP styling guidelines followed in CSS
- [ ] Functional components with hooks (no classes)
- [ ] Single CSS file maintained (no splitting)
- [ ] Branding consistency (Panes/dX/Macrohard/Chatlon)

#### Never Acceptable:
- [ ] New Gun instances (use existing from gun.js)
- [ ] External state management libraries
- [ ] Modern CSS frameworks (Tailwind, etc.)
- [ ] TypeScript additions (pure JavaScript project)
- [ ] Window state management outside App.js
- [ ] References to Windows/XP/Microsoft/MSN branding

---

## Commit Rules

### Message Format

```
type: short description

- Detail 1
- Detail 2
```

### Types

| Type | Use |
|------|-----|
| `feat` | New feature |
| `fix` | Bug fix |
| `style` | CSS/styling changes |
| `refactor` | Code restructure (no behavior change) |
| `docs` | Documentation |
| `chore` | Build/config changes |

### Examples

```
feat: add typing indicator to conversations

- Show "X is typing..." when contact types
- Throttle signals to 1/second
- Auto-hide after 3 seconds

fix: prevent duplicate toast notifications

- Use ref for synchronous duplicate check
- Track shown toasts by unique key

style: improve XP button hover state

- Add orange border on hover
- Match original XP behavior
```

---

## Review Checklist

Before submitting changes, verify:

- [ ] Full files provided (not snippets)
- [ ] All Gun subscriptions have cleanup
- [ ] Refs used for values in async callbacks
- [ ] No new dependencies added
- [ ] CSS follows XP style guide
- [ ] No TypeScript (project uses JavaScript)
- [ ] Components are functional (not class-based)
- [ ] Gun paths unchanged (or documented if changed)
- [ ] Works with existing window manager
- [ ] Tested login/logout cycle
- [ ] Tested message send/receive

---

## Questions?

If unsure about any contribution:

1. Check ARCHITECTURE.md for technical details
2. Check USAGE.md for expected behavior
3. Ask before making structural changes
4. When in doubt, match existing patterns

---

## Code of Conduct

- Be respectful to all contributors (human and AI)
- Assume good intent
- Prefer collaboration over correction
- Document decisions for future contributors