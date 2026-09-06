# JobBoard Pro

A self-hosted job-application tracker — dark UI, login system, LinkedIn
profile optimizer, and a companion Chrome extension that fetches job postings
into your pipeline (or lets you add them manually) and autofills application
forms from one central profile.

## Architecture (v2 — frontend and backend fully separated)

```
job-tracker-pro/
├── backend/                  # FastAPI — pure JSON REST API, no HTML rendering
│   ├── main.py                # routes: auth, profile, applications (full CRUD), linkedin, extension
│   ├── models.py               # User, Profile, JobApplication (now includes `salary`)
│   ├── schemas.py               # Pydantic request/response models
│   ├── auth.py                   # JWT + bcrypt
│   ├── database.py                 # SQLAlchemy engine (SQLite by default, Postgres via DATABASE_URL)
│   ├── linkedin_optimizer.py         # rule-based LinkedIn scoring engine
│   ├── requirements.txt
│   ├── Dockerfile                     # backend-only image (for a separated deploy)
│   └── .env.example
├── frontend/                 # React (Vite) — a completely separate app, its own build/deploy
│   ├── src/
│   │   ├── lib/                # api.js (fetch client), AuthContext, ToastContext
│   │   ├── components/          # Sidebar, ProtectedLayout, JobCard, JobFormModal
│   │   └── pages/                 # Login, Signup, Board, Profile, LinkedIn
│   └── .env.example
├── extension/                # Manifest V3 Chrome extension
│   ├── popup.html/js/css       # login + fetch/manual capture + autofill, all editable before saving
│   ├── content.js               # job scraping (JSON-LD first) + form autofill
│   └── background.js             # right-click "capture job" context menu
└── Dockerfile                 # ROOT file: builds frontend + backend into ONE container (see Deployment)
```

The backend has zero knowledge of the frontend's existence — it's a plain
REST API. The frontend is a standalone Vite app that talks to it over HTTP,
configured entirely through one environment variable (`VITE_API_URL`). You
can run, build, version, and deploy them completely independently.

## What changed from v1 (the fixes you asked for)

- **Edit is now a first-class action everywhere.** Every job card in the
  board has a pencil (edit) and an X (delete) button — not just the status
  dropdown. Editing opens the same form used for adding a job, with every
  field (company, title, location, **salary — new field**, job URL, notes)
  open to change.
- **The extension no longer saves blind.** Both "Fetch job from this page"
  and the new "Add manually" button open an editable review screen —
  company/title/location/salary/URL — before anything is sent to your
  pipeline. You can correct a bad scrape or fill in a job by hand entirely
  from the popup.
- **Frontend and backend are separate codebases** you can deploy, scale, and
  redeploy independently (see below) — the backend never renders HTML.

## Run it locally

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Confirm it's up: `curl http://127.0.0.1:8000/health` should return `{"status":"ok",...}`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the URL Vite prints (typically http://localhost:5173). It talks to
`http://127.0.0.1:8000` by default — override with a `.env` file (see
`frontend/.env.example`) if your backend runs elsewhere.

### Extension
`chrome://extensions` -> enable Developer mode -> **Load unpacked** -> select
`extension/`. Open the popup -> set Server URL to your backend
(`http://127.0.0.1:8000` locally) -> sign in with the same account you made
in the web app.

---

## Deploying it — free, for ~10-20 testers

### Can you use Hugging Face Spaces? Yes.

Use the **Docker SDK** (not one of the ML-model templates) — Spaces will
happily run any container that listens on port 7860, which is exactly what
both Dockerfiles in this repo do. The one thing to know: **free-tier Spaces
don't guarantee persistent disk** across a rebuild/restart, so if you use
local SQLite, application data can reset when you push an update or the
Space restarts after inactivity. For a short test with 10-20 people this is
often fine; for anything you want to survive longer, point `DATABASE_URL` at
a free Postgres instance instead (Neon.tech's free tier needs no credit
card) — nothing in the code needs to change, `database.py` already reads
`DATABASE_URL` from the environment.

