# Mobile Presence: platform boundaries and next slice

## iPhone / iOS

- Inside OMYLA, the camera view or a user-selected screenshot is the canvas. This works today in the mobile web preview at `/app/`.
- To bring another app's screen into OMYLA, a native iOS Share Extension can receive a screenshot shared by the user. This is a planned native integration.
- ReplayKit Broadcast Upload Extension can process screen samples after the user explicitly starts a broadcast. It does not grant a general-purpose floating, interactive window over other apps. The broadcast must be stopped visibly and its samples minimized before cloud submission.
- iOS Picture in Picture is designed for video playback; it is not a replacement for a freely interactive OS-wide overlay. Do not advertise an always-on-top button across other iPhone apps.
- iOS cannot be promised autonomous taps into arbitrary third-party apps with public application APIs. Use in-app guidance and supported app-specific actions, share intents, and Shortcuts where appropriate.

## Android

- A native foreground component can request `SYSTEM_ALERT_WINDOW` for a small floating OMYLA control. The user must allow overlay access.
- `MediaProjection` can capture the display or an app window after explicit system consent. The consent and foreground-service lifecycle must follow the Android version in use; recent versions require new consent for each capture session.
- Keep drawn marks local, permit one-shot screenshot submission, and render guidance as a narrow overlay on the selected surface. Add actions only through explicit capabilities and user confirmation.

## Shared contract

`surface.kind` distinguishes `camera`, `screen-upload`, `ios-broadcast`, and `android-projection`; each observation carries dimensions, orientation, timestamp, scope, and a consent record. Agent identity and provider model are independent. Never infer that access on one device grants access on another. Do not store raw screen frames by default.

## Primary sources

- [Apple ReplayKit broadcast sample handler](https://developer.apple.com/documentation/replaykit/rpbroadcastsamplehandler)
- [Apple Picture in Picture](https://developer.apple.com/documentation/avkit/adopting-picture-in-picture-in-a-custom-player)
- [Android MediaProjection](https://developer.android.com/media/grow/media-projection)
- [Android overlay permission](https://developer.android.com/about/versions/11/privacy/permissions)
