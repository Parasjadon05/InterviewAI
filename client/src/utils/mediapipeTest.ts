import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

export interface MediaPipeTestResult {
  success: boolean;
  faceModel: boolean;
  handModel: boolean;
  poseModel: boolean;
  webglBackend: boolean;
  errors: string[];
  warnings: string[];
}

export async function testMediaPipeModels(): Promise<MediaPipeTestResult> {
  const result: MediaPipeTestResult = {
    success: false,
    faceModel: false,
    handModel: false,
    poseModel: false,
    webglBackend: false,
    errors: [],
    warnings: []
  };

  try {
    console.log('🧪 Starting MediaPipe model tests...');

    // Test WebGL backend
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      result.webglBackend = true;
      console.log('✅ WebGL backend initialized successfully');
    } catch (error) {
      result.errors.push(`WebGL backend failed: ${error}`);
      console.error('❌ WebGL backend failed:', error);
      return result;
    }

    // Test Face Mesh model
    try {
      console.log('🔄 Loading Face Mesh model...');
      const faceModel = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { 
          runtime: 'tfjs', 
          refineLandmarks: true,
          maxFaces: 1
        }
      );
      result.faceModel = true;
      console.log('✅ Face Mesh model loaded successfully');
    } catch (error) {
      result.errors.push(`Face Mesh model failed: ${error}`);
      console.error('❌ Face Mesh model failed:', error);
    }

    // Test Hand Pose model
    try {
      console.log('🔄 Loading Hand Pose model...');
      const handModel = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        { 
          runtime: 'tfjs',
          maxHands: 2
        }
      );
      result.handModel = true;
      console.log('✅ Hand Pose model loaded successfully');
    } catch (error) {
      result.errors.push(`Hand Pose model failed: ${error}`);
      console.error('❌ Hand Pose model failed:', error);
    }

    // Test Pose Detection model
    try {
      console.log('🔄 Loading Pose Detection model...');
      const poseModel = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { 
          modelType: 'SinglePose.Lightning', 
          runtime: 'tfjs' 
        }
      );
      result.poseModel = true;
      console.log('✅ Pose Detection model loaded successfully');
    } catch (error) {
      result.errors.push(`Pose Detection model failed: ${error}`);
      console.error('❌ Pose Detection model failed:', error);
    }

    // Check overall success
    result.success = result.faceModel && result.handModel && result.poseModel && result.webglBackend;

    if (result.success) {
      console.log('🎉 All MediaPipe models loaded successfully!');
    } else {
      console.log('⚠️ Some MediaPipe models failed to load');
      result.warnings.push('Some models failed to load - check errors above');
    }

    // Additional system checks
    const systemInfo = await getSystemInfo();
    console.log('💻 System Info:', systemInfo);

    if (systemInfo.gpuVendor === 'unknown') {
      result.warnings.push('GPU vendor unknown - may affect performance');
    }

    if (systemInfo.memory < 4) {
      result.warnings.push('Less than 4GB RAM detected - may affect performance');
    }

  } catch (error) {
    result.errors.push(`Test failed with error: ${error}`);
    console.error('❌ MediaPipe test failed:', error);
  }

  return result;
}

async function getSystemInfo() {
  const info: any = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    memory: 0,
    gpuVendor: 'unknown'
  };

  // Get memory info if available
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    info.memory = Math.round(memory.jsHeapSizeLimit / (1024 * 1024 * 1024)); // GB
  }

  // Get GPU info if available
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        info.gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        info.gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (error) {
    console.warn('Could not get GPU info:', error);
  }

  return info;
}

// Test landmark detection with a simple canvas
export async function testLandmarkDetection(): Promise<boolean> {
  try {
    console.log('🧪 Testing landmark detection...');

    // Create a simple test canvas
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('❌ Could not get canvas context');
      return false;
    }

    // Draw a simple face-like shape for testing
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(320, 240, 100, 0, 2 * Math.PI);
    ctx.fill();

    // Draw eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(290, 220, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(350, 220, 10, 0, 2 * Math.PI);
    ctx.fill();

    // Draw mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(320, 270, 20, 0, Math.PI);
    ctx.stroke();

    // Test face detection
    const faceModel = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      { runtime: 'tfjs', refineLandmarks: true, maxFaces: 1 }
    );

    const faces = await faceModel.estimateFaces(canvas);
    console.log('📊 Face detection test result:', faces.length, 'faces detected');

    return faces.length > 0;
  } catch (error) {
    console.error('❌ Landmark detection test failed:', error);
    return false;
  }
}

// Performance test
export async function testPerformance(): Promise<{ fps: number; memoryUsage: number }> {
  try {
    console.log('🧪 Testing performance...');

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Create a simple test image
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(0, 0, 640, 480);

    const faceModel = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      { runtime: 'tfjs', refineLandmarks: true, maxFaces: 1 }
    );

    const startTime = performance.now();
    const iterations = 10;
    let totalTime = 0;

    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();
      await faceModel.estimateFaces(canvas);
      const iterEnd = performance.now();
      totalTime += (iterEnd - iterStart);
    }

    const avgTime = totalTime / iterations;
    const fps = Math.round(1000 / avgTime);

    // Get memory usage
    let memoryUsage = 0;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = Math.round(memory.usedJSHeapSize / (1024 * 1024)); // MB
    }

    console.log(`📊 Performance test: ${fps} FPS, ${memoryUsage}MB memory usage`);
    return { fps, memoryUsage };
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return { fps: 0, memoryUsage: 0 };
  }
}

// Export test functions for use in components
export const MediaPipeTests = {
  testModels: testMediaPipeModels,
  testLandmarks: testLandmarkDetection,
  testPerformance: testPerformance
}; 