### Recommended: one combined Space (simplest — one URL, no CORS setup)

The root **`Dockerfile`** builds the frontend and copies it into the
backend's static folder, so the whole app — API and UI — runs from a single
container and a single URL.

1. Create a new Space at huggingface.co/new-space -> **Docker** SDK -> any
   visibility (public is easiest to share a link for testing).
2. Push this entire repo to that Space's git remote (Spaces are just git
   repos):
   ```bash
   git init
   git remote add space https://huggingface.co/spaces/<your-username>/<space-name>
   git add .
   git commit -m "Initial deploy"
   git push space main
   ```
3. In the Space's **Settings -> Variables and secrets**, add:
   - `JWT_SECRET` — any long random string
   - `DATABASE_URL` — a Neon/Supabase Postgres connection string (recommended); omit to use local SQLite
   - `CORS_ORIGINS` — you can leave this unset (defaults to `*`) since everything is same-origin here
4. The Space builds automatically. Once it's live, your app is at
   `https://<your-username>-<space-name>.hf.space` — share that one link
   with testers.
5. Point the Chrome extension's "Server URL" at that same `https://...hf.space` address.

### Alternative: fully separated deploy

If you'd rather scale or update the frontend and backend independently:

- **Backend -> Hugging Face Space (Docker SDK)**, but push only the
  `backend/` folder's contents as that Space's repo root (so it picks up
  `backend/Dockerfile` instead of the root one), or copy `backend/Dockerfile`
  to the repo root of a dedicated backend repo. Same env vars as above, plus
  set `CORS_ORIGINS` to your frontend's real deployed URL once you have it.
- **Frontend -> Vercel** (free tier, zero-config for Vite): import the
  `frontend/` folder as a project, set the environment variable
  `VITE_API_URL` to your backend Space's URL, deploy. Vercel gives you a free
  `https://your-app.vercel.app` URL automatically.
- Other equally-free options for the backend if you'd rather not use HF
  Spaces: **Render** (free web service tier, sleeps after 15 min idle) or
  **Railway** (free trial credit, not indefinite). Both support the same
  `backend/Dockerfile` as-is.

### A note on the extension for a 10-20 person test group

You don't need the Chrome Web Store for this. Zip the `extension/` folder
and share it — each tester loads it via `chrome://extensions` -> Developer
mode -> **Load unpacked**. Publishing to the Web Store (as unlisted/private,
if you want it later) costs a one-time $5 developer registration fee — skip
it for internal testing.

## Security notes before sharing a public URL

- Change `JWT_SECRET` from the default — the code intentionally ships a dev
  placeholder so it runs out of the box, but that value must not survive
  into anything with real users.
- CORS defaults to wide open (`*`) since the extension calls the API from
  whatever job site you're on. Tighten `CORS_ORIGINS` to your real frontend
  URL once you know it, if you're not using the combined single-container deploy.
- Passwords are hashed with `bcrypt` directly (not `passlib`, which has a
  known incompatibility with `bcrypt>=4.1` — see `backend/auth.py` for the
  fix if you're curious).

## Extraction strategy (why the extension generalizes beyond one site)

`content.js` tries three layers, in order, before handing the result to the
now-editable review form:
1. **JSON-LD `JobPosting` schema** — most modern job boards/ATS platforms
   (Greenhouse, Lever, Workable, most company career pages) embed this for
   Google Jobs SEO, including salary via `baseSalary` where present.
2. **Site-specific selectors** — a small fallback table for LinkedIn/Indeed/
   Greenhouse/Lever.
3. **Generic fallback** — `og:title` / `<h1>` / page `<title>`.

Whatever comes out of this pipeline lands in the editable review form —
nothing is ever saved without you seeing and being able to correct it first.

## Ideas for extending this further

- Swap the rule-based LinkedIn optimizer for an LLM rewrite pass (Gemini/
  OpenAI) for generated headline/About copy instead of a templated one.
- Add a resume-tailoring step that diffs a captured job description against
  `profile.resume_text` / `skills`.
- Add drag-and-drop between board columns instead of the status dropdown.
