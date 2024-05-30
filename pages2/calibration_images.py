import streamlit as st
from streamlit_webrtc import WebRtcMode, webrtc_streamer
import tempfile
from streamlit import session_state as state
import os
import cv2
import av
import logging
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

logger = logging.getLogger(__name__)

def get_ice_servers():
    """Use Twilio's TURN server because Streamlit Community Cloud has changed
    its infrastructure and WebRTC connection cannot be established without TURN server now."""
    try:
        account_sid = "ACa040f1a87d88d4384ff1a7f46bd6f91f"
        auth_token = "3b2eea2d9e742c0fd1d4271d7b8aa4e3"
    except KeyError:
        logger.warning(
            "Twilio credentials are not set. Fallback to a free STUN server from Google."
        )
        return [{"urls": ["stun:stun.l.google.com:19302"]}]

    client = Client(account_sid, auth_token)

    try:
        token = client.tokens.create()
    except TwilioRestException as e:
        st.warning(
            f"Error occurred while accessing Twilio API. Fallback to a free STUN server from Google. ({e})"
        )
        return [{"urls": ["stun:stun.l.google.com:19302"]}]

    return token.ice_servers

def video_frame_callback(frame: av.VideoFrame) -> av.VideoFrame:
    img = frame.to_ndarray(format="bgr24")
    if state.get("capturing", False):
        st.write("Capturing")
        img_path = os.path.join(state.temp_dir, f"image_{len(os.listdir(state.temp_dir))}.jpg")
        cv2.imwrite(img_path, img)
        state.capturing = False  # Reset capturing flag after saving
        st.image(img, caption=f"Captured Image {len(os.listdir(state.temp_dir))}", channels="BGR")
    return av.VideoFrame.from_ndarray(img, format="bgr24")

def save_uploaded_files(uploaded_files, dir_prefix):
    temp_dir = tempfile.mkdtemp(prefix=dir_prefix)
    for uploaded_file in uploaded_files:
        with open(os.path.join(temp_dir, uploaded_file.name), "wb") as f:
            f.write(uploaded_file.getbuffer())
    return temp_dir

def show():

    calibration_type = st.selectbox("Calibration Type", ["Single Camera", "Stereo Camera"], key="calibration_type")

    stream_type = st.selectbox("Select Stream Type", ["Upload Images", "Video File"], key="stream_type")
    if stream_type == "Upload Images":
        
        if calibration_type == "Single Camera":
            uploaded_files = st.file_uploader("Upload Calibration Images", type=["jpg", "jpeg", "png"], accept_multiple_files=True, key="upload_files")
            if uploaded_files:
                state.temp_dir = save_uploaded_files(uploaded_files, "single_")
                st.success("Images uploaded successfully!")
        
        elif calibration_type == "Stereo Camera":
            left_uploaded_files = st.file_uploader("Upload Left Camera Images", type=["jpg", "jpeg", "png"], accept_multiple_files=True, key="left_upload_files")
            right_uploaded_files = st.file_uploader("Upload Right Camera Images", type=["jpg", "jpeg", "png"], accept_multiple_files=True, key="right_upload_files")
            
            if left_uploaded_files and right_uploaded_files:
                state.left_temp_dir = save_uploaded_files(left_uploaded_files, "left_")
                state.right_temp_dir = save_uploaded_files(right_uploaded_files, "right_")
                st.success("Left and right images uploaded successfully!")
    
    elif stream_type == "WebRTC Webcam":
        if 'temp_dir' not in state:
            state.temp_dir = tempfile.mkdtemp()
        
        if 'capturing' not in state:
            state.capturing = False

        webrtc_ctx = webrtc_streamer(
            key="object-detection",
            mode=WebRtcMode.SENDRECV,
            rtc_configuration={
                "iceServers": get_ice_servers(),
                "iceTransportPolicy": "relay",
            },
            video_frame_callback=video_frame_callback,
            media_stream_constraints={"video": True, "audio": False},
            async_processing=True,
        )

        if st.button("Capture Image", key="capture_image_webrtc"):
            state.capturing = True
            st.write("Capturing set to True")

    elif stream_type == "RTSP":
        if 'rtsp_caps' not in state:
            state.rtsp_caps = {}

        rtsp_url = st.text_input("RTSP URL", key="rtsp_url")
        if st.button("Start RTSP Stream", key="start_rtsp"):
            if rtsp_url not in state.rtsp_caps:
                state.rtsp_caps[rtsp_url] = cv2.VideoCapture(rtsp_url)
            state.current_cap = state.rtsp_caps[rtsp_url]
            state.temp_dir = tempfile.mkdtemp()
            state.capturing = True

    elif stream_type == "Video File":
        if 'video_caps' not in state:
            state.video_caps = {}

        video_file = st.file_uploader("Upload Video File", type=["mp4", "avi", "mov"], key="video_file")
        if video_file:
            temp_dir = tempfile.mkdtemp()
            video_path = os.path.join(temp_dir, video_file.name)
            with open(video_path, "wb") as f:
                f.write(video_file.getbuffer())
            if video_path not in state.video_caps:
                state.video_caps[video_path] = cv2.VideoCapture(video_path)
            if st.button("Start Video File", key="start_video"):
                state.current_cap = state.video_caps[video_path]
                state.temp_dir = tempfile.mkdtemp()
                state.capturing = True

    if 'capturing' in state and state.capturing and stream_type != "WebRTC Webcam":
        if st.button("Capture Image", key="capture_image"):
            ret, frame = state.current_cap.read()
            if ret:
                img_path = os.path.join(state.temp_dir, f"image_{len(os.listdir(state.temp_dir))}.jpg")
                cv2.imwrite(img_path, frame)
                st.image(frame, caption=f"Captured Image {len(os.listdir(state.temp_dir))}", channels="BGR")

        if st.button("Done Capturing", key="done_capturing"):
            state.capturing = False
            st.success("Finished capturing images!")

    if st.button("Reset Calibration", key="reset_calibration"):
        if 'webcam_caps' in state:
            for cap in state.webcam_caps.values():
                cap.release()
        if 'rtsp_caps' in state:
            for cap in state.rtsp_caps.values():
                cap.release()
        if 'video_caps' in state:
            for cap in state.video_caps.values():
                cap.release()
        if 'current_cap' in state and state.current_cap:
            state.current_cap.release()
        state.temp_dir = None
        state.capturing = False
        st.success("Calibration reset successfully!")


