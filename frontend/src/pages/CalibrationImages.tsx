import React, { useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CalibrationImages = () => {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [streamType, setStreamType] = useState('upload');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedImages(prev => [...prev, ...files]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setUploadedImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800">
      <div>
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">Calibration Images</h1>
        <p className="text-stone-600 dark:text-stone-400">Upload images for camera calibration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-stone-900 dark:text-stone-100">Calibration Type</CardTitle>
            <CardDescription className="text-stone-600 dark:text-stone-400">
              Select how you want to provide calibration images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={streamType} onValueChange={setStreamType}>
              <SelectTrigger className="bg-stone-50 dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-900 dark:text-stone-100">
                <SelectValue placeholder="Select stream type" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600">
                <SelectItem value="upload" className="text-stone-900 dark:text-stone-100">Upload Images</SelectItem>
                <SelectItem value="camera" className="text-stone-900 dark:text-stone-100">Live Camera</SelectItem>
                <SelectItem value="video" className="text-stone-900 dark:text-stone-100">Video File</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-stone-900 dark:text-stone-100">Upload Statistics</CardTitle>
            <CardDescription className="text-stone-600 dark:text-stone-400">
              Current upload progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600 dark:text-stone-400">Images Uploaded</span>
                <span className="text-stone-900 dark:text-stone-100">{uploadedImages.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600 dark:text-stone-400">Recommended Minimum</span>
                <span className="text-stone-900 dark:text-stone-100">20</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2">
                <div 
                  className="bg-stone-600 dark:bg-stone-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((uploadedImages.length / 20) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {streamType === 'upload' && (
        <Card className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-stone-900 dark:text-stone-100">Upload Calibration Images</CardTitle>
            <CardDescription className="text-stone-600 dark:text-stone-400">
              Drag and drop files here • JPG, JPEG, PNG • Limit 200MB per file
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
                  <Upload className="w-8 h-8 text-stone-500 dark:text-stone-400" />
                </div>
                <div>
                  <p className="text-stone-900 dark:text-stone-100 font-medium">Drag and drop files here</p>
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
                  />
                  <label htmlFor="file-upload">
                    <Button asChild className="bg-stone-700 hover:bg-stone-800 text-white dark:bg-stone-600 dark:hover:bg-stone-500">
                      <span className="cursor-pointer">Browse files</span>
                    </Button>
                  </label>
                  <Button 
                    variant="outline" 
                    className="border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                  >
                    Reset Calibration
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadedImages.length > 0 && (
        <Card className="bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-stone-900 dark:text-stone-100">Uploaded Images ({uploadedImages.length})</CardTitle>
            <CardDescription className="text-stone-600 dark:text-stone-400">
              Images ready for calibration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {uploadedImages.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center overflow-hidden border border-stone-200 dark:border-stone-600">
                    <ImageIcon className="w-8 h-8 text-stone-500 dark:text-stone-400" />
                  </div>
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalibrationImages;
