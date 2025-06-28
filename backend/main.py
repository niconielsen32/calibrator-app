from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Import routers
from routers import upload, calibration

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

# Include routers
app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(calibration.router, prefix="/api/v1/calibration", tags=["calibration"])

@app.get("/")
async def root():
    return {
        "message": "Camera Calibration API is running",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 