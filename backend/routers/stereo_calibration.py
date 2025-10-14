from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import cv2
import numpy as np
import json
import base64
import glob
import os
import uuid
import shutil
from datetime import datetime

from ..database import get_db, StereoCalibrationResult, Session as DBSession
from ..utils.calibration import calibrate_stereo_cameras

router = APIRouter()

class StereoCalibrationRequest(BaseModel):
    left_session_id: str
    right_session_id: str
    pattern_type: str
    checkerboard_columns: int
    checkerboard_rows: int
    square_size: float
    run_optimization: bool
    camera_model: str = "Standard"
    marker_size: Optional[float] = None
    aruco_dict_name: Optional[str] = None

@router.post("/calibrate")
async def run_stereo_calibration(
    params: StereoCalibrationRequest,
    db: Session = Depends(get_db)
):
    """
    Run stereo camera calibration using images from two sessions
    """
    # Get both sessions from database
    left_session = db.query(DBSession).filter(DBSession.id == params.left_session_id).first()
    right_session = db.query(DBSession).filter(DBSession.id == params.right_session_id).first()

    if not left_session or not right_session:
        raise HTTPException(status_code=404, detail="One or both sessions not found")

    if not left_session.images_dir or not right_session.images_dir:
        raise HTTPException(status_code=400, detail="Sessions missing images directory")

    try:
        # Run stereo calibration using the utility function
        result = calibrate_stereo_cameras(
            left_images_path=left_session.images_dir,
            right_images_path=right_session.images_dir,
            checkerboard_size=(params.checkerboard_columns, params.checkerboard_rows),
            square_size=params.square_size,
            pattern_type=params.pattern_type,
            marker_size=params.marker_size,
            aruco_dict_name=params.aruco_dict_name,
            camera_model=params.camera_model,
            optimize=params.run_optimization
        )

        # Unpack results
        (left_mtx, right_mtx, left_dist, right_dist, R, T, mean_error,
         reprojection_errors, left_images_with_detections, right_images_with_detections,
         left_rvecs, left_tvecs, right_rvecs, right_tvecs, objpoints) = result

        if left_mtx is None:
            raise HTTPException(
                status_code=400,
                detail="Stereo calibration failed - ensure both cameras see the calibration pattern"
            )

        # Calculate rectification parameters (also calculated in calibrate_stereo_cameras but we recalculate for E and F)
        left_images = glob.glob(os.path.join(left_session.images_dir, '*'))
        if left_images:
            sample_img = cv2.imread(left_images[0])
            img_shape = sample_img.shape[:2][::-1]  # (width, height)

            R1, R2, P1, P2, Q, validPixROI1, validPixROI2 = cv2.stereoRectify(
                left_mtx, left_dist, right_mtx, right_dist, img_shape, R, T
            )

            # Calculate essential and fundamental matrices
            E, _ = cv2.findEssentialMat(
                np.vstack([pts.reshape(-1, 2) for pts in left_imgpoints]),
                np.vstack([pts.reshape(-1, 2) for pts in right_imgpoints]),
                left_mtx,
                method=cv2.RANSAC,
                prob=0.999,
                threshold=1.0
            )
            F, _ = cv2.findFundamentalMat(
                np.vstack([pts.reshape(-1, 2) for pts in left_imgpoints]),
                np.vstack([pts.reshape(-1, 2) for pts in right_imgpoints]),
                method=cv2.FM_RANSAC
            )

            # Handle None returns
            if E is None:
                E = np.zeros((3, 3))
            if F is None:
                F = np.zeros((3, 3))

            # Save results to database
            stereo_result = StereoCalibrationResult(
                session_id=f"stereo_{params.left_session_id}_{params.right_session_id}",
                left_camera_matrix=json.dumps(left_mtx.tolist()),
                left_distortion_coefficients=json.dumps(left_dist.tolist()),
                right_camera_matrix=json.dumps(right_mtx.tolist()),
                right_distortion_coefficients=json.dumps(right_dist.tolist()),
                rotation_matrix=json.dumps(R.tolist()),
                translation_vector=json.dumps(T.tolist()),
                essential_matrix=json.dumps(E.tolist()),
                fundamental_matrix=json.dumps(F.tolist()),
                rectification_matrix_left=json.dumps(R1.tolist()),
                rectification_matrix_right=json.dumps(R2.tolist()),
                projection_matrix_left=json.dumps(P1.tolist()),
                projection_matrix_right=json.dumps(P2.tolist()),
                disparity_to_depth_mapping=json.dumps(Q.tolist()),
                reprojection_error=float(mean_error),
                pattern_type=params.pattern_type,
                columns=params.checkerboard_columns,
                rows=params.checkerboard_rows,
                square_size=params.square_size
            )

            # Check if result already exists and update or create
            existing = db.query(StereoCalibrationResult).filter(
                StereoCalibrationResult.session_id == stereo_result.session_id
            ).first()

            if existing:
                # Update existing
                for key, value in stereo_result.__dict__.items():
                    if key != '_sa_instance_state' and key != 'id':
                        setattr(existing, key, value)
                existing.updated_at = datetime.utcnow()
            else:
                db.add(stereo_result)

            db.commit()

            # Generate rectified image previews
            rectified_previews = []
            left_images_list = sorted(glob.glob(os.path.join(left_session.images_dir, '*')))
            right_images_list = sorted(glob.glob(os.path.join(right_session.images_dir, '*')))

            # Generate preview for first image pair
            if left_images_list and right_images_list:
                left_img = cv2.imread(left_images_list[0])
                right_img = cv2.imread(right_images_list[0])

                if left_img is not None and right_img is not None:
                    # Compute rectification maps
                    h, w = left_img.shape[:2]
                    map1_left, map2_left = cv2.initUndistortRectifyMap(
                        left_mtx, left_dist, R1, P1, (w, h), cv2.CV_32FC1
                    )
                    map1_right, map2_right = cv2.initUndistortRectifyMap(
                        right_mtx, right_dist, R2, P2, (w, h), cv2.CV_32FC1
                    )

                    # Rectify images
                    rectified_left = cv2.remap(left_img, map1_left, map2_left, cv2.INTER_LINEAR)
                    rectified_right = cv2.remap(right_img, map1_right, map2_right, cv2.INTER_LINEAR)

                    # Draw horizontal lines for epipolar line visualization
                    for i in range(0, h, 30):
                        cv2.line(rectified_left, (0, i), (w, i), (0, 255, 0), 1)
                        cv2.line(rectified_right, (0, i), (w, i), (0, 255, 0), 1)

                    # Convert to base64
                    _, buffer_left = cv2.imencode('.jpg', rectified_left)
                    _, buffer_right = cv2.imencode('.jpg', rectified_right)
                    left_base64 = base64.b64encode(buffer_left).decode('utf-8')
                    right_base64 = base64.b64encode(buffer_right).decode('utf-8')

                    rectified_previews.append({
                        "left_rectified": left_base64,
                        "right_rectified": right_base64,
                        "image_index": 0
                    })

            return {
                "status": "success",
                "results": {
                    "left_camera_matrix": left_mtx.tolist(),
                    "left_dist_coeffs": left_dist.tolist(),
                    "right_camera_matrix": right_mtx.tolist(),
                    "right_dist_coeffs": right_dist.tolist(),
                    "rotation_matrix": R.tolist(),
                    "translation_vector": T.tolist(),
                    "rectification_matrix_left": R1.tolist(),
                    "rectification_matrix_right": R2.tolist(),
                    "projection_matrix_left": P1.tolist(),
                    "projection_matrix_right": P2.tolist(),
                    "disparity_to_depth_mapping": Q.tolist(),
                    "reprojection_error": float(mean_error),
                    "rectified_previews": rectified_previews,
                    "baseline": float(np.linalg.norm(T)),  # Distance between cameras
                    "checkerboard_rows": params.checkerboard_rows,
                    "checkerboard_cols": params.checkerboard_columns,
                    "square_size": params.square_size
                }
            }
        else:
            raise HTTPException(status_code=400, detail="No images found in left session")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{left_session_id}/{right_session_id}")
