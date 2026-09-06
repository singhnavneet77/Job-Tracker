# Hugging Face Spaces (Docker SDK) expects the app to listen on port 7860.
# Render/Railway/Fly inject their own $PORT — the CMD below respects that too.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=7860
EXPOSE 7860

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
