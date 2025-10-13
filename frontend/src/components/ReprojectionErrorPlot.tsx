import React from 'react';
import Plot from 'react-plotly.js';

interface ReprojectionErrorPlotProps {
  reprojectionError?: number;
}

const ReprojectionErrorPlot: React.FC<ReprojectionErrorPlotProps> = ({ 
  reprojectionError = 0.00992 
}) => {
  return (
    <div className="relative">
      <Plot
        data={[
          {
            x: [0],
            y: [reprojectionError],
            type: 'bar',
            marker: {
              color: 'rgb(59, 130, 246)',
              width: 0.6
            },
            hovertemplate: 'Error: %{y:.4f} pixels<extra></extra>',
            name: 'Reprojection Error'
          }
        ]}
        layout={{
          xaxis: {
            showticklabels: false,
            showgrid: false,
            zeroline: false,
            showline: false
          },
          yaxis: {
            title: 'Error (pixels)',
            titlefont: { color: '#A1A1AA', size: 13 },
            tickfont: { color: '#A1A1AA', size: 12 },
            showgrid: true,
            gridcolor: 'rgba(161, 161, 170, 0.1)',
            gridwidth: 1,
            range: [0, Math.max(0.012, reprojectionError * 1.2)],
            tickformat: '.4f',
            zeroline: true,
            zerolinecolor: 'rgba(161, 161, 170, 0.2)',
            zerolinewidth: 1,
            showline: false
          },
          plot_bgcolor: 'transparent',
          paper_bgcolor: 'transparent',
          margin: { t: 20, b: 20, l: 60, r: 60 },
          showlegend: false,
          width: undefined,
          height: 180,
          autosize: true,
          bargap: 0.8,
          modebar: {
            bgcolor: 'transparent',
            orientation: 'v',
            color: '#A1A1AA',
            activecolor: '#FFFFFF'
          }
        }}
        config={{
          displayModeBar: true,
          modeBarButtonsToRemove: [
            'toImage',
            'sendDataToCloud',
            'select2d',
            'lasso2d',
            'autoScale2d',
            'toggleSpikelines',
            'zoom2d',
            'pan2d',
            'resetScale2d',
            'hoverClosestCartesian',
            'hoverCompareCartesian'
          ],
          displaylogo: false,
          responsive: true,
          staticPlot: false,
          modeBarStyle: {
            orientation: 'v'
          }
        }}
        style={{
          width: '100%',
          background: 'transparent'
        }}
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

export default ReprojectionErrorPlot; 