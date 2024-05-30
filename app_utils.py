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


def capture_images_from_stream(stream_type, stream_source):
    cap = None
    if stream_type == 'Webcam':
        cap = cv2.VideoCapture(stream_source)
    elif stream_type == 'RTSP':
        cap = cv2.VideoCapture(stream_source)
    elif stream_type == 'Video File':
        cap = cv2.VideoCapture(stream_source)
    
    captured_images = []
    temp_dir = tempfile.mkdtemp()
    
    if not cap.isOpened():
        st.error("Failed to open stream.")
        return None

    stframe = st.empty()
    while True:
        ret, frame = cap.read()
        if not ret:
            st.error("Failed to capture frame.")
            break
        
        stframe.image(frame, channels="BGR")
        if st.button("Capture Image", key=f"capture_{state.capture_key}"):
            img_path = os.path.join(temp_dir, f"capture_{len(captured_images)}.jpg")
            cv2.imwrite(img_path, frame)
            captured_images.append(img_path)
            st.success(f"Captured image saved to {img_path}")
            state.capture_key += 1  # Increment the key for the next button
        
        if st.button("Stop Capture", key=f"stop_{state.stop_key}"):
            state.stop_key += 1  # Increment the key for the next button
            break
    
    cap.release()
    cv2.destroyAllWindows()
    return temp_dir

# Ensure session state variables are initialized
if 'capture_key' not in state:
    state.capture_key = 0
if 'stop_key' not in state:
    state.stop_key = 0
if 'temp_dir' not in state:
    state.temp_dir = None
                     