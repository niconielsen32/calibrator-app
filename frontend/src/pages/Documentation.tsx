import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Book, 
  Camera, 
  Upload, 
  Download, 
  RotateCcw, 
  Code2,
  FileText,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';

const Documentation = () => {
  const [calibrationType, setCalibrationType] = useState('single-camera');
  const [cameraModel, setCameraModel] = useState('standard');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleDownloadCalibrationData = () => {
    // Example calibration data structure
    const calibrationData = {
      "camera_matrix": [[814.183955460782, 0.0, 687.576887970277], 
                       [0.0, 783.3228810454083, 600.9911160856717], 
                       [0.0, 0.0, 1.0]],
      "fx": 814.183955460782,
      "fy": 783.3228810454083,
      "cx": 687.576887970277,
      "cy": 600.9911160856717,
      "distortion": [[-0.10892612562370071, 0.014731033107379722, -0.004434530390102297, -0.0029042128739589453, -0.0017411975377909141]],
      "rotation_vecs": [[[0.22399517883486053], [0.028419916725077966], [-0.023594732815429294]]],
      "translation_vecs": [[[-0.2052349240879531], [-0.9710027300788882], [1.3582379411584353]]]
    };

    // Create a Blob containing the JSON data
    const blob = new Blob([JSON.stringify(calibrationData, null, 2)], { type: 'application/json' });
    
    // Create a URL for the Blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calibration_data.json';
    
    // Append the link to the document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    window.URL.revokeObjectURL(url);
  };

  const handleResetCalibration = () => {
    console.log('Resetting calibration');
  };

  const handleCopyCode = (codeId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(codeId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [];

  const singleCameraPythonCode = `import json
import cv2
import numpy as np

with open('calibration_data.json', 'r') as f:
    calibration_data = json.load(f)

mtx = np.array(calibration_data['camera_matrix'])
dist = np.array(calibration_data['distortion'])

# Load image
img = cv2.imread('your_image.jpg')
h, w = img.shape[:2]

# Undistort
newcameramtx, roi = cv2.getOptimalNewCameraMatrix(mtx, dist, (w, h), 1, (w, h))
dst = cv2.undistort(img, mtx, dist, None, newcameramtx)

# Crop the image
x, y, w, h = roi
dst = dst[y:y+h, x:x+w]

cv2.imwrite('calibrated_result.jpg', dst)`;

  const singleCameraCppCode = `#include <opencv2/opencv.hpp>
#include <fstream>
#include <json/json.h>

int main() {
    cv::Mat mtx, dist;

    std::ifstream file("calibration_data.json");
    Json::Value calibration_data;
    file >> calibration_data;

    for (Json::Value::ArrayIndex i = 0; i != calibration_data["camera_matrix"].size(); i++) {
        mtx.push_back(calibration_data["camera_matrix"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["distortion"].size(); i++) {
        dist.push_back(calibration_data["distortion"][i].asDouble());
    }

    // Load image
    cv::Mat img = cv::imread("your_image.jpg");
    cv::Mat dst;
    cv::Size imageSize = img.size();

    // Undistort
    cv::Mat newCameraMatrix = cv::getOptimalNewCameraMatrix(mtx, dist, imageSize, 1, imageSize, 0);
    cv::undistort(img, dst, mtx, dist, newCameraMatrix);

    // Save the image
    cv::imwrite("calibrated_result.jpg", dst);

    return 0;
}`;

  const singleCameraFisheyePythonCode = `import json
import cv2
import numpy as np

with open('calibration_data.json', 'r') as f:
    calibration_data = json.load(f)

mtx = np.array(calibration_data['camera_matrix'])
dist = np.array(calibration_data['distortion'])

# Load image
img = cv2.imread('your_image.jpg')
h, w = img.shape[:2]

# Undistort
newcameramtx = mtx.copy()
map1, map2 = cv2.fisheye.initUndistortRectifyMap(mtx, dist, np.eye(3), newcameramtx, (w, h), cv2.CV_16SC2)
dst = cv2.remap(img, map1, map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

cv2.imwrite('calibrated_result.jpg', dst)`;

  const singleCameraFisheyeCppCode = `#include <opencv2/opencv.hpp>
#include <fstream>
#include <json/json.h>

int main() {
    cv::Mat mtx, dist;

    std::ifstream file("calibration_data.json");
    Json::Value calibration_data;
    file >> calibration_data;

    for (Json::Value::ArrayIndex i = 0; i != calibration_data["camera_matrix"].size(); i++) {
        mtx.push_back(calibration_data["camera_matrix"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["distortion"].size(); i++) {
        dist.push_back(calibration_data["distortion"][i].asDouble());
    }

    // Load image
    cv::Mat img = cv::imread("your_image.jpg");
    cv::Mat dst;
    cv::Size imageSize = img.size();

    // Undistort
    cv::Mat newCameraMatrix = mtx.clone();
    cv::Mat map1, map2;
    cv::fisheye::initUndistortRectifyMap(mtx, dist, cv::Mat::eye(3, 3, CV_64F), newCameraMatrix, imageSize, CV_16SC2, map1, map2);
    cv::remap(img, dst, map1, map2, cv::INTER_LINEAR, cv::BORDER_CONSTANT);

    // Save the image
    cv::imwrite("calibrated_result.jpg", dst);

    return 0;
}`;

  const stereoCameraPythonCode = `import json
import cv2
import numpy as np

with open('stereo_calibration_data.json', 'r') as f:
    calibration_data = json.load(f)

left_mtx = np.array(calibration_data['left_camera_matrix'])
right_mtx = np.array(calibration_data['right_camera_matrix'])
left_dist = np.array(calibration_data['left_distortion'])
right_dist = np.array(calibration_data['right_distortion'])
R = np.array(calibration_data['rotation_matrix'])
T = np.array(calibration_data['translation_vector'])

# Load images
left_img = cv2.imread('left_image.jpg')
right_img = cv2.imread('right_image.jpg')

# Undistort
h, w = left_img.shape[:2]
left_newcameramtx, left_roi = cv2.getOptimalNewCameraMatrix(left_mtx, left_dist, (w, h), 1, (w, h))
right_newcameramtx, right_roi = cv2.getOptimalNewCameraMatrix(right_mtx, right_dist, (w, h), 1, (w, h))
left_dst = cv2.undistort(left_img, left_mtx, left_dist, None, left_newcameramtx)
right_dst = cv2.undistort(right_img, right_mtx, right_dist, None, right_newcameramtx)

# Crop the images
lx, ly, lw, lh = left_roi
rx, ry, rw, rh = right_roi
left_dst = left_dst[ly:ly+lh, lx:lx+lw]
right_dst = right_dst[ry:ry+rh, rx:rx+rw]

cv2.imwrite('left_calibrated_result.jpg', left_dst)
cv2.imwrite('right_calibrated_result.jpg', right_dst)`;

  const stereoCameraCppCode = `#include <opencv2/opencv.hpp>
#include <fstream>
#include <json/json.h>

int main() {
    cv::Mat left_mtx, right_mtx, left_dist, right_dist, R, T;

    std::ifstream file("stereo_calibration_data.json");
    Json::Value calibration_data;
    file >> calibration_data;

    for (Json::Value::ArrayIndex i = 0; i != calibration_data["left_camera_matrix"].size(); i++) {
        left_mtx.push_back(calibration_data["left_camera_matrix"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["right_camera_matrix"].size(); i++) {
        right_mtx.push_back(calibration_data["right_camera_matrix"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["left_distortion"].size(); i++) {
        left_dist.push_back(calibration_data["left_distortion"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["right_distortion"].size(); i++) {
        right_dist.push_back(calibration_data["right_distortion"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["rotation_matrix"].size(); i++) {
        R.push_back(calibration_data["rotation_matrix"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["translation_vector"].size(); i++) {
        T.push_back(calibration_data["translation_vector"][i].asDouble());
    }

    // Load images
    cv::Mat left_img = cv::imread("left_image.jpg");
    cv::Mat right_img = cv::imread("right_image.jpg");
    cv::Mat left_dst, right_dst;
    cv::Size imageSize = left_img.size();

    // Undistort
    cv::Mat left_newCameraMatrix = cv::getOptimalNewCameraMatrix(left_mtx, left_dist, imageSize, 1, imageSize, 0);
    cv::Mat right_newCameraMatrix = cv::getOptimalNewCameraMatrix(right_mtx, right_dist, imageSize, 1, imageSize, 0);
    cv::undistort(left_img, left_dst, left_mtx, left_dist, left_newCameraMatrix);
    cv::undistort(right_img, right_dst, right_mtx, right_dist, right_newCameraMatrix);

    // Save the images
    cv::imwrite("left_calibrated_result.jpg", left_dst);
    cv::imwrite("right_calibrated_result.jpg", right_dst);

    return 0;
}`;

  const stereoCameraFisheyePythonCode = `import json
import cv2
import numpy as np

with open('stereo_calibration_data.json', 'r') as f:
    calibration_data = json.load(f)

left_mtx = np.array(calibration_data['left_camera_matrix'])
right_mtx = np.array(calibration_data['right_camera_matrix'])
left_dist = np.array(calibration_data['left_distortion'])
right_dist = np.array(calibration_data['right_distortion'])
R = np.array(calibration_data['rotation_matrix'])
T = np.array(calibration_data['translation_vector'])

# Load images
left_img = cv2.imread('left_image.jpg')
right_img = cv2.imread('right_image.jpg')

# Undistort
h, w = left_img.shape[:2]
left_newcameramtx = left_mtx.copy()
right_newcameramtx = right_mtx.copy()
left_map1, left_map2 = cv2.fisheye.initUndistortRectifyMap(left_mtx, left_dist, np.eye(3), left_newcameramtx, (w, h), cv2.CV_16SC2)
right_map1, right_map2 = cv2.fisheye.initUndistortRectifyMap(right_mtx, right_dist, np.eye(3), right_newcameramtx, (w, h), cv2.CV_16SC2)
left_dst = cv2.remap(left_img, left_map1, left_map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
right_dst = cv2.remap(right_img, right_map1, right_map2, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

cv2.imwrite('left_calibrated_result.jpg', left_dst)
cv2.imwrite('right_calibrated_result.jpg', right_dst)`;

  const stereoCameraFisheyeCppCode = `#include <opencv2/opencv.hpp>
#include <fstream>
#include <json/json.h>

int main() {
    cv::Mat left_mtx, right_mtx, left_dist, right_dist, R, T;

    std::ifstream file("stereo_calibration_data.json");
    Json::Value calibration_data;
    file >> calibration_data;

    for (Json::Value::ArrayIndex i = 0; i != calibration_data["left_camera_matrix"].size(); i++) {
        left_mtx.push_back(calibration_data["left_camera_matrix"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["right_camera_matrix"].size(); i++) {
        right_mtx.push_back(calibration_data["right_camera_matrix"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["left_distortion"].size(); i++) {
        left_dist.push_back(calibration_data["left_distortion"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["right_distortion"].size(); i++) {
        right_dist.push_back(calibration_data["right_distortion"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["rotation_matrix"].size(); i++) {
        R.push_back(calibration_data["rotation_matrix"][i].asDouble());
    }
    for (Json::Value::ArrayIndex i = 0; i != calibration_data["translation_vector"].size(); i++) {
        T.push_back(calibration_data["translation_vector"][i].asDouble());
    }

    // Load images
    cv::Mat left_img = cv::imread("left_image.jpg");
    cv::Mat right_img = cv::imread("right_image.jpg");
    cv::Mat left_dst, right_dst;
    cv::Size imageSize = left_img.size();

    // Undistort
    cv::Mat left_newCameraMatrix = left_mtx.clone();
    cv::Mat right_newCameraMatrix = right_mtx.clone();
    cv::Mat left_map1, left_map2;
    cv::Mat right_map1, right_map2;
    cv::fisheye::initUndistortRectifyMap(left_mtx, left_dist, cv::Mat::eye(3, 3, CV_64F), left_newCameraMatrix, imageSize, CV_16SC2, left_map1, left_map2);
    cv::fisheye::initUndistortRectifyMap(right_mtx, right_dist, cv::Mat::eye(3, 3, CV_64F), right_newCameraMatrix, imageSize, CV_16SC2, right_map1, right_map2);
    cv::remap(left_img, left_dst, left_map1, left_map2, cv::INTER_LINEAR, cv::BORDER_CONSTANT);
    cv::remap(right_img, right_dst, right_map1, right_map2, cv::INTER_LINEAR, cv::BORDER_CONSTANT);

    // Save the images
    cv::imwrite("left_calibrated_result.jpg", left_dst);
    cv::imwrite("right_calibrated_result.jpg", right_dst);

    return 0;
}`;

  // Function to get the appropriate code based on calibration type and camera model
  const getCode = (language: string) => {
    if (calibrationType === 'single-camera') {
      if (cameraModel === 'standard') {
        return language === 'python' ? singleCameraPythonCode : singleCameraCppCode;
      } else if (cameraModel === 'fisheye') {
        return language === 'python' ? singleCameraFisheyePythonCode : singleCameraFisheyeCppCode;
      }
    } else if (calibrationType === 'stereo-camera') {
      if (cameraModel === 'standard') {
        return language === 'python' ? stereoCameraPythonCode : stereoCameraCppCode;
      } else if (cameraModel === 'fisheye') {
        return language === 'python' ? stereoCameraFisheyePythonCode : stereoCameraFisheyeCppCode;
      }
    }
    return ''; // Default empty string for unsupported types
  };

  const CodeBlock = ({ code, language, title, codeId }: { code: string; language: string; title: string; codeId: string }) => (
    <div className="relative group">
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 px-6 py-4 rounded-t-lg border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center space-x-3">
          <Code2 className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          <h4 className="text-stone-900 dark:text-stone-200 font-medium">{title}</h4>
          <Badge variant="secondary" className="text-xs bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
            {language}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCopyCode(codeId, code)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
        >
          {copiedCode === codeId ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div className="bg-stone-50 dark:bg-stone-900 overflow-x-auto rounded-b-lg border border-stone-200 dark:border-stone-700">
        <pre className="p-6 text-sm leading-relaxed">
          <code className="text-stone-800 dark:text-stone-200 font-mono">
            {code}
          </code>
        </pre>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-800">
      <div className="container mx-auto px-6 py-8 space-y-8 max-w-5xl">
        {/* Header */}
        <div className="text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-stone-600 to-stone-800 rounded-3xl shadow-2xl mb-6">
            <Book className="w-10 h-10 text-stone-100" />
          </div>
          <div>
            <h1 className="text-5xl font-bold text-stone-900 dark:text-stone-100 mb-4">
              Technical Documentation
            </h1>
          </div>
        </div>

        {/* Download Section */}
        <Card className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm border-stone-200 dark:border-stone-700 shadow-2xl">
          <CardHeader className="border-b border-stone-200 dark:border-stone-700 bg-gradient-to-r from-stone-50 to-white dark:from-stone-800 dark:to-stone-700 rounded-t-lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-stone-600 to-stone-800 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-stone-100" />
              </div>
              <div>
                <CardTitle className="text-stone-900 dark:text-stone-100 text-2xl">
                  Download Calibration Data & Examples
                </CardTitle>
                <CardDescription className="text-stone-600 dark:text-stone-400 text-base">
                  Get calibration data and code examples for your specific use case
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="calibration-type" className="text-stone-700 dark:text-stone-300 font-semibold text-base">
                  Calibration Type
                </Label>
                <Select value={calibrationType} onValueChange={setCalibrationType}>
                  <SelectTrigger className="bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600 h-12">
                    <SelectValue placeholder="Select calibration type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600">
                    <SelectItem value="single-camera">Single Camera</SelectItem>
                    <SelectItem value="stereo-camera">Stereo Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="camera-model" className="text-stone-700 dark:text-stone-300 font-semibold text-base">
                  Camera Model
                </Label>
                <Select value={cameraModel} onValueChange={setCameraModel}>
                  <SelectTrigger className="bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-600 h-12">
                    <SelectValue placeholder="Select camera model" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600">
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="fisheye">Fisheye</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                onClick={handleDownloadCalibrationData}
                className="flex-1 bg-gradient-to-r from-stone-600 to-stone-800 hover:from-stone-700 hover:to-stone-900 text-white shadow-lg h-12 text-base"
              >
                <Download className="w-5 h-5 mr-3" />
                Download Calibration Package
              </Button>
              <Button 
                onClick={handleResetCalibration}
                variant="outline"
                className="flex-1 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 h-12 text-base"
              >
                <RotateCcw className="w-5 h-5 mr-3" />
                Reset Configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Code Examples */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-4">
              Code Examples
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-lg">
              Implementation examples for {calibrationType === 'single-camera' ? 'Single Camera' : 'Stereo Camera'} with {cameraModel} model
            </p>
          </div>

          <div className="space-y-6">
            <CodeBlock
              code={getCode('python')}
              language="python"
              title={`Python Example for ${calibrationType === 'single-camera' ? 'Single Camera' : 'Stereo Camera'} with ${cameraModel} Model`}
              codeId="python-example"
            />
            <CodeBlock
              code={getCode('cpp')}
              language="cpp"
              title={`C++ Example for ${calibrationType === 'single-camera' ? 'Single Camera' : 'Stereo Camera'} with ${cameraModel} Model`}
              codeId="cpp-example"
            />
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sections.map((section, index) => (
            <Card key={section.id} className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-sm border-stone-200 dark:border-stone-700 shadow-xl animate-slide-up">
              <CardHeader className="border-b border-stone-200 dark:border-stone-700">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-stone-600 to-stone-800 rounded-lg flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-stone-100" />
                  </div>
                  <CardTitle className="text-stone-900 dark:text-stone-100 text-xl">
                    {section.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {section.content.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center mt-1">
                        <ArrowRight className="w-3 h-3 text-stone-600 dark:text-stone-400" />
                      </div>
                      <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>


      </div>
    </div>
  );
};

export default Documentation;
