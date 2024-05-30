import streamlit as st
from pages2 import calibration_images, camera_calibration, download_examples

# Path to your logo image
logo_path = "logo.png"

# Display the logo in the top left corner
st.sidebar.image(logo_path, use_column_width=True)

# Define a function to render the navigation menu
def render_menu():
    st.sidebar.title("Camera Calibration App")
    return st.sidebar.radio("Steps", ["Calibration Images", "Camera Calibration", "Download & Examples"])

# Get the selected page
page = render_menu()

# Display the selected page
if page == "Calibration Images":
    calibration_images.show()
elif page == "Camera Calibration":
    camera_calibration.show()
elif page == "Download & Examples":
    download_examples.show()
