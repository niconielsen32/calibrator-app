# Using Calibration Data - Code Examples

After calibrating your camera, you can download a JSON file with all calibration parameters. Here's how to use it in your applications.

## Downloaded JSON Format

```json
{
  "camera_matrix": [
    [fx, 0, cx],
    [0, fy, cy],
    [0, 0, 1]
  ],
  "distortion_coefficients": [k1, k2, p1, p2, k3],
  "camera_parameters": {
    "fx": 1234.56,
    "fy": 1235.78,
    "cx": 640.0,
    "cy": 480.0
  },
  "distortion_parameters": {
    "k1": -0.234,
    "k2": 0.056,
    "k3": -0.012,
    "p1": -0.001,
    "p2": 0.0002
  },
  "calibration_quality": {
    "mean_reprojection_error": 0.234,
    "max_reprojection_error": 0.456,
    "min_reprojection_error": 0.123,
    "quality_rating": "Excellent",
    "num_images_used": 25
  },
  "per_image_errors": [0.189, 0.245, 0.198, ...],
  "session_id": "abc123",
  "timestamp": "2025-10-14T18:30:00.000Z"
}
```

## Python Examples

### Load Calibration Data

```python
import json
import cv2
import numpy as np

# Load calibration data
with open('calibration_data.json', 'r') as f:
    calib = json.load(f)

# Extract camera matrix and distortion coefficients
camera_matrix = np.array(calib['camera_matrix'])
dist_coeffs = np.array(calib['distortion_coefficients'])

print(f"Camera Matrix:\\n{camera_matrix}")
print(f"Distortion Coefficients: {dist_coeffs}")
print(f"Quality: {calib['calibration_quality']['quality_rating']}")
print(f"Mean Error: {calib['calibration_quality']['mean_reprojection_error']:.4f}px")
```

### Undistort an Image

```python
import json
import cv2
import numpy as np

# Load calibration
with open('calibration_data.json', 'r') as f:
    calib = json.load(f)

camera_matrix = np.array(calib['camera_matrix'])
dist_coeffs = np.array(calib['distortion_coefficients'])

# Load your image
img = cv2.imread('your_image.jpg')
h, w = img.shape[:2]

# Get optimal new camera matrix
new_camera_matrix, roi = cv2.getOptimalNewCameraMatrix(
    camera_matrix, dist_coeffs, (w, h), 1, (w, h)
)

# Undistort image
undistorted = cv2.undistort(img, camera_matrix, dist_coeffs, None, new_camera_matrix)

# Crop to valid region
x, y, w, h = roi
undistorted = undistorted[y:y+h, x:x+w]

# Save result
cv2.imwrite('undistorted_image.jpg', undistorted)
```

### Real-time Video Undistortion

```python
import json
import cv2
import numpy as np

# Load calibration
with open('calibration_data.json', 'r') as f:
    calib = json.load(f)

camera_matrix = np.array(calib['camera_matrix'])
dist_coeffs = np.array(calib['distortion_coefficients'])

# Open camera
cap = cv2.VideoCapture(0)

# Get frame size
ret, frame = cap.read()
h, w = frame.shape[:2]

# Compute undistortion maps once
new_camera_matrix, roi = cv2.getOptimalNewCameraMatrix(
    camera_matrix, dist_coeffs, (w, h), 1, (w, h)
)
mapx, mapy = cv2.initUndistortRectifyMap(
    camera_matrix, dist_coeffs, None, new_camera_matrix, (w, h), cv2.CV_32FC1
)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Fast undistortion using precomputed maps
    undistorted = cv2.remap(frame, mapx, mapy, cv2.INTER_LINEAR)

    cv2.imshow('Original', frame)
    cv2.imshow('Undistorted', undistorted)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

### Project 3D Points to Image

```python
import json
import cv2
import numpy as np

# Load calibration
with open('calibration_data.json', 'r') as f:
    calib = json.load(f)

camera_matrix = np.array(calib['camera_matrix'])
dist_coeffs = np.array(calib['distortion_coefficients'])

# Define 3D points (e.g., corners of a cube)
object_points = np.array([
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1]
], dtype=np.float32)

# Camera pose (rotation and translation)
rvec = np.array([[0.1], [0.2], [0.3]])  # Rotation vector
tvec = np.array([[0], [0], [5]])         # Translation vector

# Project 3D points to 2D
image_points, _ = cv2.projectPoints(
    object_points, rvec, tvec, camera_matrix, dist_coeffs
)

