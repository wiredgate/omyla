# OMYLA browser bridge (Chromium)

This unpacked Manifest V3 extension is a first bridge from an actual web page to the OMYLA public preview. It is not yet distributed through the Chrome Web Store.

## Install

1. Download the repository ZIP from GitHub and extract it.
2. Open `chrome://extensions` in Chrome or Edge, enable Developer mode, and choose **Load unpacked**.
3. Select the extracted `extension/` folder. Pin the OMYLA extension if useful.
4. Open or reload a normal `http://` or `https://` page. A single small OMYLA button appears at the bottom right. Press it to point, draw, or give an instruction, then choose **OMYLAで確認**. Review the selected text at `omyla.uwaaa.com/app/` and submit there. The toolbar icon also opens or closes the panel.

The resting page UI is one button. The temporary controls close with ×, Escape, or the same button; the site is otherwise clickable as usual.

Chrome will ask for access to normal HTTP and HTTPS pages because this button appears on each page. The script is injected on those pages, but does not send a page snapshot or read form values. It extracts visible labels near a point or drawing only when you interact with it. It never captures screenshots, passwords, or other tabs. The handoff uses a fragment that the OMYLA page immediately removes from the address bar. This temporary handoff does not authenticate the user. Avoid selecting private material in this public preview. You can manage the extension's site access in Chrome's extension settings.

The OMYLA website is excluded to avoid a duplicate button. Browser internal pages, extension pages, some protected sites, and cross-origin iframe contents cannot be inspected. The user can correct the last stroke type before handoff.
