# 📘 Chatlon Usage & AI Workflow

This document defines **how Chatlon is worked on**,  
by a **human developer** assisted by **multiple AI systems**.

It is not an architecture document.
It is not a changelog.
It is not a session log.

---

## 👤 Human Development Flow

- The human developer is the final authority
- All code is integrated manually
- No AI commits code directly
- Git history replaces session logs

The human decides:
- What changes are applied
- When documentation is updated
- Which AI is used for which task

---

## 🤖 AI Roles

Chatlon uses **three distinct AI roles**:

### Claude — Primary Implementation AI
- Writes and modifies code
- Proposes architectural-safe changes
- Outputs minimal diffs only

### ChatGPT — Documentation & Consistency AI
- Rewrites documentation
- Checks for inconsistencies
- Simplifies structure
- Reduces token overhead

### Gemini — Debug & Feature Design AI
- Analyses bugs
- Designs features
- Suggests logic and flows
- Does not implement directly

---

## 🔑 Claude Development Contract (CRITICAL)

Claude **must** follow these rules at all times.

Violations are considered incorrect output.

---

### ❌ Forbidden Behavior

Claude MUST NOT:
- Rewrite entire files
- Reprint unchanged code
- Update logs, changelogs or issue lists
- Maintain session history
- Invent architecture rules
- Override `ARCHITECTURE.md`

---

### ✅ Allowed Output Only

Claude MAY output:
- Exact code blocks to **replace**
- Exact new blocks to **insert**
- Approximate line numbers
- Surrounding context for placement
- Short reasoning for the change

---

### 📦 Mandatory Output Format

Claude output **must** follow this structure:

```markdown
## 📂 Change Proposal

**File**: src/example.js  
**Scope**: Bug fix / Feature / Refactor  
**Impact**: Low / Medium / High  

---

### 🔁 Replace Block
**Around line ~120**

```js
// OLD
const value = false;
```

⬇️

```js
// NEW
const value = true;
```

Reason: Fix incorrect default value.

### ➕ New Block

Insert after line ~200

```js
function newHelper() {}
```
```

Anything outside this structure is invalid.

---

## 🔐 Architecture Compliance

- `ARCHITECTURE.md` is **locked**
- Claude may not contradict it
- If a change requires architectural updates:
  - Claude must explicitly say so
  - No silent deviations allowed

---

## 🧠 Token Efficiency Rules

Claude should:
- Avoid repeating existing code
- Reference existing logic instead of duplicating it
- Prefer minimal diffs over explanations
- Skip obvious or unchanged parts

---

## 🧪 Debugging & Experiments

- Temporary debug code is allowed
- Debug code must be clearly marked
- Cleanup is always the human's responsibility

No debug logic is documented unless explicitly requested.

---

## 🧾 Documentation Update Policy

Documentation is updated **only when explicitly asked**, except for:
- Architecture changes → `ARCHITECTURE.md`
- Workflow changes → `USAGE.md`

Claude never updates:
- Changelogs
- Known issues
- Session logs

---

## 🚀 Local Development

```bash
npm install
npm start
```

### Dependencies

Core:
- React 19
- Gun.js + SEA (auth, realtime sync, data storage)
- react-draggable, react-resizable

Transport:
- Trystero (BitTorrent P2P — used for TeamTalk voice chat)

### Environment

- `.env.local` → local Gun server (port 5050)
- `.env` → hosted Gun relay (Render)
- `REACT_APP_GUN_URL` — primary relay URL
- `REACT_APP_GUN_URL_2` — secondary relay URL (optional)

---

## 🧠 Design Philosophy Reminder

Chatlon prioritizes:
- Authentic early-2000s behavior
- Clarity over abstraction
- Manual control over automation

AI assists.
The human decides.