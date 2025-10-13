import React from 'react';
import Plot from 'react-plotly.js';

interface Visualization3DProps {
  objectPoints?: number[][];
  cameraPosition?: number[];
}

const Visualization3D: React.FC<Visualization3DProps> = ({ 
  objectPoints = generateGridPoints(),
  cameraPosition = [0, 0, 0]
}) => {
  return (
    <div className="relative">
      <Plot
        data={[
          // Dense grid of object points
          {
            type: 'scatter3d',
            mode: 'markers',
            x: objectPoints.map(p => p[0]),
            y: objectPoints.map(p => p[1]),
            z: objectPoints.map(p => p[2]),
            marker: {
              size: 3,
              color: 'red',
              symbol: 'circle',
            },
            name: 'Object Points'
          },
          // Camera position
          {
            type: 'scatter3d',
            mode: 'markers',
            x: [cameraPosition[0]],
            y: [cameraPosition[1]],
            z: [cameraPosition[2]],
            marker: {
              size: 8,
              color: 'green',
              symbol: 'circle',
            },
            name: 'Camera Position'
          },
          // Grid lines - X direction
          ...generateGridLines('x'),
          // Grid lines - Y direction
          ...generateGridLines('y')
        ]}
        layout={{
          title: '3D Calibration Visualization',
          scene: {
            xaxis: { 
              title: 'X',
              range: [-0.2, 0.4],
              color: '#A1A1AA',
              gridcolor: '#27272A',
              zerolinecolor: '#52525B'
            },
            yaxis: { 
              title: 'Y',
              range: [-1, -0.6],
              color: '#A1A1AA',
              gridcolor: '#27272A',
              zerolinecolor: '#52525B'
            },
            zaxis: { 
              title: 'Z',
              range: [1.35, 1.45],
              color: '#A1A1AA',
              gridcolor: '#27272A',
              zerolinecolor: '#52525B'
            },
            camera: {
              eye: { x: 1.5, y: 1.5, z: 1.5 },
              up: { x: 0, y: 0, z: 1 }
            },
            aspectmode: 'manual',
            aspectratio: { x: 1, y: 1, z: 1 }
          },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          showlegend: true,
          legend: { 
            x: 0.02,
            y: 0.98,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: 'transparent',
            borderwidth: 0,
            font: { 
              color: '#A1A1AA',
              size: 14
            },
            itemclick: 'toggleothers',
            itemdoubleclick: 'toggle',
            itemwidth: 40,
            itemsizing: 'constant',
            itemstyle: {
              cursor: 'pointer'
            }
          },
          margin: { t: 30, b: 0, l: 0, r: 60 },
          modebar: {
            bgcolor: 'transparent',
            orientation: 'v',
            color: '#A1A1AA',
            activecolor: '#FFFFFF'
          }
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
          displaylogo: false,
          modeBarStyle: {
            orientation: 'v'
          },
          modeBarButtonsToAdd: [
            {
              name: 'Reset Camera',
              click: function(gd) {
                const scene = gd._fullLayout.scene;
                if (scene) {
                  scene.camera = {
                    eye: { x: 1.5, y: 1.5, z: 1.5 },
                    up: { x: 0, y: 0, z: 1 }
                  };
                }
              }
            },
            {
              name: 'Reset Z-axis',
              click: function(gd) {
                const scene = gd._fullLayout.scene;
                if (scene) {
                  scene.camera.eye.z = 1.5;
                }
              }
            }
          ]
        }}
        style={{ width: '100%', height: '600px' }}
        className="plotly-graph"
      />
      <style>
        {`
          .plotly-graph .modebar {
            right: 16px !important;
            background: transparent !important;
            gap: 8px !important;
          }
          .plotly-graph .modebar-group {
            padding: 0 !important;
            margin: 0 !important;
          }
          .plotly-graph .modebar-btn {
            padding: 4px !important;
          }
        `}
      </style>
    </div>
  );
};

// Helper function to generate a grid of points
function generateGridPoints() {
  const points: number[][] = [];
  const rows = 20;
  const cols = 20;
  const xStart = -0.2;
  const yStart = -1.0;
  const z = 1.4;
  const xStep = 0.03;
  const yStep = 0.02;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      points.push([
        xStart + i * xStep,
        yStart + j * yStep,
        z
      ]);
    }
  }
  return points;
}

// Helper function to generate grid lines
function generateGridLines(direction: 'x' | 'y') {
  const lines = [];
  const count = direction === 'x' ? 10 : 8;
  const start = direction === 'x' ? -0.2 : -1.0;
  const step = direction === 'x' ? 0.06 : 0.05;
  
  for (let i = 0; i < count; i++) {
    const pos = start + i * step;
    const trace = {
      type: 'scatter3d',
      mode: 'lines',
      x: direction === 'x' ? [pos, pos] : [-0.2, 0.4],
      y: direction === 'y' ? [pos, pos] : [-1.0, -0.6],
      z: [1.35, 1.45],
      line: {
        color: '#52525B',
        width: 1
      },
      showlegend: false,
      hoverinfo: 'skip'
    };
    lines.push(trace);
  }
  return lines;
}

export default Visualization3D;
