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
- Desktop auth is not equal to messenger active state:
  - chat listeners run only when messenger is signed in
  - signed-out messenger means no message/friend-request/presence ingestie
- Presence ownership is split and explicit:
  - `usePresence` = self presence lifecycle/writes
  - `usePresenceCoordinator` = contact presence listeners/transitions/policy
  - `ContactsPane` = read-only consumer via `contactPresenceMap`
- Pane/window state is managed centrally (App + pane manager hook).
- Functional React components only.
- Gun callbacks should use refs for reactive values (avoid stale closures).
- Styling entrypoint is `gun-client/src/App.css`; selectors are split by domain under `gun-client/src/styles/`.
- CSS naming contract is defined in `gun-client/docs/CSS_NAMING.md`.
- Review gate for CSS naming: no unprefixed generic state classes in JSX (`active`, `selected`, `disabled`, `primary`, ...).

## 3. Important Documentation
- Source of truth architecture: `gun-client/docs/ARCHITECTURE.md`
- CSS naming standard: `gun-client/docs/CSS_NAMING.md`
- Token alignment map: `gun-client/docs/TOKEN_ALIGNMENT_MAP.md`
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
- Games invites and game panes:
  - `gun-client/src/components/panes/GamePane.js`
  - `gun-client/src/components/panes/games/TicTacToe.js`
  - `gun-client/src/components/panes/conversation/ChatToolbar.js`
  - `gun-client/src/hooks/useWindowManager.js`
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
- Presence policy stability:
  - hysteresis (grace + dwell) remains deterministic
  - explicit offline/appear-offline transitions still produce correct next online toast
  - stale/out-of-order suppression does not hide valid transitions
  - adaptive attach queue keeps active/open contacts realtime
  - self auto-away recovery updates local status to online instantly on first activity
  - manual self statuses (`away`/`busy`) are never auto-reset by activity
- Messenger hard-gate stability:
  - no retro message/friend-request toasts after messenger sign-in
  - no chat callbacks while messenger signed out
- Portal usage alignment with architecture portal-root rules.
- Superpeer qualification timing and related comments/docs consistency.
- Gun signaling cleanup staying aligned with active schemas.
- Games invite robustness:
  - request-scoped invite records (`GAME_INVITES_{pairId}/{requestId}`) are used consistently
  - only one active/pending game invite per contact+gameType in UI flow
  - stale invite window is 5 minutes
  - closing/signing out messenger closes conversation and game panes
  - abandoned games must not auto-reopen when conversation reopens

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
- Feature flags: `src/config/featureFlags.js` (`contextMenus` is enabled for desktop/shortcut/taskbar-tab).

## 15. Desktop Contextmenu Scope
- Active context types:
  - `desktop`: Vernieuwen, Eigenschappen
  - `shortcut`: Openen, Naam wijzigen, Verwijderen, Eigenschappen
  - `taskbar-tab`: Herstellen, Minimaliseren, Maximaliseren, Sluiten
- `useContextMenuManager` owns:
  - open/close state
  - outside click + Escape close
  - viewport clamping based on rendered menu size
- `useDesktopManager` owns desktop shortcut persistence:
  - storage key `chatlon_desktop_shortcuts`
  - rename (`label`) and hide (`hidden`) overrides
- Desktop menu must only open on wallpaper area, never from pane content (`.pane-frame` guard).

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
  - eligibility attach/detach
  - priority immediate attach + queued attach
  - offline->online / offline->away / appear-offline->online transitions
  - stale/out-of-order suppression
  - cleanup/remount baseline reset + idempotent cleanup
- `src/hooks/usePresence.test.js`
  - messenger sign-in boundary (`isActive=false`)
  - additive heartbeat fields (`heartbeatAt`, `heartbeatSeq`, `sessionId`, `tabId`, `source`)
  - heartbeat seq monotonicity
  - instant auto-away -> online local recovery
  - manual `away/busy` activity guardrails
- `src/utils/presencePolicy.test.js`
  - transition policy helpers
  - heartbeat freshness and stale-transition logic
- `src/components/panes/ContactsPane.test.js`
  - consumes `contactPresenceMap`
  - does not attach per-contact `PRESENCE` listeners
- `src/hooks/useMessageListeners.test.js`
  - messenger hard gate (`messengerSignedIn=false` => no message/friend-request attach)
  - sign-in/sign-out transition attach-detach
  - no retro replay toasts after re-sign-in

## 14. Games Data Contract
- Invite records:
  - `GAME_INVITES_{pairId}/{requestId}`
  - fields: `requestId`, `inviter`, `invitee`, `gameType`, `gameSessionId`, `status`, `createdAt`, `updatedAt`
- Game session state:
  - `GAME_STATE_{gameSessionId}`
  - fields: `board`, `currentTurn`, `winner`, `player1`, `player2`, `status`, `abandonedBy`
- Current policy:
  - one active/pending game invite flow per contact+gameType
  - stale incoming invites ignored after 5 minutes
  - messenger close/sign-out closes all game panes
