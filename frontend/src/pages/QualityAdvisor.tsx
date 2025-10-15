import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, CheckCircle2, AlertCircle, Info, Loader2, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://127.0.0.1:8000/api/v1' : '/api/v1'
);

const QualityAdvisor = () => {
  const [sessionId, setSessionId] = useState('');
  const [patternType, setPatternType] = useState('Checkerboard');
  const [checkerboardWidth, setCheckerboardWidth] = useState('9');
  const [checkerboardHeight, setCheckerboardHeight] = useState('6');
  const [squareSize, setSquareSize] = useState('30');
  const [markerSize, setMarkerSize] = useState('20');
  const [arucoDictName, setArucoDictName] = useState('DICT_6X6_250');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);

  const loadLatestCalibration = async () => {
    setIsLoadingLatest(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/quality/latest-calibration`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load latest calibration');
      }

      const data = await response.json();

      // Populate the form with latest calibration data
      setSessionId(data.session_id);
      setPatternType(data.pattern_type);
      setCheckerboardWidth(data.checkerboard_columns.toString());
      setCheckerboardHeight(data.checkerboard_rows.toString());
      setSquareSize((data.square_size * 1000).toString()); // Convert from meters to mm

      // Automatically trigger analysis
      setTimeout(() => {
        analyzeQuality();
      }, 100);
    } catch (error: any) {
      setError(error.message || 'Failed to load latest calibration');
    } finally {
      setIsLoadingLatest(false);
    }
  };

  const analyzeQuality = async () => {
    if (!sessionId) {
      setError('Please enter a session ID');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisComplete(false);

    try {
      const response = await fetch(`${API_URL}/quality/analyze/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          pattern_type: patternType,
          checkerboard_columns: parseInt(checkerboardWidth),
          checkerboard_rows: parseInt(checkerboardHeight),
          square_size: parseFloat(squareSize),
          marker_size: patternType === 'ChArUcoboard' ? parseFloat(markerSize) : null,
          aruco_dict_name: patternType === 'ChArUcoboard' ? arucoDictName : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysisResults(data);
      setAnalysisComplete(true);
    } catch (error: any) {
      setError(error.message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return { variant: 'default' as const, label: 'Excellent' };
    if (score >= 0.6) return { variant: 'secondary' as const, label: 'Good' };
    return { variant: 'destructive' as const, label: 'Needs Improvement' };
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'medium':
        return <Info className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
  };

  const renderHeatmap = (heatmap: number[][]) => {
    const maxValue = Math.max(...heatmap.flat());

    return (
      <div className="grid gap-0.5" style={{
        gridTemplateColumns: `repeat(${heatmap[0]?.length || 1}, minmax(0, 1fr))`
      }}>
        {heatmap.map((row, i) =>
          row.map((value, j) => {
            const intensity = maxValue > 0 ? value / maxValue : 0;
            const color = `rgba(0, 255, 0, ${intensity})`;
            return (
              <div
                key={`${i}-${j}`}
                className="aspect-square border border-gray-700"
                style={{ backgroundColor: color }}
                title={`Coverage: ${(intensity * 100).toFixed(0)}%`}
              />
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Calibration Quality Advisor
        </h1>
        <p className="text-muted-foreground">
          Analyze your calibration dataset and get intelligent recommendations
        </p>
      </div>

      {/* Input Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Analyze Calibration Dataset</CardTitle>
          <CardDescription>Enter your session ID and pattern configuration, or view your latest calibration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Latest Calibration Button */}
            <div className="flex justify-center pb-4 border-b">
              <Button
                onClick={loadLatestCalibration}
                disabled={isLoadingLatest || isAnalyzing}
                variant="outline"
                size="lg"
                className="w-full md:w-auto"
              >
                {isLoadingLatest ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading Latest Calibration...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 mr-2" />
                    View Latest Calibration
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="session-id">Session ID</Label>
                <Input
                  id="session-id"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter session ID from upload"
                />
              </div>

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
                <Label htmlFor="square-size">Square Size (mm)</Label>
                <Input
                  id="square-size"
                  type="number"
                  value={squareSize}
                  onChange={(e) => setSquareSize(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="width">Checkerboard Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={checkerboardWidth}
                  onChange={(e) => setCheckerboardWidth(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="height">Checkerboard Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={checkerboardHeight}
                  onChange={(e) => setCheckerboardHeight(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={analyzeQuality}
              disabled={!sessionId || isAnalyzing}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Quality...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Analyze Quality
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {analysisComplete && analysisResults && (
        <div className="space-y-6">
          {/* Overall Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Coverage Score</div>
                  <div className={`text-3xl font-bold ${getScoreColor(analysisResults.metrics.coverage.coverage_score)}`}>
                    {(analysisResults.metrics.coverage.coverage_score * 100).toFixed(0)}%
                  </div>
                  <Progress
                    value={analysisResults.metrics.coverage.coverage_score * 100}
                    className="mt-2"
                  />
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Pose Diversity</div>
                  <div className={`text-3xl font-bold ${getScoreColor(analysisResults.metrics.pose_diversity.pose_diversity_score)}`}>
                    {(analysisResults.metrics.pose_diversity.pose_diversity_score * 100).toFixed(0)}%
                  </div>
                  <Progress
                    value={analysisResults.metrics.pose_diversity.pose_diversity_score * 100}
                    className="mt-2"
                  />
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Images</div>
                  <div className="text-3xl font-bold">
                    {analysisResults.metrics.num_images}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Recommended: 20-30
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Reprojection Error</div>
                  <div className="text-3xl font-bold">
                    {analysisResults.metrics.reprojection_error.toFixed(3)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    pixels
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coverage Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Coverage Analysis</CardTitle>
                <CardDescription>How well your images cover different regions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Center Coverage</span>
                    <span className="text-sm font-medium">
                      {(analysisResults.metrics.coverage.center_coverage * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysisResults.metrics.coverage.center_coverage * 100} />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Corner Coverage</span>
                    <span className="text-sm font-medium">
                      {(analysisResults.metrics.coverage.corner_coverage * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysisResults.metrics.coverage.corner_coverage * 100} />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Edge Coverage</span>
                    <span className="text-sm font-medium">
                      {(analysisResults.metrics.coverage.edge_coverage * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysisResults.metrics.coverage.edge_coverage * 100} />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Coverage Heatmap</h4>
                  <div className="bg-gray-900 p-4 rounded-lg">
                    {analysisResults.heatmap && renderHeatmap(analysisResults.heatmap)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Greener areas indicate more calibration points were detected
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pose Diversity Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Pose Diversity Analysis</CardTitle>
                <CardDescription>Variation in camera angles and distances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Angle Diversity</span>
                    <span className="text-sm font-medium">
                      {(analysisResults.metrics.pose_diversity.angle_diversity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysisResults.metrics.pose_diversity.angle_diversity * 100} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variation in rotation angles (pitch, yaw, roll)
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Distance Diversity</span>
                    <span className="text-sm font-medium">
                      {(analysisResults.metrics.pose_diversity.distance_diversity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysisResults.metrics.pose_diversity.distance_diversity * 100} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variation in distances from calibration pattern
                  </p>
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertTitle>Why Diversity Matters</AlertTitle>
                  <AlertDescription className="text-xs">
                    Higher pose diversity improves calibration accuracy by providing
                    more varied perspectives of the calibration pattern, leading to
                    better estimation of camera parameters and distortion coefficients.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Actionable suggestions to improve your calibration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisResults.recommendations.map((rec: any, index: number) => (
                  <Alert key={index} variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                    <div className="flex items-start gap-3">
                      {getPriorityIcon(rec.priority)}
                      <div className="flex-1">
                        <AlertTitle className="text-sm font-semibold">
                          {rec.message}
                        </AlertTitle>
                        <AlertDescription className="text-xs mt-1">
                          {rec.details}
                        </AlertDescription>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {rec.category}
                        </Badge>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default QualityAdvisor;