print("2D Image Points:")
print(image_points.reshape(-1, 2))
```

## C++ Examples

### Load and Use Calibration Data

```cpp
#include <opencv2/opencv.hpp>
#include <fstream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main() {
    // Load calibration data
    std::ifstream file("calibration_data.json");
    json calib;
    file >> calib;

    // Extract camera matrix
    cv::Mat camera_matrix = (cv::Mat_<double>(3, 3) <<
        calib["camera_matrix"][0][0], calib["camera_matrix"][0][1], calib["camera_matrix"][0][2],
        calib["camera_matrix"][1][0], calib["camera_matrix"][1][1], calib["camera_matrix"][1][2],
        calib["camera_matrix"][2][0], calib["camera_matrix"][2][1], calib["camera_matrix"][2][2]
    );

    // Extract distortion coefficients
    std::vector<double> dist_coeffs;
    for (const auto& coeff : calib["distortion_coefficients"]) {
        dist_coeffs.push_back(coeff);
    }
    cv::Mat dist_mat(dist_coeffs);

    // Load and undistort image
    cv::Mat img = cv::imread("your_image.jpg");
    cv::Mat undistorted;

    cv::undistort(img, undistorted, camera_matrix, dist_mat);

    cv::imwrite("undistorted_image.jpg", undistorted);

    return 0;
}
```

### Real-time Video Undistortion (C++)

```cpp
#include <opencv2/opencv.hpp>
#include <fstream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main() {
    // Load calibration
    std::ifstream file("calibration_data.json");
    json calib;
    file >> calib;

    cv::Mat camera_matrix = (cv::Mat_<double>(3, 3) <<
        calib["camera_matrix"][0][0], calib["camera_matrix"][0][1], calib["camera_matrix"][0][2],
        calib["camera_matrix"][1][0], calib["camera_matrix"][1][1], calib["camera_matrix"][1][2],
        calib["camera_matrix"][2][0], calib["camera_matrix"][2][1], calib["camera_matrix"][2][2]
    );

    std::vector<double> dist_coeffs;
    for (const auto& coeff : calib["distortion_coefficients"]) {
        dist_coeffs.push_back(coeff);
    }
    cv::Mat dist_mat(dist_coeffs);

    // Open camera
    cv::VideoCapture cap(0);
    cv::Mat frame, undistorted;

    // Precompute undistortion maps
    cv::Size image_size(1280, 720);  // Adjust to your camera resolution
    cv::Mat new_camera_matrix = cv::getOptimalNewCameraMatrix(
        camera_matrix, dist_mat, image_size, 1, image_size
    );

    cv::Mat mapx, mapy;
    cv::initUndistortRectifyMap(
        camera_matrix, dist_mat, cv::Mat(), new_camera_matrix,
        image_size, CV_32FC1, mapx, mapy
    );

    while (true) {
        cap >> frame;
        if (frame.empty()) break;

        // Fast undistortion
        cv::remap(frame, undistorted, mapx, mapy, cv::INTER_LINEAR);

        cv::imshow("Original", frame);
        cv::imshow("Undistorted", undistorted);

        if (cv::waitKey(1) == 'q') break;
    }

    return 0;
}
```

## MATLAB Example

```matlab
% Load calibration data
calibData = jsondecode(fileread('calibration_data.json'));

% Extract camera parameters
cameraMatrix = calibData.camera_matrix;
distCoeffs = calibData.distortion_coefficients;

% Create camera parameters object
fx = cameraMatrix(1,1);
fy = cameraMatrix(2,2);
cx = cameraMatrix(1,3);
cy = cameraMatrix(2,3);

intrinsics = cameraIntrinsics([fx, fy], [cx, cy], [720, 1280]);

% Load and undistort image
img = imread('your_image.jpg');
undistortedImg = undistortImage(img, intrinsics);

imwrite(undistortedImg, 'undistorted_image.jpg');
```

## ROS/ROS2 Integration

### camera_info Message

```python
import json
from sensor_msgs.msg import CameraInfo

def load_camera_info(json_file):
    with open(json_file, 'r') as f:
        calib = json.load(f)

    camera_info = CameraInfo()
    camera_info.height = 720  # Your image height
    camera_info.width = 1280  # Your image width

    # Camera matrix (K)
    K = calib['camera_matrix']
    camera_info.K = [
        K[0][0], K[0][1], K[0][2],
        K[1][0], K[1][1], K[1][2],
        K[2][0], K[2][1], K[2][2]
    ]

    # Distortion coefficients (D)
    camera_info.D = calib['distortion_coefficients']
    camera_info.distortion_model = 'plumb_bob'

    # Rectification matrix (identity for monocular)
    camera_info.R = [1, 0, 0, 0, 1, 0, 0, 0, 1]

    # Projection matrix
    camera_info.P = [
        K[0][0], 0, K[0][2], 0,
        0, K[1][1], K[1][2], 0,
        0, 0, 1, 0
    ]

    return camera_info
```

## Quality Metrics

Always check calibration quality before using:

```python
# Check quality from JSON
quality_rating = calib['calibration_quality']['quality_rating']
mean_error = calib['calibration_quality']['mean_reprojection_error']

if quality_rating in ['Excellent', 'Good'] and mean_error < 0.5:
    print("✓ Calibration quality is good")
else:
    print("⚠ Consider recalibrating with better images")
```

## Tips for Best Results

1. **Check reprojection error**: Mean error < 0.5 pixels is good
2. **Use enough images**: 20-30 images minimum
3. **Vary camera poses**: Different angles and distances
4. **Precompute maps**: For real-time, use `initUndistortRectifyMap` once
5. **Validate results**: Test on real images before production use

## Common Issues

### Image looks warped after undistortion
- Check if camera model matches (Standard vs Fisheye)
- Verify dimensions match your camera resolution
- Try alpha=1 in `getOptimalNewCameraMatrix` for full FOV

### Slow performance
- Precompute undistortion maps with `initUndistortRectifyMap`
- Use `cv2.remap()` instead of `cv2.undistort()`
- Consider GPU acceleration for real-time applications

### Parameters seem wrong
- Check calibration quality rating in JSON
- Verify reprojection error is < 0.5 pixels
- Recalibrate with better quality images if needed
