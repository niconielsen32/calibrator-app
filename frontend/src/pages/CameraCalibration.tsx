import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Settings, Play, Upload, Image as ImageIcon, X, Sliders, Loader2, CheckCircle2, BarChart3, RotateCcw, Eye, Trash2, InfoIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CheckedState } from '@radix-ui/react-checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://127.0.0.1:8080/api/v1';

interface PreviewResult {
  image_path: string;
  corners_found: boolean;
  preview_image: string; // base64 encoded image with detected corners
}

const CameraCalibration = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: uploadedImages = [], isLoading: isLoadingImages } = useQuery({
    queryKey: ['uploadedImages'],
    initialData: [],
  });

  const { data: persistedUploadStatus } = useQuery({
    queryKey: ['uploadStatus'],
    initialData: null,
  });

  const { mutate: setUploadedImages } = useMutation({
    mutationFn: (newImages: File[]) => Promise.resolve(newImages),
    onSuccess: (newImages) => {
      queryClient.setQueryData(['uploadedImages'], newImages);
    },
  });

  const [streamType, setStreamType] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{success: boolean; message: string; sessionId?: string} | null>(persistedUploadStatus);
  const [imagesUploaded, setImagesUploaded] = useState(!!persistedUploadStatus?.sessionId);

  const [checkerboardWidth, setCheckerboardWidth] = useState('24');
  const [checkerboardHeight, setCheckerboardHeight] = useState('17');
  const [squareSize, setSquareSize] = useState('30');
  const [cameraModel, setCameraModel] = useState('standard');
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [useFixedPrincipalPoint, setUseFixedPrincipalPoint] = useState(false);
  const [useRationalModel, setUseRationalModel] = useState(false);
  const [useThinPrismModel, setUseThinPrismModel] = useState(false);
  const [runOptimization, setRunOptimization] = useState(true);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [calibrationResults, setCalibrationResults] = useState(null);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const updateUploadStatus = (newStatus: typeof uploadStatus) => {
    setUploadStatus(newStatus);
    queryClient.setQueryData(['uploadStatus'], newStatus);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedImages(files);
    
    // Automatically upload files as soon as they're selected
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    setIsUploading(true);
    updateUploadStatus(null);

    try {
      const response = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      updateUploadStatus({
        success: true,
        message: `Successfully uploaded ${files.length} images`,
        sessionId: data.session_id
      });
      setImagesUploaded(true);
    } catch (error) {
      console.error('Upload error:', error);
      updateUploadStatus({
        success: false,
        message: error instanceof Error ? error.message : "Failed to upload images"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setUploadedImages([...uploadedImages, ...files]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleFixedPrincipalPointChange = (checked: CheckedState) => {
    setUseFixedPrincipalPoint(checked === true);
  };

  const handleRationalModelChange = (checked: CheckedState) => {
    setUseRationalModel(checked === true);
  };

  const handleThinPrismModelChange = (checked: CheckedState) => {
    setUseThinPrismModel(checked === true);
  };

  const handleCalibrate = async () => {
    setCalibrationError(null);

    const currentUploadStatus = queryClient.getQueryData(['uploadStatus']) as typeof uploadStatus;

    // Check if images are uploaded
    if (uploadedImages.length === 0) {
      setCalibrationError("Please upload images before running calibration");
      return;
    }

    // Check if session exists
    if (!currentUploadStatus?.sessionId) {
      setCalibrationError("No upload session found. Please upload images first.");
      return;
    }

    // Validate inputs
    if (!checkerboardWidth || !checkerboardHeight || !squareSize) {
      setCalibrationError("Please enter valid checkerboard dimensions and square size");
      return;
    }

    const cols = parseInt(checkerboardWidth);
    const rows = parseInt(checkerboardHeight);
    const size = parseFloat(squareSize);

    if (isNaN(cols) || isNaN(rows) || isNaN(size) || cols <= 0 || rows <= 0 || size <= 0) {
      setCalibrationError("Checkerboard dimensions and square size must be positive numbers");
      return;
    }

    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);

    const calibrationParams = {
      calibration_type: "Single Camera",
      camera_model: cameraModel === 'standard' ? "Standard" : cameraModel === 'fisheye' ? "Fisheye" : "Omnidirectional",
      pattern_type: "Checkerboard",
      checkerboard_columns: cols,
      checkerboard_rows: rows,
      square_size: size / 1000, // Convert mm to meters
      run_optimization: runOptimization,
      marker_size: 0,
      aruco_dict_name: "string"
    };

    try {
      const response = await fetch(`${API_URL}/calibration/calibrate/${currentUploadStatus.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calibrationParams)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Calibration failed: ${response.statusText}`);
      }

      const data = await response.json();

      const cameraMatrix = data.results.camera_matrix;
      const distCoeffs = data.results.dist_coeffs;

      const results = {
        fx: cameraMatrix[0][0],
        fy: cameraMatrix[1][1],
        cx: cameraMatrix[0][2],
        cy: cameraMatrix[1][2],
        k1: distCoeffs[0][0],
        k2: distCoeffs[0][1],
        p1: distCoeffs[0][2],
        p2: distCoeffs[0][3],
        k3: distCoeffs[0][4],
        reprojection_error: data.results.reprojection_error,
        num_images_calibrated: data.results.num_images_calibrated,
        session_id: currentUploadStatus.sessionId
      };

      setCalibrationResults(results);
      setCalibrationComplete(true);
      setCalibrationError(null);
      queryClient.setQueryData(['calibrationResults'], results);

    } catch (error) {
      console.error('Calibration error:', error);
      setCalibrationError(error instanceof Error ? error.message : "Calibration failed. Please check your parameters and try again.");
    } finally {
      setIsCalibrating(false);
      setCalibrationProgress(100);
    }
  };

  const handlePreview = async () => {
    setPreviewError(null);

    const currentUploadStatus = queryClient.getQueryData(['uploadStatus']) as typeof uploadStatus;

    // Check if images are uploaded
    if (uploadedImages.length === 0) {
      setPreviewError("Please upload images before running preview");
      return;
    }

    // Check if session exists
    if (!currentUploadStatus?.sessionId) {
      setPreviewError("No upload session found. Please upload images first.");
      return;
    }

    // Validate inputs
    if (!checkerboardWidth || !checkerboardHeight || !squareSize) {
      setPreviewError("Please enter valid checkerboard dimensions and square size");
      return;
    }

    const cols = parseInt(checkerboardWidth);
    const rows = parseInt(checkerboardHeight);
    const size = parseFloat(squareSize);

    if (isNaN(cols) || isNaN(rows) || isNaN(size) || cols <= 0 || rows <= 0 || size <= 0) {
      setPreviewError("Checkerboard dimensions and square size must be positive numbers");
      return;
    }

    setIsPreviewing(true);
    setPreviewResults([]);

    const previewParams = {
      calibration_type: "Single Camera",
      pattern_type: "Checkerboard",
      checkerboard_columns: cols,
      checkerboard_rows: rows,
      square_size: size / 1000 // Convert mm to meters
    };

    try {
      const response = await fetch(`${API_URL}/calibration/preview/${currentUploadStatus.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previewParams)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Preview failed: ${response.statusText}`);
      }

      const data = await response.json();
      setPreviewResults(data.results);
      setPreviewError(null);

    } catch (error) {
      console.error('Preview error:', error);
      setPreviewError(error instanceof Error ? error.message : "Failed to preview pattern detection");
    } finally {
      setIsPreviewing(false);
    }
  };

  const resetImages = () => {
    setUploadedImages([]);
    updateUploadStatus(null);
    setImagesUploaded(false);
    setCalibrationComplete(false);
    setCalibrationResults(null);
    setCalibrationProgress(0);
    setPreviewResults([]);
    setIsPreviewing(false);
    setPreviewError(null);
    setCalibrationError(null);
    queryClient.setQueryData(['uploadedImages'], []);
    queryClient.setQueryData(['calibrationResults'], null);
    queryClient.setQueryData(['uploadStatus'], null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800">
      <div className="container mx-auto px-6 py-8 space-y-8 max-w-6xl">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-stone-600 to-stone-800 rounded-2xl shadow-lg mb-4">
            <Camera className="w-8 h-8 text-stone-100" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 dark:text-stone-100">Camera Calibration</h1>
          <p className="text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            Upload calibration images and configure parameters to obtain precise camera intrinsics
          </p>
        </div>

        <Tabs defaultValue="images" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-stone-200 dark:bg-stone-700">
            <TabsTrigger value="images" className="text-stone-700 dark:text-stone-300">Upload Images</TabsTrigger>
            <TabsTrigger value="parameters" className="text-stone-700 dark:text-stone-300">Calibration Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="space-y-6">
            <Card className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm border-stone-200 dark:border-stone-700 shadow-xl">
              <CardHeader>
                <CardTitle className="text-stone-900 dark:text-stone-100">Upload Calibration Images</CardTitle>
                <CardDescription className="text-stone-600 dark:text-stone-400">
                  {isUploading ? "Uploading images..." : "Drag and drop files here • JPG, JPEG, PNG • Limit 200MB per file"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-lg p-8 text-center hover:border-stone-400 dark:hover:border-stone-500 transition-colors bg-stone-50 dark:bg-stone-800/50"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-stone-200 dark:bg-stone-700 rounded-full flex items-center justify-center">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 text-stone-500 dark:text-stone-400 animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-stone-500 dark:text-stone-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-stone-900 dark:text-stone-100 font-medium">
                        {isUploading ? "Uploading..." : "Drag and drop files here"}
                      </p>
                      <p className="text-stone-600 dark:text-stone-400 text-sm">Limit 200MB per file • JPG, JPEG, PNG</p>
                    </div>
                    <div className="flex space-x-4">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        disabled={isUploading}
                      />
                      <label htmlFor="file-upload">
                        <Button asChild className="bg-stone-700 hover:bg-stone-800 text-white dark:bg-stone-600 dark:hover:bg-stone-500" disabled={isUploading}>
                          <span className="cursor-pointer">Browse files</span>
                        </Button>
                      </label>
                      <Button
                        variant="outline" 
                        className="border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                        onClick={resetImages}
                        disabled={isUploading}
                      >
                        Reset Images
                      </Button>
                    </div>
                  </div>
                </div>

                {uploadStatus && uploadStatus.success && (
                  <div className="mt-4 flex items-center justify-between px-4 py-2.5 rounded-md bg-green-900/30 border border-green-800 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-green-300">
                        Successfully uploaded {uploadedImages.length} {uploadedImages.length === 1 ? 'image' : 'images'}
                      </span>
                    </div>
                    <Badge className="bg-green-800 text-green-200 border-green-700 text-xs">
                      Ready
                    </Badge>
                  </div>
                )}

                {uploadStatus && !uploadStatus.success && (
                  <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-md bg-red-900/30 border border-red-800 animate-fade-in">
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-red-300">
                      {uploadStatus.message}
                    </span>
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <Card className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm border-stone-200 dark:border-stone-700 shadow-xl mt-6">
                    <CardHeader className="border-b border-stone-200 dark:border-stone-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <CardTitle className="text-stone-900 dark:text-stone-100">
                              {isLoadingImages ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Loading images...</span>
                                </div>
                              ) : (
                                `Uploaded Images`
                              )}
                            </CardTitle>
                            <CardDescription className="text-stone-600 dark:text-stone-400">
                              {uploadedImages.length} {uploadedImages.length === 1 ? 'image' : 'images'} ready for calibration
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700">
                          {uploadedImages.length} {uploadedImages.length === 1 ? 'file' : 'files'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {uploadedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center overflow-hidden border border-stone-200 dark:border-stone-600 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-stone-300 dark:group-hover:border-stone-500">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.src = '';
                                  e.currentTarget.className = 'hidden';
                                  const icon = document.createElement('div');
                                  icon.innerHTML = '<ImageIcon className="w-8 h-8 text-stone-500 dark:text-stone-400" />';
                                  e.currentTarget.parentNode?.appendChild(icon);
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                <p className="text-xs text-white font-medium truncate">{file.name}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              aria-label="Remove image"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                            <Badge 
                              className="absolute top-2 left-2 bg-black/50 border-0 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              variant="outline"
                            >
                              #{index + 1}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <div className="border-t border-stone-200 dark:border-stone-700 p-4 flex justify-between items-center bg-stone-50/50 dark:bg-stone-800/50">
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {uploadedImages.length} {uploadedImages.length === 1 ? 'image' : 'images'} • Recommended: 20-30 images
                      </p>
                      <Button
                        variant="outline" 
                        size="sm"
                        className="border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                        onClick={resetImages}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All
                      </Button>
                    </div>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parameters" className="space-y-6">
            <Card className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm border-stone-200 dark:border-stone-700 shadow-xl">
              <CardHeader className="border-b border-stone-200 dark:border-stone-700">
                <div className="flex items-center space-x-3">
                  <Settings className="w-6 h-6 text-stone-600 dark:text-stone-400" />
                  <div>
                    <CardTitle className="text-stone-900 dark:text-stone-100 text-2xl">Calibration Parameters</CardTitle>
                    <CardDescription className="text-stone-600 dark:text-stone-400">
                      Configure checkerboard pattern and camera settings for optimal calibration
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Calibration Type</h3>
                  <Select value="Single Camera" disabled>
                    <SelectTrigger className="bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600">
                      <SelectValue placeholder="Select calibration type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single Camera">Single Camera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Pattern Type</h3>
                  <Select value="Checkerboard" disabled>
                    <SelectTrigger className="bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600">
                      <SelectValue placeholder="Select pattern type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checkerboard">Checkerboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sliders className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                    <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Checkerboard Pattern</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="columns" className="text-stone-700 dark:text-stone-300 font-medium">
                        Checkerboard Columns
                      </Label>
                      <Input
                        id="columns"
                        value={checkerboardWidth}
                        onChange={(e) => setCheckerboardWidth(e.target.value)}
                        className="bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600 focus:border-stone-500 dark:focus:border-stone-400"
                        placeholder="9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rows" className="text-stone-700 dark:text-stone-300 font-medium">
                        Checkerboard Rows
                      </Label>
                      <Input
                        id="rows"
                        value={checkerboardHeight}
                        onChange={(e) => setCheckerboardHeight(e.target.value)}
                        className="bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600 focus:border-stone-500 dark:focus:border-stone-400"
                        placeholder="6"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="square-size" className="text-stone-700 dark:text-stone-300 font-medium">
                      Square Size (millimeters)
                    </Label>
                    <Input
                      id="square-size"
                      value={squareSize}
                      onChange={(e) => setSquareSize(e.target.value)}
                      className="bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600 focus:border-stone-500 dark:focus:border-stone-400"
                      placeholder="30"
                    />
                    <p className="text-sm text-stone-500 dark:text-stone-400">Enter the size of each square in your checkerboard pattern</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Camera Model</h3>
                  <div className="space-y-2">
                    <Label htmlFor="camera-model" className="text-stone-700 dark:text-stone-300 font-medium">
                      Select Camera Model
                    </Label>
                    <Select value={cameraModel} onValueChange={setCameraModel}>
                      <SelectTrigger className="bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600">
                        <SelectValue placeholder="Select camera model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (Pinhole Model)</SelectItem>
                        <SelectItem value="fisheye">Fisheye</SelectItem>
                        <SelectItem value="omnidirectional">Omnidirectional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="run-optimization"
                      checked={runOptimization}
                      onCheckedChange={(checked: CheckedState) => setRunOptimization(checked === true)}
                      className="border-stone-400 dark:border-stone-500"
                    />
                    <Label htmlFor="run-optimization" className="text-stone-700 dark:text-stone-300 font-medium">
                      Run sub-pixel optimization
                    </Label>
                  </div>
                </div>

                <div className="space-y-6 pt-4 border-t border-stone-200 dark:border-stone-700">
                  {/* Pattern Detection Preview - Always visible when results exist */}
                  {previewResults.length > 0 && (
                    <div className="rounded-lg border border-stone-300 dark:border-stone-700 overflow-hidden">
                      <div className="bg-stone-100 dark:bg-stone-800 px-4 py-3 border-b border-stone-300 dark:border-stone-700">
                        <h3 className="font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                          Pattern Detection Preview
                        </h3>
                      </div>
                      <div className="p-4 bg-white dark:bg-stone-900">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          {previewResults.map((result, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-video bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700">
                                <img 
                                  src={`data:image/jpeg;base64,${result.preview_image}`}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-contain"
                                />
                                <div className="absolute top-0 left-0 m-2 px-2 py-0.5 bg-amber-500/80 text-white text-xs rounded">
                                  Preview
                                </div>
                              </div>
                              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                                result.corners_found 
                                  ? 'bg-green-500/80 text-white' 
                                  : 'bg-red-500/80 text-white'
                              }`}>
                                {result.corners_found ? 'Pattern Detected' : 'No Pattern Found'}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                          <InfoIcon className="h-3 w-3 flex-shrink-0" />
                          <span>This shows pattern detection only. For camera parameters, check the calibration results.</span>
                        </div>
                        
                        {!calibrationComplete && (
                          <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                            <Button
                              onClick={handlePreview}
                              disabled={isPreviewing}
                              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all duration-200 disabled:opacity-50"
                            >
                              {isPreviewing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Detecting Patterns...
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Refresh Preview
                                </>
                              )}
                            </Button>
                            {previewError && (
                              <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-md bg-red-900/30 border border-red-800 animate-fade-in">
                                <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-red-300">
                                  {previewError}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preview Button - Only visible when no preview results and calibration not complete */}
                  {previewResults.length === 0 && !calibrationComplete && (
                    <div className="rounded-lg border border-stone-300 dark:border-stone-700 overflow-hidden">
                      <div className="bg-stone-100 dark:bg-stone-800 px-4 py-3 border-b border-stone-300 dark:border-stone-700">
                        <h3 className="font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2">
                          <Eye className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                          Pattern Detection Preview
                        </h3>
                      </div>
                      <div className="p-4 bg-white dark:bg-stone-900">
                        <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
                          Verify that checkerboard patterns can be detected in your images before running calibration
                        </p>
                        <Button
                          onClick={handlePreview}
                          disabled={isPreviewing}
                          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all duration-200 disabled:opacity-50"
                        >
                          {isPreviewing ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                              Detecting Patterns...
                            </>
                          ) : (
                            <>
                              <Eye className="w-5 h-5 mr-3" />
                              Preview Pattern Detection
                            </>
                          )}
                        </Button>
                        {previewError && (
                          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-md bg-red-900/30 border border-red-800 animate-fade-in">
                            <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-red-300">
                              {previewError}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Calibration Section - Different states based on completion */}
                  {!calibrationComplete ? (
                    <div className="rounded-lg border border-stone-300 dark:border-stone-700 overflow-hidden">
                      <div className="bg-stone-100 dark:bg-stone-800 px-4 py-3 border-b border-stone-300 dark:border-stone-700">
                        <h3 className="font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                          Camera Calibration
                        </h3>
                      </div>
                      <div className="p-4 bg-white dark:bg-stone-900">
                        <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
                          Run full calibration to calculate camera parameters and generate results
                        </p>
                        <Button
                          onClick={handleCalibrate}
                          disabled={isCalibrating}
                          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white shadow-md transition-all duration-200 disabled:opacity-50"
                        >
                          <Play className="w-5 h-5 mr-3" />
                          {isCalibrating ? 'Calibrating...' : `Start Calibration (${uploadedImages.length} images)`}
                        </Button>

                        {/* Error Message */}
                        {calibrationError && (
                          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-md bg-red-900/30 border border-red-800 animate-fade-in">
                            <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-red-300">
                              {calibrationError}
                            </span>
                          </div>
                        )}

                        {/* Calibration Progress */}
                        {isCalibrating && (
                          <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-stone-700 dark:text-stone-300">
                                <span className="font-medium">Calibration Progress</span>
                                <span className="text-lg font-bold">{calibrationProgress}%</span>
                              </div>
                              <Progress
                                value={calibrationProgress}
                                className="w-full h-3 bg-stone-200 dark:bg-stone-700"
                              />
                              <p className="text-sm text-stone-600 dark:text-stone-400">
                                Processing calibration images and computing camera parameters...
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-stone-300 dark:border-stone-700 overflow-hidden">
                      <div className="bg-stone-100 dark:bg-stone-800 px-4 py-3 border-b border-stone-300 dark:border-stone-700">
                        <h3 className="font-medium text-stone-800 dark:text-stone-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          Calibration Complete
                        </h3>
                      </div>
                      <div className="p-4 bg-white dark:bg-stone-900">
                        {calibrationResults && (
                          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="space-y-2 text-sm text-green-700 dark:text-green-400">
                              <p className="flex items-center justify-between">
                                <span>Reprojection error:</span>
                                <span className="font-mono font-medium">{calibrationResults.reprojection_error.toFixed(4)}</span>
                              </p>
                              <p className="flex items-center justify-between">
                                <span>Images processed:</span>
                                <span className="font-mono font-medium">{calibrationResults.num_images_calibrated}</span>
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-3">
                          <Button 
                            onClick={() => navigate('/results')}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Results
                          </Button>
                          <Button 
                            onClick={() => {
                              setCalibrationComplete(false);
                              setCalibrationResults(null);
                              setCalibrationProgress(0);
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Recalibrate
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CameraCalibration;
