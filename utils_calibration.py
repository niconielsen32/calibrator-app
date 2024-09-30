import cv2
import json
import numpy as np
import os
import glob
import streamlit as st
from streamlit import session_state as state

def calibrate_camera(images_path, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model="Standard", optimize=False):
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)

    print(checkerboard_size)
    # Correct: Create an array with the proper number of checkerboard corners
    objp = np.zeros(((checkerboard_size[0]) * (checkerboard_size[1]), 3), np.float32)
    print(objp.shape)
    # This line now correctly fills the array
    objp[:, :2] = np.mgrid[0:checkerboard_size[0], 0:checkerboard_size[1]].T.reshape(-1, 2)
    print(objp.shape)
    objp *= square_size

    if pattern_type == 'ChArUcoboard':
        objp = np.zeros((checkerboard_size[0] * checkerboard_size[1], 3), np.float32)
        objp[:, :2] = np.mgrid[0:checkerboard_size[0], 0:checkerboard_size[1]].T.reshape(-1, 2)
        objp *= square_size
    
    objpoints = []
    imgpoints = []
    images_with_detections = []
    
    images = glob.glob(os.path.join(images_path, '*'))
    
    if not images:
        return None, None, None, None, None, None, None, None, images_with_detections
    
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
    

    if pattern_type == 'ChArUcoboard':
        aruco_dict = cv2.aruco.getPredefinedDictionary(aruco_dicts[aruco_dict_name])
        board = cv2.aruco.CharucoBoard((checkerboard_size[0], checkerboard_size[1]), square_size, marker_size, aruco_dict)
    
    for fname in images:
        img = cv2.imread(fname)
        if img is None:
            continue
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        found = False
        corners = []
        if pattern_type == 'Checkerboard':

            checkerboard_size = (checkerboard_size[0], checkerboard_size[1])

            print(checkerboard_size)
            found, corners = cv2.findChessboardCorners(gray, checkerboard_size)
            if found:
                term = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_COUNT, 30, 0.1)
                cv2.cornerSubPix(gray, corners, (5, 5), (-1, -1), term)
                frame_img_points = corners.reshape(-1, 2)
                frame_obj_points = objp
                img_with_detections = cv2.drawChessboardCorners(img, checkerboard_size, corners, found)
        elif pattern_type == 'ChArUcoboard':
            corners, ids, _ = cv2.aruco.detectMarkers(gray, aruco_dict)
            if ids is not None and len(corners) > 0:
                _, charuco_corners, charuco_ids = cv2.aruco.interpolateCornersCharuco(corners, ids, gray, board)
                if charuco_corners is not None and charuco_ids is not None and len(charuco_corners) > 3:
                    frame_img_points = charuco_corners
                    frame_obj_points = board.getChessboardCorners()[charuco_ids.flatten()]
                    found = True
                    img_with_detections = cv2.aruco.drawDetectedMarkers(img, corners, ids)
                    img_with_detections = cv2.aruco.drawDetectedCornersCharuco(img_with_detections, charuco_corners, charuco_ids)
        
        if not found:
            continue
        
        imgpoints.append(frame_img_points)
        objpoints.append(frame_obj_points)
        images_with_detections.append(img_with_detections)
    
    if not objpoints or not imgpoints:
        return None, None, None, None, None, None, None, None, images_with_detections
    
    if camera_model == "Standard":
        ret, mtx, dist, rvecs, tvecs = cv2.calibrateCamera(objpoints, imgpoints, gray.shape[::-1], None, None)
        if optimize:
            for i in range(len(objpoints)):
                imgpoints[i] = cv2.cornerSubPix(gray, imgpoints[i], (11, 11), (-1, -1), criteria)
            ret, mtx, dist, rvecs, tvecs = cv2.calibrateCamera(objpoints, imgpoints, gray.shape[::-1], None, None)
    elif camera_model == "Fisheye":
        objpoints = [np.array(obj).reshape(-1, 1, 3) for obj in objpoints]
        imgpoints = [np.array(img).reshape(-1, 1, 2) for img in imgpoints]
        ret, mtx, dist, rvecs, tvecs = cv2.fisheye.calibrate(
            objpoints, imgpoints, gray.shape[::-1], None, None,
            criteria=criteria,
            flags=(cv2.fisheye.CALIB_RECOMPUTE_EXTRINSIC |
                   cv2.fisheye.CALIB_CHECK_COND |
                   cv2.fisheye.CALIB_FIX_SKEW)
        )
        if optimize:
            for i in range(len(objpoints)):
                imgpoints[i] = cv2.cornerSubPix(gray, imgpoints[i], (11, 11), (-1, -1), criteria)
            ret, mtx, dist, rvecs, tvecs = cv2.fisheye.calibrate(
                objpoints, imgpoints, gray.shape[::-1], None, None,
                criteria=criteria,
                flags=(cv2.fisheye.CALIB_RECOMPUTE_EXTRINSIC |
                       cv2.fisheye.CALIB_CHECK_COND |
                       cv2.fisheye.CALIB_FIX_SKEW)
            )
    
    calibration_data = {
        'camera_matrix': mtx.tolist(),
        'fx': mtx[0, 0],
        'fy': mtx[1, 1],
        'cx': mtx[0, 2],
        'cy': mtx[1, 2],
        'distortion': dist.tolist(),
        'rotation_vecs': [rvec.tolist() for rvec in rvecs],
        'translation_vecs': [tvec.tolist() for tvec in tvecs]
    }
    
    with open('calibration_data.json', 'w') as f:
        json.dump(calibration_data, f)
    
    mean_error = 0
    reprojection_errors = []
    for i in range(len(objpoints)):
        if camera_model == "Standard":
            imgpoints2, _ = cv2.projectPoints(objpoints[i], rvecs[i], tvecs[i], mtx, dist)
        elif camera_model == "Fisheye":
            imgpoints2, _ = cv2.fisheye.projectPoints(objpoints[i], rvecs[i], tvecs[i], mtx, dist)
        imgpoints[i] = np.asarray(imgpoints[i], dtype=np.float32).reshape(-1, 1, 2)
        imgpoints2 = np.asarray(imgpoints2, dtype=np.float32)
        error = cv2.norm(imgpoints[i], imgpoints2, cv2.NORM_L2) / len(imgpoints2)
        mean_error += error
        reprojection_errors.append(error)
    
    mean_error = mean_error / len(objpoints)
    
    return mtx, dist, mean_error, rvecs, tvecs, imgpoints, objpoints, reprojection_errors, images_with_detections



