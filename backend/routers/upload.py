from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
from typing import List

from ..database import get_db, CalibrationImage, Session as DbSession

router = APIRouter()

@router.post("/")
async def upload_images(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload multiple images and create a new calibration session.
    Returns the session ID for subsequent calibration.
    """
    # Create new session
    session_id = str(uuid.uuid4())
    session_dir = os.path.join("uploads", session_id)
    
    # Create session with images_dir
    session = DbSession(
        id=session_id,
        images_dir=session_dir
    )
    db.add(session)
    
    try:
        # Commit session first to ensure it exists
        db.commit()
        
        # Create directory for session if it doesn't exist
        os.makedirs(session_dir, exist_ok=True)
        
        saved_paths = []
        try:
            for file in files:
                # Save file
                file_path = os.path.join(session_dir, file.filename)
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                    
                # Save to database
                db_image = CalibrationImage(
                    session_id=session_id,
                    image_path=file_path
                )
                db.add(db_image)
                saved_paths.append(file_path)
            
            # Commit image records
            db.commit()
            
            return {
                "message": f"Successfully uploaded {len(saved_paths)} images",
                "session_id": session_id,
                "image_paths": saved_paths
            }
            
        except Exception as e:
            db.rollback()
            # Clean up saved files
            for path in saved_paths:
                if os.path.exists(path):
                    os.remove(path)
            if os.path.exists(session_dir):
                os.rmdir(session_dir)
            raise HTTPException(status_code=400, detail=str(e))
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/images/{session_id}")
async def get_session_images(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get all images associated with a session"""
    images = db.query(CalibrationImage).filter(
        CalibrationImage.session_id == session_id
    ).all()

    if not images:
        raise HTTPException(status_code=404, detail="No images found for this session")

    return {
        "session_id": session_id,
        "images": [{"path": img.image_path} for img in images]
    }

@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Delete a session and all associated images"""
    import shutil

    # Get session from database
    session = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete physical files
    if session.images_dir and os.path.exists(session.images_dir):
        try:
            shutil.rmtree(session.images_dir)
        except Exception as e:
            print(f"Error deleting directory {session.images_dir}: {e}")

    # Delete from database (cascade will handle related records)
    db.delete(session)
    db.commit()

    return {"message": f"Session {session_id} and all associated data deleted successfully"}

@router.post("/cleanup")
async def trigger_cleanup(
    hours_old: int = 24,
    db: Session = Depends(get_db)
):
    """
    Manually trigger cleanup of old sessions.

    Args:
        hours_old: Delete sessions older than this many hours (default 24)
    """
    from ..utils.cleanup import cleanup_old_sessions, cleanup_orphaned_files

    deleted_sessions = cleanup_old_sessions(hours_old)
    deleted_orphaned = cleanup_orphaned_files()

    return {
        "message": "Cleanup completed successfully",
        "deleted_sessions": deleted_sessions,
        "deleted_orphaned_directories": deleted_orphaned
    } 
