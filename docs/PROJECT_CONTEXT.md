# Project Context - Chatlon

Use this file at the start of a new conversation to bootstrap context quickly.
Keep it concise, factual, and current.

## 1. Project Snapshot
- Name: Chatlon
- Stack: React client + Gun relay server + Trystero (TeamTalk voice)
- Main folders:
  - `gun-client/` (UI, app logic, hooks, contexts, utils)
  - `gun-server/` (Express + Gun relay)
- Runtime model: single shared Gun instance in `gun-client/src/gun.js`

## 2. Architecture Rules (High Signal)
- Global orchestration is centered in `gun-client/src/App.js`.
- Messenger cross-pane policy orchestration is centralized in `gun-client/src/hooks/useMessengerCoordinator.js`.
- Pane/window state is managed centrally (App + pane manager hook).
- Functional React components only.
- Gun callbacks should use refs for reactive values (avoid stale closures).
- Styling is centralized in `gun-client/src/App.css`.

## 3. Important Documentation
- Source of truth architecture: `gun-client/docs/ARCHITECTURE.md`
- Usage and workflow: `gun-client/docs/USAGE.md`
- Working TODO list: `gun-client/docs/TODO.md`
- Bug notes: `gun-client/docs/bugs.md`
- Alpha test checklist: `gun-client/docs/alphatest.md`

## 4. Core Feature Areas
- Desktop shell and window manager:
  - `gun-client/src/App.js`
  - `gun-client/src/hooks/usePaneManager.js`
- Contacts, presence, messenger state:
  - `gun-client/src/components/panes/ContactsPane.js`
  - `gun-client/src/hooks/usePresence.js`
  - `gun-client/src/hooks/usePresenceCoordinator.js`
- Conversations and encrypted chat:
  - `gun-client/src/components/panes/ConversationPane.js`
  - `gun-client/src/utils/encryption.js`
- Message and friend request listeners:
  - `gun-client/src/hooks/useMessageListeners.js`
- Messenger coordinator (toast/unread/taskbar policy):
  - `gun-client/src/hooks/useMessengerCoordinator.js`
- TeamTalk voice via Trystero:
  - `gun-client/src/components/panes/TeamTalkPane.js`
  - `gun-client/src/hooks/useTrysteroTeamTalk.js`
- Relay and superpeer behavior:
  - `gun-client/src/utils/relayMonitor.js`
  - `gun-client/src/hooks/useSuperpeer.js`

## 5. Environment Notes
- Client relay env vars:
  - `REACT_APP_GUN_URL`
  - `REACT_APP_GUN_URL_2`
- Gun server default port: `5050` (`gun-server/index.js`)

## 6. Watchlist (Keep Updated)
- Conversation listener lifecycle and cleanup correctness.
- Presence ownership split correctness:
  - `usePresence` = self lifecycle
  - `usePresenceCoordinator` = contact listeners + transitions
  - `ContactsPane` = consumer only
- Portal usage alignment with architecture portal-root rules.
- Superpeer qualification timing and related comments/docs consistency.
- Gun signaling cleanup staying aligned with active schemas.

## 7. Update Policy For This File
Update this file whenever you:
- Add/remove a user-facing feature
- Change data flow or state ownership
- Refactor file/module boundaries
- Fix a bug that changes behavior
- Introduce or eliminate a notable risk

Always refresh these sections after major changes:
- Project Snapshot
- Important Documentation
- Core Feature Areas
- Watchlist
- Last Updated

## 8. Session Bootstrap Prompt
Copy/paste in a new chat:

"Read `gun-client/docs/PROJECT_CONTEXT.md` first, then continue. If this file conflicts with code or architecture docs, trust code + `ARCHITECTURE.md`, then update this file."

## 9. Last Updated
- Date: 2026-02-24
- Reason: Added messenger coordinator ownership and updated core flow references.

## 10. Shell Modularization Map
- Shell UI components: `src/components/shell/DesktopShell.js`, `DesktopShortcuts.js`, `PaneLayer.js`, `Taskbar.js`, `StartMenu.js`, `Systray.js`, `ContextMenuHost.js`.
- Shell managers: `src/hooks/useWindowManager.js`, `useTaskbarManager.js`, `useStartMenuManager.js`, `useSystrayManager.js`, `useDesktopManager.js`.
- Compatibility facade: `src/hooks/usePaneManager.js`.
- Command bus: `src/hooks/useDesktopCommandBus.js` + `src/types/desktopCommands.js`.
- Feature flags: `src/config/featureFlags.js` (`contextMenus` is off by default).

## 11. Shell Test Coverage
- `src/hooks/useTaskbarManager.test.js`
- `src/hooks/useStartMenuManager.test.js`
- `src/hooks/useSystrayManager.test.js`
- `src/hooks/useDesktopManager.test.js`

## 12. Last Updated
- Date: 2026-02-24
- Reason: App shell modularization completed through manager split + command bus + context menu foundation.

## 13. Presence Regression Coverage
- `src/hooks/usePresenceCoordinator.test.js`
  - attach/detach by eligibility
  - offline->online transition single-fire
  - cleanup/remount baseline reset
- `src/components/panes/ContactsPane.test.js`
  - consumes `contactPresenceMap`
  - does not attach per-contact `PRESENCE` listeners
