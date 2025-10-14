# Production-Ready Camera Calibration Pipeline

## Complete End-to-End Workflow

This document describes the full production-ready camera calibration pipeline with comprehensive per-image analysis and quality assessment.

## Pipeline Overview

```
1. Image Upload
   ↓
2. Pattern Detection Preview
   ↓
3. Calibration Execution
   ↓
4. Per-Image Analysis
   ↓
5. Quality Assessment
   ↓
6. Results Visualization
```

## 1. Image Upload

**Features:**
- Drag-and-drop or file browser upload
- Automatic upload to backend
- Session-based image management
- Real-time upload status
- Image preview thumbnails

**Best Practices:**
- Upload 20-30 images minimum
- Capture from multiple angles and distances
- Ensure checkerboard is fully visible in all images
- Use good lighting conditions
- Avoid motion blur

## 2. Pattern Detection Preview

**Features:**
- Preview corner detection before full calibration
- Visual feedback with detected corners overlaid
- Per-image detection status
- Detection success indicators

**Purpose:**
- Verify checkerboard parameters are correct
- Identify problematic images before calibration
- Ensure all images have valid patterns detected

## 3. Calibration Execution

**Supported Calibration Types:**
- Single Camera (fully implemented)
- Stereo Camera (coming soon)

**Supported Pattern Types:**
- **Checkerboard**: Classic calibration pattern
- **ChArUco Board**: Hybrid ArUco + Checkerboard (21 dictionary options)

**Supported Camera Models:**
- Standard (Pinhole model)
- Fisheye
- Omnidirectional

**Calibration Parameters:**
- Checkerboard rows/columns (arbitrary size)
- Square size (in millimeters, auto-converted to meters)
- Marker size (for ChArUco only)
- ArUco dictionary (for ChArUco only)
- Sub-pixel optimization (optional)

## 4. Per-Image Analysis

**What's Analyzed:**
- ✅ Individual reprojection error for each image
- ✅ Corner detection visualization with overlays
- ✅ Image quality indicators
- ✅ Per-image success/failure status

**Visualization:**
- Image thumbnails with detected corners
- Color-coded quality indicators
- Sortable by error magnitude
- Detailed error metrics per image

## 5. Quality Assessment

**Automated Quality Metrics:**

### Overall Quality Rating
- **Excellent**: < 0.3 pixels mean error
- **Good**: 0.3 - 0.5 pixels mean error
- **Acceptable**: 0.5 - 1.0 pixels mean error
- **Poor**: > 1.0 pixels mean error

### Statistical Analysis
- **Mean Reprojection Error**: Average across all images
- **Max Reprojection Error**: Worst-case image
- **Min Reprojection Error**: Best-case image
- **Standard Deviation**: Error consistency
- **Number of Images**: Total used in calibration

### Per-Image Quality
Each image is individually rated and color-coded:
- 🟢 Green: Excellent quality
- 🔵 Blue: Good quality
- 🟡 Yellow: Acceptable quality
- 🔴 Red: Poor quality (consider removing)

## 6. Results Visualization

### Overview Tab
- **Quality Metrics Dashboard**: Mean, max, min errors at a glance
- **Reprojection Error Chart**: Bar chart showing per-image errors
- **Quality Rating**: Overall calibration quality assessment

### Per-Image Analysis Tab
- **Image Grid**: All calibration images with detection overlays
- **Per-Image Metrics**: Individual reprojection error for each image
- **Visual Feedback**: Color-coded quality indicators
- **Image Names**: Original filenames for reference

### Parameters Tab
- **Camera Matrix**: Intrinsic parameters (fx, fy, cx, cy)
- **Distortion Coefficients**: k1, k2, k3, p1, p2
- **Export Options**: Copy or download parameters

### 3D Visualization Tab
- **Interactive 3D View**: Camera poses and calibration board positions
- **Rotation/Translation Vectors**: Extrinsic parameters visualization

## Production-Ready Features

