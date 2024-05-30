import streamlit as st
from streamlit import session_state as state
from utils_calibration import calibrate_camera, calibrate_stereo_cameras
from utils_plot import plot_3d_calibration, plot_reprojection_errors
from pathlib import Path

def show():
    st.title("Camera Calibration")

    calibration_type = st.selectbox("Calibration Type", ["Single Camera", "Stereo Camera"])

    # Camera model selection
    camera_model = st.selectbox("Camera Model", ["Standard", "Fisheye"])
    
    
    # Calibration pattern selection
    pattern_type = st.selectbox("Pattern Type", ["Checkerboard", "ChArUcoboard"])
    checkerboard_size = (int(st.text_input("Checkerboard Columns", 18)), int(st.text_input("Checkerboard Rows", 11)))
    square_size = float(st.text_input("Square Size", 0.03))
    optimize = st.checkbox("Run sub-pixel optimization")
    
    if pattern_type == "ChArUcoboard":
        marker_size = float(st.text_input("Marker Size", 0.022))  # Only used for charucoboard
        aruco_dict_name = st.selectbox("Aruco Dictionary", ["DICT_4X4_50", "DICT_4X4_100", "DICT_5X5_100", "DICT_6X6_250", "DICT_7X7_1000", "DICT_ARUCO_ORIGINAL"])
    else:
        marker_size = None
        aruco_dict_name = None

    if 'temp_dir' in state:
        if st.button("Run Calibration", key="run_calibration"):
            if calibration_type == "Single Camera":
                st.write("Running initial calibration...")
                mtx, dist, mean_error, rvecs, tvecs, objpoints, reprojection_errors = calibrate_camera(
                    state.temp_dir, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model
                )
                if mtx is None:
                    st.error("No valid calibration images found.")
                    return
                
                st.write("Initial Calibration Results:")
                st.write("Camera matrix:", mtx)
                st.write("Distortion coefficients:", dist)
                st.write("Reprojection error:", mean_error)
                plot_3d_calibration(objpoints, rvecs, tvecs)
                plot_reprojection_errors(reprojection_errors, "Initial Reprojection Errors")

                if optimize:
                    st.write("Running sub-pixel optimization...")
                    mtx, dist, mean_error, rvecs, tvecs, objpoints, reprojection_errors = calibrate_camera(
                        state.temp_dir, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model, optimize=optimize
                    )
                    st.write("Optimized Calibration Results:")
                    st.write("Reprojection error after optimization:", mean_error)
                    plot_3d_calibration(objpoints, rvecs, tvecs)
                    plot_reprojection_errors(reprojection_errors, "Optimized Reprojection Errors")

                if Path('calibration_data.json').exists():
                    with open('calibration_data.json', 'rb') as f:
                        st.download_button('Download Calibration Data', f, file_name='calibration_data.json')
                else:
                    st.error("No calibration data found. Please run the calibration first.")
            elif calibration_type == "Stereo Camera":
                st.write("Running stereo calibration...")
                left_images_path = st.text_input("Left Camera Images Path")
                right_images_path = st.text_input("Right Camera Images Path")
                
                if not left_images_path or not right_images_path:
                    st.error("Please provide paths for both left and right camera images.")
                    return

                left_mtx, right_mtx, left_dist, right_dist, R, T, mean_error, reprojection_errors = calibrate_stereo_cameras(
                    left_images_path, right_images_path, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model, optimize
                )

                if left_mtx is None or right_mtx is None:
                    st.error("Stereo calibration failed. Please check your input data and parameters.")
                    return

                st.write("Stereo Calibration Results:")
                st.write("Left Camera Matrix:", left_mtx)
                st.write("Right Camera Matrix:", right_mtx)
                st.write("Rotation Matrix:", R)
                st.write("Translation Vector:", T)
                st.write("Reprojection Error:", mean_error)
                plot_reprojection_errors(reprojection_errors, "Stereo Reprojection Errors")

                if Path('stereo_calibration_data.json').exists():
                    with open('stereo_calibration_data.json', 'rb') as f:
                        st.download_button('Download Stereo Calibration Data', f, file_name='stereo_calibration_data.json')
                else:
                    st.error("No stereo calibration data found. Please run the calibration first.")
    else:
        st.error("Please upload images or capture from stream first.")
