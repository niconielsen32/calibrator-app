from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
import cv2
import numpy as np
import json
import glob
import os
from datetime import datetime

from ..database import get_db, CalibrationQualityMetrics, Session as DBSession
from ..utils.calibration import calibrate_camera

router = APIRouter()

class QualityAnalysisRequest(BaseModel):
    session_id: str
    pattern_type: str
    checkerboard_columns: int
    checkerboard_rows: int
    square_size: float
    marker_size: float | None = None
    aruco_dict_name: str | None = None

def analyze_coverage(imgpoints, image_shape):
    """
    Analyze how well the calibration pattern covers different regions of the image
    """
    h, w = image_shape

    # Define regions
    center_region = (w*0.25, h*0.25, w*0.75, h*0.75)

    # Corners
    corner_regions = [
        (0, 0, w*0.3, h*0.3),  # Top-left
        (w*0.7, 0, w, h*0.3),  # Top-right
        (0, h*0.7, w*0.3, h),  # Bottom-left
        (w*0.7, h*0.7, w, h)   # Bottom-right
    ]

    # Edges
    edge_regions = [
        (w*0.3, 0, w*0.7, h*0.2),  # Top edge
        (w*0.3, h*0.8, w*0.7, h),  # Bottom edge
        (0, h*0.3, w*0.2, h*0.7),  # Left edge
        (w*0.8, h*0.3, w, h*0.7)   # Right edge
    ]

    center_coverage = 0
    corner_coverage = 0
    edge_coverage = 0

    # Flatten all image points
    all_points = np.vstack([pts.reshape(-1, 2) for pts in imgpoints])

    # Count points in each region
    for point in all_points:
        x, y = point

        # Check center
        if center_region[0] <= x <= center_region[2] and center_region[1] <= y <= center_region[3]:
            center_coverage += 1

        # Check corners
        for corner in corner_regions:
            if corner[0] <= x <= corner[2] and corner[1] <= y <= corner[3]:
                corner_coverage += 1
                break

        # Check edges
        for edge in edge_regions:
            if edge[0] <= x <= edge[2] and edge[1] <= y <= edge[3]:
                edge_coverage += 1
                break

    total_points = len(all_points)

    return {
        "center_coverage": center_coverage / total_points if total_points > 0 else 0,
        "corner_coverage": corner_coverage / total_points if total_points > 0 else 0,
        "edge_coverage": edge_coverage / total_points if total_points > 0 else 0,
        "coverage_score": (center_coverage + corner_coverage + edge_coverage) / (3 * total_points) if total_points > 0 else 0
    }

def analyze_pose_diversity(rvecs, tvecs):
    """
    Analyze the diversity of camera poses (rotation and translation)
    """
    if not rvecs or not tvecs:
        return {
            "pose_diversity_score": 0,
            "angle_diversity": 0,
            "distance_diversity": 0
        }

    # Convert rotation vectors to angles
    angles = []
    for rvec in rvecs:
        angle = np.linalg.norm(rvec)
        angles.append(angle)

    # Calculate angle diversity (standard deviation normalized)
    angle_std = np.std(angles) if len(angles) > 1 else 0
    angle_diversity = min(angle_std / np.pi, 1.0)  # Normalize to 0-1

    # Calculate distance diversity
    distances = [np.linalg.norm(tvec) for tvec in tvecs]
    distance_std = np.std(distances) if len(distances) > 1 else 0
    distance_mean = np.mean(distances) if distances else 1
    distance_diversity = min(distance_std / distance_mean, 1.0) if distance_mean > 0 else 0

    # Combined pose diversity score
    pose_diversity_score = (angle_diversity + distance_diversity) / 2

    return {
        "pose_diversity_score": float(pose_diversity_score),
        "angle_diversity": float(angle_diversity),
        "distance_diversity": float(distance_diversity)
    }

