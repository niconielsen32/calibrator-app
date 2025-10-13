from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from typing import Optional

# Import routers
from .routers import upload, calibration

# Create FastAPI app
app = FastAPI(
    title="Camera Calibration API",
    description="API for camera calibration using OpenCV",
    version="0.1.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount uploads directory for serving files
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

# Include routers (mounted under /api)
app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(calibration.router, prefix="/api/v1/calibration", tags=["calibration"])

@app.get("/api")
async def api_root():
    return {
        "message": "Camera Calibration API is running",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }

# Optionally serve the built frontend if present
FRONTEND_DIST = os.getenv(
    "FRONTEND_DIST",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
)

if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
    # Serve static frontend at root path
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

    # SPA fallback: serve index.html for unknown paths (after API and docs routes)
    from starlette.responses import FileResponse
    from starlette.requests import Request

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str, request: Optional[Request] = None):
        index_path = os.path.join(FRONTEND_DIST, "index.html")
        # Do not hijack API/docs/openapi/static files
        if full_path.startswith("api/") or full_path in {"docs", "openapi.json", "redoc"}:
            return {"detail": "Not Found"}
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"detail": "Not Found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 
