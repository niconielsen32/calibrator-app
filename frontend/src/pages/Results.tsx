import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Enhanced3DVisualization from './Enhanced3DVisualization';
import ReprojectionErrorPlot from '@/components/ReprojectionErrorPlot';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, ArrowRight, Upload, ImagePlus, Dices, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerImageResult {
  image_index: number;
  image_name: string;
  reprojection_error: number;
  detection_image: string;
  used_in_calibration: boolean;
}

interface UndistortedPreview {
  image_index: number;
  image_name: string;
  original_image: string;
  undistorted_image: string;
}

interface CalibrationResults {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  k1: number;
  k2: number;
  k3: number;
  p1: number;
  p2: number;
  reprojection_error: number;
  num_images_calibrated: number;
  session_id: string;
  per_image_results: PerImageResult[];
  reprojection_errors: number[];
  undistorted_previews: UndistortedPreview[];
  rotation_vectors: number[][][];
  translation_vectors: number[][][];
  checkerboard_rows: number;
  checkerboard_cols: number;
  square_size: number;
}

const Results = () => {
  const navigate = useNavigate();
  
  const { data: uploadedImages = [] } = useQuery({
    queryKey: ['uploadedImages'],
    initialData: [],
  });

  const { data: uploadStatus } = useQuery({
    queryKey: ['uploadStatus'],
    initialData: null,
  });

  const { data: calibrationResults } = useQuery<CalibrationResults>({
    queryKey: ['calibrationResults'],
    staleTime: Infinity,
  });

  if (!calibrationResults) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
        <Card className="w-full max-w-4xl bg-gradient-to-br from-stone-50/80 to-white/80 dark:from-stone-900/80 dark:to-stone-800/80 backdrop-blur-lg border-stone-200 dark:border-stone-700 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-stone-100 to-transparent dark:from-stone-700/20 dark:to-transparent rounded-full -mr-32 -mt-32 opacity-70"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-stone-100 to-transparent dark:from-stone-700/20 dark:to-transparent rounded-full -ml-32 -mb-32 opacity-70"></div>
          
          <CardContent className="grid md:grid-cols-2 gap-8 p-8 relative">
            <div className="flex flex-col justify-center space-y-6 md:pr-6">
              <div>
                <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-50 tracking-tight mb-3">
                  No Calibration Results Yet
                </h2>
                <p className="text-stone-600 dark:text-stone-300 text-lg">
                  Start the calibration process to generate your camera parameters
                </p>
              </div>
              
              <div className="space-y-5 pt-2">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-800 dark:text-stone-200">Upload Images</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400">Add 20-30 images of a checkerboard pattern from different angles</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                    <Dices className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-800 dark:text-stone-200">Configure Parameters</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400">Set your checkerboard dimensions and calibration options</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-800 dark:text-stone-200">Run Calibration</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400">Process your images and generate camera parameters</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={() => navigate('/calibration')}
                  className="bg-gradient-to-r from-stone-700 to-stone-900 hover:from-stone-800 hover:to-stone-950 text-white px-6 py-5 h-auto rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <span>Go to Camera Calibration</span>
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="hidden md:flex items-center justify-center relative">
              <div className="absolute w-72 h-72 bg-gradient-to-tr from-stone-200 to-stone-50 dark:from-stone-700 dark:to-stone-800 rounded-full opacity-50 blur-xl"></div>
              <div className="relative z-10 flex items-center justify-center">
                <div className="w-64 h-64 bg-stone-100 dark:bg-stone-700/50 rounded-xl border border-stone-200 dark:border-stone-600 shadow-inner overflow-hidden flex items-center justify-center animate-float">
                  <div className="grid grid-cols-6 grid-rows-6 gap-3 opacity-30">
                    {Array(36).fill(0).map((_, index) => (
                      <div key={index} className={`w-6 h-6 ${index % 2 === (Math.floor(index / 6) % 2) ? 'bg-white' : 'bg-black'} dark:bg-opacity-80`}></div>
                    ))}
                  </div>
                  <ImagePlus className="absolute w-16 h-16 text-stone-400 dark:text-stone-300" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedResults = [
    { parameter: 'Focal Length X (fx)', value: calibrationResults.fx.toFixed(4), unit: 'pixels' },
    { parameter: 'Focal Length Y (fy)', value: calibrationResults.fy.toFixed(4), unit: 'pixels' },
    { parameter: 'Principal Point X (cx)', value: calibrationResults.cx.toFixed(4), unit: 'pixels' },
    { parameter: 'Principal Point Y (cy)', value: calibrationResults.cy.toFixed(4), unit: 'pixels' },
    { parameter: 'Radial Distortion k1', value: calibrationResults.k1.toFixed(4), unit: '' },
    { parameter: 'Radial Distortion k2', value: calibrationResults.k2.toFixed(4), unit: '' },
    { parameter: 'Tangential Distortion p1', value: calibrationResults.p1.toFixed(4), unit: '' },
    { parameter: 'Tangential Distortion p2', value: calibrationResults.p2.toFixed(4), unit: '' },
    { parameter: 'Radial Distortion k3', value: calibrationResults.k3.toFixed(4), unit: '' },
  ];

  // Calculate quality metrics
  const meanError = calibrationResults.reprojection_error;
  const maxError = calibrationResults.reprojection_errors.length > 0
    ? Math.max(...calibrationResults.reprojection_errors)
    : meanError;
  const minError = calibrationResults.reprojection_errors.length > 0
    ? Math.min(...calibrationResults.reprojection_errors)
    : meanError;

  const getQualityRating = (error: number) => {
    if (error < 0.3) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400' };
    if (error < 0.5) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    if (error < 1.0) return { label: 'Acceptable', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Poor', color: 'text-red-600 dark:text-red-400' };
  };

  const quality = getQualityRating(meanError);

  const downloadCalibrationData = () => {
    const calibrationData = {
      camera_matrix: [
        [calibrationResults.fx, 0, calibrationResults.cx],
        [0, calibrationResults.fy, calibrationResults.cy],
        [0, 0, 1]
      ],
      distortion_coefficients: [
        calibrationResults.k1,
        calibrationResults.k2,
        calibrationResults.p1,
        calibrationResults.p2,
        calibrationResults.k3
      ],
      camera_parameters: {
        fx: calibrationResults.fx,
        fy: calibrationResults.fy,
        cx: calibrationResults.cx,
        cy: calibrationResults.cy
      },
      distortion_parameters: {
        k1: calibrationResults.k1,
        k2: calibrationResults.k2,
        k3: calibrationResults.k3,
        p1: calibrationResults.p1,
        p2: calibrationResults.p2
      },
      calibration_quality: {
        mean_reprojection_error: calibrationResults.reprojection_error,
        max_reprojection_error: maxError,
        min_reprojection_error: minError,
        quality_rating: quality.label,
        num_images_used: calibrationResults.num_images_calibrated
      },
      per_image_errors: calibrationResults.reprojection_errors,
      session_id: calibrationResults.session_id,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(calibrationData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calibration_${calibrationResults.session_id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header with Quality Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Calibration Results</h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            {calibrationResults.num_images_calibrated} images processed
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={downloadCalibrationData}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download JSON
          </Button>
          <div className="text-right">
            <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">Overall Quality</div>
            <div className={`text-2xl font-bold ${quality.color}`}>{quality.label}</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Mean Error: {meanError.toFixed(4)}px
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="per-image">Per-Image Analysis</TabsTrigger>
          <TabsTrigger value="undistortion">Undistortion Preview</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="visualization">3D View</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Calibration Quality Metrics</CardTitle>
              <CardDescription>Statistical analysis of reprojection errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-stone-50 dark:bg-stone-800 rounded-lg">
                  <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">Mean Error</div>
                  <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {meanError.toFixed(4)}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">pixels</div>
                </div>
                <div className="text-center p-4 bg-stone-50 dark:bg-stone-800 rounded-lg">
                  <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">Max Error</div>
                  <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {maxError.toFixed(4)}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">pixels</div>
                </div>
                <div className="text-center p-4 bg-stone-50 dark:bg-stone-800 rounded-lg">
                  <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">Min Error</div>
                  <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {minError.toFixed(4)}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">pixels</div>
                </div>
                <div className="text-center p-4 bg-stone-50 dark:bg-stone-800 rounded-lg">
                  <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">Images Used</div>
                  <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {calibrationResults.num_images_calibrated}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reprojection Error Chart */}
          {calibrationResults.reprojection_errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reprojection Error Per Image</CardTitle>
                <CardDescription>
                  Lower values indicate better calibration quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={calibrationResults.reprojection_errors.map((error, idx) => ({
                      name: `Image ${idx + 1}`,
                      error: error,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis label={{ value: 'Error (pixels)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="error" fill="#78716c" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Per-Image Analysis Tab */}
        <TabsContent value="per-image" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Image-by-Image Analysis</CardTitle>
              <CardDescription>
                Detailed view of corner detection and reprojection error for each calibration image
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {calibrationResults.per_image_results.map((result) => (
                  <div key={result.image_index} className="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
                    <div className="aspect-video bg-stone-100 dark:bg-stone-800">
                      <img
                        src={`data:image/jpeg;base64,${result.detection_image}`}
                        alt={result.image_name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-3 bg-stone-50 dark:bg-stone-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                          {result.image_name}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          #{result.image_index + 1}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-600 dark:text-stone-400">
                          Reprojection Error:
                        </span>
                        <span className={`text-sm font-bold ${getQualityRating(result.reprojection_error).color}`}>
                          {result.reprojection_error.toFixed(4)}px
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Undistortion Preview Tab */}
        <TabsContent value="undistortion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Undistortion Preview</CardTitle>
              <CardDescription>
                Compare original and undistorted images using the calibration parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calibrationResults.undistorted_previews && calibrationResults.undistorted_previews.length > 0 ? (
                <div className="space-y-6">
                  {calibrationResults.undistorted_previews.map((preview) => (
                    <div key={preview.image_index} className="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
                      <div className="bg-stone-100 dark:bg-stone-800 px-4 py-2">
                        <h4 className="font-semibold text-stone-900 dark:text-stone-100">
                          {preview.image_name}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                        {/* Original */}
                        <div>
                          <div className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                            Original (Distorted)
                          </div>
                          <div className="border border-stone-300 dark:border-stone-600 rounded overflow-hidden bg-stone-50 dark:bg-stone-900">
                            <img
                              src={`data:image/jpeg;base64,${preview.original_image}`}
                              alt={`Original ${preview.image_name}`}
                              className="w-full h-auto"
                            />
                          </div>
                        </div>
                        {/* Undistorted */}
                        <div>
                          <div className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                            Undistorted (Corrected)
                          </div>
                          <div className="border border-green-500 dark:border-green-600 rounded overflow-hidden bg-stone-50 dark:bg-stone-900">
                            <img
                              src={`data:image/jpeg;base64,${preview.undistorted_image}`}
                              alt={`Undistorted ${preview.image_name}`}
                              className="w-full h-auto"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="bg-stone-50 dark:bg-stone-800 px-4 py-2 text-sm text-stone-600 dark:text-stone-400">
                        💡 Look for straightened lines and corrected distortion, especially near image edges
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-stone-500 dark:text-stone-400">
                  No undistortion previews available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parameters Tab */}
        <TabsContent value="parameters">
          <Card>
            <CardHeader>
              <CardTitle>Camera Parameters</CardTitle>
              <CardDescription>
                Intrinsic camera parameters and distortion coefficients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formattedResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.parameter}</TableCell>
                      <TableCell className="text-right font-mono">{result.value}</TableCell>
                      <TableCell className="text-right">{result.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3D Visualization Tab */}
        <TabsContent value="visualization">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>3D Calibration Visualization</CardTitle>
                <CardDescription>
                  Interactive 3D view of calibration results
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {calibrationResults.rotation_vectors &&
                 calibrationResults.translation_vectors &&
                 calibrationResults.checkerboard_rows &&
                 calibrationResults.checkerboard_cols &&
                 calibrationResults.square_size ? (
                  <Enhanced3DVisualization
                    rotationVectors={calibrationResults.rotation_vectors}
                    translationVectors={calibrationResults.translation_vectors}
                    checkerboardRows={calibrationResults.checkerboard_rows}
                    checkerboardCols={calibrationResults.checkerboard_cols}
                    squareSize={calibrationResults.square_size}
                  />
                ) : (
                  <div className="text-center py-12 text-stone-500 dark:text-stone-400">
                    3D visualization data not available. Please run a new calibration to generate 3D visualization data.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Results;