def generate_recommendations(coverage, pose_diversity, num_images):
    """
    Generate actionable recommendations based on quality metrics
    """
    recommendations = []

    # Coverage recommendations
    if coverage["center_coverage"] < 0.3:
        recommendations.append({
            "priority": "high",
            "category": "coverage",
            "message": "Capture more images with the calibration pattern in the center of the frame",
            "details": "Center coverage is low. This can affect the accuracy of the principal point estimation."
        })

    if coverage["corner_coverage"] < 0.2:
        recommendations.append({
            "priority": "high",
            "category": "coverage",
            "message": "Capture images with the pattern near the corners of the frame",
            "details": "Corner coverage is critical for accurate distortion modeling, especially for fisheye lenses."
        })

    if coverage["edge_coverage"] < 0.2:
        recommendations.append({
            "priority": "medium",
            "category": "coverage",
            "message": "Capture images with the pattern near the edges of the frame",
            "details": "Edge coverage helps improve distortion coefficient estimation."
        })

    # Pose diversity recommendations
    if pose_diversity["angle_diversity"] < 0.3:
        recommendations.append({
            "priority": "high",
            "category": "pose_diversity",
            "message": "Capture images from more varied angles",
            "details": "Try tilting the camera or pattern at different angles (pitch, yaw, roll) to improve calibration accuracy."
        })

    if pose_diversity["distance_diversity"] < 0.2:
        recommendations.append({
            "priority": "medium",
            "category": "pose_diversity",
            "message": "Vary the distance between camera and calibration pattern",
            "details": "Capture images at different distances (closer and farther) to improve depth estimation accuracy."
        })

    # Number of images recommendation
    if num_images < 15:
        recommendations.append({
            "priority": "high",
            "category": "quantity",
            "message": f"Capture more images (current: {num_images}, recommended: 20-30)",
            "details": "More images generally lead to better calibration results, especially with varied poses."
        })
    elif num_images > 50:
        recommendations.append({
            "priority": "low",
            "category": "quantity",
            "message": f"You have many images ({num_images}), consider removing low-quality ones",
            "details": "Too many images can slow down calibration. Focus on quality over quantity."
        })

    # Overall quality assessment
    overall_score = (
        coverage["coverage_score"] * 0.5 +
        pose_diversity["pose_diversity_score"] * 0.3 +
        min(num_images / 25, 1.0) * 0.2
    )

    if overall_score >= 0.8:
        recommendations.append({
            "priority": "info",
            "category": "overall",
            "message": "Excellent calibration dataset! You're ready to proceed",
            "details": f"Overall quality score: {overall_score:.2f}/1.00"
        })
    elif overall_score >= 0.6:
        recommendations.append({
            "priority": "info",
            "category": "overall",
            "message": "Good calibration dataset. Consider the suggestions above for optimal results",
            "details": f"Overall quality score: {overall_score:.2f}/1.00"
        })
    else:
        recommendations.append({
            "priority": "warning",
            "category": "overall",
            "message": "Calibration dataset needs improvement",
            "details": f"Overall quality score: {overall_score:.2f}/1.00. Follow the recommendations above."
        })

    return recommendations

def create_coverage_heatmap(imgpoints, image_shape):
    """
    Create a heatmap showing where calibration points are concentrated
    """
    h, w = image_shape
    heatmap = np.zeros((h, w), dtype=np.float32)

    # Flatten all image points
    all_points = np.vstack([pts.reshape(-1, 2) for pts in imgpoints])

    # Create heatmap using Gaussian blobs
    sigma = min(h, w) * 0.05  # 5% of image dimension

    for point in all_points:
        x, y = int(point[0]), int(point[1])
        if 0 <= x < w and 0 <= y < h:
            # Create Gaussian blob
            y_grid, x_grid = np.ogrid[-y:h-y, -x:w-x]
            gaussian = np.exp(-(x_grid*x_grid + y_grid*y_grid) / (2 * sigma * sigma))
            heatmap += gaussian

    # Normalize heatmap
    if heatmap.max() > 0:
        heatmap = heatmap / heatmap.max()

    # Convert to grid format for frontend (downsampled for performance)
    grid_size = 20
    h_step = h // grid_size
    w_step = w // grid_size

    heatmap_grid = []
    for i in range(grid_size):
        row = []
        for j in range(grid_size):
            y_start, y_end = i * h_step, (i + 1) * h_step
            x_start, x_end = j * w_step, (j + 1) * w_step
            cell_value = heatmap[y_start:y_end, x_start:x_end].mean()
            row.append(float(cell_value))
        heatmap_grid.append(row)

    return heatmap_grid

