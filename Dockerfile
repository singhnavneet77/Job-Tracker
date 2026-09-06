# Combined single-container build: frontend (static) + backend (API) served
# from ONE origin, ONE port. This is the easiest path for Hugging Face
# Spaces (Docker SDK) or any host that only wants to run one container —
# ideal for sharing a single URL with a small group of testers.
#
# If you'd rather deploy the frontend and backend separately (e.g. backend
# on a HF Space, frontend on Vercel), ignore this file and use
# backend/Dockerfile + frontend's own build step instead — see README.md.

# ---- Stage 1: build the frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Empty on purpose: "" means "same origin as the frontend" (see src/lib/api.js) —
# correct here since both are served from the same container/port.
ENV VITE_API_URL=""
RUN npm run build

# ---- Stage 2: backend + serve the built frontend ----
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /frontend/dist ./static_frontend

# Hugging Face Spaces (Docker SDK) expects the app on port 7860.
# Render/Railway/Fly inject their own $PORT — CMD below respects that too.
ENV PORT=7860
EXPOSE 7860

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
