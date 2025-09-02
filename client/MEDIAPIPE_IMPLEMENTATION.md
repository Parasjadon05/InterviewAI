# Enhanced MediaPipe Face Mesh Implementation

This document explains the enhanced MediaPipe Face Mesh implementation for facial landmark detection, pose tracking, and body language analysis in the InterviewAI application.

## Overview

The implementation uses MediaPipe Face Mesh to detect:
- **Iris landmarks** for eye contact detection
- **Mouth landmarks** for speaking detection  
- **Head pose landmarks** for engagement cues
- **Pose detection** for body posture analysis
- **Hand tracking** for gesture recognition

## Key Features

### 1. Iris Landmarks for Eye Contact Detection
- **Landmarks**: 468-472 (left iris), 473-477 (right iris)
- **Detection Method**: Calculates average iris position relative to nose tip
- **Thresholds**: 
  - Horizontal offset: 30 pixels
  - Vertical offset: 40 pixels
- **Smoothing**: 10-frame moving average

### 2. Mouth Openness for Speaking Detection
- **Landmarks**: 61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318 (outer mouth)
- **Detection Method**: Calculates mouth aspect ratio (height/width)
- **Threshold**: 0.25 (mouth open enough to indicate speaking)
- **Smoothing**: 10-frame moving average

### 3. Head Tilt for Engagement Cues
- **Landmarks**: 234 (left ear), 454 (right ear)
- **Detection Method**: Calculates vertical difference between ears
- **Threshold**: 20 pixels (acceptable head tilt)
- **Smoothing**: 10-frame moving average

### 4. Pose Detection for Body Posture
- **Key Points**: Shoulders, hips, ears
- **Detection Method**: 
  - Shoulder alignment with hips
  - Shoulder levelness
  - Head position relative to shoulders
- **Thresholds**: 
  - Alignment: 30 pixels
  - Levelness: 20 pixels

### 5. Hand Tracking for Gesture Recognition
- **Landmarks**: 21 points per hand
- **Detection Method**: Finger extension analysis
- **Gesture Types**: Open hand detection
- **Threshold**: 3+ extended fingers

## Technical Implementation

### Moving Average Smoothing
```typescript
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
}
```

### Enhanced Metrics
The implementation now tracks:
- `eyeContactPercent`: Percentage of frames with good eye contact
- `speakingPercent`: Percentage of frames with mouth open (speaking)
- `headTiltScore`: Percentage of frames with acceptable head tilt
- `engagementScore`: Combined engagement metric
- `confidenceScore`: Combined confidence metric
- `postureScore`: Body posture quality
- `gestureCount`: Number of detected gestures

## Debug Component

The `FaceMeshDebug` component provides real-time visualization:
- **Red dots**: Iris landmarks (eye contact)
- **Blue dots**: Mouth landmarks (speaking)
- **Yellow dot**: Nose tip (head pose reference)
- **Purple dots**: Ears (head tilt)
- **Cyan/Orange**: Hand landmarks (gestures)
- **Green**: Pose landmarks (posture)

### Enabling Debug Mode
1. Start the interview session
2. Enable camera and microphone
3. Click the eye icon (👁️) in the top-left corner
4. Debug overlay will show real-time landmarks

## Troubleshooting Guide

### Issue: No Face Detection
**Symptoms**: 
- Debug shows "Face: ❌"
- No landmarks visible
- Console errors about face detection

**Solutions**:
1. **Check lighting**: Ensure good, even lighting on face
2. **Camera position**: Face should be clearly visible and centered
3. **Model loading**: Check console for "MediaPipe models loaded successfully"
4. **Browser compatibility**: Ensure WebGL is enabled
5. **Camera permissions**: Verify camera access is granted

### Issue: Unstable Metrics
**Symptoms**:
- Metrics jumping between values
- Inconsistent eye contact detection
- Erratic posture scores

