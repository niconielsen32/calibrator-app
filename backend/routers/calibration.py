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
    marker_size: Optional[float] = None
    aruco_dict_name: Optional[str] = None

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
        mtx, dist, mean_error, rvecs, tvecs, imgpoints, objpoints, reprojection_errors, images_with_detections, image_detection_map = calibrate_camera(
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

        # Get image paths for per-image results and generate undistorted previews
        images = sorted(glob.glob(os.path.join(session.images_dir, '*')))
        per_image_results = []
        undistorted_previews = []

        for i, (img_path, error) in enumerate(zip(images, reprojection_errors)):
            # Get image from detection map
            detection_found = img_path in image_detection_map
            if detection_found:
                _, img_with_detections = image_detection_map[img_path]

                # Convert detection image to base64
                _, buffer = cv2.imencode('.jpg', img_with_detections)
                img_base64 = base64.b64encode(buffer).decode('utf-8')

                # Generate undistorted version for preview
                original_img = cv2.imread(img_path)
                if original_img is not None:
                    h, w = original_img.shape[:2]

                    # Get optimal camera matrix for undistortion
                    newcameramtx, roi = cv2.getOptimalNewCameraMatrix(mtx, dist, (w, h), 1, (w, h))

                    # Undistort image
                    undistorted = cv2.undistort(original_img, mtx, dist, None, newcameramtx)

                    # Crop to region of interest
                    x, y, w_roi, h_roi = roi
                    if h_roi > 0 and w_roi > 0:
                        undistorted_cropped = undistorted[y:y+h_roi, x:x+w_roi]
                    else:
                        undistorted_cropped = undistorted

                    # Convert undistorted to base64
                    _, undist_buffer = cv2.imencode('.jpg', undistorted_cropped)
                    undist_base64 = base64.b64encode(undist_buffer).decode('utf-8')

                    # Also convert original for comparison
                    _, orig_buffer = cv2.imencode('.jpg', original_img)
                    orig_base64 = base64.b64encode(orig_buffer).decode('utf-8')

                    undistorted_previews.append({
                        "image_index": i,
                        "image_name": os.path.basename(img_path),
                        "original_image": orig_base64,
                        "undistorted_image": undist_base64
                    })

                per_image_results.append({
                    "image_index": i,
                    "image_name": os.path.basename(img_path),
                    "reprojection_error": float(error),
                    "detection_image": img_base64,
                    "used_in_calibration": True
                })

        return {
            "status": "success",
            "results": {
                "camera_matrix": mtx.tolist(),
                "dist_coeffs": dist.tolist(),
                "reprojection_error": float(mean_error),
                "rotation_vectors": [r.tolist() for r in rvecs],
                "translation_vectors": [t.tolist() for t in tvecs],
                "num_images_calibrated": len(objpoints),
                "per_image_results": per_image_results,
                "reprojection_errors": [float(e) for e in reprojection_errors],
                "undistorted_previews": undistorted_previews,
                "checkerboard_rows": params.checkerboard_rows,
                "checkerboard_cols": params.checkerboard_columns,
                "square_size": params.square_size
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
        _, _, _, _, _, _, _, _, images_with_detections, image_detection_map = calibrate_camera(
            images_path=session.images_dir,
            checkerboard_size=(params.checkerboard_columns, params.checkerboard_rows),
            square_size=params.square_size,
            pattern_type=params.pattern_type,
            marker_size=params.marker_size,
            aruco_dict_name=params.aruco_dict_name,
            camera_model="Standard",  # Use standard for preview
            optimize=False  # No optimization needed for preview
        )

        # Convert images to base64 for response
        preview_results = []

        for img_path, (corners_found, preview_img) in image_detection_map.items():
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
