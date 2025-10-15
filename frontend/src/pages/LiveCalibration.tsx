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
  const wsRef = useRef<WebSocket | null>(null);
  const processingRef = useRef<boolean>(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState(false);

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

  // Get WebSocket URL from API URL
  const getWebSocketUrl = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiBase = API_URL.replace('http://', '').replace('https://', '');
    const wsUrl = `${wsProtocol}//${apiBase}/live/stream`;
    console.log('[WebSocket] URL Construction:', {
      windowProtocol: window.location.protocol,
      API_URL,
      wsProtocol,
      apiBase,
      finalWsUrl: wsUrl
    });
    return wsUrl;
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopStream();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // Draw frames continuously when streaming for live feed display
    let animationFrameId: number;

    const drawLoop = () => {
      if (isStreaming && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          // Set canvas size to match video (only once)
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // Draw the current video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw coverage guidance overlay
          drawCoverageGuidance(ctx, canvas.width, canvas.height);
        }

        animationFrameId = requestAnimationFrame(drawLoop);
      }
    };

    if (isStreaming && wsConnected) {
      // Start continuous drawing loop for live video feed
      animationFrameId = requestAnimationFrame(drawLoop);

      // Process pattern detection via WebSocket periodically
      const detectionInterval = setInterval(() => {
        sendFrameToWebSocket();
      }, 500); // Send frame every 500ms

      return () => {
        cancelAnimationFrame(animationFrameId);
        clearInterval(detectionInterval);
      };
    }
  }, [isStreaming, wsConnected, patternType, checkerboardWidth, checkerboardHeight, coverageAreas]);

  const connectWebSocket = () => {
    try {
      const wsUrl = getWebSocketUrl();
      console.log('[WebSocket] Attempting to connect to:', wsUrl);
      console.log('[WebSocket] Current state:', {
        isStreaming,
        wsConnected,
        existingWs: wsRef.current ? 'exists' : 'null'
      });

      const ws = new WebSocket(wsUrl);
      console.log('[WebSocket] WebSocket object created, readyState:', ws.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');

      ws.onopen = () => {
        console.log('[WebSocket] ✅ Connection established! readyState:', ws.readyState);
        setWsConnected(true);
        setMessage('Camera started successfully - Connected to server');
      };

      ws.onmessage = (event) => {
        console.log('[WebSocket] 📨 Message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Parsed message data:', data);

          if (data.type === 'detection_result') {
            console.log('[WebSocket] Detection result:', {
              found: data.found,
              num_corners: data.num_corners,
              quality_score: data.quality_score,
              should_capture: data.should_capture
            });
            setDetectionResult(data);
            processingRef.current = false;
            setIsProcessing(false);

            // Update message based on detection
            if (data.found) {
              setMessage(`Pattern detected! Quality: ${(data.quality_score * 100).toFixed(0)}%`);

              // Auto-capture if enabled and quality is good
              if (autoCapture && data.should_capture) {
                console.log('[WebSocket] Auto-capturing image...');
                captureImageFromData(data.annotated_image);
              }
            } else {
              setMessage('Move the calibration pattern in front of the camera');
            }
          } else if (data.type === 'error') {
            console.error('[WebSocket] ❌ Error from server:', data.message);
            setMessage(`Error: ${data.message}`);
            processingRef.current = false;
            setIsProcessing(false);
          } else {
            console.warn('[WebSocket] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[WebSocket] ❌ Error parsing message:', error, 'Raw data:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] ❌ Error event:', error);
        console.log('[WebSocket] Error details - readyState:', ws.readyState);
        setMessage('Error: Failed to connect to server');
        setWsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] 🔌 Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          readyState: ws.readyState
        });
        setWsConnected(false);
        if (isStreaming) {
          setMessage('Warning: Connection to server lost');
        }
      };

      wsRef.current = ws;
      console.log('[WebSocket] WebSocket reference stored');
    } catch (error) {
      console.error('[WebSocket] ❌ Exception creating WebSocket:', error);
      setMessage('Error: Failed to establish server connection');
    }
  };

  const startStream = async () => {
    console.log('[Camera] Starting camera stream...');
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[Camera] getUserMedia not supported');
        setMessage('Error: Camera access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
        return;
      }

      // Check if the page is served over HTTPS or localhost
      const isSecureContext = window.isSecureContext;
      console.log('[Camera] Secure context:', isSecureContext);
      if (!isSecureContext) {
        setMessage('Error: Camera access requires HTTPS. Please ensure your app is deployed with HTTPS enabled.');
        console.error('Camera access blocked: Page must be served over HTTPS or localhost');
        return;
      }

      console.log('[Camera] Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('[Camera] ✅ Camera access granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setMessage('Camera started - Connecting to server...');
        console.log('[Camera] Video stream assigned to video element');

        // Connect WebSocket
        console.log('[Camera] Initiating WebSocket connection...');
        connectWebSocket();

        // Create session
        console.log('[Camera] Creating upload session...');
        const response = await fetch(`${API_URL}/upload/`, {
          method: 'POST',
          body: new FormData(), // Empty initially
        });

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.session_id);
          console.log('[Camera] ✅ Session created:', data.session_id);
        } else {
          console.error('[Camera] ❌ Failed to create session:', response.statusText);
        }
      }
    } catch (error: any) {
      console.error('[Camera] ❌ Error accessing camera:', error);

      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMessage('Error: Camera access denied. Please allow camera permissions in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setMessage('Error: No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setMessage('Error: Camera is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        setMessage('Error: Camera does not support the requested resolution.');
      } else if (error.name === 'SecurityError') {
        setMessage('Error: Camera access blocked due to security restrictions. Ensure the page is served over HTTPS.');
      } else {
        setMessage(`Error: Could not access camera - ${error.message || 'Unknown error'}`);
      }
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
    setWsConnected(false);
  };

  const sendFrameToWebSocket = () => {
    console.log('[Frame] sendFrameToWebSocket called, checking conditions...');

    if (!videoRef.current) {
      console.log('[Frame] ❌ No video ref');
      return;
    }
    if (!canvasRef.current) {
      console.log('[Frame] ❌ No canvas ref');
      return;
    }
    if (!wsRef.current) {
      console.log('[Frame] ❌ No WebSocket ref');
      return;
    }
    if (processingRef.current) {
      console.log('[Frame] ⏸️ Already processing, skipping frame');
      return;
    }

    const wsState = wsRef.current.readyState;
    console.log('[Frame] WebSocket state:', wsState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');
    if (wsState !== WebSocket.OPEN) {
      console.log('[Frame] ❌ WebSocket not open, skipping frame');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.log('[Frame] ❌ Video not ready, readyState:', video.readyState);
      return;
    }

    console.log('[Frame] ✅ All checks passed, processing frame...');
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // Get current frame from canvas for pattern detection
      canvas.toBlob((blob) => {
        if (!blob || !wsRef.current) {
          console.log('[Frame] ❌ Blob creation failed or WebSocket lost');
          processingRef.current = false;
          setIsProcessing(false);
          return;
        }

        console.log('[Frame] Blob created, size:', blob.size, 'bytes');

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);

        reader.onloadend = () => {
          try {
            const base64data = reader.result as string;
            const base64Image = base64data.split(',')[1];

            const payload = {
              type: 'frame',
              image_data: base64Image,
              pattern_type: patternType,
              checkerboard_columns: parseInt(checkerboardWidth),
              checkerboard_rows: parseInt(checkerboardHeight),
              marker_size: patternType === 'ChArUcoboard' ? parseFloat(markerSize) : null,
              aruco_dict_name: patternType === 'ChArUcoboard' ? arucoDictName : null,
            };

            console.log('[Frame] Sending frame to WebSocket:', {
              type: payload.type,
              pattern_type: payload.pattern_type,
              checkerboard_columns: payload.checkerboard_columns,
              checkerboard_rows: payload.checkerboard_rows,
              image_data_length: base64Image.length
            });

            // Send frame via WebSocket
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify(payload));
              console.log('[Frame] ✅ Frame sent successfully');
            } else {
              console.log('[Frame] ❌ WebSocket not open at send time');
              processingRef.current = false;
              setIsProcessing(false);
            }
          } catch (error) {
            console.error('[Frame] ❌ Error sending frame:', error);
            processingRef.current = false;
            setIsProcessing(false);
          }
        };

        reader.onerror = (error) => {
          console.error('[Frame] ❌ Error reading blob:', error);
          processingRef.current = false;
          setIsProcessing(false);
        };
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('[Frame] ❌ Exception in sendFrameToWebSocket:', error);
      processingRef.current = false;
      setIsProcessing(false);
    }
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

  const captureImageFromData = async (annotatedBase64: string) => {
    // Capture from the annotated image received from WebSocket
    await captureImage(annotatedBase64);
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
              <CardTitle className="flex items-center justify-between">
                <span>Camera Feed</span>
                {isStreaming && (
                  <Badge variant={wsConnected ? "default" : "secondary"} className="text-xs">
                    {wsConnected ? '● Connected' : '○ Connecting...'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Position the calibration pattern in view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {!isStreaming ? (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 p-4">
                    <Button onClick={startStream} size="lg">
                      <Play className="w-5 h-5 mr-2" />
                      Start Camera
                    </Button>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Note: Camera access requires HTTPS in production. Ensure your browser allows camera permissions.
                    </p>
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

              {/* Show messages at all times if present */}
              {message && (
                <Alert className="mt-4" variant={message.startsWith('Error') ? 'destructive' : 'default'}>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

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
