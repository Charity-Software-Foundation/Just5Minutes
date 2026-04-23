# Just 5 Minutes

A Chrome extension that blocks distracting websites with a timed intervention overlay. The pause between you and your distractions.

## How It Works

1. **Visit a blocked site** → a full-screen overlay asks: "又来了？ / Here again?"
2. **Choose**: close the page, or start a timed session (5 min, 15 min)
3. **A floating circular timer** tracks your session — draggable anywhere on screen
4. **Time's up** → overlay returns. Close the tab and earn a "言而有信，不错嘛 / Kept your word. Nice."

## Features

- **Full-screen intervention overlay** with blur backdrop
- **Floating ring timer** — circular SVG progress, draggable
- **Timed sessions** — 5 min, 15 min, or allow for the rest of the day (weekends only)
- **Bilingual UI** — Chinese / English, auto-detected from browser language
- **Context-aware popup** — current site always shown first with Add/Remove toggle

## Default Blocked Sites

youtube.com · x.com · instagram.com · threads.com · bsky.app · mastodon.social · zhihu.com · bilibili.com

## Installation

1. Clone or download this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `src/` directory

## Project Structure

```
src/
├── manifest.json              # Extension manifest (MV3)
├── assets/icons/              # 16/48/128px icons
└── src/
    ├── background/
    │   └── background.js      # Service worker — sessions & alarms
    ├── content/
    │   └── content.js         # Overlay & floating timer
    ├── popup/
    │   ├── popup.html
    │   ├── popup.css
    │   └── popup.js           # Site management
    └── styles/
        └── overlay.css
```

## Privacy

Just 5 Minutes does not collect, store, or transmit any personal data. All settings are stored locally in Chrome sync storage. No analytics. No network requests.

## Tech

- Chrome Extension Manifest V3
- Vanilla JS, no dependencies
- `chrome.storage.sync` for settings
- `chrome.alarms` for session timing
- CSS `backdrop-filter` for overlay blur

## License

MIT
