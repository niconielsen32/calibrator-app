import cv2
import json
import numpy as np
import os
import glob
import streamlit as st
from matplotlib import pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import tempfile
from streamlit import session_state as state


def plot_3d_calibration(objpoints, rvecs, tvecs):
    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    
    for i in range(len(objpoints)):
        rmat, _ = cv2.Rodrigues(rvecs[i])
        imgpts, _ = cv2.projectPoints(objpoints[i], rvecs[i], tvecs[i], np.eye(3), np.zeros((4, 1)))

        if objpoints[i].shape[1] < 3:
            continue
        ax.scatter(objpoints[i][:, 0], objpoints[i][:, 1], objpoints[i][:, 2], c='r', marker='o')
        ax.scatter(imgpts[:, 0, 0], imgpts[:, 0, 1], c='b', marker='x')
        
        ax.scatter([0, tvecs[i][0][0]], [0, tvecs[i][1][0]], [0, tvecs[i][2][0]], c='g')
    
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    st.pyplot(fig)

def plot_reprojection_errors(errors, title):
    fig, ax = plt.subplots()
    ax.scatter(range(len(errors)), errors, c='b', marker='o')
    ax.set_xlabel('Image Index')
    ax.set_ylabel('Reprojection Error')
    ax.set_title(title)
    st.pyplot(fig)

def draw_detections(image, corners, checkerboard_size, pattern_type):
    if pattern_type == 'chessboard':
        return cv2.drawChessboardCorners(image, checkerboard_size, corners, True)
    elif pattern_type == 'charucoboard':
        cv2.aruco.drawDetectedMarkers(image, corners)
        return image
    return image
