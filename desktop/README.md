# OMYLA Desktop shell

An early Windows/macOS desktop shell for the single-button Presence. It is source code, not a signed installer.

## Run locally

Requires Node.js and npm on the computer where the button should appear:

```bash
cd desktop
npm install
npm start
```

One 48px button stays above the desktop. Click it for a short request panel, enter an instruction, and press **OMYLAで確認**. Your normal browser opens `omyla.uwaaa.com` with the text filled in; you review and submit it there. Escape closes the panel. **終了** quits the app.

This shell does not capture screens, inspect other apps, control the mouse, run in the background after quitting, or sync devices. The button sits near the lower right of the primary display; OS behavior for always-on-top and transparent windows varies, especially on Linux Wayland. No credential is stored in this app. The handoff puts the user-authored instruction temporarily in the URL fragment, which the site immediately removes. Avoid private instructions in the public preview.

The Electron window loads only packaged local files, keeps Node integration off and sandbox/context isolation on, blocks renderer navigation, and exposes only four narrowly scoped IPC actions. Future screen capture needs a separate on-demand OS permission, visible review of the selected image, an authenticated upload channel, and a capability-specific approval gate before computer use.
