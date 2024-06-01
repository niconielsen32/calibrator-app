import plotly.graph_objects as go
import cv2
import numpy as np
import streamlit as st

def plot_3d_calibration(objpoints, rvecs, tvecs):
    fig = go.Figure()

    for i in range(len(objpoints)):
        rmat, _ = cv2.Rodrigues(rvecs[i])
        transformed_objpoints = np.dot(objpoints[i], rmat.T) + tvecs[i].T
        
        fig.add_trace(go.Scatter3d(
            x=transformed_objpoints[:, 0],
            y=transformed_objpoints[:, 1],
            z=transformed_objpoints[:, 2],
            mode='markers',
            marker=dict(size=2, color='red'),
            name=f'Object Points {i}'
        ))

        fig.add_trace(go.Scatter3d(
            x=[tvecs[i][0][0]],
            y=[tvecs[i][1][0]],
            z=[tvecs[i][2][0]],
            mode='markers',
            marker=dict(size=4, color='green'),
            name=f'Camera Position {i}'
        ))

    fig.update_layout(scene=dict(
        xaxis_title='X',
        yaxis_title='Y',
        zaxis_title='Z'
    ))

    st.plotly_chart(fig)


def plot_reprojection_errors(errors, title):
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=list(range(len(errors))),
        y=errors,
        marker=dict(color='blue'),
        width=[0.1] * len(errors)  # Set the width of the bars to make them closer
    ))
    fig.update_layout(
        title=title,
        xaxis=dict(
            title='Image Index',
            tickmode='array',
            tickvals=list(range(len(errors))),
            type='category'  # Ensure only integers are shown
        ),
        yaxis_title='Reprojection Error'
    )
    st.plotly_chart(fig)



def plot_stereo_calibration(objpoints, left_rvecs, left_tvecs, right_rvecs, right_tvecs):
    fig = go.Figure()

    for i in range(len(objpoints)):
        left_rmat, _ = cv2.Rodrigues(left_rvecs[i])
        right_rmat, _ = cv2.Rodrigues(right_rvecs[i])
        
        transformed_left_objpoints = np.dot(objpoints[i], left_rmat.T) + left_tvecs[i].T
        transformed_right_objpoints = np.dot(objpoints[i], right_rmat.T) + right_tvecs[i].T
        
        fig.add_trace(go.Scatter3d(
            x=transformed_left_objpoints[:, 0],
            y=transformed_left_objpoints[:, 1],
            z=transformed_left_objpoints[:, 2],
            mode='markers',
            marker=dict(size=2, color='red'),
            name=f'Left Object Points {i}'
        ))
        
        fig.add_trace(go.Scatter3d(
            x=transformed_right_objpoints[:, 0],
            y=transformed_right_objpoints[:, 1],
            z=transformed_right_objpoints[:, 2],
            mode='markers',
            marker=dict(size=2, color='blue'),
            name=f'Right Object Points {i}'
        ))

        fig.add_trace(go.Scatter3d(
            x=[left_tvecs[i][0][0]],
            y=[left_tvecs[i][1][0]],
            z=[left_tvecs[i][2][0]],
            mode='markers',
            marker=dict(size=4, color='green'),
            name=f'Left Camera Position {i}'
        ))
        
        fig.add_trace(go.Scatter3d(
            x=[right_tvecs[i][0][0]],
            y=[right_tvecs[i][1][0]],
            z=[right_tvecs[i][2][0]],
            mode='markers',
            marker=dict(size=4, color='purple'),
            name=f'Right Camera Position {i}'
        ))

    fig.update_layout(scene=dict(
        xaxis_title='X',
        yaxis_title='Y',
        zaxis_title='Z'
    ))

    st.plotly_chart(fig)
