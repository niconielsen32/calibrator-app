import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "calibrator")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")

# Construct database URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

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