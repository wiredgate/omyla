# Mobile Presence: platform boundaries and next slice

## iPhone / iOS

- Inside OMYLA, the live camera view or a user-selected screenshot is the canvas. While the camera is running, the user can ask about the current frame without stopping the preview. A single JPEG frame is captured on explicit question, not streamed continuously. The public preview has a five-request daily per-IP quota; an explicitly started watch can send up to three change-triggered frames per session. The user can point, draw, type or press to speak. Short audio is sent to the transcription endpoint only after the user stops recording; for a still image, the text is reviewable before the visual request. With a live camera, the frame is captured when recording stops and automatically paired with the transcript for an observation request; the transcript remains visible. The visual observation endpoint answers aloud first; it shows optional location marks only when the image supports them. The answer is spoken while the web page remains in the foreground. This works today in the mobile web preview at `/app/`.
- To bring another app's screen into OMYLA, a native iOS Share Extension can receive a screenshot shared by the user. This is a planned native integration.
- A native iOS app with an appropriate background audio session is the candidate for voice playback while users switch apps; browser speech synthesis cannot be promised to continue in the background. ReplayKit Broadcast Upload Extension can process screen samples after the user explicitly starts a broadcast. It does not grant a general-purpose floating, interactive window over other apps. The broadcast must be stopped visibly and its samples minimized before cloud submission.
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

## Live watch preview

The user may explicitly start "見続ける" while the camera is open. A 24×18 downsampled luminance signature is compared locally every two seconds; after a meaningful change and a minimum twelve-second gap, one JPEG frame is sent to the existing observation API. There are at most three sends per watch session. Each consumes the same per-IP daily image quota (five) and global daily quota (thirty); the UI displays the number sent. The watch stops when closed, hidden, switched to a still image, speech recording begins, an API failure occurs, or its session limit is reached. The AI answers with speech; location marks are omitted on moving video because the target may already have moved. This is sparse event-triggered visual observation, not a streaming video model or continuous audio listener.

## Short follow-up memory

While the same camera or still-image surface is open, the client sends only the previous question and its short answer with the next explicit visual question. The current frame wins when the scene has changed. This bounded context is held only in page memory and cleared when switching or closing the surface. It is not written to server storage. The existing per-request preview quota still applies.
