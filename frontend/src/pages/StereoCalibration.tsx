import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Loader2, CheckCircle2, BarChart3, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://127.0.0.1:8000/api/v1' : '/api/v1'
);

const StereoCalibration = () => {
  const navigate = useNavigate();

  // Left camera state
  const [leftImages, setLeftImages] = useState<File[]>([]);
  const [leftSessionId, setLeftSessionId] = useState<string | null>(null);
  const [isUploadingLeft, setIsUploadingLeft] = useState(false);

  // Right camera state
  const [rightImages, setRightImages] = useState<File[]>([]);
  const [rightSessionId, setRightSessionId] = useState<string | null>(null);
  const [isUploadingRight, setIsUploadingRight] = useState(false);

  // Calibration parameters
  const [patternType, setPatternType] = useState('Checkerboard');
  const [checkerboardWidth, setCheckerboardWidth] = useState('9');
  const [checkerboardHeight, setCheckerboardHeight] = useState('6');
  const [squareSize, setSquareSize] = useState('30');
  const [markerSize, setMarkerSize] = useState('20');
  const [arucoDictName, setArucoDictName] = useState('DICT_6X6_250');
  const [cameraModel, setCameraModel] = useState('Standard');
  const [runOptimization, setRunOptimization] = useState(true);

  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [calibrationResults, setCalibrationResults] = useState<any>(null);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  const handleLeftFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setLeftImages(files);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    setIsUploadingLeft(true);

    try {
      const response = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setLeftSessionId(data.session_id);
    } catch (error) {
      console.error('Left camera upload error:', error);
    } finally {
      setIsUploadingLeft(false);
    }
  };

  const handleRightFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setRightImages(files);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    setIsUploadingRight(true);

    try {
      const response = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setRightSessionId(data.session_id);
    } catch (error) {
      console.error('Right camera upload error:', error);
    } finally {
      setIsUploadingRight(false);
    }
  };

  const handleStereoCalibration = async () => {
    if (!leftSessionId || !rightSessionId) {
      setCalibrationError('Please upload images for both cameras');
      return;
    }

    setIsCalibrating(true);
    setCalibrationError(null);
    setCalibrationComplete(false);

    try {
      const response = await fetch(`${API_URL}/stereo/calibrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          left_session_id: leftSessionId,
          right_session_id: rightSessionId,
          pattern_type: patternType,
          checkerboard_columns: parseInt(checkerboardWidth),
          checkerboard_rows: parseInt(checkerboardHeight),
          square_size: parseFloat(squareSize),
          run_optimization: runOptimization,
          camera_model: cameraModel,
          marker_size: patternType === 'ChArUcoboard' ? parseFloat(markerSize) : null,
          aruco_dict_name: patternType === 'ChArUcoboard' ? arucoDictName : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Stereo calibration failed');
      }

      const data = await response.json();
      setCalibrationResults(data.results);
      setCalibrationComplete(true);
    } catch (error: any) {
      setCalibrationError(error.message || 'An error occurred during calibration');
    } finally {
      setIsCalibrating(false);
    }
  };

  const downloadResults = () => {
    if (!calibrationResults) return;

    const dataStr = JSON.stringify(calibrationResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stereo_calibration_results.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Camera className="w-8 h-8" />
          Stereo Camera Calibration
        </h1>
        <p className="text-muted-foreground">
          Calibrate two cameras simultaneously for 3D reconstruction and depth estimation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Camera */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Left Camera
            </CardTitle>
            <CardDescription>Upload calibration images from the left camera</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="left-images">Calibration Images</Label>
                <Input
                  id="left-images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleLeftFileUpload}
                  disabled={isUploadingLeft}
                />
              </div>

              {isUploadingLeft && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading left camera images...
                </div>
              )}

              {leftSessionId && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">
                    {leftImages.length} images uploaded
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Camera */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Right Camera
            </CardTitle>
            <CardDescription>Upload calibration images from the right camera</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="right-images">Calibration Images</Label>
                <Input
                  id="right-images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleRightFileUpload}
                  disabled={isUploadingRight}
                />
              </div>

              {isUploadingRight && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading right camera images...
                </div>
              )}

              {rightSessionId && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">
                    {rightImages.length} images uploaded
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calibration Parameters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Calibration Parameters</CardTitle>
          <CardDescription>Configure the calibration pattern and camera model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pattern-type">Pattern Type</Label>
              <Select value={patternType} onValueChange={setPatternType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Checkerboard">Checkerboard</SelectItem>
                  <SelectItem value="ChArUcoboard">ChArUco Board</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="width">Checkerboard Width (inner corners)</Label>
              <Input
                id="width"
                type="number"
                value={checkerboardWidth}
                onChange={(e) => setCheckerboardWidth(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="height">Checkerboard Height (inner corners)</Label>
              <Input
                id="height"
                type="number"
                value={checkerboardHeight}
                onChange={(e) => setCheckerboardHeight(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="square-size">Square Size (mm)</Label>
              <Input
                id="square-size"
                type="number"
                value={squareSize}
                onChange={(e) => setSquareSize(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="camera-model">Camera Model</Label>
              <Select value={cameraModel} onValueChange={setCameraModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Fisheye">Fisheye</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calibration Button */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Button
            onClick={handleStereoCalibration}
            disabled={!leftSessionId || !rightSessionId || isCalibrating}
            className="w-full"
            size="lg"
          >
            {isCalibrating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Calibrating Stereo Cameras...
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5 mr-2" />
                Start Stereo Calibration
              </>
            )}
          </Button>

          {calibrationError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{calibrationError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {calibrationComplete && calibrationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Stereo Calibration Complete
            </CardTitle>
            <CardDescription>Review your stereo calibration results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Reprojection Error</div>
                  <div className="text-2xl font-bold">
                    {calibrationResults.reprojection_error.toFixed(3)} px
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Baseline</div>
                  <div className="text-2xl font-bold">
                    {calibrationResults.baseline.toFixed(2)} mm
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Pattern Size</div>
                  <div className="text-2xl font-bold">
                    {calibrationResults.checkerboard_cols} × {calibrationResults.checkerboard_rows}
                  </div>
                </div>
              </div>

              {/* Rectified Previews */}
              {calibrationResults.rectified_previews && calibrationResults.rectified_previews.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Rectified Images (Epipolar Lines)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Left Camera</p>
                      <img
                        src={`data:image/jpeg;base64,${calibrationResults.rectified_previews[0].left_rectified}`}
                        alt="Rectified left"
                        className="w-full rounded-lg border"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Right Camera</p>
                      <img
                        src={`data:image/jpeg;base64,${calibrationResults.rectified_previews[0].right_rectified}`}
                        alt="Rectified right"
                        className="w-full rounded-lg border"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Green horizontal lines show epipolar correspondence. Corresponding points should lie on the same horizontal line.
                  </p>
                </div>
              )}

              {/* Download Button */}
              <Button onClick={downloadResults} className="w-full">
                Download Stereo Calibration JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StereoCalibration;
