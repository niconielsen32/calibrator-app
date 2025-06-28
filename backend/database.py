from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
from config import DATABASE_URL

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True)
    images_dir = Column(String, nullable=False)  # Directory containing the calibration images
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    images = relationship("CalibrationImage", back_populates="session", cascade="all, delete-orphan")
    calibration_result = relationship("CalibrationResult", back_populates="session", uselist=False, cascade="all, delete-orphan")

class CalibrationImage(Base):
    __tablename__ = "calibration_images"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"))
    image_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="images")

class CalibrationResult(Base):
    __tablename__ = "calibration_results"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), unique=True)
    camera_matrix = Column(String, nullable=False)  # JSON string
    distortion_coefficients = Column(String, nullable=False)  # JSON string
    reprojection_error = Column(Float, nullable=False)
    pattern_type = Column(String, nullable=False)
    columns = Column(Integer, nullable=False)
    rows = Column(Integer, nullable=False)
    square_size = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="calibration_result")

class CalibrationParameters(Base):
    __tablename__ = "calibration_parameters"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), unique=True)
    
    # Calibration parameters
    calibration_type = Column(String, default="Single Camera")
    camera_model = Column(String, default="Standard")
    pattern_type = Column(String, default="Checkerboard")
    checkerboard_columns = Column(Integer, default=18)
    checkerboard_rows = Column(Integer, default=11)
    square_size = Column(Float, default=0.03)
    run_optimization = Column(Boolean, default=False)
    
    # Optional parameters for ChArUco
    marker_size = Column(Float, nullable=True)
    aruco_dict_name = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

# Create tables when this module is imported
create_tables() 