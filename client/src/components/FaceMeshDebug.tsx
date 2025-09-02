import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

interface FaceMeshDebugProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onMetricsUpdate?: (metrics: any) => void;
}

const FaceMeshDebug = ({ videoRef, enabled, onMetricsUpdate }: FaceMeshDebugProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    faceDetected: false,
    handsDetected: 0,
    poseDetected: false,
    landmarks: 0,
    fps: 0,
  });

  const faceModelRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const handModelRef = useRef<handPoseDetection.HandDetector | null>(null);
  const poseModelRef = useRef<poseDetection.PoseDetector | null>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // MediaPipe Face Mesh landmark indices for visualization
  const FACE_LANDMARKS = {
    // Iris landmarks for eye contact detection
    LEFT_IRIS: [468, 469, 470, 471, 472],
    RIGHT_IRIS: [473, 474, 475, 476, 477],
    
    // Eye landmarks for blink detection
    LEFT_EYE: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    RIGHT_EYE: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
    
    // Mouth landmarks for speaking detection
    MOUTH_OUTER: [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318],
    MOUTH_INNER: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308],
    
    // Head pose landmarks
    NOSE_TIP: 1,
    LEFT_EAR: 234,
    RIGHT_EAR: 454,
  };

  // Load MediaPipe models
  useEffect(() => {
    if (!enabled) return;

    async function loadModels() {
      try {
        console.log('Loading MediaPipe models for debug...');
        
        await tf.setBackend('webgl');
        await tf.ready();

        // Load MediaPipe Face Mesh
        faceModelRef.current = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          { 
            runtime: 'tfjs', 
            refineLandmarks: true,
            maxFaces: 1
          }
        );

        // Load MediaPipe Hands
        handModelRef.current = await handPoseDetection.createDetector(
          handPoseDetection.SupportedModels.MediaPipeHands,
          { 
            runtime: 'tfjs',
            maxHands: 2
          }
        );

        // Load MediaPipe Pose
        poseModelRef.current = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { 
            modelType: 'SinglePose.Lightning', 
            runtime: 'tfjs' 
          }
        );

        setIsModelLoaded(true);
        console.log('MediaPipe models loaded successfully for debug');
      } catch (error) {
        console.error('Error loading MediaPipe models for debug:', error);
      }
    }

    loadModels();
  }, [enabled]);

  // Draw landmarks on canvas
  const drawLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    color: string = '#00ff00',
    size: number = 2
  ) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    landmarks.forEach(landmark => {
      if (landmark && landmark.x !== undefined && landmark.y !== undefined) {
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, size, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  // Draw face mesh connections
  const drawFaceMesh = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    if (!landmarks || landmarks.length === 0) return;

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;

    // Draw iris landmarks (eye contact detection)
    const leftIris = FACE_LANDMARKS.LEFT_IRIS.map(idx => landmarks[idx]).filter(Boolean);
    const rightIris = FACE_LANDMARKS.RIGHT_IRIS.map(idx => landmarks[idx]).filter(Boolean);

    if (leftIris.length > 0) {
      ctx.strokeStyle = '#ff0000';
      leftIris.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, 3, 0, 2 * Math.PI);
        ctx.stroke();
      });
    }

    if (rightIris.length > 0) {
      ctx.strokeStyle = '#ff0000';
      rightIris.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, 3, 0, 2 * Math.PI);
        ctx.stroke();
      });
    }

    // Draw mouth landmarks (speaking detection)
    const mouthOuter = FACE_LANDMARKS.MOUTH_OUTER.map(idx => landmarks[idx]).filter(Boolean);
    const mouthInner = FACE_LANDMARKS.MOUTH_INNER.map(idx => landmarks[idx]).filter(Boolean);

    if (mouthOuter.length > 0) {
      ctx.strokeStyle = '#0000ff';
      mouthOuter.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, 2, 0, 2 * Math.PI);
        ctx.stroke();
      });
    }

    if (mouthInner.length > 0) {
      ctx.strokeStyle = '#0000ff';
      mouthInner.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, 2, 0, 2 * Math.PI);
        ctx.stroke();
      });
    }

    // Draw nose tip (head pose reference)
    const noseTip = landmarks[FACE_LANDMARKS.NOSE_TIP];
    if (noseTip) {
      ctx.strokeStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(noseTip.x, noseTip.y, 4, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw ears (head tilt detection)
    const leftEar = landmarks[FACE_LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[FACE_LANDMARKS.RIGHT_EAR];
    
    if (leftEar) {
      ctx.strokeStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(leftEar.x, leftEar.y, 3, 0, 2 * Math.PI);
      ctx.stroke();
    }

    if (rightEar) {
      ctx.strokeStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(rightEar.x, rightEar.y, 3, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  // Draw hand landmarks
  const drawHands = (ctx: CanvasRenderingContext2D, hands: any[]) => {
    hands.forEach((hand, handIndex) => {
      const color = handIndex === 0 ? '#00ffff' : '#ff8800';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      if (hand.keypoints && hand.keypoints.length >= 21) {
        // Draw hand landmarks
        hand.keypoints.forEach((landmark: any) => {
          if (landmark && landmark.x !== undefined && landmark.y !== undefined) {
            ctx.beginPath();
            ctx.arc(landmark.x, landmark.y, 2, 0, 2 * Math.PI);
            ctx.stroke();
          }
        });

        // Draw hand connections (simplified)
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // index
          [0, 9], [9, 10], [10, 11], [11, 12], // middle
          [0, 13], [13, 14], [14, 15], [15, 16], // ring
          [0, 17], [17, 18], [18, 19], [19, 20], // pinky
        ];

        connections.forEach(([start, end]) => {
          const startPoint = hand.keypoints[start];
          const endPoint = hand.keypoints[end];
          if (startPoint && endPoint) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();
          }
        });
      }
    });
  };

  // Draw pose landmarks
  const drawPose = (ctx: CanvasRenderingContext2D, pose: any) => {
    if (!pose || !pose.keypoints) return;

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;

    // Draw key pose points
    const keyPoints = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip', 'left_ear', 'right_ear'];
    
    keyPoints.forEach(pointName => {
      const point = pose.keypoints.find((k: any) => k.name === pointName);
      if (point && point.x !== undefined && point.y !== undefined) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });

    // Draw shoulder line
    const leftShoulder = pose.keypoints.find((k: any) => k.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find((k: any) => k.name === 'right_shoulder');
    
    if (leftShoulder && rightShoulder) {
      ctx.beginPath();
      ctx.moveTo(leftShoulder.x, leftShoulder.y);
      ctx.lineTo(rightShoulder.x, rightShoulder.y);
      ctx.stroke();
    }

    // Draw hip line
    const leftHip = pose.keypoints.find((k: any) => k.name === 'left_hip');
    const rightHip = pose.keypoints.find((k: any) => k.name === 'right_hip');
    
    if (leftHip && rightHip) {
      ctx.beginPath();
      ctx.moveTo(leftHip.x, leftHip.y);
      ctx.lineTo(rightHip.x, rightHip.y);
      ctx.stroke();
    }
  };

  // Main detection loop
  const detectAndDraw = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !isModelLoaded || !enabled) {
      animationRef.current = requestAnimationFrame(detectAndDraw);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(detectAndDraw);
      return;
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Face detection
      const faces = await faceModelRef.current!.estimateFaces(video);
      let faceDetected = false;
      let landmarkCount = 0;

      if (faces.length > 0) {
        faceDetected = true;
        const face = faces[0];
        landmarkCount = face.keypoints.length;
        drawFaceMesh(ctx, face.keypoints);
      }

      // Hand detection
      const hands = await handModelRef.current!.estimateHands(video);
      drawHands(ctx, hands);

      // Pose detection
      const poses = await poseModelRef.current!.estimatePoses(video);
      let poseDetected = false;

      if (poses.length > 0) {
        poseDetected = true;
        drawPose(ctx, poses[0]);
      }

      // Calculate FPS
      const currentTime = performance.now();
      frameCountRef.current++;
      
      if (currentTime - lastTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (currentTime - lastTimeRef.current));
        setDebugInfo({
          faceDetected,
          handsDetected: hands.length,
          poseDetected,
          landmarks: landmarkCount,
          fps,
        });
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      // Call metrics update callback if provided
      if (onMetricsUpdate && faces.length > 0) {
        onMetricsUpdate({
          faceDetected,
          handsDetected: hands.length,
          poseDetected,
          landmarks: landmarkCount,
          fps: debugInfo.fps,
        });
      }

    } catch (error) {
      console.error('Detection error in debug mode:', error);
    }

    animationRef.current = requestAnimationFrame(detectAndDraw);
  };

  // Start detection loop
  useEffect(() => {
    if (enabled && isModelLoaded) {
      detectAndDraw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, isModelLoaded]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        style={{ 
          border: '2px solid #00ff00',
          borderRadius: '8px'
        }}
      />
      
      {/* Debug Info Overlay */}
      <div className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded text-xs z-20">
        <div>Model: {isModelLoaded ? '✅ Loaded' : '⏳ Loading...'}</div>
        <div>Face: {debugInfo.faceDetected ? '✅' : '❌'}</div>
        <div>Hands: {debugInfo.handsDetected}</div>
        <div>Pose: {debugInfo.poseDetected ? '✅' : '❌'}</div>
        <div>Landmarks: {debugInfo.landmarks}</div>
        <div>FPS: {debugInfo.fps}</div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs z-20">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Iris (Eye Contact)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Mouth (Speaking)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Nose (Head Pose)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span>Ears (Head Tilt)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
          <span>Hands (Gestures)</span>
        </div>
      </div>
    </div>
  );
};

export default FaceMeshDebug; 