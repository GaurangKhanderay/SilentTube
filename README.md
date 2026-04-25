# 🔇 SilentTube — YouTube Focus Mode Extension

> Block distracting YouTube elements with a single click. No backend. No tracking. 100% local.

---

## ✨ What It Does

**SilentTube** is a browser extension that lets you take back control of your YouTube experience. Using toggleable settings, you can hide any combination of these distracting elements:

| Feature | What it hides |
|---|---|
| 🩳 **Hide Shorts** | Shorts shelf on homepage, Shorts tab in sidebar |
| 📺 **Hide Recommended** | Right-side recommended video sidebar |
| 🏠 **Hide Home Feed** | The entire video grid on the home page |
| 🎬 **Hide End Cards** | Clickable video thumbnails at end of videos |
| ▶️ **Hide Autoplay** | The autoplay next video toggle button |
| 💬 **Hide Comments** | The entire comments section |
| 📈 **Hide Trending** | The Trending tab in the sidebar |

All settings are saved in your browser and apply instantly — no page reload needed.

---

## 📁 File Structure

```
SilentTube/
├── manifest.json    # Extension config (Manifest V3)
├── content.js       # Injected into YouTube pages; hides elements via CSS
├── popup.html       # Extension popup UI layout
├── popup.css        # Dark-themed styling for the popup
├── popup.js         # Reads/writes settings, communicates with content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Install in Chrome (Developer Mode)

1. **Download / clone** this repository to your computer.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer Mode** (toggle in the top-right corner).
4. Click **"Load unpacked"**.
5. Select the `SilentTube/` folder.
6. The extension icon will appear in your browser toolbar.
7. Navigate to [youtube.com](https://youtube.com) and click the icon to configure.

---

## 🦊 Install in Firefox (Temporary Add-on)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **"Load Temporary Add-on..."**.
3. Navigate to the `SilentTube/` folder and select the `manifest.json` file.
4. The extension is now active for this browser session.

> **Note:** Firefox requires the extension to be re-loaded each time the browser restarts when installed this way. For permanent installation, the extension needs to be signed by Mozilla.

---

## ⚙️ How It Works (Technical)

- **`manifest.json`** — Manifest V3 config. Declares permissions (`storage`, `activeTab`) and injects `content.js` into all `youtube.com` pages.
- **`content.js`** — Runs on every YouTube page. Reads settings from `chrome.storage.sync` and injects a `<style>` tag into the page with CSS `display: none` rules. Uses a `MutationObserver` to handle YouTube's SPA navigation (URL changes without full page reload). Listens to `chrome.storage.onChanged` for real-time updates.
- **`popup.html/css/js`** — The settings panel. Reads and writes to `chrome.storage.sync`. When a toggle changes, it sends a message to the active tab's content script to update immediately.

---

## 🔒 Privacy

- **No data collection.** Zero.
- **No external requests.** The extension never contacts any server.
- **All settings are local.** Stored in `chrome.storage.sync` (synced via your Google account if enabled, but only toggle states — no personal data).

---

## 📄 License

MIT — free to use, modify, and distribute.
