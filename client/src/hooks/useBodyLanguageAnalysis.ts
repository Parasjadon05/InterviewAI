import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

interface BodyLanguageMetrics {
  eyeContactPercent: number;
  postureScore: number;
  gestureCount: number;
  smilePercent: number;
  handPresencePercent: number;
  advancedPostureScore: number;
  speakingPercent: number;
  headTiltScore: number;
  engagementScore: number;
  confidenceScore: number;
}

const defaultMetrics: BodyLanguageMetrics = {
  eyeContactPercent: 0,
  postureScore: 0,
  gestureCount: 0,
  smilePercent: 0,
  handPresencePercent: 0,
  advancedPostureScore: 0,
  speakingPercent: 0,
  headTiltScore: 0,
  engagementScore: 0,
  confidenceScore: 0,
};

// MediaPipe Face Mesh landmark indices
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
  LEFT_SHOULDER: 234,
  RIGHT_SHOULDER: 454,
  
  // Facial features for engagement
  LEFT_EYEBROW: [70, 63, 105, 66, 107],
  RIGHT_EYEBROW: [336, 296, 334, 293, 300],
  LEFT_CHEEK: [50],
  RIGHT_CHEEK: [280],
};

// Moving average class for smoothing metrics
class MovingAverage {
  private values: number[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  add(value: number): void {
    this.values.push(value);
    if (this.values.length > this.maxSize) {
      this.values.shift();
    }
  }

  getAverage(): number {
    if (this.values.length === 0) return 0;
    return this.values.reduce((sum, val) => sum + val, 0) / this.values.length;
  }

  reset(): void {
    this.values = [];
  }
}

export default function useBodyLanguageAnalysis(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean
) {
  const [latestMetrics, setLatestMetrics] = useState<BodyLanguageMetrics>(defaultMetrics);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceModelRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const handModelRef = useRef<handPoseDetection.HandDetector | null>(null);
  const poseModelRef = useRef<poseDetection.PoseDetector | null>(null);
  
  // Frame counters
  const frameCount = useRef(0);
  const eyeContactFrames = useRef(0);
  const smileFrames = useRef(0);
  const goodPostureFrames = useRef(0);
  const handPresenceFrames = useRef(0);
  const gestureCount = useRef(0);
  const advancedPostureFrames = useRef(0);
  const speakingFrames = useRef(0);
  const goodHeadTiltFrames = useRef(0);
  const engagementFrames = useRef(0);
  const confidenceFrames = useRef(0);

  // Moving averages for smoothing
  const eyeContactSmoother = useRef(new MovingAverage(10));
  const postureSmoother = useRef(new MovingAverage(10));
  const speakingSmoother = useRef(new MovingAverage(10));
  const headTiltSmoother = useRef(new MovingAverage(10));
  const engagementSmoother = useRef(new MovingAverage(10));
  const confidenceSmoother = useRef(new MovingAverage(10));

  // Reset metrics for next question
  const resetMetrics = () => {
    frameCount.current = 0;
    eyeContactFrames.current = 0;
    smileFrames.current = 0;
    goodPostureFrames.current = 0;
    handPresenceFrames.current = 0;
    gestureCount.current = 0;
    advancedPostureFrames.current = 0;
    speakingFrames.current = 0;
    goodHeadTiltFrames.current = 0;
    engagementFrames.current = 0;
    confidenceFrames.current = 0;

    // Reset smoothers
    eyeContactSmoother.current.reset();
    postureSmoother.current.reset();
    speakingSmoother.current.reset();
    headTiltSmoother.current.reset();
    engagementSmoother.current.reset();
    confidenceSmoother.current.reset();

    setLatestMetrics(defaultMetrics);
  };

  // Helper function to calculate distance between two points
  const calculateDistance = (point1: { x: number; y: number }, point2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
  };

  // Helper function to calculate angle between three points
  const calculateAngle = (point1: { x: number; y: number }, point2: { x: number; y: number }, point3: { x: number; y: number }): number => {
    const angle1 = Math.atan2(point1.y - point2.y, point1.x - point2.x);
    const angle2 = Math.atan2(point3.y - point2.y, point3.x - point2.x);
    let angle = (angle2 - angle1) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
  };

  // Enhanced eye contact detection using iris landmarks
  const detectEyeContact = (face: faceLandmarksDetection.NormalizedKeypoint[]): boolean => {
    try {
      // Get iris centers
      const leftIrisCenter = {
        x: face[468].x,
        y: face[468].y
      };
      const rightIrisCenter = {
        x: face[473].x,
        y: face[473].y
      };

      // Get nose tip for reference
      const noseTip = {
        x: face[FACE_LANDMARKS.NOSE_TIP].x,
        y: face[FACE_LANDMARKS.NOSE_TIP].y
      };

      // Calculate average iris position
      const avgIrisX = (leftIrisCenter.x + rightIrisCenter.x) / 2;
      const avgIrisY = (leftIrisCenter.y + rightIrisCenter.y) / 2;

      // Check if irises are centered (looking at camera)
      const horizontalOffset = Math.abs(avgIrisX - noseTip.x);
      const verticalOffset = Math.abs(avgIrisY - noseTip.y);

      // Thresholds for eye contact detection
      const horizontalThreshold = 30; // pixels
      const verticalThreshold = 40; // pixels

      return horizontalOffset < horizontalThreshold && verticalOffset < verticalThreshold;
    } catch (error) {
      console.error('Eye contact detection error:', error);
      return false;
    }
  };

  // Enhanced mouth openness detection for speaking
  const detectSpeaking = (face: faceLandmarksDetection.NormalizedKeypoint[]): boolean => {
    try {
      // Get mouth landmarks
      const mouthOuter = FACE_LANDMARKS.MOUTH_OUTER.map(idx => face[idx]);
      const mouthInner = FACE_LANDMARKS.MOUTH_INNER.map(idx => face[idx]);

      // Calculate mouth openness
      const mouthWidth = calculateDistance(mouthOuter[0], mouthOuter[6]); // Left to right
      const mouthHeight = calculateDistance(mouthOuter[3], mouthOuter[9]); // Top to bottom

      // Calculate mouth aspect ratio
      const mouthAspectRatio = mouthHeight / mouthWidth;

      // Threshold for speaking detection (mouth open enough)
      const speakingThreshold = 0.25;
      
      return mouthAspectRatio > speakingThreshold;
    } catch (error) {
      console.error('Speaking detection error:', error);
      return false;
    }
  };

  // Head tilt detection for engagement
  const detectHeadTilt = (face: faceLandmarksDetection.NormalizedKeypoint[]): boolean => {
    try {
      // Get ear positions
      const leftEar = {
        x: face[FACE_LANDMARKS.LEFT_EAR].x,
        y: face[FACE_LANDMARKS.LEFT_EAR].y
      };
      const rightEar = {
        x: face[FACE_LANDMARKS.RIGHT_EAR].x,
        y: face[FACE_LANDMARKS.RIGHT_EAR].y
      };

      // Calculate head tilt angle
      const headTiltAngle = Math.abs(leftEar.y - rightEar.y);
      
      // Threshold for acceptable head tilt (not too tilted)
      const tiltThreshold = 20; // pixels
      
      return headTiltAngle < tiltThreshold;
    } catch (error) {
      console.error('Head tilt detection error:', error);
      return false;
    }
  };

  // Enhanced posture detection using pose landmarks
  const detectPosture = (pose: poseDetection.Keypoint[]): boolean => {
    try {
      const leftShoulder = pose.find(k => k.name === 'left_shoulder');
      const rightShoulder = pose.find(k => k.name === 'right_shoulder');
      const leftHip = pose.find(k => k.name === 'left_hip');
      const rightHip = pose.find(k => k.name === 'right_hip');
      const leftEar = pose.find(k => k.name === 'left_ear');
      const rightEar = pose.find(k => k.name === 'right_ear');

      if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftEar || !rightEar) {
        return false;
      }

      // Check shoulder alignment
      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
      const hipMidX = (leftHip.x + rightHip.x) / 2;
      const shoulderAlignment = Math.abs(shoulderMidX - hipMidX);

      // Check if shoulders are level
      const shoulderLevel = Math.abs(leftShoulder.y - rightShoulder.y);

      // Check head position relative to shoulders
      const earMidX = (leftEar.x + rightEar.x) / 2;
      const headAlignment = Math.abs(earMidX - shoulderMidX);

      // Thresholds for good posture
      const alignmentThreshold = 30;
      const levelThreshold = 20;

      return shoulderAlignment < alignmentThreshold && 
             shoulderLevel < levelThreshold && 
             headAlignment < alignmentThreshold;
    } catch (error) {
      console.error('Posture detection error:', error);
      return false;
    }
  };

