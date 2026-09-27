# OMYLA Presence architecture

The product is a cloud crew reached from a lightweight, normally transparent presence on each device. The user's current PC display(s), phone screen, browser page, or camera view is the canvas. OMYLA is visible only as a small invocation control, transient ink, contextual proposals, and permission prompts. `omyla.uwaaa.com` is the landing page; `/app/` is a browser preview and fallback review surface, not the primary daily interface.

| Surface | Resting state | Invocation | Current implementation | Next native milestone |
| --- | --- | --- | --- | --- |
| Windows/macOS | Floating 48px button | Click, then short goal panel | Electron shell; packaged builds register login startup with an opt-out | Signed installer; on-demand screen capture/OS accessibility after permission and review |
| Chromium browser | One button on ordinary HTTP/HTTPS pages | Click, Point, Draw | MV3 content script extracts only selected labels; handoff to `/app/` for review | Authenticated same-page results and account-scoped task state |
| Android | Foreground notification or optional floating button | Tap, share sheet, voice after activation | Not shipped | Native app; user-granted overlay permission for the optional floating button; foreground service and notification |
| iPhone/iPad | Widget, Shortcuts/Share Sheet, notifications | Tap or share | Not shipped | Native companion for status, voice, approval, camera; no promise of a floating button over other apps |

## Canvas contract

Each observation and mark must target a specific canvas: `canvasId`, `deviceId`, `kind` (`monitor`, `browser_tab`, `phone_screen`, `camera`), `frameId` and capture time, viewport pixel size, pixel density, orientation, and coordinate transform. A multi-monitor desktop uses one canvas per display, with stable display identifiers and a desktop-space origin; each mark stores canvas-local normalized coordinates plus its frame reference. No agent may silently merge marks from different screens or stale frames. A camera view is a time-stamped frame or user-approved short clip with its own coordinates, not an assumed live feed.

The local presence translates Point and Draw into coordinates and, where possible, semantic targets. The cloud receives only the selected context and a bounded snapshot when the user explicitly grants capture. Results and approval prompts return to the originating canvas, anchored to the target; if the frame changes or the anchor disappears, show an unanchored notification and require review before any action. This canvas model supports adding future physical resources with their own coordinate systems and capabilities without treating them as screens.

## Shared protocol, not shared window

Each device presents only its local input. It sends a goal envelope with `goalId`, `actorId`, `deviceId`, `canvasId`, `frameId`, `surface`, `modality`, `marks`, `attachments`, and a timestamp. The cloud owns task/agent state, permissions, and results. Device inputs never grant extra permissions by themselves. Selected screen context is reviewed before transmission; screen capture, camera frames, and microphone access each require their own platform permission and visible capture state. Default capture is off. Cross-device continuity requires accounts, device registration, and an authenticated API; the current cookie session has none of those.

The next vertical slice is one goal started in a browser or desktop presence, stored as a cloud task, then viewed or approved from mobile. Approval tokens must bind the user, device, task, action, resource, expiry, and idempotency key. Approval is a control flow event, never an instruction embedded in a model response.

## Platform boundaries

Electron supports login registration for packaged Windows/macOS applications. An `npm start` development session is not an installed app and does not register itself. Chromium content scripts need site access to appear on every page; browser privileged pages and cross-origin frames remain outside scope. Android application overlays require `SYSTEM_ALERT_WINDOW` and an explicit grant in system settings; apps may block overlays. iOS app extensions run at supported entry points, not as a permanent cross-app floating layer. Mobile should make tasks reachable through OS-native entry points while cloud work continues after the UI closes.

Sources: [Electron login items](https://www.electronjs.org/docs/latest/api/app#appsetloginitemsettingssettings-macos-windows), [Android overlays](https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW), [Android overlay permission](https://developer.android.com/reference/android/provider/Settings#ACTION_MANAGE_OVERLAY_PERMISSION), [Apple app extension lifecycle](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionOverview.html).

## Implementation order

1. Browser: render transient ink and selected targets directly over the active tab; keep the public preview as a fallback.
2. Windows: enumerate displays, map ink to a single display/frame, and add on-demand capture with a visible indicator. Keep the resting presence one small control.
3. Cross-device: authenticate accounts and bind canvases to devices and goals before sharing state.
4. Mobile: use OS-supported screen share/recording, Share Sheet, widget, or Android overlay where granted. Camera mode is explicit and stops when dismissed. iOS cannot provide a permanent transparent layer across all apps.

The current desktop shell and browser preview do not yet understand arbitrary screen pixels or camera imagery. This document defines the target interaction contract, not a claim that these capabilities are shipped.
