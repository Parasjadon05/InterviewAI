import * as faceapi from 'face-api.js';

export const loadModels = async (): Promise<void> => {
  try {
    // Load models from CDN
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    
    console.log('Face-api.js models loaded successfully');
  } catch (error) {
    console.error('Failed to load face-api.js models:', error);
    throw error;
  }
};