  // Enhanced gesture detection using hand landmarks
  const detectGestures = (hands: handPoseDetection.Hand[]): number => {
    try {
      let gestureCount = 0;
      
      for (const hand of hands) {
        if (hand.keypoints && hand.keypoints.length >= 21) {
          // Check for open hand gesture
          const wrist = hand.keypoints[0];
          const thumbTip = hand.keypoints[4];
          const indexTip = hand.keypoints[8];
          const middleTip = hand.keypoints[12];
          const ringTip = hand.keypoints[16];
          const pinkyTip = hand.keypoints[20];

          // Calculate finger extensions
          const thumbExtension = calculateDistance(wrist, thumbTip);
          const indexExtension = calculateDistance(wrist, indexTip);
          const middleExtension = calculateDistance(wrist, middleTip);
          const ringExtension = calculateDistance(wrist, ringTip);
          const pinkyExtension = calculateDistance(wrist, pinkyTip);

          // Check if hand is open (fingers extended)
          const extensionThreshold = 0.1; // Normalized distance
          const extendedFingers = [
            thumbExtension, indexExtension, middleExtension, 
            ringExtension, pinkyExtension
          ].filter(ext => ext > extensionThreshold).length;

          if (extendedFingers >= 3) {
            gestureCount++;
          }
        }
      }
      
      return gestureCount;
    } catch (error) {
      console.error('Gesture detection error:', error);
      return 0;
    }
  };

