import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Visualization3D from './Visualization3D';
import ReprojectionErrorPlot from '@/components/ReprojectionErrorPlot';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, ArrowRight, Upload, ImagePlus, Dices } from 'lucide-react';

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
    { parameter: 'Reprojection Error', value: calibrationResults.reprojection_error.toFixed(4), unit: 'pixels' }
  ];

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <Tabs defaultValue="results" className="space-y-8">
        <TabsList>
          <TabsTrigger value="results">Calibration Results</TabsTrigger>
          <TabsTrigger value="visualization">3D Visualization</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
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

        <TabsContent value="visualization">
          <div className="space-y-6">
            {/* 3D Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>3D Calibration Visualization</CardTitle>
                <CardDescription>
                  Interactive 3D view of calibration results
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Visualization3D />
              </CardContent>
            </Card>

            {/* Reprojection Error Plot */}
            <Card>
              <CardHeader>
                <CardTitle>Reprojection Error</CardTitle>
                <CardDescription>
                  Error measurement across calibration images
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ReprojectionErrorPlot reprojectionError={calibrationResults.reprojection_error} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Results;
