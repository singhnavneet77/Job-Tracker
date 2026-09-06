# JobBoard Pro

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

