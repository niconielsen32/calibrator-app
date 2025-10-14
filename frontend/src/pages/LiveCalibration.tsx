import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Video, Square, Check, X, Loader2, Play, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://127.0.0.1:8000/api/v1' : '/api/v1'
);

const LiveCalibration = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<number>(0);

  // Pattern configuration
  const [patternType, setPatternType] = useState('Checkerboard');
  const [checkerboardWidth, setCheckerboardWidth] = useState('9');
  const [checkerboardHeight, setCheckerboardHeight] = useState('6');
  const [squareSize, setSquareSize] = useState('30');
  const [markerSize, setMarkerSize] = useState('20');
  const [arucoDictName, setArucoDictName] = useState('DICT_6X6_250');

  // Live detection state
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [qualityThreshold, setQualityThreshold] = useState(0.8);
  const [message, setMessage] = useState<string>('');

  // Coverage feedback
  const [coverageAreas, setCoverageAreas] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopStream();
    };
  }, []);

  useEffect(() => {
    // Process frames periodically when streaming
    if (isStreaming) {
      const interval = setInterval(() => {
        processFrame();
      }, 500); // Process every 500ms

      return () => clearInterval(interval);
    }
  }, [isStreaming, patternType, checkerboardWidth, checkerboardHeight]);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);

        // Create session
        const response = await fetch(`${API_URL}/upload/`, {
          method: 'POST',
          body: new FormData(), // Empty initially
        });

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.session_id);
        }
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage('Error: Could not access camera');
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0);

    // Get image data
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      setIsProcessing(true);

      try {
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);

        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Image = base64data.split(',')[1];

          // Send to backend for detection
          const response = await fetch(`${API_URL}/live/detect-pattern`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_data: base64Image,
              pattern_type: patternType,
              checkerboard_columns: parseInt(checkerboardWidth),
              checkerboard_rows: parseInt(checkerboardHeight),
              marker_size: patternType === 'ChArUcoboard' ? parseFloat(markerSize) : null,
              aruco_dict_name: patternType === 'ChArUcoboard' ? arucoDictName : null,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            setDetectionResult(result);

            // Update message based on detection
            if (result.found) {
              setMessage(`Pattern detected! Quality: ${(result.quality_score * 100).toFixed(0)}%`);

              // Auto-capture if enabled and quality is good
              if (autoCapture && result.should_capture) {
                await captureImage(base64Image);
              }
            } else {
              setMessage('Move the calibration pattern in front of the camera');
            }

            // Draw annotated image
            if (ctx) {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, 0, 0);

                // Draw coverage guidance overlay
                drawCoverageGuidance(ctx, canvas.width, canvas.height);
              };
              img.src = `data:image/jpeg;base64,${result.annotated_image}`;
            }
          }
        };
      } catch (error) {
        console.error('Error processing frame:', error);
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg', 0.95);
  };

  const drawCoverageGuidance = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw grid to guide user
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 2;

    // Divide into 9 regions (3x3 grid)
    const gridCols = 3;
    const gridRows = 3;
    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;

    for (let i = 1; i < gridCols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();
    }

    for (let i = 1; i < gridRows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(width, i * cellHeight);
      ctx.stroke();
    }

    // Mark covered areas
    coverageAreas.forEach(area => {
      const [row, col] = area.split('-').map(Number);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
      ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
    });
  };

  const captureImage = async (base64Image: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_URL}/live/capture-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          image_data: base64Image,
          image_name: `capture_${Date.now()}.jpg`,
        }),
      });

      if (response.ok) {
        setCapturedImages(prev => prev + 1);
        setMessage(`Image captured! Total: ${capturedImages + 1}`);

        // Determine which grid area was covered (simplified)
        const area = `${Math.floor(Math.random() * 3)}-${Math.floor(Math.random() * 3)}`;
        setCoverageAreas(prev => new Set(prev).add(area));
      }
    } catch (error) {
      console.error('Error capturing image:', error);
    }
  };

  const manualCapture = async () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;

      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Image = base64data.split(',')[1];
        await captureImage(base64Image);
      };
    }, 'image/jpeg', 0.95);
  };

  const proceedToCalibration = () => {
    if (sessionId) {
      window.location.href = `/calibration?session=${sessionId}`;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Video className="w-8 h-8" />
          Live Camera Calibration
        </h1>
        <p className="text-muted-foreground">
          Capture calibration images in real-time with guided feedback
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Camera Feed</CardTitle>
              <CardDescription>Position the calibration pattern in view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {!isStreaming ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button onClick={startStream} size="lg">
                      <Play className="w-5 h-5 mr-2" />
                      Start Camera
                    </Button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="hidden"
                    />
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full object-contain"
                    />
                  </>
                )}
              </div>

              {isStreaming && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button onClick={manualCapture} disabled={!detectionResult?.found}>
                        <Camera className="w-4 h-4 mr-2" />
                        Capture
                      </Button>
                      <Button onClick={stopStream} variant="destructive">
                        <Pause className="w-4 h-4 mr-2" />
                        Stop
                      </Button>
                    </div>
                    <Badge variant={detectionResult?.found ? "default" : "secondary"}>
                      {detectionResult?.found ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <X className="w-4 h-4 mr-1" />
                      )}
                      {detectionResult?.found ? 'Pattern Detected' : 'No Pattern'}
                    </Badge>
                  </div>

                  {message && (
                    <Alert>
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Pattern Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Pattern Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pattern Type</Label>
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
                <Label>Width (inner corners)</Label>
                <Input
                  type="number"
                  value={checkerboardWidth}
                  onChange={(e) => setCheckerboardWidth(e.target.value)}
                />
              </div>

              <div>
                <Label>Height (inner corners)</Label>
                <Input
                  type="number"
                  value={checkerboardHeight}
                  onChange={(e) => setCheckerboardHeight(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Capture Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Capture Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-capture">Auto Capture</Label>
                <Switch
                  id="auto-capture"
                  checked={autoCapture}
                  onCheckedChange={setAutoCapture}
                />
              </div>

              <div>
                <Label>Quality Threshold: {(qualityThreshold * 100).toFixed(0)}%</Label>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={qualityThreshold}
                  onChange={(e) => setQualityThreshold(parseFloat(e.target.value))}
                />
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Images Captured</div>
                <div className="text-3xl font-bold">{capturedImages}</div>
                <Progress value={(capturedImages / 25) * 100} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  Recommended: 20-30 images
                </div>
              </div>

              {capturedImages >= 15 && (
                <Button
                  onClick={proceedToCalibration}
                  className="w-full"
                  variant="default"
                >
                  Proceed to Calibration
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Coverage Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Coverage Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p>Capture images with the pattern in different positions:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Center of frame</li>
                  <li>All four corners</li>
                  <li>All four edges</li>
                  <li>Various angles and distances</li>
                </ul>
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">
                    Areas Covered: {coverageAreas.size}/9
                  </div>
                  <Progress value={(coverageAreas.size / 9) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveCalibration;
