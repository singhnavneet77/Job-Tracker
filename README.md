# JobBoard Pro / Job-Tracker

JobBoard Pro (aka Job-Tracker) is a compact full-stack project that helps you capture job postings from the web into a personal pipeline and autofill application forms from a saved user profile. It contains:

- A backend API built with FastAPI (auth, profile, applications, simple LinkedIn scoring).
- A React frontend (Vite) intended as a single-page app.
- A Chrome extension (Manifest V3) to extract job details and autofill application forms.
- A Dockerfile that can build the frontend and run the backend in a single container for easy hosting.

This README shows how the pieces fit together and how to run the system locally or in Docker.

---

## Table of contents

- Features
- Repository layout
- Quick start
- Local development
  - Backend
  - Frontend
  - Browser extension
- Docker (single-container) build & run
- Extension ↔ API interactions
- Troubleshooting & testing
- Contributing
- License

---

## Features

- Job extraction using JSON-LD (primary) with supplemental site rules for common boards.
- One-click capture from the extension popup or a right-click context menu.
- Save jobs/applications to your pipeline via API (/applications).
- Autofill public application forms with your saved profile using heuristic field matching.
- Minimal service worker (background.js) for context menu actions and small UX affordances.

---

## Repository layout

- `backend/` — FastAPI server: endpoints for auth, profile, applications, and other server logic. Uses SQLAlchemy and Pydantic.
- `frontend/` — Vite + React single-page app (client). Includes API client code and UI components.
- `extension/` — Chrome extension (Manifest V3):
  - `popup.html`, `popup.js`, `popup.css` — extension popup UI and logic.
  - `content.js` — content script injected into pages; exposes two functions to pages:
    - `window.__jbpExtractJob__()` — returns job data: { title, company, location, salary, description }
    - `window.__jbpAutofill__(profile)` — autofills inputs and returns { filled: number }
  - `background.js` — service worker for context menu capture.
- `Dockerfile` — builds the frontend, installs backend deps, and runs the API serving the built static frontend.

---

## Quick start (recommended)

1. Backend and extension only (fastest): run the backend locally and load the extension unpacked.

2. Full local dev: run backend and frontend separately during development.

3. Single-container: build the Docker image that bundles frontend + backend.

---

## Local development

### Backend

Requirements: Python 3.11+ (the Dockerfile uses 3.12-slim).

1. Create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

2. Run the app with Uvicorn (reload for development):

   ```bash
   cd backend
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

3. By default the API is available at http://127.0.0.1:8000.

Notes:
- The extension expects API endpoints such as `/auth/login`, `/extension/ping`, `/applications`, and `/profile`. Ensure these routes exist and authentication uses the same Bearer token flow the extension expects.
- Configure DATABASE_URL or `.env` in the backend if you want a DB other than SQLite.

### Frontend

Requirements: Node 18+ / npm.

1. Install and run dev server:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

2. Build for production (used by the Dockerfile):

   ```bash
   npm run build
   ```

The frontend communicates with the backend via the API client. The Docker single-container setup serves the built frontend from the backend under the same origin.

### Browser extension (development)

1. Open Chrome (or a Chromium-based browser) and go to chrome://extensions.
2. Enable "Developer mode" and click "Load unpacked".
3. Select the `extension/` directory from this repository.

Extension notes:
- Use the popup to set `serverUrl` (default `http://127.0.0.1:8000`) and sign in.
- The extension stores `token`, `email`, and `serverUrl` in chrome.storage.local.
- Popup actions:
  - Sign in (POST /auth/login) to obtain an access token.
  - Fetch job — runs `__jbpExtractJob__()` in the active tab and opens the review view to save to `/applications`.
  - Autofill — loads profile from `/profile` and runs `__jbpAutofill__(profile)` in the active tab.
- Context menu capture is provided via the background service worker: right-click -> "Capture this job to JobBoard Pro".

Permissions in `manifest.json` include `storage`, `activeTab`, `scripting`, `contextMenus` and `host_permissions` for localhost and `<all_urls>` (for extraction/autofill testing). Adjust these before publishing.

---

## Docker (single-container)

A Dockerfile is included to build the frontend and then run the backend with the built assets available in `static_frontend`.

Build and run:

```bash
# build
docker build -t job-tracker:latest .

# run (example mapping port 8000 on host)
docker run -e PORT=8000 -p 8000:8000 job-tracker:latest
```

Notes:
- The Dockerfile exposes port 7860 by default to support specific hosts, but the container's CMD respects the `PORT` env var.
- If you prefer separate deployments, build and deploy the frontend and backend independently (frontend to Vercel/Netlify, backend to your cloud host).

---

## Extension ↔ API interactions (endpoints used by the extension)

- POST /auth/login -> receives { email, password }, returns { access_token }.
- GET /extension/ping -> protected endpoint that validates the access token.
- POST /applications -> create a new application record. The extension POSTs job details (company, title, location, salary, job_url, source: "extension", status: "saved").
- GET /profile -> returns profile JSON that the content script uses to autofill forms.

Make sure CORS and host permissions allow the extension to reach the API (the extension itself uses host_permissions in the manifest). When using a remote backend, set `serverUrl` in the extension popup to the correct host.

---

## Troubleshooting & testing

- Check the extension popup console: go to chrome://extensions -> Inspect views for the popup to see errors printed by `popup.js`.
- Background/service worker logs can also be viewed via the extension page.
- When extraction fails on a page, open the page console and try `window.__jbpExtractJob__()` to see what the content script provides.
- The extractor prioritizes JSON-LD script[type="application/ld+json"] with `JobPosting`, then site-specific selectors, then a simple generic fallback.
- The autofill uses heuristics matching input `name`, `id`, `placeholder`, `aria-label`, and associated `label` text. It uses native setters and dispatches input/change events so React/Vue inputs are notified.

---

## Contributing

Contributions are welcome. Suggested improvements:

- Expand site rules and JSON-LD handling for more job boards.
- Improve autofill to support file uploads (resume) and multi-step forms.
- Add tests for backend endpoints and content script behaviors.

Create a branch, open a PR, and include a short testing guide in your PR description.

