from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import cv2
import numpy as np
import json
import base64
import os
import uuid
from datetime import datetime

from ..database import get_db, LiveCaptureSession, Session as DBSession, CalibrationImage

router = APIRouter()

class LiveCaptureRequest(BaseModel):
    session_id: str
    pattern_type: str
    checkerboard_columns: int
    checkerboard_rows: int
    square_size: float
    auto_capture_enabled: bool = True
    quality_threshold: float = 0.8
    marker_size: Optional[float] = None
    aruco_dict_name: Optional[str] = None

class LiveDetectionRequest(BaseModel):
    image_data: str  # Base64 encoded image
    pattern_type: str
    checkerboard_columns: int
    checkerboard_rows: int
    marker_size: Optional[float] = None
    aruco_dict_name: Optional[str] = None

class LiveCaptureImageRequest(BaseModel):
    session_id: str
    image_data: str  # Base64 encoded image
    image_name: str

def detect_pattern_in_image(image, pattern_type, checkerboard_size, marker_size=None, aruco_dict_name=None):
    """
    Detect calibration pattern in an image and return quality metrics
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    found = False
    corners = None
    num_corners = 0
    quality_score = 0.0

    aruco_dicts = {
        'DICT_4X4_50': cv2.aruco.DICT_4X4_50,
        'DICT_4X4_100': cv2.aruco.DICT_4X4_100,
        'DICT_4X4_250': cv2.aruco.DICT_4X4_250,
        'DICT_4X4_1000': cv2.aruco.DICT_4X4_1000,
        'DICT_5X5_50': cv2.aruco.DICT_5X5_50,
        'DICT_5X5_100': cv2.aruco.DICT_5X5_100,
        'DICT_5X5_250': cv2.aruco.DICT_5X5_250,
        'DICT_5X5_1000': cv2.aruco.DICT_5X5_1000,
        'DICT_6X6_50': cv2.aruco.DICT_6X6_50,
        'DICT_6X6_100': cv2.aruco.DICT_6X6_100,
        'DICT_6X6_250': cv2.aruco.DICT_6X6_250,
        'DICT_6X6_1000': cv2.aruco.DICT_6X6_1000,
        'DICT_7X7_50': cv2.aruco.DICT_7X7_50,
        'DICT_7X7_100': cv2.aruco.DICT_7X7_100,
        'DICT_7X7_250': cv2.aruco.DICT_7X7_250,
        'DICT_7X7_1000': cv2.aruco.DICT_7X7_1000,
        'DICT_ARUCO_ORIGINAL': cv2.aruco.DICT_ARUCO_ORIGINAL,
        'DICT_APRILTAG_16h5': cv2.aruco.DICT_APRILTAG_16h5,
        'DICT_APRILTAG_25h9': cv2.aruco.DICT_APRILTAG_25h9,
        'DICT_APRILTAG_36h10': cv2.aruco.DICT_APRILTAG_36h10,
        'DICT_APRILTAG_36h11': cv2.aruco.DICT_APRILTAG_36h11
    }

    annotated_image = image.copy()

    if pattern_type == 'Checkerboard':
        found, corners = cv2.findChessboardCorners(gray, checkerboard_size)
        if found:
            # Refine corners
            term = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_COUNT, 30, 0.1)
            cv2.cornerSubPix(gray, corners, (5, 5), (-1, -1), term)
            num_corners = len(corners)

            # Draw corners
            cv2.drawChessboardCorners(annotated_image, checkerboard_size, corners, found)

            # Calculate quality score based on corner sharpness and distribution
            # Check if corners are well distributed
            corners_flat = corners.reshape(-1, 2)
            h, w = gray.shape

            # Calculate coverage (how much of the image the pattern covers)
            min_x, min_y = corners_flat.min(axis=0)
            max_x, max_y = corners_flat.max(axis=0)
            coverage = ((max_x - min_x) * (max_y - min_y)) / (w * h)

            # Calculate corner sharpness (using local gradient magnitude)
            sharpness_scores = []
            for corner in corners_flat:
                x, y = int(corner[0]), int(corner[1])
                if 5 < x < w - 5 and 5 < y < h - 5:
                    patch = gray[y-5:y+6, x-5:x+6]
                    gx = cv2.Sobel(patch, cv2.CV_64F, 1, 0, ksize=3)
                    gy = cv2.Sobel(patch, cv2.CV_64F, 0, 1, ksize=3)
                    sharpness = np.sqrt(gx**2 + gy**2).mean()
                    sharpness_scores.append(sharpness)

            avg_sharpness = np.mean(sharpness_scores) if sharpness_scores else 0

            # Normalize sharpness (typical range 0-100)
            normalized_sharpness = min(avg_sharpness / 100.0, 1.0)

            # Combined quality score
            quality_score = (coverage * 0.5 + normalized_sharpness * 0.5)

    elif pattern_type == 'ChArUcoboard':
        if aruco_dict_name in aruco_dicts:
            aruco_dict = cv2.aruco.getPredefinedDictionary(aruco_dicts[aruco_dict_name])
            board = cv2.aruco.CharucoBoard(checkerboard_size, marker_size or 0.02, marker_size or 0.015, aruco_dict)

            marker_corners, marker_ids, _ = cv2.aruco.detectMarkers(gray, aruco_dict)

            if marker_ids is not None and len(marker_corners) > 0:
                cv2.aruco.drawDetectedMarkers(annotated_image, marker_corners, marker_ids)

                _, charuco_corners, charuco_ids = cv2.aruco.interpolateCornersCharuco(
                    marker_corners, marker_ids, gray, board
                )

                if charuco_corners is not None and charuco_ids is not None and len(charuco_corners) > 3:
                    found = True
                    corners = charuco_corners
                    num_corners = len(charuco_corners)

                    cv2.aruco.drawDetectedCornersCharuco(annotated_image, charuco_corners, charuco_ids)

                    # Quality score based on number of detected corners
                    max_corners = checkerboard_size[0] * checkerboard_size[1]
                    quality_score = min(num_corners / max_corners, 1.0)

    return {
        "found": found,
        "num_corners": num_corners,
        "quality_score": quality_score,
        "annotated_image": annotated_image,
        "corners": corners
    }

@router.post("/detect-pattern")
async def detect_pattern_live(request: LiveDetectionRequest):
    """
    Detect calibration pattern in a live image and return detection results with quality metrics
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_data)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Detect pattern
        result = detect_pattern_in_image(
            image,
            request.pattern_type,
            (request.checkerboard_columns, request.checkerboard_rows),
            request.marker_size,
            request.aruco_dict_name
        )

        # Encode annotated image
        _, buffer = cv2.imencode('.jpg', result["annotated_image"])
        annotated_base64 = base64.b64encode(buffer).decode('utf-8')

        return {
            "found": result["found"],
            "num_corners": result["num_corners"],
            "quality_score": result["quality_score"],
            "annotated_image": annotated_base64,
            "should_capture": result["found"] and result["quality_score"] >= 0.7
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/capture-image")
async def capture_live_image(request: LiveCaptureImageRequest, db: Session = Depends(get_db)):
    """
    Save a captured image from live calibration to a session
    """
    try:
        # Get session
        session = db.query(DBSession).filter(DBSession.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Decode and save image
        image_data = base64.b64decode(request.image_data)

        # Ensure session images directory exists
        os.makedirs(session.images_dir, exist_ok=True)

        # Save image
        image_path = os.path.join(session.images_dir, request.image_name)
        with open(image_path, 'wb') as f:
            f.write(image_data)

        # Add to database
        cal_image = CalibrationImage(
            session_id=request.session_id,
            image_path=image_path
        )
        db.add(cal_image)
        db.commit()

        return {
            "status": "success",
            "image_path": image_path,
            "message": "Image captured and saved successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-session")
async def start_live_capture_session(request: LiveCaptureRequest, db: Session = Depends(get_db)):
    """
    Start a new live capture session
    """
    try:
        # Check if session exists
        session = db.query(DBSession).filter(DBSession.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Create live capture session
        live_session = LiveCaptureSession(
            id=str(uuid.uuid4()),
            session_id=request.session_id,
            is_active=True,
            auto_capture_enabled=request.auto_capture_enabled,
            quality_threshold=request.quality_threshold
        )

        db.add(live_session)
        db.commit()

        return {
            "status": "success",
            "live_session_id": live_session.id,
            "message": "Live capture session started"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop-session/{live_session_id}")
async def stop_live_capture_session(live_session_id: str, db: Session = Depends(get_db)):
    """
    Stop an active live capture session
    """
    try:
        live_session = db.query(LiveCaptureSession).filter(
            LiveCaptureSession.id == live_session_id
        ).first()

        if not live_session:
            raise HTTPException(status_code=404, detail="Live capture session not found")

        live_session.is_active = False
        db.commit()

        return {
            "status": "success",
            "message": "Live capture session stopped"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
