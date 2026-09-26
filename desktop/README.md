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

This shell does not capture screens, inspect other apps, control the mouse, run in the background after quitting, or sync devices. The button sits near the lower right of the primary display; OS behavior for always-on-top and transparent windows varies, especially on Linux Wayland. No credential is stored in this app. The handoff puts the user-authored instruction temporarily in the URL fragment, which the site immediately removes. Avoid private instructions in the public preview.

## Windows preview build

GitHub Actions **Build Windows Presence Preview** packages the app for Windows x64. Its artifact is a ZIP containing a portable executable and support files; extract the entire folder to a stable location before running `OMYLA.exe`. The build is unsigned and may trigger Windows warnings. It is a preview build, not an installer, and has not been exercised on the user's Windows machine. Moving or deleting the folder after enabling login startup breaks that startup entry. The source alone is not an installed resident app.

The Electron window loads only local files, keeps Node integration off and sandbox/context isolation on, blocks renderer navigation, and exposes narrowly scoped IPC actions. Future screen capture needs a separate on-demand OS permission, visible review of the selected image, an authenticated upload channel, and a capability-specific approval gate before computer use.