@router.post("/analyze/{session_id}")
async def analyze_calibration_quality(
    session_id: str,
    params: QualityAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze calibration quality for a session and provide recommendations
    """
    # Get session from database
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.images_dir:
        raise HTTPException(status_code=400, detail="Session has no images directory")

    try:
        # Run calibration to get data for analysis
        mtx, dist, mean_error, rvecs, tvecs, imgpoints, objpoints, reprojection_errors, _, _ = calibrate_camera(
            images_path=session.images_dir,
            checkerboard_size=(params.checkerboard_columns, params.checkerboard_rows),
            square_size=params.square_size,
            pattern_type=params.pattern_type,
            marker_size=params.marker_size,
            aruco_dict_name=params.aruco_dict_name,
            camera_model="Standard",
            optimize=False
        )

        if mtx is None or not imgpoints:
            raise HTTPException(
                status_code=400,
                detail="Cannot analyze quality - no valid calibration patterns detected"
            )

        # Get image shape
        images = glob.glob(os.path.join(session.images_dir, '*'))
        if not images:
            raise HTTPException(status_code=400, detail="No images found")

        sample_img = cv2.imread(images[0])
        image_shape = sample_img.shape[:2]

        # Analyze coverage
        coverage = analyze_coverage(imgpoints, image_shape)

        # Analyze pose diversity
        pose_diversity = analyze_pose_diversity(rvecs, tvecs)

        # Generate recommendations
        recommendations = generate_recommendations(coverage, pose_diversity, len(imgpoints))

        # Create coverage heatmap
        heatmap_grid = create_coverage_heatmap(imgpoints, image_shape)

        # Save metrics to database
        quality_metrics = CalibrationQualityMetrics(
            session_id=session_id,
            coverage_score=coverage["coverage_score"],
            center_coverage=coverage["center_coverage"],
            corner_coverage=coverage["corner_coverage"],
            edge_coverage=coverage["edge_coverage"],
            pose_diversity_score=pose_diversity["pose_diversity_score"],
            angle_diversity=pose_diversity["angle_diversity"],
            distance_diversity=pose_diversity["distance_diversity"],
            recommendations=json.dumps(recommendations)
        )

        # Check if metrics already exist and update or create
        existing = db.query(CalibrationQualityMetrics).filter(
            CalibrationQualityMetrics.session_id == session_id
        ).first()

        if existing:
            for key, value in quality_metrics.__dict__.items():
                if key != '_sa_instance_state' and key != 'id':
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
        else:
            db.add(quality_metrics)

        db.commit()

        return {
            "status": "success",
            "metrics": {
                "coverage": coverage,
                "pose_diversity": pose_diversity,
                "num_images": len(imgpoints),
                "reprojection_error": float(mean_error)
            },
            "heatmap": heatmap_grid,
            "recommendations": recommendations
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/{session_id}")
async def get_quality_metrics(session_id: str, db: Session = Depends(get_db)):
    """
    Get saved quality metrics for a session
    """
    metrics = db.query(CalibrationQualityMetrics).filter(
        CalibrationQualityMetrics.session_id == session_id
    ).first()

    if not metrics:
        raise HTTPException(status_code=404, detail="Quality metrics not found")

    return {
        "coverage_score": metrics.coverage_score,
        "center_coverage": metrics.center_coverage,
        "corner_coverage": metrics.corner_coverage,
        "edge_coverage": metrics.edge_coverage,
        "pose_diversity_score": metrics.pose_diversity_score,
        "angle_diversity": metrics.angle_diversity,
        "distance_diversity": metrics.distance_diversity,
        "recommendations": json.loads(metrics.recommendations),
        "created_at": metrics.created_at,
        "updated_at": metrics.updated_at
    }

@router.get("/latest-calibration")
async def get_latest_calibration(db: Session = Depends(get_db)):
    """
    Get the most recent calibration session with quality metrics
    """
    from ..database import CalibrationResult

    # Get the latest calibration result
    latest_result = db.query(CalibrationResult).order_by(
        CalibrationResult.created_at.desc()
    ).first()

    if not latest_result:
        raise HTTPException(status_code=404, detail="No calibration found")

    # Get the associated session
    session = db.query(DBSession).filter(DBSession.id == latest_result.session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get quality metrics if available
    quality_metrics = db.query(CalibrationQualityMetrics).filter(
        CalibrationQualityMetrics.session_id == latest_result.session_id
    ).first()

    return {
        "session_id": latest_result.session_id,
        "pattern_type": latest_result.pattern_type,
        "checkerboard_columns": latest_result.columns,
        "checkerboard_rows": latest_result.rows,
        "square_size": latest_result.square_size,
        "reprojection_error": latest_result.reprojection_error,
        "created_at": latest_result.created_at,
        "has_quality_metrics": quality_metrics is not None,
        "quality_metrics": {
            "coverage_score": quality_metrics.coverage_score if quality_metrics else None,
            "pose_diversity_score": quality_metrics.pose_diversity_score if quality_metrics else None,
        } if quality_metrics else None
    }