async def get_stereo_calibration_results(
    left_session_id: str,
    right_session_id: str,
    db: Session = Depends(get_db)
):
    """
    Get stereo calibration results for a pair of sessions
    """
    session_id = f"stereo_{left_session_id}_{right_session_id}"
    result = db.query(StereoCalibrationResult).filter(
        StereoCalibrationResult.session_id == session_id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Stereo calibration results not found")

    return {
        "left_camera_matrix": json.loads(result.left_camera_matrix),
        "left_distortion_coefficients": json.loads(result.left_distortion_coefficients),
        "right_camera_matrix": json.loads(result.right_camera_matrix),
        "right_distortion_coefficients": json.loads(result.right_distortion_coefficients),
        "rotation_matrix": json.loads(result.rotation_matrix),
        "translation_vector": json.loads(result.translation_vector),
        "essential_matrix": json.loads(result.essential_matrix),
        "fundamental_matrix": json.loads(result.fundamental_matrix),
        "rectification_matrix_left": json.loads(result.rectification_matrix_left),
        "rectification_matrix_right": json.loads(result.rectification_matrix_right),
        "projection_matrix_left": json.loads(result.projection_matrix_left),
        "projection_matrix_right": json.loads(result.projection_matrix_right),
        "disparity_to_depth_mapping": json.loads(result.disparity_to_depth_mapping),
        "reprojection_error": result.reprojection_error,
        "created_at": result.created_at,
        "updated_at": result.updated_at
    }
