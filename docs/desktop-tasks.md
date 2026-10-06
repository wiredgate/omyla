# Windows PC tasks — OMYLA 0.2

## Using the app

Extract the entire Windows preview ZIP and launch OMYLA.exe. The existing release pipeline updates `windows-phase1-preview/OMYLA-Windows-Preview.zip` after a successful build on main. A portable ZIP is not an installer, and existing installations do not auto-update.

Click Mia, select the display, enter the task, check the task-scoped screen-sharing/input consent, then click **Mia、やってきて**. The panel collapses. A small task HUD shows progress, **停止**, and approval prompts. **Ctrl+Alt+S** stops pending work; **Ctrl+Alt+Shift+Q** exits OMYLA.

Mia has a vector body with separate arms/legs, a breathing head, eye blinks, walking direction, and a working hand animation. Her window physically travels toward each proposed target before the native action. This is an articulated stylized vector character, not a production-quality character rig or a claim of Disney-level animation.

Try a browser search field or a Notepad document that is already open. Ordinary tasks support clicks, double-clicks, Unicode text input, scrolling, and a restricted list of keyboard shortcuts. Unknown UI elements and sensitive actions require a specific confirmation. Enter, paste, save, and multiline text require confirmation. Password fields, command consoles, arbitrary hotkeys, and executable URLs are blocked. Some custom controls and elevated windows will not accept UI Automation or injected input.

## Execution

The Electron main process owns a single task with an immutable selected display geometry, at most 12 observation/action rounds and a five-minute deadline. It captures the selected screen, requests one grounded action, animates Mia toward the target, checks Windows UI Automation metadata, obtains approval where required, recaptures to detect changes, reinspects the native target, and performs one fixed Win32 input operation. The next screenshot determines the next step. Delivered input does not itself prove task success.

Images and task text are sent to the existing Cloudflare vision endpoint `/api/desktop-step`. This release uses the already-configured Workers AI vision model, not the unvalidated Agents API pilot in PR #7. Identity/animation remain on OMYLA's desktop side. Multi-agent persistent cloud work and personal account sync are not connected to native input in this release.

The planner has a separate daily cap of 24 requests per IP and 80 globally. The public preview is bounded and not a paid production service. The existing quota ledger receives provider usage if available; screen images and typed text are not added to that ledger.

The fixed PowerShell helper reads JSON from stdin. AI text is never interpolated into a shell command. Unicode text is delivered using SendInput without putting it on the clipboard. UI Automation rejects password controls, focus outside the observed target, and changes to the observed window/control. Pointer movement before unapproved execution stops the task. Stop aborts the network request, walking animation, and pending native subprocess; already-delivered input cannot be undone.

Native input operates in the current user session. It cannot bypass UIPI, elevation or the Windows secure desktop. Do not run the app as administrator to work around this limitation.

## Verification and limitations

Node tests cover execution order, fresh observations, interruption before input, sensitive confirmation, native target changes, parser boundaries, task caps and request quotas. The Windows build verifies the PowerShell parser, compiles the fixed C# helper and checks x64 INPUT struct size. It does not send real input in CI.

The development environment has no interactive Windows desktop. Actual browser/Notepad task execution, UIA behavior in individual applications, stop behavior during native input, and mixed-DPI multi-monitor input remain manual Windows checks. The task grant covers a display, not an account or an individual application window. Sensitive labels are heuristic and imperfect; sensitive actions are also flagged by the planner. No blanket promise of safe autonomous financial/destructive operation is made.

Suggested manual acceptance: (1) type Japanese into an open Notepad edit region; (2) search in an open browser with a confirmed Enter; (3) scroll and stop while Mia walks; (4) change the target while planning and verify no stale click; (5) reject a sensitive prompt; (6) use 125%/150% DPI and a display with a negative origin; (7) verify UAC/password input is blocked. Do not claim these passed unless run on Windows.
