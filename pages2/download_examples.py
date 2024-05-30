import streamlit as st
from pathlib import Path
import json
import numpy as np
import cv2

def show():
    st.title("Download Calibration Data and Examples")
    
    calibration_type = st.selectbox("Calibration Type", ["Single Camera", "Stereo Camera"])
    camera_model = st.selectbox("Camera Model", ["Standard", "Fisheye"])
    
    calibration_file = 'calibration_data.json' if calibration_type == "Single Camera" else 'stereo_calibration_data.json'
    
    if Path(calibration_file).exists():
        with open(calibration_file, 'rb') as f:
            st.download_button('Download Calibration Data', f, file_name=calibration_file)
    else:
        st.error("No calibration data found. Please run the calibration first.")
    
    if calibration_type == "Single Camera":
        if camera_model == "Standard":
            st.markdown("""
            ### Python Example for Single Camera with Standard Model
            ```python
            import json
            import cv2
            import numpy as np

            with open('calibration_data.json', 'r') as f:
                calibration_data = json.load(f)
            
            mtx = np.array(calibration_data['camera_matrix'])
            dist = np.array(calibration_data['distortion'])

            # Load image
            img = cv2.imread('your_image.jpg')
            h, w = img.shape[:2]
            
            # Undistort
            newcameramtx, roi = cv2.getOptimalNewCameraMatrix(mtx, dist, (w, h), 1, (w, h))
            dst = cv2.undistort(img, mtx, dist, None, newcameramtx)

            # Crop the image
            x, y, w, h = roi
            dst = dst[y:y+h, x:x+w]
            
            cv2.imwrite('calibrated_result.jpg', dst)
            ```

            ### C++ Example for Single Camera with Standard Model
            ```cpp
            #include <opencv2/opencv.hpp>
            #include <fstream>
            #include <json/json.h>

            int main() {
                cv::Mat mtx, dist;

                std::ifstream file("calibration_data.json");
                Json::Value calibration_data;
                file >> calibration_data;

                for (Json::Value::ArrayIndex i = 0; i != calibration_data["camera_matrix"].size(); i++) {
                    mtx.push_back(calibration_data["camera_matrix"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["distortion"].size(); i++) {
                    dist.push_back(calibration_data["distortion"][i].asDouble());
                }

                // Load image
                cv::Mat img = cv::imread("your_image.jpg");
                cv::Mat dst;
                cv::Size imageSize = img.size();

                // Undistort
                cv::Mat newCameraMatrix = cv::getOptimalNewCameraMatrix(mtx, dist, imageSize, 1, imageSize, 0);
                cv::undistort(img, dst, mtx, dist, newCameraMatrix);

                // Save the image
                cv::imwrite("calibrated_result.jpg", dst);

                return 0;
            }
            ```
            """)
        elif camera_model == "Fisheye":
            st.markdown("""
            ### Python Example for Single Camera with Fisheye Model
            ```python
            import json
            import cv2
            import numpy as np

            with open('calibration_data.json', 'r') as f:
                calibration_data = json.load(f)
            
            mtx = np.array(calibration_data['camera_matrix'])
            dist = np.array(calibration_data['distortion'])

            # Load image
            img = cv2.imread('your_image.jpg')
            h, w = img.shape[:2]
            
            # Undistort
            newcameramtx = mtx.copy()
            map1, map2 = cv2.fisheye.initUndistortRectifyMap(mtx, dist, np.eye(3), newcameramtx, (w, h), cv2.CV_16SC2)
            dst = cv2.remap(img, map1, map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

            cv2.imwrite('calibrated_result.jpg', dst)
            ```

            ### C++ Example for Single Camera with Fisheye Model
            ```cpp
            #include <opencv2/opencv.hpp>
            #include <fstream>
            #include <json/json.h>

            int main() {
                cv::Mat mtx, dist;

                std::ifstream file("calibration_data.json");
                Json::Value calibration_data;
                file >> calibration_data;

                for (Json::Value::ArrayIndex i = 0; i != calibration_data["camera_matrix"].size(); i++) {
                    mtx.push_back(calibration_data["camera_matrix"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["distortion"].size(); i++) {
                    dist.push_back(calibration_data["distortion"][i].asDouble());
                }

                // Load image
                cv::Mat img = cv::imread("your_image.jpg");
                cv::Mat dst;
                cv::Size imageSize = img.size();

                // Undistort
                cv::Mat newCameraMatrix = mtx.clone();
                cv::Mat map1, map2;
                cv::fisheye::initUndistortRectifyMap(mtx, dist, cv::Mat::eye(3, 3, CV_64F), newCameraMatrix, imageSize, CV_16SC2, map1, map2);
                cv::remap(img, dst, map1, map2, cv::INTER_LINEAR, cv::BORDER_CONSTANT);

                // Save the image
                cv::imwrite("calibrated_result.jpg", dst);

                return 0;
            }
            ```
            """)
    elif calibration_type == "Stereo Camera":
        if camera_model == "Standard":
            st.markdown("""
            ### Python Example for Stereo Camera with Standard Model
            ```python
            import json
            import cv2
            import numpy as np

            with open('stereo_calibration_data.json', 'r') as f:
                calibration_data = json.load(f)
            
            left_mtx = np.array(calibration_data['left_camera_matrix'])
            right_mtx = np.array(calibration_data['right_camera_matrix'])
            left_dist = np.array(calibration_data['left_distortion'])
            right_dist = np.array(calibration_data['right_distortion'])
            R = np.array(calibration_data['rotation_matrix'])
            T = np.array(calibration_data['translation_vector'])

            # Load images
            left_img = cv2.imread('left_image.jpg')
            right_img = cv2.imread('right_image.jpg')

            # Undistort
            h, w = left_img.shape[:2]
            left_newcameramtx, left_roi = cv2.getOptimalNewCameraMatrix(left_mtx, left_dist, (w, h), 1, (w, h))
            right_newcameramtx, right_roi = cv2.getOptimalNewCameraMatrix(right_mtx, right_dist, (w, h), 1, (w, h))
            left_dst = cv2.undistort(left_img, left_mtx, left_dist, None, left_newcameramtx)
            right_dst = cv2.undistort(right_img, right_mtx, right_dist, None, right_newcameramtx)

            # Crop the images
            lx, ly, lw, lh = left_roi
            rx, ry, rw, rh = right_roi
            left_dst = left_dst[ly:ly+lh, lx:lx+lw]
            right_dst = right_dst[ry:ry+rh, rx:rx+rw]

            cv2.imwrite('left_calibrated_result.jpg', left_dst)
            cv2.imwrite('right_calibrated_result.jpg', right_dst)
            ```

            ### C++ Example for Stereo Camera with Standard Model
            ```cpp
            #include <opencv2/opencv.hpp>
            #include <fstream>
            #include <json/json.h>

            int main() {
                cv::Mat left_mtx, right_mtx, left_dist, right_dist, R, T;

                std::ifstream file("stereo_calibration_data.json");
                Json::Value calibration_data;
                file >> calibration_data;

                for (Json::Value::ArrayIndex i = 0; i != calibration_data["left_camera_matrix"].size(); i++) {
                    left_mtx.push_back(calibration_data["left_camera_matrix"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["right_camera_matrix"].size(); i++) {
                    right_mtx.push_back(calibration_data["right_camera_matrix"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["left_distortion"].size(); i++) {
                    left_dist.push_back(calibration_data["left_distortion"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["right_distortion"].size(); i++) {
                    right_dist.push_back(calibration_data["right_distortion"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["rotation_matrix"].size(); i++) {
                    R.push_back(calibration_data["rotation_matrix"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["translation_vector"].size(); i++) {
                    T.push_back(calibration_data["translation_vector"][i].asDouble());
                }

                // Load images
                cv::Mat left_img = cv::imread("left_image.jpg");
                cv::Mat right_img = cv::imread("right_image.jpg");
                cv::Mat left_dst, right_dst;
                cv::Size imageSize = left_img.size();

                // Undistort
                cv::Mat left_newCameraMatrix = cv::getOptimalNewCameraMatrix(left_mtx, left_dist, imageSize, 1, imageSize, 0);
                cv::Mat right_newCameraMatrix = cv::getOptimalNewCameraMatrix(right_mtx, right_dist, imageSize, 1, imageSize, 0);
                cv::undistort(left_img, left_dst, left_mtx, left_dist, left_newCameraMatrix);
                cv::undistort(right_img, right_dst, right_mtx, right_dist, right_newCameraMatrix);

                // Save the images
                cv::imwrite("left_calibrated_result.jpg", left_dst);
                cv::imwrite("right_calibrated_result.jpg", right_dst);

                return 0;
            }
            ```
            """)
        elif camera_model == "Fisheye":
            st.markdown("""
            ### Python Example for Stereo Camera with Fisheye Model
            ```python
            import json
            import cv2
            import numpy as np

            with open('stereo_calibration_data.json', 'r') as f:
                calibration_data = json.load(f)
            
            left_mtx = np.array(calibration_data['left_camera_matrix'])
            right_mtx = np.array(calibration_data['right_camera_matrix'])
            left_dist = np.array(calibration_data['left_distortion'])
            right_dist = np.array(calibration_data['right_distortion'])
            R = np.array(calibration_data['rotation_matrix'])
            T = np.array(calibration_data['translation_vector'])

            # Load images
            left_img = cv2.imread('left_image.jpg')
            right_img = cv2.imread('right_image.jpg')

            # Undistort
            h, w = left_img.shape[:2]
            left_newcameramtx = left_mtx.copy()
            right_newcameramtx = right_mtx.copy()
            left_map1, left_map2 = cv2.fisheye.initUndistortRectifyMap(left_mtx, left_dist, np.eye(3), left_newcameramtx, (w, h), cv2.CV_16SC2)
            right_map1, right_map2 = cv2.fisheye.initUndistortRectifyMap(right_mtx, right_dist, np.eye(3), right_newcameramtx, (w, h), cv2.CV_16SC2)
            left_dst = cv2.remap(left_img, left_map1, left_map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
            right_dst = cv2.remap(right_img, right_map1, right_map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

            cv2.imwrite('left_calibrated_result.jpg', left_dst)
            cv2.imwrite('right_calibrated_result.jpg', right_dst)
            ```

            ### C++ Example for Stereo Camera with Fisheye Model
            ```cpp
            #include <opencv2/opencv.hpp>
            #include <fstream>
            #include <json/json.h>

            int main() {
                cv::Mat left_mtx, right_mtx, left_dist, right_dist, R, T;

                std::ifstream file("stereo_calibration_data.json");
                Json::Value calibration_data;
                file >> calibration_data;

                for (Json::Value::ArrayIndex i = 0; i != calibration_data["left_camera_matrix"].size(); i++) {
                    left_mtx.push_back(calibration_data["left_camera_matrix"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["right_camera_matrix"].size(); i++) {
                    right_mtx.push_back(calibration_data["right_camera_matrix"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["left_distortion"].size(); i++) {
                    left_dist.push_back(calibration_data["left_distortion"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["right_distortion"].size(); i++) {
                    right_dist.push_back(calibration_data["right_distortion"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["rotation_matrix"].size(); i++) {
                    R.push_back(calibration_data["rotation_matrix"][i].asDouble());
                }
                for (Json::Value::ArrayIndex i = 0; i != calibration_data["translation_vector"].size(); i++) {
                    T.push_back(calibration_data["translation_vector"][i].asDouble());
                }

                // Load images
                cv::Mat left_img = cv::imread("left_image.jpg");
                cv::Mat right_img = cv::imread("right_image.jpg");
                cv::Mat left_dst, right_dst;
                cv::Size imageSize = left_img.size();

                // Undistort
                cv::Mat left_newCameraMatrix = left_mtx.clone();
                cv::Mat right_newCameraMatrix = right_mtx.clone();
                cv::Mat left_map1, left_map2;
                cv::Mat right_map1, right_map2;
                cv::fisheye::initUndistortRectifyMap(left_mtx, left_dist, cv::Mat::eye(3, 3, CV_64F), left_newCameraMatrix, imageSize, CV_16SC2, left_map1, left_map2);
                cv::fisheye::initUndistortRectifyMap(right_mtx, right_dist, cv::Mat::eye(3, 3, CV_64F), right_newCameraMatrix, imageSize, CV_16SC2, right_map1, right_map2);
                cv::remap(left_img, left_dst, left_map1, left_map2, cv::INTER_LINEAR, cv::BORDER_CONSTANT);
                cv::remap(right_img, right_dst, right_map1, right_map2, cv::INTER_LINEAR, cv::BORDER_CONSTANT);

                // Save the images
                cv::imwrite("left_calibrated_result.jpg", left_dst);
                cv::imwrite("right_calibrated_result.jpg", right_dst);

                return 0;
            }
            ```
            """)
