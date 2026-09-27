# OMYLA Desktop shell

An early Windows/macOS desktop shell for the single-button Presence. It is source code, not a signed installer.

## Run locally

Requires Node.js and npm on the computer where the button should appear:

```bash
cd desktop
npm install
npm start
```

One 48px button stays above the desktop. Click it for a short request panel, enter an instruction, and press **OMYLAで確認**. Your normal browser opens `omyla.uwaaa.com/app/` with the text filled in; you review and submit it there. Escape closes the panel. **終了** quits the app. When packaged as an installed Windows or macOS app, it starts at login by default; the expanded panel lets you turn that off. `npm start` is development mode and does not register login startup. There is no installer or signed binary yet.

The panel lets you select one connected monitor and draw directly over it in a temporary transparent ink window. Point and line/circle geometry is attached to the browser handoff with that display's ID and dimensions. The separate **画像確認** button takes a one-time thumbnail of the chosen display after hiding the OMYLA panel, and displays it locally. This thumbnail is cleared when switching displays or sending the text instruction. No screen image or underlying app text is uploaded; selecting an unlabelled point only conveys geometry. The ink window temporarily intercepts pointer input on the selected display until you finish or cancel. This shell only captures a screen when the user presses **画像確認**; it does not continuously capture, inspect other apps through OCR, control the mouse outside the ink layer, run in the background after quitting, or sync devices. The button starts near the lower right of the primary display and moves to the selected monitor; OS behavior for always-on-top and transparent windows varies, especially on Linux Wayland. No credential is stored in this app. The handoff puts the user-authored instruction temporarily in the URL fragment, which the site immediately removes. Avoid private instructions in the public preview.

## Windows preview build

GitHub Actions **Build Windows Presence Preview** packages the app for Windows x64. Its artifact is a ZIP containing a portable executable and support files; extract the entire folder to a stable location before running `OMYLA.exe`. The build is unsigned and may trigger Windows warnings. It is a preview build, not an installer, and has not been exercised on the user's Windows machine. Moving or deleting the folder after enabling login startup breaks that startup entry. The source alone is not an installed resident app.

The Electron window loads only local files, keeps Node integration off and sandbox/context isolation on, blocks renderer navigation, and exposes narrowly scoped IPC actions. Future screen capture needs a separate on-demand OS permission, visible review of the selected image, an authenticated upload channel, and a capability-specific approval gate before computer use.