**Solutions**:
1. **Increase smoothing**: Adjust MovingAverage size (default: 10)
2. **Check thresholds**: Verify landmark detection thresholds
3. **Stabilize camera**: Use tripod or stable surface
4. **Reduce movement**: Minimize head movement during analysis
5. **Check FPS**: Ensure consistent frame rate (target: 30+ FPS)

### Issue: Poor Performance
**Symptoms**:
- Low FPS in debug overlay
- Laggy video feed
- High CPU usage

**Solutions**:
1. **Reduce resolution**: Lower video resolution
2. **Close other tabs**: Free up browser resources
3. **Update GPU drivers**: Ensure latest graphics drivers
4. **Use hardware acceleration**: Enable WebGL backend
5. **Reduce processing frequency**: Increase interval between analyses

### Issue: Incorrect Landmark Detection
**Symptoms**:
- Landmarks appearing in wrong positions
- Eye contact detection not working
- Speaking detection inaccurate

**Solutions**:
1. **Check landmark indices**: Verify correct MediaPipe indices
2. **Adjust thresholds**: Fine-tune detection thresholds
3. **Face orientation**: Ensure face is facing camera
4. **Distance**: Maintain appropriate distance from camera
5. **Calibration**: Test with different lighting conditions

## Performance Optimization

### Frame Processing
- **Interval**: 500ms between analyses (configurable)
- **Batch processing**: Process face, hands, and pose together
- **Early exit**: Skip processing if models not loaded

### Memory Management
- **Model cleanup**: Properly dispose of TensorFlow models
- **Canvas clearing**: Clear debug canvas each frame
- **Reference cleanup**: Clear intervals and animations

### Browser Compatibility
- **WebGL backend**: Required for TensorFlow.js
- **MediaDevices API**: Required for camera access
- **Canvas API**: Required for debug visualization

## Configuration

### Thresholds (Configurable)
```typescript
// Eye contact detection
const horizontalThreshold = 30; // pixels
const verticalThreshold = 40; // pixels

// Speaking detection
const speakingThreshold = 0.25; // mouth aspect ratio

// Head tilt detection
const tiltThreshold = 20; // pixels

// Posture detection
const alignmentThreshold = 30; // pixels
const levelThreshold = 20; // pixels
```

### Model Configuration
```typescript
// Face Mesh
{
  runtime: 'tfjs',
  refineLandmarks: true,
  maxFaces: 1
}

// Hands
{
  runtime: 'tfjs',
  maxHands: 2
}

// Pose
{
  modelType: 'SinglePose.Lightning',
  runtime: 'tfjs'
}
```

## Monitoring and Logging

### Console Logs
- Model loading status
- Detection errors
- Performance metrics
- Debug information

### Debug Overlay
- Real-time FPS
- Detection status
- Landmark count
- Model loading status

### Metrics Tracking
- Frame-by-frame analysis
- Moving averages
- Confidence scores
- Engagement metrics

## Best Practices

1. **Lighting**: Use even, front-facing lighting
2. **Distance**: Maintain 2-3 feet from camera
3. **Stability**: Minimize movement during analysis
4. **Calibration**: Test in intended environment
5. **Performance**: Monitor FPS and adjust settings
6. **Debugging**: Use debug overlay for troubleshooting

## Common Use Cases

### Interview Preparation
- Practice eye contact detection
- Monitor speaking patterns
- Improve posture awareness
- Track gesture usage

### Performance Analysis
- Review engagement metrics
- Analyze confidence indicators
- Identify improvement areas
- Track progress over time

### Technical Development
- Debug landmark detection
- Optimize performance
- Fine-tune thresholds
- Test new features

## Support

For technical issues:
1. Check browser console for errors
2. Enable debug overlay
3. Verify camera permissions
4. Test with different browsers
5. Check system requirements

For feature requests:
- Document specific requirements
- Provide use case examples
- Include performance expectations
- Specify browser compatibility needs 