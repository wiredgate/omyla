# OMYLA browser bridge (Chromium)

This unpacked Manifest V3 extension is a first bridge from an actual web page to the OMYLA public preview. It is not yet distributed through the Chrome Web Store.

## Install

1. Download the repository ZIP from GitHub and extract it.
2. Open `chrome://extensions` in Chrome or Edge, enable Developer mode, and choose **Load unpacked**.
3. Select the extracted `extension/` folder. Pin the OMYLA extension if useful.
4. On a normal `http://` or `https://` page, click the OMYLA toolbar icon. Point or draw, write an instruction, then choose **OMYLAで確認**. Review the selected text on `omyla.uwaaa.com` and submit there.

The extension requests only `activeTab` and `scripting`. It runs on the current page only after the toolbar click. It reads the specific pointed or drawn DOM text and page title/hostname; it never captures a screenshot, form values, passwords, the full page, or other tabs. The handoff uses a fragment that the OMYLA page immediately removes from the address bar. This temporary handoff does not authenticate the user. Avoid selecting private material in this public preview.

Browser internal pages, extension pages, some protected sites, and cross-origin iframe contents cannot be inspected. The user can correct the last stroke type before handoff.
