import streamlit as st
from streamlit import session_state as state
from utils_calibration import calibrate_camera, calibrate_stereo_cameras
from utils_plot import plot_3d_calibration, plot_reprojection_errors, plot_stereo_calibration
from pathlib import Path
import cv2

def show():
    st.title("Camera Calibration")

    # Calibration parameters
    calibration_type = st.selectbox("Calibration Type", ["Single Camera", "Stereo Camera"])
    camera_model = st.selectbox("Camera Model", ["Standard", "Fisheye"])
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

    if 'temp_dir' in state or 'left_temp_dir' in state or 'right_temp_dir' in state:
        run_calibration = st.button("Run Calibration", key="run_calibration")

        if run_calibration:
            if calibration_type == "Single Camera":
                st.write("Running initial calibration...")
                mtx, dist, mean_error, rvecs, tvecs, imgpoints, objpoints, reprojection_errors, images_with_detections = calibrate_camera(
                    state.temp_dir, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model
                )
                if mtx is None:
                    st.error("No valid calibration images found.")
                    return
                
                state.mtx = mtx
                state.dist = dist
                state.mean_error = mean_error
                state.rvecs = rvecs
                state.tvecs = tvecs
                state.imgpoints = imgpoints
                state.objpoints = objpoints
                state.reprojection_errors = reprojection_errors
                state.images_with_detections = images_with_detections

                #st.write("Initial Calibration Results:")
                #st.write("Camera matrix:", state.mtx)
                #st.write("Distortion coefficients:", state.dist)
                #st.write("Reprojection error:", state.mean_error)
                #plot_3d_calibration(state.objpoints, state.rvecs, state.tvecs)
                #plot_reprojection_errors(state.reprojection_errors, "Initial Reprojection Errors")

                if optimize:
                    st.write("Running sub-pixel optimization...")
                    mtx, dist, mean_error, rvecs, tvecs, imgpoints, objpoints, reprojection_errors, images_with_detections = calibrate_camera(
                        state.temp_dir, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model, optimize=optimize
                    )
                    state.mtx = mtx
                    state.dist = dist
                    state.mean_error = mean_error
                    state.rvecs = rvecs
                    state.tvecs = tvecs
                    state.imgpoints = imgpoints
                    state.objpoints = objpoints
                    state.reprojection_errors = reprojection_errors
                    state.images_with_detections = images_with_detections

                    #st.subheader("Reprojection")
                    #plot_reprojection_errors(state.reprojection_errors, "Optimized Reprojection Errors")

                    #st.write("Optimized Calibration Results:")
                    #st.write("Reprojection error after optimization:", state.mean_error)
                    #st.subheader("3D Calibration Visualization")
                    #plot_3d_calibration(state.objpoints, state.rvecs, state.tvecs)
                
                if Path('calibration_data.json').exists():
                    with open('calibration_data.json', 'rb') as f:
                        st.download_button('Download Calibration Data', f, file_name='calibration_data.json')
                else:
                    st.error("No calibration data found. Please run the calibration first.")
            
            elif calibration_type == "Stereo Camera":
                st.write("Running stereo calibration...")
                left_mtx, right_mtx, left_dist, right_dist, R, T, mean_error, reprojection_errors, left_images_with_detections, right_images_with_detections, left_rvecs, left_tvecs, right_rvecs, right_tvecs, objpoints = calibrate_stereo_cameras(
                    state.left_temp_dir, state.right_temp_dir, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model, optimize
                )
                
                if left_mtx is None or right_mtx is None:
                    st.error("Stereo calibration failed. Please check your input data and parameters.")
                    return
                
                state.left_mtx = left_mtx
                state.right_mtx = right_mtx
                state.left_dist = left_dist
                state.right_dist = right_dist
                state.R = R
                state.T = T
                state.mean_error = mean_error
                state.reprojection_errors = reprojection_errors
                state.left_images_with_detections = left_images_with_detections
                state.right_images_with_detections = right_images_with_detections
                state.left_rvecs = left_rvecs
                state.left_tvecs = left_tvecs
                state.right_rvecs = right_rvecs
                state.right_tvecs = right_tvecs
                state.objpoints = objpoints

                #st.subheader("Reprojection")
                #plot_reprojection_errors(state.reprojection_errors, "Stereo Reprojection Errors")

                #st.subheader("Stereo Calibration Results")
                #plot_stereo_calibration(state.objpoints, state.left_rvecs, state.left_tvecs, state.right_rvecs, state.right_tvecs)  # Plot stereo calibration

                #st.write("Stereo Calibration Results:")
                #st.write("Left Camera Matrix:", state.left_mtx)
                #st.write("Right Camera Matrix:", state.right_mtx)
                #st.write("Rotation Matrix:", state.R)
                #st.write("Translation Vector:", state.T)
                #st.write("Reprojection Error:", state.mean_error)
                
            
                if Path('stereo_calibration_data.json').exists():
                    with open('stereo_calibration_data.json', 'rb') as f:
                        st.download_button('Download Stereo Calibration Data', f, file_name='stereo_calibration_data.json')
                else:
                    st.error("No stereo calibration data found. Please run the calibration first.")

        # Display image selection dropdown for Single Camera
        if 'images_with_detections' in state and calibration_type == "Single Camera":
            selected_image = st.selectbox("Select Image to View Detections", range(len(state.images_with_detections)))
            if selected_image is not None:
                st.image(cv2.cvtColor(state.images_with_detections[selected_image], cv2.COLOR_BGR2RGB), caption="Detected Markers and Checkerboard")
        
        # Display image pair selection dropdown for Stereo Camera
        if 'left_images_with_detections' in state and 'right_images_with_detections' in state and calibration_type == "Stereo Camera":
            selected_image = st.selectbox("Select Image Pair to View Detections", range(len(state.left_images_with_detections)))
            if selected_image is not None:
                col1, col2 = st.columns(2)
                with col1:
                    st.image(cv2.cvtColor(state.left_images_with_detections[selected_image], cv2.COLOR_BGR2RGB), caption="Left Camera")
                with col2:
                    st.image(cv2.cvtColor(state.right_images_with_detections[selected_image], cv2.COLOR_BGR2RGB), caption="Right Camera")

        # Always display previously computed calibration results
        if 'mtx' in state:
            st.subheader("Calibration Results")
            st.write("Camera matrix:", state.mtx)
            st.write("Distortion coefficients:", state.dist)
            st.subheader("Reprojection")
            st.write("Reprojection error:", state.mean_error)
            plot_reprojection_errors(state.reprojection_errors, "Reprojection Error Plot")
            st.subheader("3D Calibration Visualization")
            plot_3d_calibration(state.objpoints, state.rvecs, state.tvecs)

            
            if optimize:
                st.subheader("Optimized Calibration Results")
                st.write("Reprojection error after optimization:", state.mean_error)
                plot_reprojection_errors(state.reprojection_errors, "Optimized Reprojection Error Plot")
                st.subheader("3D Calibration Visualization")
                plot_3d_calibration(state.objpoints, state.rvecs, state.tvecs)


        if 'left_mtx' in state and 'right_mtx' in state:
            st.subheader("Stereo Calibration Results")
            st.write("Left Camera Matrix:", state.left_mtx)
            st.write("Right Camera Matrix:", state.right_mtx)
            st.write("Rotation Matrix:", state.R)
            st.write("Translation Vector:", state.T)
            st.subheader("Reprojection")
            st.write("Reprojection Error:", state.mean_error)
            plot_reprojection_errors(state.reprojection_errors, "Stereo Reprojection Error Plot")
            st.subheader("3D Calibration Visualization")
            plot_stereo_calibration(state.objpoints, state.left_rvecs, state.left_tvecs, state.right_rvecs, state.right_tvecs)  # Plot stereo calibration

        
    if st.button("Reset Calibration", key="reset_calibration"):
        for key in list(state.keys()):
            del state[key]
        st.success("Calibration reset successfully!")

if __name__ == '__main__':
    show()
