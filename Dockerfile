# Multi-stage build: frontend (Vite) + backend (FastAPI)

# ---------- Frontend build ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Build arg for API URL (injected at build time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Install deps
COPY frontend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy rest of frontend and build
COPY frontend/ ./
RUN npm run build

# ---------- Backend runtime ----------
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps required by OpenCV and friends
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ backend/

# Copy frontend build artifacts
COPY --from=frontend-builder /app/frontend/dist frontend/dist

# Let backend know where the built frontend lives
ENV FRONTEND_DIST=/app/frontend/dist

EXPOSE 8000

# Use $PORT if provided by the platform (e.g., Railway)
ENV PORT=8000
CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
