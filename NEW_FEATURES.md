# New Features Documentation

This document describes the three major features added to the Camera Calibration App.

## 1. Stereo Camera Calibration

### Overview
Calibrate two cameras simultaneously for 3D reconstruction, depth estimation, and stereo vision applications. The stereo calibration process computes the relative position and orientation between two cameras, along with rectification parameters for creating aligned stereo pairs.

### Features
- Dual camera calibration with synchronized image upload
- Rectification matrix calculation for both cameras
- Epipolar geometry visualization
- Baseline distance calculation
- Disparity-to-depth mapping matrix (Q matrix)
- Export stereo parameters in JSON format

### API Endpoints

#### POST `/api/v1/stereo/calibrate`
Calibrate stereo camera pair

**Request Body:**
```json
{
  "left_session_id": "uuid-for-left-camera",
  "right_session_id": "uuid-for-right-camera",
  "pattern_type": "Checkerboard",
  "checkerboard_columns": 9,
  "checkerboard_rows": 6,
  "square_size": 30.0,
  "run_optimization": true,
  "camera_model": "Standard",
  "marker_size": null,
  "aruco_dict_name": null
}
```

**Response:**
```json
{
  "status": "success",
  "results": {
    "left_camera_matrix": [[fx, 0, cx], [0, fy, cy], [0, 0, 1]],
    "right_camera_matrix": [[fx, 0, cx], [0, fy, cy], [0, 0, 1]],
    "rotation_matrix": [...],
    "translation_vector": [...],
    "baseline": 120.5,
    "reprojection_error": 0.342,
    "rectified_previews": [...]
  }
}
```

#### GET `/api/v1/stereo/results/{left_session_id}/{right_session_id}`
Retrieve saved stereo calibration results

### Usage Example

1. Upload calibration images for left camera → Get `left_session_id`
2. Upload calibration images for right camera → Get `right_session_id`
3. Navigate to `/stereo` page
4. Enter session IDs and calibration parameters
5. Click "Start Stereo Calibration"
6. Review rectified image pairs with epipolar lines
7. Download stereo calibration JSON

## 2. Live Camera Calibration Mode

### Overview
Capture calibration images in real-time using your webcam with intelligent guidance. The system provides live feedback on pattern detection quality, automatically captures images when quality is high, and guides you to capture images from different positions for optimal coverage.

### Features
- Real-time pattern detection from webcam feed
- Quality scoring for each frame
- Auto-capture when quality threshold is met
- Visual coverage grid overlay (3×3)
- Guided capture recommendations
- Live corner detection visualization
- Coverage progress tracking
- Seamless transition to calibration workflow

### API Endpoints

#### POST `/api/v1/live/detect-pattern`
Analyze a live frame for calibration pattern

**Request Body:**
```json
{
  "image_data": "base64-encoded-image",
  "pattern_type": "Checkerboard",
  "checkerboard_columns": 9,
  "checkerboard_rows": 6,
  "marker_size": null,
  "aruco_dict_name": null
}
```

**Response:**
```json
{
  "found": true,
  "num_corners": 54,
  "quality_score": 0.85,
  "annotated_image": "base64-encoded-image-with-corners",
  "should_capture": true
}
```

#### POST `/api/v1/live/capture-image`
Save a captured frame to a calibration session

**Request Body:**
```json
{
  "session_id": "uuid",
  "image_data": "base64-encoded-image",
  "image_name": "capture_timestamp.jpg"
}
```

#### POST `/api/v1/live/start-session`
Start a new live capture session

#### POST `/api/v1/live/stop-session/{live_session_id}`
Stop an active live capture session

### Quality Scoring

The quality score (0-1) is calculated based on:
- **Coverage** (50%): How much of the frame the pattern occupies
- **Sharpness** (50%): Corner sharpness using local gradient magnitude

A score above the quality threshold (default 0.8) triggers auto-capture.

### Usage Example

1. Navigate to `/live` page
2. Configure pattern parameters
3. Click "Start Camera"
4. Position calibration pattern in view
5. System provides live feedback on detection quality
6. Auto-capture saves high-quality images
7. Capture from different positions (center, corners, edges, various angles)
8. When 15+ images captured, click "Proceed to Calibration"

## 3. Calibration Quality Advisor

### Overview
Analyze your calibration dataset and receive intelligent, actionable recommendations to improve calibration accuracy. The Quality Advisor evaluates coverage, pose diversity, and provides specific suggestions for capturing additional images.

### Features
- Comprehensive quality analysis of calibration datasets
- Coverage metrics (center, corners, edges)
- Pose diversity analysis (angle and distance variation)
- Coverage heatmap visualization
- Priority-ranked recommendations
- Overall quality scoring
- Reprojection error analysis

### API Endpoints

#### POST `/api/v1/quality/analyze/{session_id}`
Analyze calibration quality for a session

**Request Body:**
```json
{
  "session_id": "uuid",
  "pattern_type": "Checkerboard",
  "checkerboard_columns": 9,
  "checkerboard_rows": 6,
  "square_size": 30.0,
  "marker_size": null,
  "aruco_dict_name": null
}
```

**Response:**
```json
{
  "status": "success",
  "metrics": {
    "coverage": {
      "coverage_score": 0.75,
      "center_coverage": 0.42,
      "corner_coverage": 0.28,
      "edge_coverage": 0.30
    },
    "pose_diversity": {
      "pose_diversity_score": 0.65,
      "angle_diversity": 0.70,
      "distance_diversity": 0.60
    },
    "num_images": 22,
    "reprojection_error": 0.425
  },
  "heatmap": [[0.1, 0.2, ...], ...],
  "recommendations": [
    {
      "priority": "high",
      "category": "coverage",
      "message": "Capture more images with pattern in center",
      "details": "Center coverage is low. This affects principal point estimation."
    }
  ]
}
```

