# OMYLA browser bridge (Chromium)

This unpacked Manifest V3 extension is a small in-page assistant connected to the OMYLA public preview. It is not yet distributed through the Chrome Web Store.

## Install

1. Download the repository ZIP from GitHub and extract it.
2. Open `chrome://extensions` in Chrome or Edge, enable Developer mode, and choose **Load unpacked**.
3. Select the extracted `extension/` folder. Pin the OMYLA extension if useful.
4. Open or reload a normal `http://` or `https://` page. A single small OMYLA button appears at the bottom right. Press it to point, draw, or give an instruction, then choose **このページで教えて**. Kai, Mia, or Emma respond with short, sequential guidance cards directly on the current page, with a ring around the selected point that each AI step explicitly refers to. When it cannot identify a matching selected mark, no ring is drawn. Use Back/Next to move through the steps or the speaker button to read the current step aloud. The agent steps are suggestions; they do not automatically operate the page. **詳細を開く** sends the selected context to `omyla.uwaaa.com/app/` for the longer preview. The toolbar icon also opens or closes the panel.

The panel also offers on-demand speech input through the browser's Web Speech API. The transcript stays in the text field for review before you send it. Browser support varies; some browsers send speech to their recognition provider, so speech recognition may require a network connection. Audio is not sent to OMYLA by this button.\n\nThe resting page UI is one button. The temporary controls close with ×, Escape, or the same button; the site is otherwise clickable as usual.

Chrome will ask for access to normal HTTP and HTTPS pages because this button appears on each page. The script is injected on those pages, but does not send a page snapshot or read form values. It extracts visible labels near a point or drawing only when you interact with it. It never captures screenshots, passwords, or other tabs. The optional detailed handoff uses a fragment that the OMYLA page immediately removes from the address bar. This temporary handoff does not authenticate the user. Avoid selecting private material in this public preview. You can manage the extension's site access in Chrome's extension settings.

The OMYLA website is excluded to avoid a duplicate button. Browser internal pages, extension pages, some protected sites, and cross-origin iframe contents cannot be inspected. The user can correct the last stroke type before sending. Guidance uses selected labels and coordinates; it does not see the full page or click on it. Closing the card restores a single small button.
