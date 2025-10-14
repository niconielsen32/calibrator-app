import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';

interface Enhanced3DVisualizationProps {
  rotationVectors: number[][][];
  translationVectors: number[][][];
  checkerboardRows: number;
  checkerboardCols: number;
  squareSize: number;
}

const Enhanced3DVisualization: React.FC<Enhanced3DVisualizationProps> = ({
  rotationVectors,
  translationVectors,
  checkerboardRows,
  checkerboardCols,
  squareSize
}) => {
  const visualizationData = useMemo(() => {
    const traces: any[] = [];

    // Debug logging
    console.log('3D Visualization Data:', {
      rotationVectors,
      translationVectors,
      checkerboardRows,
      checkerboardCols,
      squareSize
    });

    // Validate input data
    if (!rotationVectors || !translationVectors || rotationVectors.length === 0 || translationVectors.length === 0) {
      console.warn('Missing or empty rotation/translation vectors');
      return traces;
    }

    if (!checkerboardRows || !checkerboardCols || !squareSize) {
      console.warn('Missing checkerboard parameters');
      return traces;
    }

    // Generate checkerboard pattern points
    const generateBoardPoints = () => {
      const points: number[][] = [];
      for (let i = 0; i < checkerboardRows; i++) {
        for (let j = 0; j < checkerboardCols; j++) {
          points.push([j * squareSize, i * squareSize, 0]);
        }
      }
      return points;
    };

    const boardPoints = generateBoardPoints();

    // Helper function to convert rotation vector to rotation matrix
    const rodrigues = (rvec: number[]): number[][] => {
      const theta = Math.sqrt(rvec[0]**2 + rvec[1]**2 + rvec[2]**2);
      if (theta < 1e-10) {
        return [[1,0,0], [0,1,0], [0,0,1]];
      }
      const r = rvec.map(v => v / theta);
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      const oneMinusCos = 1 - cosTheta;

      return [
        [
          cosTheta + r[0]**2 * oneMinusCos,
          r[0] * r[1] * oneMinusCos - r[2] * sinTheta,
          r[0] * r[2] * oneMinusCos + r[1] * sinTheta
        ],
        [
          r[1] * r[0] * oneMinusCos + r[2] * sinTheta,
          cosTheta + r[1]**2 * oneMinusCos,
          r[1] * r[2] * oneMinusCos - r[0] * sinTheta
        ],
        [
          r[2] * r[0] * oneMinusCos - r[1] * sinTheta,
          r[2] * r[1] * oneMinusCos + r[0] * sinTheta,
          cosTheta + r[2]**2 * oneMinusCos
        ]
      ];
    };

    // Transform and plot each calibration board
    rotationVectors.forEach((rvec, idx) => {
      const tvec = translationVectors[idx];

      // Validate that rvec and tvec exist and have proper structure
      if (!rvec || !tvec || !Array.isArray(rvec) || !Array.isArray(tvec)) {
        return;
      }

      // Handle different possible formats for rotation and translation vectors
      let rvecFlat: number[];
      let tvecFlat: number[];

      if (Array.isArray(rvec[0])) {
        // Format: [[x], [y], [z]]
        rvecFlat = [rvec[0][0], rvec[1][0], rvec[2][0]];
      } else {
        // Format: [x, y, z]
        rvecFlat = rvec as number[];
      }

      if (Array.isArray(tvec[0])) {
        // Format: [[x], [y], [z]]
        tvecFlat = [tvec[0][0], tvec[1][0], tvec[2][0]];
      } else {
        // Format: [x, y, z]
        tvecFlat = tvec as number[];
      }

      if (rvecFlat.length !== 3 || tvecFlat.length !== 3) {
        return;
      }

      const R = rodrigues(rvecFlat);
      const t = tvecFlat;

      // Transform board points
      const transformedPoints = boardPoints.map(point => {
        const rotated = [
          R[0][0] * point[0] + R[0][1] * point[1] + R[0][2] * point[2],
          R[1][0] * point[0] + R[1][1] * point[1] + R[1][2] * point[2],
          R[2][0] * point[0] + R[2][1] * point[1] + R[2][2] * point[2]
        ];
        return [
          rotated[0] + t[0],
          rotated[1] + t[1],
          rotated[2] + t[2]
        ];
      });

      // Add board points
      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        x: transformedPoints.map(p => p[0]),
        y: transformedPoints.map(p => p[1]),
        z: transformedPoints.map(p => p[2]),
        marker: {
          size: 2,
          color: `hsl(${(idx * 360 / rotationVectors.length)}, 70%, 50%)`,
        },
        name: `Board ${idx + 1}`,
        showlegend: true
      });

      // Add board corners - validate indices first
      if (transformedPoints.length < checkerboardRows * checkerboardCols) {
        return; // Not enough points
      }

      const corners = [
        transformedPoints[0], // Top-left
        transformedPoints[checkerboardCols - 1], // Top-right
        transformedPoints[transformedPoints.length - 1], // Bottom-right
        transformedPoints[(checkerboardRows - 1) * checkerboardCols] // Bottom-left (first point of last row)
      ];

      // Verify all corners exist
      if (corners.some(c => !c)) {
        return;
      }

      // Draw board outline
      const outlineX = [...corners.map(p => p[0]), corners[0][0]];
      const outlineY = [...corners.map(p => p[1]), corners[0][1]];
      const outlineZ = [...corners.map(p => p[2]), corners[0][2]];

      traces.push({
        type: 'scatter3d',
        mode: 'lines',
        x: outlineX,
        y: outlineY,
        z: outlineZ,
        line: {
          color: `hsl(${(idx * 360 / rotationVectors.length)}, 70%, 50%)`,
          width: 4
        },
        showlegend: false,
        hoverinfo: 'skip'
      });

      // Camera position for this view
      traces.push({
        type: 'scatter3d',
        mode: 'markers+text',
        x: [0],
        y: [0],
        z: [0],
        marker: {
          size: 6,
          color: 'red',
          symbol: 'diamond',
        },
        text: [`Cam ${idx + 1}`],
        textposition: 'top center',
        textfont: { size: 10, color: 'white' },
        name: idx === 0 ? 'Camera Poses' : undefined,
        showlegend: idx === 0,
        legendgroup: 'cameras'
      });

      // Camera coordinate axes (scaled)
      const axisLength = squareSize * 3;
      const axes = [
        { color: 'red', name: 'X-axis', points: [[0,0,0], [axisLength,0,0]] },
        { color: 'green', name: 'Y-axis', points: [[0,0,0], [0,axisLength,0]] },
        { color: 'blue', name: 'Z-axis', points: [[0,0,0], [0,0,axisLength]] }
      ];

      if (idx === 0) {
        axes.forEach(axis => {
          traces.push({
            type: 'scatter3d',
            mode: 'lines',
            x: axis.points.map(p => p[0]),
            y: axis.points.map(p => p[1]),
            z: axis.points.map(p => p[2]),
            line: {
              color: axis.color,
              width: 3
            },
            name: axis.name,
            showlegend: true
          });
        });
      }

      // Draw line from camera to board center
      const boardCenter = [
        transformedPoints.reduce((sum, p) => sum + p[0], 0) / transformedPoints.length,
        transformedPoints.reduce((sum, p) => sum + p[1], 0) / transformedPoints.length,
        transformedPoints.reduce((sum, p) => sum + p[2], 0) / transformedPoints.length
      ];

      traces.push({
        type: 'scatter3d',
        mode: 'lines',
        x: [0, boardCenter[0]],
        y: [0, boardCenter[1]],
        z: [0, boardCenter[2]],
        line: {
          color: 'rgba(150, 150, 150, 0.3)',
          width: 1,
          dash: 'dash'
        },
        showlegend: false,
        hoverinfo: 'skip'
      });
    });

    return traces;
  }, [rotationVectors, translationVectors, checkerboardRows, checkerboardCols, squareSize]);

  // Check if we have data
  const hasData = visualizationData.length > 0;

  return (
    <div className="relative">
      {hasData ? (
        <>
          <Plot
            data={visualizationData}
            layout={{
              title: {
                text: 'Camera Calibration 3D Scene',
                font: { color: '#A1A1AA', size: 18 }
              },
              scene: {
                xaxis: {
                  title: 'X (meters)',
                  backgroundcolor: '#1C1C1C',
                  gridcolor: '#27272A',
                  showbackground: true,
                  zerolinecolor: '#52525B'
                },
                yaxis: {
                  title: 'Y (meters)',
                  backgroundcolor: '#1C1C1C',
                  gridcolor: '#27272A',
                  showbackground: true,
                  zerolinecolor: '#52525B'
                },
                zaxis: {
                  title: 'Z (meters)',
                  backgroundcolor: '#1C1C1C',
                  gridcolor: '#27272A',
                  showbackground: true,
                  zerolinecolor: '#52525B'
                },
                camera: {
                  eye: { x: 1.5, y: -1.5, z: 1.2 },
                  up: { x: 0, y: 0, z: 1 }
                },
                aspectmode: 'data'
              },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              showlegend: true,
              legend: {
                x: 0.02,
                y: 0.98,
                xanchor: 'left',
                yanchor: 'top',
                bgcolor: 'rgba(28, 28, 28, 0.8)',
                bordercolor: '#52525B',
                borderwidth: 1,
                font: {
                  color: '#A1A1AA',
                  size: 12
                }
              },
              margin: { t: 40, b: 0, l: 0, r: 0 }
            }}
            config={{
              responsive: true,
              displayModeBar: true,
              modeBarButtonsToRemove: ['toImage'],
              displaylogo: false
            }}
            style={{ width: '100%', height: '700px' }}
          />
          <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-800 rounded-lg">
            <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-2">Visualization Guide</h4>
            <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-1">
              <li>• <span className="text-red-500">Red diamonds</span>: Camera positions (origin)</li>
              <li>• <span className="text-blue-400">Colored points</span>: Checkerboard patterns at different poses</li>
              <li>• <span className="text-gray-400">Dashed lines</span>: Camera viewing rays to board centers</li>
              <li>• <span className="text-red-500">Red</span>/<span className="text-green-500">Green</span>/<span className="text-blue-500">Blue</span>: Camera coordinate axes (X/Y/Z)</li>
              <li>• Each color represents a different calibration image</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[700px] bg-stone-50 dark:bg-stone-800 rounded-lg">
          <div className="text-center p-8">
            <p className="text-stone-600 dark:text-stone-400 mb-4">
              Unable to generate 3D visualization. Check browser console for details.
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-500">
              Data received: {rotationVectors?.length || 0} rotation vectors, {translationVectors?.length || 0} translation vectors
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enhanced3DVisualization;
