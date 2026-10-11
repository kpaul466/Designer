# PowerLine Designer

Professional Electrical Distribution Line Drawing, Maintenance, Erection & BOQ Management System.

Built specifically for electrical utility engineers, line supervisors, and contractors to draft field survey blueprints, calculate material schedules, inspect field routes with GIS map underlays, and export official A4 Landscape drawing sheets with title blocks, indices, and BOQ tables.

---

## Key Features

### 1. User Authentication & Admin Approval Workflow
- **Phone Number & Password Login**: Fast and secure access using 10-digit mobile phone numbers and passwords.
- **Registration Feature**: Self-registration for engineers, surveyors, and contractor supervisors.
- **Admin Approval Gate**: Newly registered users are placed in `pending_approval` status. Users cannot use the software until approved by an Administrator.
- **Admin Approval Panel**: Full management interface to review, approve, reject, or delete user accounts with live pending badge indicators.
- **Pre-configured Accounts for Testing**:
  - **Admin**: Phone `9876543210` / Password `admin`
  - **Approved Engineer**: Phone `9434012345` / Password `user123`
  - **Pending User (for approval testing)**: Phone `7602393385` / Password `user123`

### Drawing Management
- Create a clean, blank drawing from **New Drawing** without loading an old sample.
- Save any local drawing as a reusable template from **My Drawings**.
- The template picker now contains only user-saved templates; bundled sample drawings are no longer offered.

### 2. Supabase Cloud Database Integration
- Complete data persistence for drawings, user accounts, and approvals.
- Built-in Supabase client with local database mirroring (works both with a live Supabase project and seamless offline fallback).
- Includes one-click **Cloud Save** and SQL setup scripts directly in the UI.

### 3. GitHub Pages Ready
- Built with a configurable Vite asset base so project Pages sites and custom domains both load their assets correctly.
- Included GitHub Actions workflow (`.github/workflows/deploy.yml`) for automated building and zero-configuration publishing on push to `main`.

### 4. Installable Progressive Web App
- Install PowerLine Designer from a supported browser using **Install app** or **Add to Home Screen**.
- The service worker caches the app shell and same-origin assets for offline startup after the first successful online load.
- GIS tiles, geocoding, and OpenStreetMap feature queries still require an internet connection.

### 5. OpenStreetMap GIS Layer (Underlay & Overlay)
- The CAD drafting grid background automatically becomes transparent when the GIS map is enabled, making OpenStreetMap features clearly visible beneath CAD elements.
- OpenStreetMap tiles are rendered with OpenLayers and attributed on the canvas.
- The drawing sheet remains fixed at the selected page size and its border stays visible while the surrounding OpenStreetMap area extends beyond the page.
- Place search uses OpenStreetMap's online geocoding service and requires an internet connection.
  - Added **Layer Placement** control:
    - **Under CAD Lines**: Map sits cleanly underneath poles, conductors, and annotations.
    - **Over CAD Lines**: Map sits above the vectors with adjustable transparency (10% to 100%).

### 6. Authentic Electrical CAD Canvas & Full Keyboard Shortcuts
- **Ctrl + Scroll**: Zoom In / Zoom Out centered on cursor.
- **Scroll**: Pan canvas viewport.
- **Click + Drag**: Marquee box multi-selection of poles, conductors, stays, and crossings.
- **CAD Shortcuts**: `Ctrl+S` (Save), `Ctrl+Z`/`Ctrl+Y` (Undo/Redo), `Del` (Delete), `Ctrl+C`/`Ctrl+V`/`Ctrl+X`/`Ctrl+D` (Clipboard), `F`/`Z` (Fit to screen), `0` (Reset zoom), `?` (Keyboard guide).
- **Custom Tool Creator**: Build and save on-the-fly custom electrical and civil symbols integrated into the live BOQ.

### 7. ISO 216 A4 Landscape PDF Export
- Exports official A4 Landscape (297mm × 210mm) drawings with Title Block, Index, and BOQ Schedule.
- Prominently embeds:
  - **Application Number** (e.g. `4003705061`)
  - **PO Number / Work Order No.** (e.g. `PO/DIS/2026/089`)
  - **Drawing Name / Title**
  - **Area / Location**
  - **Agency Name**
  - **CCC Name** (Customer Care Centre)

---

## GitHub Pages Deployment Guide

1. Push this repository to GitHub on the `main` or `master` branch.
2. In your GitHub repository, navigate to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. The workflow installs dependencies with Bun, builds the Vite site, and deploys the artifact. You can also start a deployment from the **Actions** tab using **Run workflow**.

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.