  // Calculate engagement score based on multiple factors
  const calculateEngagementScore = (
    eyeContact: boolean,
    speaking: boolean,
    headTilt: boolean,
    posture: boolean
  ): number => {
    let score = 0;
    if (eyeContact) score += 25;
    if (speaking) score += 25;
    if (headTilt) score += 25;
    if (posture) score += 25;
    return score;
  };

  // Calculate confidence score
  const calculateConfidenceScore = (
    eyeContact: boolean,
    posture: boolean,
    headTilt: boolean,
    gestureCount: number
  ): number => {
    let score = 0;
    if (eyeContact) score += 30;
    if (posture) score += 30;
    if (headTilt) score += 20;
    if (gestureCount > 0) score += 20;
    return Math.min(score, 100);
  };

  useEffect(() => {
    if (!enabled || !videoRef.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let isMounted = true;
    let modelsLoaded = false;

    async function loadModelsAndStart() {
      try {
        // Ensure TensorFlow.js backend is ready
        await tf.setBackend('webgl');
        await tf.ready();
        
        if (!modelsLoaded) {
          console.log('Loading MediaPipe models...');
          
          // Load MediaPipe Face Mesh with refined landmarks
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
          
          modelsLoaded = true;
          console.log('All MediaPipe models loaded successfully');
        }

        if (!isMounted) return;

        intervalRef.current = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !faceModelRef.current || !handModelRef.current || !poseModelRef.current) {
            return;
          }

          frameCount.current++;

          try {
            // Face analysis with MediaPipe Face Mesh
            const faces = await faceModelRef.current.estimateFaces(video);
            
            if (faces.length > 0) {
              const face = faces[0];
              const landmarks = face.keypoints;

              // Enhanced eye contact detection
              const eyeContact = detectEyeContact(landmarks);
              if (eyeContact) eyeContactFrames.current++;

              // Enhanced speaking detection
              const speaking = detectSpeaking(landmarks);
              if (speaking) speakingFrames.current++;

              // Enhanced head tilt detection
              const headTilt = detectHeadTilt(landmarks);
              if (headTilt) goodHeadTiltFrames.current++;

              // Smile detection (simplified)
              const mouthLeft = landmarks[61];
              const mouthRight = landmarks[291];
              const mouthTop = landmarks[13];
              const mouthBottom = landmarks[14];
              
              if (mouthLeft && mouthRight && mouthTop && mouthBottom) {
                const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
                const mouthHeight = Math.abs(mouthBottom.y - mouthTop.y);
                if (mouthHeight / mouthWidth > 0.35) smileFrames.current++;
              }
            }

            // Hand analysis with MediaPipe Hands
            const hands = await handModelRef.current.estimateHands(video);
            
            if (hands.length > 0) {
              handPresenceFrames.current++;
              const gestures = detectGestures(hands);
              gestureCount.current += gestures;
            }

            // Pose analysis with MediaPipe Pose
            const poses = await poseModelRef.current.estimatePoses(video);
            
            if (poses.length > 0) {
              const pose = poses[0];
              const goodPosture = detectPosture(pose.keypoints);
              if (goodPosture) {
                goodPostureFrames.current++;
                advancedPostureFrames.current++;
              }
            }

            // Calculate engagement and confidence scores
            const currentEyeContact = eyeContactFrames.current > frameCount.current * 0.5;
            const currentSpeaking = speakingFrames.current > frameCount.current * 0.3;
            const currentHeadTilt = goodHeadTiltFrames.current > frameCount.current * 0.7;
            const currentPosture = goodPostureFrames.current > frameCount.current * 0.6;
            const currentGestures = gestureCount.current > 0;

            const engagementScore = calculateEngagementScore(
              currentEyeContact, currentSpeaking, currentHeadTilt, currentPosture
            );
            const confidenceScore = calculateConfidenceScore(
              currentEyeContact, currentPosture, currentHeadTilt, currentGestures ? 1 : 0
            );

            if (engagementScore > 50) engagementFrames.current++;
            if (confidenceScore > 60) confidenceFrames.current++;

            // Apply smoothing with moving averages
            const eyeContactPercent = Math.round((eyeContactFrames.current / frameCount.current) * 100);
            const postureScore = Math.round((goodPostureFrames.current / frameCount.current) * 100);
            const speakingPercent = Math.round((speakingFrames.current / frameCount.current) * 100);
            const headTiltScore = Math.round((goodHeadTiltFrames.current / frameCount.current) * 100);
            const engagementPercent = Math.round((engagementFrames.current / frameCount.current) * 100);
            const confidencePercent = Math.round((confidenceFrames.current / frameCount.current) * 100);

            eyeContactSmoother.current.add(eyeContactPercent);
            postureSmoother.current.add(postureScore);
            speakingSmoother.current.add(speakingPercent);
            headTiltSmoother.current.add(headTiltScore);
            engagementSmoother.current.add(engagementPercent);
            confidenceSmoother.current.add(confidencePercent);

            const metrics: BodyLanguageMetrics = {
              eyeContactPercent: Math.round(eyeContactSmoother.current.getAverage()),
              postureScore: Math.round(postureSmoother.current.getAverage()),
              gestureCount: gestureCount.current,
              smilePercent: Math.round((smileFrames.current / frameCount.current) * 100),
              handPresencePercent: Math.round((handPresenceFrames.current / frameCount.current) * 100),
              advancedPostureScore: Math.round((advancedPostureFrames.current / frameCount.current) * 100),
              speakingPercent: Math.round(speakingSmoother.current.getAverage()),
              headTiltScore: Math.round(headTiltSmoother.current.getAverage()),
              engagementScore: Math.round(engagementSmoother.current.getAverage()),
              confidenceScore: Math.round(confidenceSmoother.current.getAverage()),
            };

            console.log('Enhanced body language metrics:', metrics);
            setLatestMetrics(metrics);

          } catch (error) {
            console.error('Enhanced body language analysis error:', error);
          }
        }, 500); // Process every 500ms for stable metrics

      } catch (error) {
        console.error('Error loading MediaPipe models:', error);
      }
    }

    loadModelsAndStart();

    return () => {
      isMounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, videoRef]);

  return { latestMetrics, resetMetrics };
} 