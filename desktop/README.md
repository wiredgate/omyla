# OMYLA Windows Presence · Phase 1

Portable Windows x64 app. It runs above other windows and can start at login after the extracted folder is placed at a stable location. This is an unsigned preview executable, not an installer.

## Run

Download the `OMYLA-Windows-Preview` artifact from the Windows build workflow, extract the whole ZIP, and run `OMYLA.exe`. For source development, run `npm install && npm start` inside `desktop/` on Windows.

Mia stays on top. Drag her with a mouse or finger; she struggles while held and reacts when released. Tap or click her to open the panel. The **終了** button stays at the top of the panel. On Windows, right-click Mia and select **OMYLAを終了**, or press **Ctrl+Alt+Shift+Q** to quit even when the panel is inaccessible. In compact mode, Windows native window shaping passes input outside her hit region to the app beneath. The expanded panel is interactive; close it to return to normal work. Ctrl+Shift+O toggles the panel. The login startup checkbox is available in a packaged build.

The drawing tool temporarily takes pointer input while drawing on one chosen monitor. Finish or cancel to return input to underlying apps. Finished strokes stay visible in a transparent, input-transparent window; their small pink handles can be dragged with mouse or touch, or removed with a right click. The guide overlay passes input through. A disconnected display removes its drawing until a new drawing is made. The character and marks themselves remain intentional interactive targets.

Ask by text or microphone; answers are spoken aloud by Windows speech synthesis. Checking **この画面を見せる** takes a fresh screenshot only for that question and sends it to `/api/observe` for an answer and optional pointing marks. Otherwise text goes to `/api/ask`; microphone audio goes to `/api/transcribe`. These endpoints must be deployed on `omyla.uwaaa.com` before the app's live AI features work. The image preview button only shows a local thumbnail. The existing guide flow and deliberate one-click action remain separate.

This phase does not automatically read the screen in the background. Screen content is sent only on an explicit screen question or guide request. The build and code have not been exercised on a physical Windows touchscreen; verify native touch hit testing and mixed-DPI monitors on target hardware before release. The executable is unsigned and may show a Windows warning.
