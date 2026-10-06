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

### 2. Supabase Cloud Database Integration
- Complete data persistence for drawings, user accounts, and approvals.
- Built-in Supabase client with local database mirroring (works both with a live Supabase project and seamless offline fallback).
- Includes one-click **Cloud Save** and SQL setup scripts directly in the UI.

### 3. GitHub Pages Ready
- Built with relative asset base (`base: './'` in `vite.config.ts`), making the production bundle immediately deployable on GitHub Pages.
- Included GitHub Actions workflow (`.github/workflows/deploy.yml`) for automated building and zero-configuration publishing on push to `main`.

### 4. Resolved GIS Map Layer (Underlay & Overlay)
- The map was previously blocked by an opaque canvas background. This is now resolved:
  - The CAD drafting grid background automatically becomes transparent when the GIS map is enabled, making satellite and road features clearly visible beneath CAD elements.
  - Added **Layer Placement** control:
    - **Under CAD Lines**: Map sits cleanly underneath poles, conductors, and annotations.
    - **Over CAD Lines**: Map sits above the vectors with adjustable transparency (10% to 100%).
  - Features high-resolution aerial agricultural cadastre parcels, highway corridors (NH-31D), and river crossing paths (Mujnai/Torsa).

### 5. Authentic Electrical CAD Canvas & Full Keyboard Shortcuts
- **Ctrl + Scroll**: Zoom In / Zoom Out centered on cursor.
- **Scroll**: Pan canvas viewport.
- **Click + Drag**: Marquee box multi-selection of poles, conductors, stays, and crossings.
- **CAD Shortcuts**: `Ctrl+S` (Save), `Ctrl+Z`/`Ctrl+Y` (Undo/Redo), `Del` (Delete), `Ctrl+C`/`Ctrl+V`/`Ctrl+X`/`Ctrl+D` (Clipboard), `F`/`Z` (Fit to screen), `0` (Reset zoom), `?` (Keyboard guide).
- **Custom Tool Creator**: Build and save on-the-fly custom electrical and civil symbols integrated into the live BOQ.

### 6. ISO 216 A4 Landscape PDF Export
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

1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and publish the site!

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.
