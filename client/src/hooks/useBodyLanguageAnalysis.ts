import { useState, useCallback } from 'react';
import { BodyLanguageAnalyzer, BodyLanguageMetrics } from '../services/bodyLanguageAnalysis';

export const useBodyLanguageAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BodyLanguageMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = useCallback(async (videoElement: HTMLVideoElement): Promise<BodyLanguageMetrics | null> => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const analyzer = new BodyLanguageAnalyzer();
      const result = await analyzer.analyzeVideoFrames(videoElement);
      
      setAnalysisResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze body language';
      setError(errorMessage);
      console.error('Body language analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return {
    analyzeVideo,
    isAnalyzing,
    analysisResult,
    error,
    resetAnalysis,
  };
};