def calibrate_stereo_cameras(left_images_path, right_images_path, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model="Standard", optimize=False):
    left_mtx, left_dist, left_error, left_rvecs, left_tvecs, left_imgpoints, left_objpoints, left_reprojection_errors, left_images_with_detections = calibrate_camera(
        left_images_path, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model, optimize)
    right_mtx, right_dist, right_error, right_rvecs, right_tvecs, right_imgpoints, right_objpoints, right_reprojection_errors, right_images_with_detections = calibrate_camera(
        right_images_path, checkerboard_size, square_size, pattern_type, marker_size, aruco_dict_name, camera_model, optimize)
    
    if left_mtx is None or right_mtx is None:
        return None, None, None, None, None, None, None, None, None, None
    
    objpoints = left_objpoints
    
    if not objpoints or not left_imgpoints or not right_imgpoints:
        return None, None, None, None, None, None, None, None, None, None
    
    images = glob.glob(os.path.join(left_images_path, '*'))
    gray = cv2.cvtColor(cv2.imread(images[0]), cv2.COLOR_BGR2GRAY)
    
    ret, left_mtx, left_dist, right_mtx, right_dist, R, T, E, F = cv2.stereoCalibrate(
        objpoints, left_imgpoints, right_imgpoints, left_mtx, left_dist, right_mtx, right_dist, gray.shape[::-1]
    )
    
    R1, R2, P1, P2, Q, validPixROI1, validPixROI2 = cv2.stereoRectify(
        left_mtx, left_dist, right_mtx, right_dist, gray.shape[::-1], R, T
    )
    
    stereo_calibration_data = {
        'left_camera_matrix': left_mtx.tolist(),
        'left_distortion': left_dist.tolist(),
        'right_camera_matrix': right_mtx.tolist(),
        'right_distortion': right_dist.tolist(),
        'rotation_matrix': R.tolist(),
        'translation_vector': T.tolist(),
        'essential_matrix': E.tolist(),
        'fundamental_matrix': F.tolist(),
        'rectification_matrix_left': R1.tolist(),
        'rectification_matrix_right': R2.tolist(),
        'projection_matrix_left': P1.tolist(),
        'projection_matrix_right': P2.tolist(),
        'disparity-to-depth_mapping': Q.tolist(),
        'valid_pixel_ROI_left': validPixROI1,
        'valid_pixel_ROI_right': validPixROI2
    }
    
    with open('stereo_calibration_data.json', 'w') as f:
        json.dump(stereo_calibration_data, f)
    
    mean_error = 0
    reprojection_errors = []
    for i in range(len(objpoints)):
        imgpoints2, _ = cv2.projectPoints(objpoints[i], left_rvecs[i], left_tvecs[i], left_mtx, left_dist)
        error = cv2.norm(left_imgpoints[i], imgpoints2, cv2.NORM_L2) / len(imgpoints2)
        mean_error += error
        reprojection_errors.append(error)
        
        imgpoints2, _ = cv2.projectPoints(objpoints[i], right_rvecs[i], right_tvecs[i], right_mtx, right_dist)
        error = cv2.norm(right_imgpoints[i], imgpoints2, cv2.NORM_L2) / len(imgpoints2)
        mean_error += error
        reprojection_errors.append(error)
    
    mean_error = mean_error / (2 * len(objpoints))
    
    return left_mtx, right_mtx, left_dist, right_dist, R, T, mean_error, reprojection_errors, left_images_with_detections, right_images_with_detections, left_rvecs, left_tvecs, right_rvecs, right_tvecs, objpoints
