import os
from dotenv import load_dotenv

# Load environment variables from .env file (optional in Docker/Railway)
load_dotenv()

# Prefer a full DATABASE_URL if provided (e.g., from Railway Postgres)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to SQLite file for zero-config deployments
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    SQLITE_PATH = os.path.join(BASE_DIR, "calibration.db")
    DATABASE_URL = f"sqlite:///{SQLITE_PATH}"

# API configuration
APP_NAME = "Camera Calibration API"
APP_VERSION = "0.1.0"
APP_DESCRIPTION = "API for camera calibration"

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "uploads")

# FastAPI app settings
APP_NAME = "Camera Calibration API"
APP_VERSION = "0.1.0"
APP_DESCRIPTION = "API for camera calibration"

class CalibrationSettings:
    DEFAULT_CALIBRATION_TYPE: str = "Single Camera"
    DEFAULT_CAMERA_MODEL: str = "Standard"
    DEFAULT_PATTERN_TYPE: str = "Checkerboard"
    DEFAULT_CHECKERBOARD_COLUMNS: int = 24
    DEFAULT_CHECKERBOARD_ROWS: int = 17
    DEFAULT_SQUARE_SIZE: float = 0.03
    DEFAULT_RUN_OPTIMIZATION: bool = True
    
    class Config:
        env_prefix = "CALIBRATION_"  # This means env vars should be like CALIBRATION_DEFAULT_SQUARE_SIZE

# Create a global settings instance
settings = CalibrationSettings() 
