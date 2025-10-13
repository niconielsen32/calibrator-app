from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import cv2
import numpy as np
import json
import base64
import glob
import os
from datetime import datetime

from ..database import get_db, CalibrationResult, Session as DBSession
from ..utils.calibration import calibrate_camera

router = APIRouter()

class CalibrationRequest(BaseModel):
    calibration_type: str
    camera_model: str
    pattern_type: str
    checkerboard_columns: int
    checkerboard_rows: int
    square_size: float
    run_optimization: bool
    marker_size: Optional[float] = None
    aruco_dict_name: Optional[str] = None

class PreviewRequest(BaseModel):
    calibration_type: str
    pattern_type: str
    checkerboard_columns: int
    checkerboard_rows: int
    square_size: float

@router.post("/calibrate/{session_id}")
async def run_calibration(
    session_id: str,
    params: CalibrationRequest,
    db: Session = Depends(get_db)
):
    """
    Run camera calibration for a specific session using parameters from request body
    """
    # Get session from database
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.images_dir:
        raise HTTPException(status_code=400, detail="Session has no images directory")

    try:
        # Run calibration using the utility function
        mtx, dist, mean_error, rvecs, tvecs, imgpoints, objpoints, reprojection_errors, images_with_detections = calibrate_camera(
            images_path=session.images_dir,
            checkerboard_size=(params.checkerboard_columns, params.checkerboard_rows),
            square_size=params.square_size,
            pattern_type=params.pattern_type,
            marker_size=params.marker_size,
            aruco_dict_name=params.aruco_dict_name,
            camera_model=params.camera_model,
            optimize=params.run_optimization
        )
        
        if mtx is None:
            raise HTTPException(status_code=400, detail="Calibration failed - no valid calibration patterns found in images")
        
        # Save results to database
        calibration_result = CalibrationResult(
            session_id=session_id,
            camera_matrix=json.dumps(mtx.tolist()),
            distortion_coefficients=json.dumps(dist.tolist()),
            reprojection_error=float(mean_error),
            pattern_type=params.pattern_type,
            columns=params.checkerboard_columns,
            rows=params.checkerboard_rows,
            square_size=params.square_size
        )
        db.add(calibration_result)
        db.commit()
        
        return {
            "status": "success",
            "results": {
                "camera_matrix": mtx.tolist(),
                "dist_coeffs": dist.tolist(),
                "reprojection_error": float(mean_error),
                "rotation_vectors": [r.tolist() for r in rvecs],
                "translation_vectors": [t.tolist() for t in tvecs],
                "num_images_calibrated": len(objpoints)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{session_id}")
async def get_calibration_results(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Get calibration results for a specific session
    """
    result = db.query(CalibrationResult).filter(CalibrationResult.session_id == session_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Calibration results not found")
        
    return {
        "camera_matrix": json.loads(result.camera_matrix),
        "distortion_coefficients": json.loads(result.distortion_coefficients),
        "reprojection_error": result.reprojection_error,
        "created_at": result.created_at,
        "updated_at": result.updated_at
    }

@router.post("/preview/{session_id}")
async def preview_pattern_detection(
    session_id: str,
    params: PreviewRequest,
    db: Session = Depends(get_db)
):
    """
    Preview pattern detection for a specific session using parameters from request body
    """
    # Get session from database
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.images_dir:
        raise HTTPException(status_code=400, detail="Session has no images directory")

    try:
        # Run calibration with preview only
        _, _, _, _, _, _, _, _, images_with_detections = calibrate_camera(
            images_path=session.images_dir,
            checkerboard_size=(params.checkerboard_columns, params.checkerboard_rows),
            square_size=params.square_size,
            pattern_type=params.pattern_type,
            camera_model="Standard",  # Use standard for preview
            optimize=False  # No optimization needed for preview
        )
        
        if not images_with_detections:
            raise HTTPException(status_code=400, detail="No valid calibration patterns found in images")
        
        # Convert images to base64 for response
        preview_results = []
        images = sorted(glob.glob(os.path.join(session.images_dir, '*')))
        
        for i, img_path in enumerate(images):
            # Read original image
            img = cv2.imread(img_path)
            if img is None:
                continue
                
            # Check if pattern was detected for this image
            corners_found = i < len(images_with_detections)
            
            # Get the preview image (with corners if detected)
            preview_img = images_with_detections[i] if corners_found else img
            
            # Convert to base64
            _, buffer = cv2.imencode('.jpg', preview_img)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            preview_results.append({
                "image_path": img_path,
                "corners_found": corners_found,
                "preview_image": img_base64
            })
        
        return {
            "status": "success",
            "results": preview_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