#### GET `/api/v1/quality/metrics/{session_id}`
Retrieve saved quality metrics

### Metrics Explained

#### Coverage Score (0-1)
Measures how well calibration points are distributed across different regions:
- **Center Coverage**: Points in the central 50% of the image
- **Corner Coverage**: Points in the four corner quadrants
- **Edge Coverage**: Points along the four edges

#### Pose Diversity Score (0-1)
Measures variation in camera/pattern positions:
- **Angle Diversity**: Standard deviation of rotation angles (normalized)
- **Distance Diversity**: Standard deviation of distances from pattern (normalized)

#### Recommendations
Automatically generated suggestions with priority levels:
- **High**: Critical issues affecting calibration accuracy
- **Medium**: Improvements that enhance results
- **Low**: Optional optimizations
- **Info**: Status messages and confirmations

### Usage Example

1. Upload and calibrate your images
2. Navigate to `/quality` page
3. Enter your session ID
4. Click "Analyze Quality"
5. Review coverage heatmap showing point distribution
6. Check coverage and pose diversity metrics
7. Follow priority recommendations to improve dataset
8. Re-capture images as suggested
9. Re-analyze to verify improvements

## Best Practices

### For Stereo Calibration
- Use the same calibration pattern for both cameras
- Ensure both cameras can see the pattern in all images
- Capture 20-30 synchronized image pairs
- Maintain the same relative camera positions during capture
- Verify epipolar line alignment in rectified results

### For Live Camera Calibration
- Use good lighting (avoid shadows and glare)
- Keep pattern flat and rigid
- Move pattern slowly and deliberately
- Wait for quality score to be high before capture (if manual)
- Cover all 9 grid regions
- Vary angles and distances
- Capture 20-30 high-quality images

### For Quality Advisor
- Run analysis before final calibration
- Aim for coverage score > 0.7
- Aim for pose diversity score > 0.6
- Follow high-priority recommendations first
- Capture 20-30 images total
- Re-analyze after adding images

## Integration Examples

### Using Stereo Results for Depth Estimation

```python
import cv2
import numpy as np
import json

# Load stereo calibration results
with open('stereo_calibration_results.json', 'r') as f:
    stereo_params = json.load(f)

# Extract parameters
left_mtx = np.array(stereo_params['left_camera_matrix'])
right_mtx = np.array(stereo_params['right_camera_matrix'])
left_dist = np.array(stereo_params['left_dist_coeffs'])
right_dist = np.array(stereo_params['right_dist_coeffs'])
R1 = np.array(stereo_params['rectification_matrix_left'])
R2 = np.array(stereo_params['rectification_matrix_right'])
P1 = np.array(stereo_params['projection_matrix_left'])
P2 = np.array(stereo_params['projection_matrix_right'])
Q = np.array(stereo_params['disparity_to_depth_mapping'])

# Load stereo pair
left_img = cv2.imread('left_image.jpg')
right_img = cv2.imread('right_image.jpg')

# Rectify images
h, w = left_img.shape[:2]
map1_left, map2_left = cv2.initUndistortRectifyMap(left_mtx, left_dist, R1, P1, (w, h), cv2.CV_32FC1)
map1_right, map2_right = cv2.initUndistortRectifyMap(right_mtx, right_dist, R2, P2, (w, h), cv2.CV_32FC1)

rectified_left = cv2.remap(left_img, map1_left, map2_left, cv2.INTER_LINEAR)
rectified_right = cv2.remap(right_img, map1_right, map2_right, cv2.INTER_LINEAR)

# Compute disparity
stereo = cv2.StereoBM_create(numDisparities=16*10, blockSize=15)
disparity = stereo.compute(
    cv2.cvtColor(rectified_left, cv2.COLOR_BGR2GRAY),
    cv2.cvtColor(rectified_right, cv2.COLOR_BGR2GRAY)
)

# Compute depth map
depth_map = cv2.reprojectImageTo3D(disparity, Q)
```

### Programmatic Quality Analysis

```python
import requests

API_URL = "http://localhost:8000/api/v1"

# Analyze quality
response = requests.post(
    f"{API_URL}/quality/analyze/your-session-id",
    json={
        "session_id": "your-session-id",
        "pattern_type": "Checkerboard",
        "checkerboard_columns": 9,
        "checkerboard_rows": 6,
        "square_size": 30.0
    }
)

quality_data = response.json()

# Check if dataset is ready
if quality_data['metrics']['coverage']['coverage_score'] > 0.7 and \
   quality_data['metrics']['pose_diversity']['pose_diversity_score'] > 0.6:
    print("Dataset quality is good! Ready to calibrate.")
else:
    print("Recommendations:")
    for rec in quality_data['recommendations']:
        if rec['priority'] == 'high':
            print(f"  - {rec['message']}")
```

## Troubleshooting

### Stereo Calibration Issues
- **Error: "No valid calibration patterns found"**
  - Ensure both cameras see the pattern in all images
  - Check that pattern parameters match your actual pattern
  - Verify images are not blurry or poorly lit

### Live Camera Issues
- **Camera not accessible**
  - Grant browser camera permissions
  - Check if another application is using the camera
  - Try refreshing the page

- **Pattern not detected**
  - Ensure pattern dimensions match configuration
  - Improve lighting conditions
  - Keep pattern flat and fully visible
  - Move closer to camera

### Quality Advisor
- **Low coverage scores**
  - Capture images with pattern in different frame positions
  - Follow recommendations to target specific regions
  - Ensure pattern is detected in all images

- **Low pose diversity**
  - Vary camera/pattern angles (tilt, rotate)
  - Vary distance between camera and pattern
  - Avoid capturing multiple images from same position
