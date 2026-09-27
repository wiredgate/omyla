# Computer Use: task-scoped agent control

OMYLA's desktop agent may act on the user's real desktop. The user grants one task, then the agent can move its cursor and execute multiple steps within that scope. The app must show an immediate Stop control while a task runs. The operator chooses the model independently of Agent Identity.

## Present implementation

Windows desktop can move the OS cursor to the tip of the last point, arrow, circle, or line the human drew on the selected display. The human explicitly presses “カーソルを指示位置へ”. The Electron main process validates the local IPC sender, mark, display ID, and current display bounds. Electron converts DIP coordinates to physical screen coordinates; a fixed PowerShell/Win32 call invokes SetPhysicalCursorPos. No arbitrary command string, click, keystroke, or network instruction is accepted. The screenshot preview stays on the device. This is a local cursor primitive, not autonomous AI control.

## Agent control protocol

A future authenticated desktop session binds a task ID to the local device and chosen displays/windows. The desktop agent, not the cloud response, enforces the grant:

- Grant: user goal, allowed surface IDs, allowed action kinds, expiry, step cap, and explicit sensitive-action restrictions.
- Observe: capture only the selected surface after OS permission; attach display ID, geometry, frame ID, timestamp, and redaction state.
- Plan: cloud agent proposes typed actions (move, click, type, scroll, wait); it cannot change its own grant. Operator model routing remains independent.
- Validate: local permission engine checks schema, session, target, staleness, screen bounds, action budget, and whether a sensitive action needs approval.
- Act and verify: execute one action locally, record result, obtain a fresh observation, then continue. Retry within the task limit; stop on ambiguity.
- Stop: persistent visible Stop control and local shortcut revoke the grant immediately, cancel pending actions, and invalidate session credentials.
- Audit: retain minimal action metadata and approval events; screenshots require explicit capture permission and short retention. Never log passwords or raw private frames by default.

Payments, destructive edits, credential entry, permission dialogs, and messages to third parties pause for a distinct human confirmation at the point of action. A user may grant ordinary moves, clicks, typing, and scrolling for the duration of a task without approving each step.

## Dependencies

1. Local permission session and stop mechanism.
2. Native Windows input adapter for move/click/type/scroll, with window focus and OS UI Automation support where available.
3. Authenticated duplex desktop-to-cloud channel; no public browser endpoint may address a device directly.
4. Explicit frame sharing, redaction, and vision-capable model routing with budgets.
5. Observe/act loop with grounding on current frame, stale-frame rejection, error recovery, and action log.
6. Mobile and browser adapters with platform permissions and the same resource/action schema.

Windows UIPI and elevated windows can reject injected input; secure desktop/UAC cannot be automated through the regular user session. Mobile OSs restrict global overlays and input; Android accessibility needs a user-enabled service and platform review, while iOS requires narrower app-supported actions. These are platform-specific capabilities, not universal Agent privileges.
