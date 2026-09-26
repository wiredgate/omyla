# OMYLA Presence architecture

The product is a cloud crew reached from a lightweight presence on each device. `omyla.uwaaa.com` is the landing page; `/app/` is a browser preview and fallback review surface, not the primary daily interface.

| Surface | Resting state | Invocation | Current implementation | Next native milestone |
| --- | --- | --- | --- | --- |
| Windows/macOS | Floating 48px button | Click, then short goal panel | Electron shell; packaged builds register login startup with an opt-out | Signed installer; on-demand screen capture/OS accessibility after permission and review |
| Chromium browser | One button on ordinary HTTP/HTTPS pages | Click, Point, Draw | MV3 content script extracts only selected labels; handoff to `/app/` for review | Authenticated same-page results and account-scoped task state |
| Android | Foreground notification or optional floating button | Tap, share sheet, voice after activation | Not shipped | Native app; user-granted overlay permission for the optional floating button; foreground service and notification |
| iPhone/iPad | Widget, Shortcuts/Share Sheet, notifications | Tap or share | Not shipped | Native companion for status, voice, approval, camera; no promise of a floating button over other apps |

## Shared protocol, not shared window

Each device presents only its local input. It sends a goal envelope with `goalId`, `actorId`, `deviceId`, `surface`, `modality`, `marks`, `attachments`, and a timestamp. The cloud owns task/agent state, permissions, and results. Device inputs never grant extra permissions by themselves. Selected screen context is reviewed before transmission; full screen capture is a separate user-approved capability. Cross-device continuity requires accounts, device registration, and an authenticated API; the current cookie session has none of those.

The next vertical slice is one goal started in a browser or desktop presence, stored as a cloud task, then viewed or approved from mobile. Approval tokens must bind the user, device, task, action, resource, expiry, and idempotency key. Approval is a control flow event, never an instruction embedded in a model response.

## Platform boundaries

Electron supports login registration for packaged Windows/macOS applications. An `npm start` development session is not an installed app and does not register itself. Chromium content scripts need site access to appear on every page; browser privileged pages and cross-origin frames remain outside scope. Android application overlays require `SYSTEM_ALERT_WINDOW` and an explicit grant in system settings; apps may block overlays. iOS app extensions run at supported entry points, not as a permanent cross-app floating layer. Mobile should make tasks reachable through OS-native entry points while cloud work continues after the UI closes.

Sources: [Electron login items](https://www.electronjs.org/docs/latest/api/app#appsetloginitemsettingssettings-macos-windows), [Android overlays](https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW), [Android overlay permission](https://developer.android.com/reference/android/provider/Settings#ACTION_MANAGE_OVERLAY_PERMISSION), [Apple app extension lifecycle](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionOverview.html).
