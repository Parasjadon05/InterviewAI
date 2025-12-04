import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
import { createDetector, SupportedModels } from '@tensorflow-models/pose-detection';
import { loadModels } from '../utils/modelLoader';

export interface BodyLanguageMetrics {
  eyeContact: {
    score: number; // 0-100
    percentage: number; // percentage of time looking at camera
    feedback: string;
  };
  posture: {
    score: number; // 0-100
    feedback: string;
  };
  confidence: {
    score: number; // 0-100
    feedback: string;
  };
  professionalAppearance: {
    score: number; // 0-100
    lighting: number; // 0-100
    background: number; // 0-100
    feedback: string;
  };
  overallScore: number; // 0-100
  recommendations: string[];
}

export class BodyLanguageAnalyzer {
  private faceDetector: any = null;
  private poseDetector: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load face-api.js models
      await loadModels();

      // Initialize pose detection
      this.poseDetector = await createDetector(SupportedModels.MoveNet, {
        modelType: 'SinglePose.Lightning',
      });

      this.isInitialized = true;
      console.log('Body language analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize body language analyzer:', error);
      throw error;
    }
  }

  async analyzeVideoFrames(videoElement: HTMLVideoElement): Promise<BodyLanguageMetrics> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const frames: ImageData[] = [];
    const frameCount = 10; // Analyze 10 frames for faster processing
    const interval = Math.floor(videoElement.duration * 1000 / frameCount);

    // Extract frames from video
    for (let i = 0; i < frameCount; i++) {
      videoElement.currentTime = (i * interval) / 1000;
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for frame to load
      
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        frames.push(imageData);
      }
    }

    // Analyze frames
    const analysisResults = await Promise.all(
      frames.map(frame => this.analyzeFrame(frame))
    );

    // Calculate overall metrics
    return this.calculateOverallMetrics(analysisResults);
  }

  private async analyzeFrame(imageData: ImageData): Promise<{
    eyeContact: boolean;
    posture: number;
    confidence: number;
    lighting: number;
    background: number;
  }> {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.putImageData(imageData, 0, 0);

    // Face detection and eye contact analysis
    const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    let eyeContact = false;
    let confidence = 50; // Default confidence

    if (detections.length > 0) {
      const face = detections[0];
      const landmarks = face.landmarks;
      
      // Calculate eye contact based on face position and angle
      eyeContact = this.calculateEyeContact(landmarks, canvas.width, canvas.height);
      
      // Calculate confidence based on facial expressions
      confidence = this.calculateConfidence(face.expressions);
    }

    // Pose detection for posture analysis
    let posture = 50; // Default posture
    try {
      const poses = await this.poseDetector.estimatePoses(canvas);
      if (poses.length > 0) {
        posture = this.calculatePosture(poses[0]);
      }
    } catch (error) {
      console.warn('Pose detection failed:', error);
    }

    // Lighting and background analysis
    const lighting = this.analyzeLighting(imageData);
    const background = this.analyzeBackground(imageData);

    return {
      eyeContact,
      posture,
      confidence,
      lighting,
      background,
    };
  }

  private calculateEyeContact(landmarks: any, width: number, height: number): boolean {
    // Get eye positions
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    // Calculate center of eyes
    const eyeCenterX = (leftEye[0].x + rightEye[0].x) / 2;
    const eyeCenterY = (leftEye[0].y + rightEye[0].y) / 2;
    
    // Check if eyes are looking towards camera (center of frame)
    const centerX = width / 2;
    const centerY = height / 2;
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(eyeCenterX - centerX, 2) + Math.pow(eyeCenterY - centerY, 2)
    );
    
    // Consider it eye contact if within 20% of center
    const threshold = Math.min(width, height) * 0.2;
    return distanceFromCenter < threshold;
  }

  private calculateConfidence(expressions: any): number {
    // Higher confidence for positive expressions
    const positiveExpressions = expressions.happy + expressions.neutral;
    const negativeExpressions = expressions.sad + expressions.angry + expressions.fearful + expressions.disgusted + expressions.surprised;
    
    const total = positiveExpressions + negativeExpressions;
    if (total === 0) return 50;
    
    return Math.round((positiveExpressions / total) * 100);
  }

  private calculatePosture(pose: any): number {
    // Analyze shoulder alignment and head position
    const keypoints = pose.keypoints;
    
    // Find key points
    const leftShoulder = keypoints.find((kp: any) => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find((kp: any) => kp.name === 'right_shoulder');
    const nose = keypoints.find((kp: any) => kp.name === 'nose');
    
    if (!leftShoulder || !rightShoulder || !nose) {
      return 50; // Default if key points not found
    }
    
    // Calculate shoulder alignment
    const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);
    const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
    
    // Good posture: shoulders level and head centered
    const alignmentScore = Math.max(0, 100 - (shoulderSlope / shoulderDistance) * 100);
    
    return Math.round(Math.min(100, alignmentScore));
  }

  private analyzeLighting(imageData: ImageData): number {
    // Analyze brightness and contrast
    const data = imageData.data;
    let totalBrightness = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      pixelCount++;
    }
    
    const averageBrightness = totalBrightness / pixelCount;
    
    // Good lighting: brightness between 100-200
    if (averageBrightness < 50) return 20; // Too dark
    if (averageBrightness > 250) return 20; // Too bright
    if (averageBrightness >= 100 && averageBrightness <= 200) return 90; // Good
    return 60; // Average
  }

  private analyzeBackground(imageData: ImageData): number {
    // Simple background analysis - check for clutter
    const data = imageData.data;
    let edgeCount = 0;
    
    // Count edges (simplified edge detection)
    for (let i = 0; i < data.length - 4; i += 4) {
      const r1 = data[i];
      const g1 = data[i + 1];
      const b1 = data[i + 2];
      
      const r2 = data[i + 4];
      const g2 = data[i + 8];
      const b2 = data[i + 12];
      
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      if (diff > 50) edgeCount++;
    }
    
    // More edges = more cluttered background
    const edgeRatio = edgeCount / (data.length / 4);
    
    if (edgeRatio < 0.1) return 90; // Clean background
    if (edgeRatio < 0.2) return 70; // Slightly cluttered
    if (edgeRatio < 0.3) return 50; // Moderately cluttered
    return 30; // Very cluttered
  }

  private calculateOverallMetrics(results: any[]): BodyLanguageMetrics {
    // Calculate averages
    const eyeContactPercentage = (results.filter(r => r.eyeContact).length / results.length) * 100;
    const avgPosture = results.reduce((sum, r) => sum + r.posture, 0) / results.length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const avgLighting = results.reduce((sum, r) => sum + r.lighting, 0) / results.length;
    const avgBackground = results.reduce((sum, r) => sum + r.background, 0) / results.length;

    // Calculate scores
    const eyeContactScore = Math.round(eyeContactPercentage);
    const postureScore = Math.round(avgPosture);
    const confidenceScore = Math.round(avgConfidence);
    const professionalAppearanceScore = Math.round((avgLighting + avgBackground) / 2);

    // Generate feedback
    const eyeContactFeedback = this.generateEyeContactFeedback(eyeContactScore);
    const postureFeedback = this.generatePostureFeedback(postureScore);
    const confidenceFeedback = this.generateConfidenceFeedback(confidenceScore);
    const professionalFeedback = this.generateProfessionalFeedback(professionalAppearanceScore);

    // Calculate overall score
    const overallScore = Math.round(
      (eyeContactScore + postureScore + confidenceScore + professionalAppearanceScore) / 4
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      eyeContact: eyeContactScore,
      posture: postureScore,
      confidence: confidenceScore,
      professional: professionalAppearanceScore,
    });

    return {
      eyeContact: {
        score: eyeContactScore,
        percentage: eyeContactPercentage,
        feedback: eyeContactFeedback,
      },
      posture: {
        score: postureScore,
        feedback: postureFeedback,
      },
      confidence: {
        score: confidenceScore,
        feedback: confidenceFeedback,
      },
      professionalAppearance: {
        score: professionalAppearanceScore,
        lighting: Math.round(avgLighting),
        background: Math.round(avgBackground),
        feedback: professionalFeedback,
      },
      overallScore,
      recommendations,
    };
  }

  private generateEyeContactFeedback(score: number): string {
    if (score >= 80) return "Excellent eye contact maintained throughout the interview.";
    if (score >= 60) return "Good eye contact, try to maintain it more consistently.";
    if (score >= 40) return "Eye contact needs improvement. Practice looking at the camera more often.";
    return "Poor eye contact. Focus on looking directly at the camera during responses.";
  }

  private generatePostureFeedback(score: number): string {
    if (score >= 80) return "Excellent posture maintained throughout the interview.";
    if (score >= 60) return "Good posture overall, maintain this professional appearance.";
    if (score >= 40) return "Posture could be improved. Sit up straight and keep shoulders level.";
    return "Poor posture detected. Focus on sitting upright with shoulders back.";
  }

  private generateConfidenceFeedback(score: number): string {
    if (score >= 80) return "Very confident and engaging presence throughout the interview.";
    if (score >= 60) return "Good confidence level, try to show more enthusiasm.";
    if (score >= 40) return "Confidence needs improvement. Practice speaking with more conviction.";
    return "Low confidence detected. Work on building self-assurance and positive body language.";
  }

  private generateProfessionalFeedback(score: number): string {
    if (score >= 80) return "Excellent professional appearance with good lighting and clean background.";
    if (score >= 60) return "Good professional setup, minor improvements could be made.";
    if (score >= 40) return "Professional appearance needs improvement. Check lighting and background.";
    return "Poor professional appearance. Improve lighting, background, and overall setup.";
  }

  private generateRecommendations(scores: any): string[] {
    const recommendations: string[] = [];

    if (scores.eyeContact < 70) {
      recommendations.push("Practice maintaining eye contact with the camera 70-80% of the time");
    }

    if (scores.posture < 70) {
      recommendations.push("Focus on sitting upright with shoulders back and head held high");
    }

    if (scores.confidence < 70) {
      recommendations.push("Work on projecting confidence through facial expressions and body language");
    }

    if (scores.professional < 70) {
      recommendations.push("Improve your professional setup with better lighting and a clean background");
    }

    if (recommendations.length === 0) {
      recommendations.push("Excellent body language and professional presence! Keep up the great work.");
    }

    return recommendations;
  }
}

