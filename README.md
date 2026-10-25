# PowerLine Designer (v2.4.0)

[![Deploy to GitHub Pages & Multi-Platform Matrix](https://github.com/kpaul466/Designer/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/kpaul466/Designer/actions/workflows/build-and-release.yml)
[![Version](https://img.shields.io/badge/version-2.4.0-red.svg)](https://github.com/kpaul466/Designer/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Live%20Web%20App-GitHub%20Pages-emerald)](https://kpaul466.github.io/Designer/)

**Professional Electrical Distribution Line CAD, Maintenance, Erection & BOQ Management System.**

Built specifically for electrical utility engineers, line supervisors, turnkey contractors, and surveyors to draft blueprints, calculate Bill of Quantities (BOQ), inspect field routes with GIS map underlays, and export official A4 Landscape drawing sheets with engineering title blocks, sign-offs, and single-line diagrams.

---

## 🚀 Cross-Platform Downloads & Installers

PowerLine Designer compiles automatically via **GitHub Actions** for Desktop and Mobile platforms:

| Platform | Format | Description | Download |
| :--- | :--- | :--- | :--- |
| **Windows Desktop** | `.exe` (NSIS Installer) | 64-bit installer with automatic `.pld` file association & desktop icon | [Download Setup](https://github.com/kpaul466/Designer/releases/latest) |
| **Windows Portable** | `.exe` (Standalone) | Portable zero-install binary for USB drives & workstations | [Download Portable](https://github.com/kpaul466/Designer/releases/latest) |
| **Android Phone / Tab** | `.apk` (Mobile) | Standalone APK for surveying, on-site route verification & tablet drafting | [Download APK](https://github.com/kpaul466/Designer/releases/latest) |
| **Linux Desktop** | `.AppImage` & `.deb` | Portable universal AppImage and Debian package for Ubuntu/Debian | [Download Linux](https://github.com/kpaul466/Designer/releases/latest) |
| **macOS Desktop** | `.dmg` (Universal) | Universal disk image for Apple Silicon (M1/M2/M3) and Intel Macs | [Download DMG](https://github.com/kpaul466/Designer/releases/latest) |
| **Web & PWA** | Web Browser | Runs instantly in any modern browser with offline PWA support | [Launch Web App](https://kpaul466.github.io/Designer/) |

👉 **Dedicated Web Download Page**: [https://kpaul466.github.io/Designer/download.html](https://kpaul466.github.io/Designer/download.html)

---

## ⚡ Key Highlights in v2.4.0

### 1. Dedicated Stateful `.PLD` File Extension
- **Native File Extension**: Saves drawings with the `.pld` (**PowerLine Drawing**) file format.
- **Full State Preservation**: Preserves the complete drawing model, electrical node ratings, pole codes, conductor phases, jumper routings, stay assemblies, railway/river crossings, custom BOQ overrides, and the exact canvas viewport (**zoom level**, **panX**, **panY** coordinates).
- **Drive Recognition & Open**: When saved to a local drive, Google Drive, or OneDrive, opening the file in PowerLine Designer immediately restores your workspace to the exact state it was saved in.
- **Drag-and-Drop Loading**: Drag any `.pld` or `.json` file anywhere onto the browser window or canvas to open it instantly.
- **File Association**: On Windows, Linux, and macOS, `.pld` files are registered with the system so double-clicking a file in File Explorer launches PowerLine Designer and loads the drawing.

### 2. Multi-Platform Desktop & Phone Applications
- **Desktop Electron App**: Packaged with `electron-builder` for Windows, macOS, and Linux with native file dialogs, offline operation, and deep-link file argument handling.
- **Android Phone App**: Packaged with Capacitor for Android smartphones and tablets with touch panning, pinch-to-zoom, and offline storage.
- **Continuous Compilation via GitHub Actions**: The automated matrix workflow (`.github/workflows/build-and-release.yml`) compiles binaries across Windows, Linux, macOS, and Android on every push or release tag.

### 3. Real-Time Update Triggers Across All Installed Instances
- **Instant Push Detection**: When an update is committed or pushed to GitHub, GitHub Actions builds and publishes a fresh `version.json` beacon with the new commit hash and build timestamp.
- **Web & PWA Auto-Update**:
  - The Service Worker checks `version.json` (bypassing cache) and registers new app shells.
  - Periodic polling (every 3 minutes) and window focus detection immediately identify pushed updates.
  - A prominent floating banner (`UpdateNotificationBanner`) alerts the user with one-click **"Update & Reload"**, instantly activating the new Service Worker and refreshing to the latest version.
- **Desktop Electron Auto-Update**:
  - Integrated `electron-updater` background updater querying GitHub releases.
  - Downloads new binaries in background and notifies the user with one-click **"Restart & Install"**.
- **Android Mobile In-App Notifications**:
  - Detects newer APK builds and prompts the user to download and update directly from the app.

### 4. About Developer & In-App App Version Modals
- **About Developer Page**: Information on the project background, developer credentials (Kaushik Paul / `@kpaul466`), mission for power distribution engineering, and technical architecture.
- **App Version & Installer Center**: Running environment detector (Web, Windows, Android, Linux, Mac), direct download links for all platform binaries, real-time GitHub update checker, and complete version changelog.

### 4. New Drawing Workflow & Scheme Classification
- **Save / Discard / Delete Prompt**: Prompts to Save updates to catalog, Discard unsaved changes, or Delete the previous drawing before starting fresh.
- **Project Setup Launch**: Automatically opens the Project Configuration wizard with drawing title autofocus.
- **Work Type Classification**: Prominent toggle for **New Work** (new lines, electrification, extensions) vs. **Maintenance Work** (renovations, repairs, reconductoring, pole replacement).

### 5. OpenStreetMap GIS Layer & Offline West Bengal Places
- **GIS Map Underlay & Overlay**: Toggle map with adjustable opacity (10% to 100%) and position (under/over CAD lines).
- **Offline Land Database**: 12,000+ West Bengal mouzas, villages, and substations indexed locally via IndexedDB.
- **Street Outlines**: Import road geometries directly from OpenStreetMap onto the CAD canvas.

### 6. ISO 216 A4 Landscape PDF Export
- Exports official A4 Landscape drawings with Title Block, Index, and automated BOQ schedule.
- Embeds Application No, PO No, Agency, CCC Name, Sub-Division, Work Order No, and Work Classification.

---

## 🛠️ Local Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup
```bash
# Clone the repository
git clone https://github.com/kpaul466/Designer.git
cd Designer

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

### Electron Desktop Development
```bash
# Start Vite and Electron
npm run electron
```

### Build Commands
```bash
# Build web production bundle (Vite)
npm run build

# Build Windows installer
npm run electron:pack:win

# Build Linux AppImage & deb
npm run electron:pack:linux

# Build macOS DMG
npm run electron:pack:mac
```

---

## 👤 Developer

- **Developer**: Kaushik Paul ([@kpaul466](https://github.com/kpaul466))
- **Repository**: [https://github.com/kpaul466/Designer](https://github.com/kpaul466/Designer)
- **Live Demo**: [https://kpaul466.github.io/Designer/](https://kpaul466.github.io/Designer/)
- **Downloads**: [https://kpaul466.github.io/Designer/download.html](https://kpaul466.github.io/Designer/download.html)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