### ✅ Robustness
- Handles arbitrary checkerboard dimensions
- Works with Checkerboard and ChArUco patterns
- Supports all major ArUco dictionaries
- Validates all user inputs with clear error messages
- Graceful error handling throughout pipeline

### ✅ Quality Control
- Per-image quality assessment
- Statistical analysis of calibration quality
- Visual feedback for problematic images
- Detailed error reporting

### ✅ Flexibility
- Multiple camera models supported
- Multiple pattern types supported
- Configurable optimization options
- Arbitrary pattern dimensions

### ✅ User Experience
- Intuitive step-by-step workflow
- Real-time feedback at each stage
- Clear visualizations of results
- Export functionality for parameters

### ✅ Data Management
- Automatic session cleanup (hourly)
- Manual cleanup options
- Persistent results across sessions
- Efficient storage and retrieval

## API Endpoints

### Upload
- `POST /api/v1/upload/` - Upload calibration images
- `DELETE /api/v1/upload/session/{session_id}` - Delete session
- `POST /api/v1/upload/cleanup` - Manual cleanup trigger

### Calibration
- `POST /api/v1/calibration/preview/{session_id}` - Preview detection
- `POST /api/v1/calibration/calibrate/{session_id}` - Run calibration
- `GET /api/v1/calibration/results/{session_id}` - Get results

## Output Format

### Calibration Results JSON
```json
{
  "status": "success",
  "results": {
    "camera_matrix": [[fx, 0, cx], [0, fy, cy], [0, 0, 1]],
    "dist_coeffs": [[k1, k2, p1, p2, k3]],
    "reprojection_error": 0.234,
    "num_images_calibrated": 25,
    "per_image_results": [
      {
        "image_index": 0,
        "image_name": "img_001.jpg",
        "reprojection_error": 0.189,
        "detection_image": "base64_encoded_image",
        "used_in_calibration": true
      }
    ],
    "reprojection_errors": [0.189, 0.245, 0.198, ...]
  }
}
```

## Quality Benchmarks

### Target Metrics
- **Mean Reprojection Error**: < 0.5 pixels (ideal: < 0.3)
- **Max Reprojection Error**: < 1.0 pixels
- **Images Used**: ≥ 15 (recommended: 20-30)
- **Pattern Coverage**: Multiple angles and distances

### Troubleshooting Poor Results

**If Mean Error > 1.0 pixels:**
1. Check checkerboard dimensions are correct
2. Verify square size measurement
3. Remove images with errors > 1.5 pixels
4. Ensure checkerboard is flat (not bent/warped)
5. Improve lighting conditions
6. Capture more images from diverse angles

**If Few Images Detected:**
1. Verify pattern type (Checkerboard vs ChArUco)
2. Check rows/columns values
3. Ensure pattern is fully visible
4. Improve image quality (focus, lighting)
5. Try different checkerboard size

## Running the Pipeline

### Backend (Port 8000)
```bash
cd /Users/nicolainielsen/calibrator-app
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend (Port 8080)
```bash
cd /Users/nicolainielsen/calibrator-app/frontend
npm run dev
```

### Access
- **Frontend**: http://localhost:8080
- **Backend API**: http://127.0.0.1:8000
- **API Docs**: http://127.0.0.1:8000/docs

## Maintenance

### Automatic Cleanup
- Runs every hour
- Deletes sessions older than 24 hours
- Removes orphaned files

### Manual Cleanup
```bash
# Via Python script
python -m backend.cleanup_script --hours 24

# Via API
curl -X POST http://127.0.0.1:8000/api/v1/upload/cleanup?hours_old=24
```

## Summary

This production-ready pipeline provides:
- ✅ Complete end-to-end calibration workflow
- ✅ Comprehensive per-image analysis and visualization
- ✅ Automated quality assessment with clear metrics
- ✅ Support for multiple pattern types and camera models
- ✅ Robust error handling and validation
- ✅ Automatic data management and cleanup
- ✅ Professional-grade results visualization
- ✅ Export-ready calibration parameters

The system is ready for production use with any arbitrary checkerboard configuration!
