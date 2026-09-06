from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
import pathlib

import models, schemas
from database import engine, get_db, Base
from auth import hash_password, verify_password, create_access_token, get_current_user
from linkedin_optimizer import analyze_profile

Base.metadata.create_all(bind=engine)

app = FastAPI(title="JobBoard Pro API", version="2.0.0")

# CORS: the frontend (a separate deployed app) and the Chrome extension both
# call this API cross-origin, so allow_origins is wide open by default.
# Set CORS_ORIGINS as a comma-separated list in production to lock this down,
# e.g. "https://jobboardpro.vercel.app,chrome-extension://<your-ext-id>".
allowed_origins = os.getenv("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allowed_origins == "*" else allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "jobboard-pro-api"}


# ============================================================
# AUTH
# ============================================================
@app.post("/auth/signup", response_model=schemas.Token, tags=["auth"])
def signup(payload: schemas.SignupIn, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "An account with this email already exists.")
    user = models.User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = models.Profile(user_id=user.id, full_name=payload.full_name or "", email=payload.email)
    db.add(profile)
    db.commit()

    token = create_access_token(user.email)
    return schemas.Token(access_token=token)


@app.post("/auth/login", response_model=schemas.Token, tags=["auth"])
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password.")
    token = create_access_token(user.email)
    return schemas.Token(access_token=token)


@app.get("/auth/me", response_model=schemas.UserOut, tags=["auth"])
def me(user: models.User = Depends(get_current_user)):
    return user


# ============================================================
# PROFILE  (the "main profile" the extension reads from)
# ============================================================
@app.get("/profile", response_model=schemas.ProfileOut, tags=["profile"])
def get_profile(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    profile = db.query(models.Profile).filter(models.Profile.user_id == user.id).first()
    if not profile:
        profile = models.Profile(user_id=user.id, email=user.email)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@app.put("/profile", response_model=schemas.ProfileOut, tags=["profile"])
def update_profile(payload: schemas.ProfileIn, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    profile = db.query(models.Profile).filter(models.Profile.user_id == user.id).first()
    if not profile:
        profile = models.Profile(user_id=user.id)
        db.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


# ============================================================
# JOB APPLICATIONS  (full CRUD — edit is a first-class operation,
# not just a status-change dropdown)
# ============================================================
@app.get("/applications", response_model=list[schemas.JobApplicationOut], tags=["applications"])
def list_applications(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.JobApplication)
        .filter(models.JobApplication.user_id == user.id)
        .order_by(models.JobApplication.created_at.desc())
        .all()
    )


@app.get("/applications/{app_id}", response_model=schemas.JobApplicationOut, tags=["applications"])
def get_application(app_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    row = db.query(models.JobApplication).filter(
        models.JobApplication.id == app_id, models.JobApplication.user_id == user.id
    ).first()
    if not row:
        raise HTTPException(404, "Application not found.")
    return row


@app.post("/applications", response_model=schemas.JobApplicationOut, tags=["applications"])
def create_application(payload: schemas.JobApplicationIn, db: Session = Depends(get_db),
                        user: models.User = Depends(get_current_user)):
    """Used by both the web app's 'Add application' form and the Chrome
    extension (after the user reviews/edits the scraped fields in the popup)."""
    app_row = models.JobApplication(user_id=user.id, **payload.model_dump())
    db.add(app_row)
    db.commit()
    db.refresh(app_row)
    return app_row


@app.put("/applications/{app_id}", response_model=schemas.JobApplicationOut, tags=["applications"])
def update_application(app_id: int, payload: schemas.JobApplicationUpdate,
                        db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Partial update — used for both the board's status-change dropdown
    AND the full edit modal (company/title/location/salary/etc)."""
    row = db.query(models.JobApplication).filter(
        models.JobApplication.id == app_id, models.JobApplication.user_id == user.id
    ).first()
    if not row:
        raise HTTPException(404, "Application not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/applications/{app_id}", tags=["applications"])
def delete_application(app_id: int, db: Session = Depends(get_db),
                        user: models.User = Depends(get_current_user)):
    row = db.query(models.JobApplication).filter(
        models.JobApplication.id == app_id, models.JobApplication.user_id == user.id
    ).first()
    if not row:
        raise HTTPException(404, "Application not found.")
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.get("/stats", tags=["applications"])
def stats(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    rows = db.query(
        models.JobApplication.status, func.count(models.JobApplication.id)
    ).filter(models.JobApplication.user_id == user.id).group_by(models.JobApplication.status).all()
    counts = {s.value: 0 for s in models.ApplicationStatus}
    for status_val, count in rows:
        counts[status_val.value if hasattr(status_val, "value") else status_val] = count
    counts["total"] = sum(counts.values())
    return counts


# ============================================================
# LINKEDIN OPTIMIZER
# ============================================================
@app.post("/linkedin/optimize", response_model=schemas.LinkedInReport, tags=["linkedin"])
def linkedin_optimize(payload: schemas.LinkedInInput, user: models.User = Depends(get_current_user)):
    return analyze_profile(payload)


# ============================================================
# EXTENSION HELPER — token check used by the popup on load
# ============================================================
@app.get("/extension/ping", tags=["extension"])
def extension_ping(user: models.User = Depends(get_current_user)):
    return {"ok": True, "email": user.email}


# ============================================================
# OPTIONAL: serve a built frontend from the same origin.
#
# Only activates if backend/static_frontend/ exists (put there by the
# root Dockerfile's multi-stage build — see repo root Dockerfile). Local
# dev and any separately-deployed frontend (Vercel/Netlify) are completely
# unaffected: this block is a no-op unless that folder is present. Must
# stay LAST so it never shadows the API routes registered above.
# ============================================================
_FRONTEND_DIST = pathlib.Path(__file__).parent / "static_frontend"
if _FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        return FileResponse(_FRONTEND_DIST / "index.html")
else:
    @app.get("/", tags=["health"], include_in_schema=False)
    def root():
        return {"status": "ok", "service": "jobboard-pro-api", "note": "API-only deployment — frontend is served separately."}
