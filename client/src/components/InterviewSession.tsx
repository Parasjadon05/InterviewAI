import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Video, VideoOff, Mic, MicOff, Volume2, Info, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AnalysisDashboard from "./AnalysisDashboard";
import useBodyLanguageAnalysis from '../hooks/useBodyLanguageAnalysis';
import FaceMeshDebug from './FaceMeshDebug';
import { MediaPipeTests } from '@/utils/mediapipeTest';
import { appwriteDatabases, APPWRITE_DB_ID, APPWRITE_FEEDBACK_COLLECTION_ID } from "@/lib/appwrite";
import { ID } from "appwrite";
import { useAuth } from "@/context/AuthContext";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface InterviewSessionProps {
  role: string;
  questions: string[];
  loadingQuestions: boolean;
  onInterviewComplete: (data: any) => void;
}

const InterviewSession = ({ role, questions, loadingQuestions, onInterviewComplete }: InterviewSessionProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlobs, setAudioBlobs] = useState<(Blob | null)[]>(Array(questions.length).fill(null));
  const [transcripts, setTranscripts] = useState<string[]>(Array(questions.length).fill(""));
  const [feedbacks, setFeedbacks] = useState<string[]>(Array(questions.length).fill(""));
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>("");
  const [autoRecordingReady, setAutoRecordingReady] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string>("");
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Add state to store Q&A pairs
  const [qaPairs, setQaPairs] = useState<{ question: string; transcript: string }[]>([]);
  // Add state to store audio metrics per question
  const [audioMetrics, setAudioMetrics] = useState<any[]>(Array(questions.length).fill(null));
  // Add state to store body language metrics per question
  const [bodyLanguageMetrics, setBodyLanguageMetrics] = useState<any[]>(Array(questions.length).fill(null));
  const qaPairsRef = useRef<{ question: string; transcript: string }[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Add state for last question transcription loading
  const [isTranscribingLast, setIsTranscribingLast] = useState(false);

  // Add at the top, after useState declarations:
  const [interviewStartTime, setInterviewStartTime] = useState<number | null>(null);
  const [interviewEndTime, setInterviewEndTime] = useState<number | null>(null);

  // Add at the top, after useState declarations:
  const transcriptionPromisesRef = useRef<Promise<any>[]>([]);

  // Add state to store audio durations per question
  const [durations, setDurations] = useState(Array(questions.length).fill(null));

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (streamRef.current) {
      // Sync video track
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled;
      });
      // Sync audio track
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isAudioEnabled;
      });
    }
  }, [isVideoEnabled, isAudioEnabled]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsVideoEnabled(true);
        setIsAudioEnabled(true);
        
        toast({
          title: "Camera and microphone ready",
          description: "You can now start your live interview",
        });
      }
    } catch (error) {
      toast({
        title: "Camera/Microphone access denied",
        description: "Please allow camera and microphone access for the interview",
        variant: "destructive",
      });
    }
  };

  // Audio recording handlers
  const startRecording = async () => {
    console.log('Starting recording for question', currentQuestion);
    if (!navigator.mediaDevices) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      console.log('Recording stopped for question', currentQuestion);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('Audio blob size:', audioBlob.size);
      if (audioBlob.size === 0) {
        setCurrentTranscript('No audio recorded.');
        return;
      }
      setCurrentAudioUrl(URL.createObjectURL(audioBlob));
      setAudioBlobs((prev) => {
        const updated = [...prev];
        updated[currentQuestion] = audioBlob;
        return updated;
      });
      const duration = await getAudioDuration(audioBlob);
      setDurations((prev) => {
        const updated = [...prev];
        updated[currentQuestion] = duration;
        return updated;
      });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'answer.webm');
      // Upload to backend for transcription and metrics
      try {
        const res = await axios.post('http://localhost:5001/transcribe-audio', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('Transcribe audio response:', res.data);
        if (!res.data.transcript || res.data.transcript.trim() === '') {
          console.warn('Transcript is empty after transcription!');
          setCurrentTranscript('Transcription failed or empty.');
          return;
        }
        setCurrentTranscript(res.data.transcript);
        setTranscripts((prev) => {
          const updated = [...prev];
          updated[currentQuestion] = res.data.transcript;
          return updated;
        });
        // Save Q&A pair only if transcript is valid
        setQaPairs((prev) => {
          const updated = [...prev];
          updated[currentQuestion] = {
            question: questions[currentQuestion],
            transcript: res.data.transcript,
          };
          qaPairsRef.current = updated; // keep ref in sync
          console.log('Saving Q&A pair:', updated[currentQuestion]);
          console.log('Current qaPairs state:', updated);
          return updated;
        });
        // Save audio metrics
        setAudioMetrics((prev) => {
          const updated = [...prev];
          updated[currentQuestion] = res.data.metrics;
          return updated;
        });
      } catch (err) {
        setCurrentTranscript('Transcription failed.');
      }
    };
    recorder.start();
    setIsRecording(true);
  };

  // Helper to get audio duration from a Blob
  async function getAudioDuration(blob: Blob) {
    return new Promise<number>((resolve) => {
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(blob);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
    });
  }

  // Integrate body language analysis hook
  const { latestMetrics, resetMetrics } = useBodyLanguageAnalysis(videoRef, isInterviewStarted && isVideoEnabled);

  // Helper to handle recording, transcription, and saving for a question
  const handleStopAndTranscribe = async (questionIdx: number, audioBlob: Blob) => {
    if (audioBlob.size === 0) {
      setCurrentTranscript('No audio recorded.');
      return null;
    }
    setCurrentAudioUrl(URL.createObjectURL(audioBlob));
    setAudioBlobs((prev) => {
      const updated = [...prev];
      updated[questionIdx] = audioBlob;
      return updated;
    });
    const duration = await getAudioDuration(audioBlob);
    setDurations((prev) => {
      const updated = [...prev];
      updated[questionIdx] = duration;
      return updated;
    });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'answer.webm');
    try {
      const res = await axios.post('http://localhost:5001/transcribe-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Transcribe audio response:', res.data);
      if (!res.data.transcript || res.data.transcript.trim() === '') {
        setCurrentTranscript('Transcription failed or empty.');
        return null;
      }
      setCurrentTranscript(res.data.transcript);
      // Directly update the ref synchronously
      qaPairsRef.current[questionIdx] = {
        question: questions[questionIdx],
        transcript: res.data.transcript,
      };
      setQaPairs([...qaPairsRef.current]); // for UI sync
      console.log('Saving Q&A pair:', qaPairsRef.current[questionIdx]);
      console.log('Current qaPairs state:', qaPairsRef.current);
      setTranscripts((prev) => {
        const updated = [...prev];
        updated[questionIdx] = res.data.transcript;
        return updated;
      });
      setAudioMetrics((prev) => {
        const updated = [...prev];
        updated[questionIdx] = res.data.metrics;
        return updated;
      });
      return res.data.transcript;
    } catch (err) {
      setCurrentTranscript('Transcription failed.');
      return null;
    }
  };

  // Refactored stopRecording to return the audioBlob
  const stopRecordingAndGetAudio = async () => {
    return new Promise<Blob | null>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setIsRecording(false);
          // Save the latest body language metrics for this question
          setBodyLanguageMetrics((prev) => {
            const updated = [...prev];
            updated[currentQuestion] = latestMetrics;
            return updated;
          });
          resetMetrics();
          resolve(audioBlob);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  };

  // Modified speakQuestion to start recording after AI finishes speaking
  const speakQuestion = (questionText: string) => {
    if ('speechSynthesis' in window) {
      setIsAISpeaking(true);
      const utterance = new SpeechSynthesisUtterance(questionText);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      utterance.onend = () => {
        setIsAISpeaking(false);
        setAutoRecordingReady(true); // Ready to start recording
      };
      speechSynthesis.speak(utterance);
    } else {
      setIsAISpeaking(false);
      setAutoRecordingReady(true);
    }
  };

  // Start recording automatically after AI finishes speaking
  useEffect(() => {
    if (autoRecordingReady) {
      startRecording();
      setAutoRecordingReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRecordingReady]);

  // On Next button
  const nextQuestion = async () => {
    // 1. Stop recording and get audio
    const audioBlob = await stopRecordingAndGetAudio();
    if (!audioBlob) return;
    // 2. Save audio blob for current question
    setAudioBlobs((prev) => {
      const updated = [...prev];
      updated[currentQuestion] = audioBlob;
      return updated;
    });
    // 3. If not last question, move to next question immediately and transcribe in background
    if (currentQuestion < questions.length - 1) {
      const prevQuestion = currentQuestion;
      setCurrentQuestion(prev => prev + 1);
      setTimeout(() => {
        speakQuestion(questions[prevQuestion + 1]);
      }, 300);
      // Transcribe previous answer in background
      transcriptionPromisesRef.current.push(handleStopAndTranscribe(prevQuestion, audioBlob));
    } else {
      // Last question: show spinner, transcribe, then complete
      setIsTranscribingLast(true);
      await handleStopAndTranscribe(currentQuestion, audioBlob); // Wait for last transcript to be added
      setIsTranscribingLast(false);
    setIsComplete(true);
    setIsInterviewStarted(false);
    setIsAISpeaking(false);
    setIsRecording(false);
    setIsBatchLoading(true);
    console.log('qaPairs before filtering:', qaPairsRef.current);
    const filteredQaPairs = qaPairsRef.current.filter(pair => pair && pair.question && pair.transcript !== undefined && pair.transcript !== null);
    console.log('Filtered Q&A pairs before sending:', filteredQaPairs);
    if (filteredQaPairs.length === 0) {
      toast({
        title: "No valid answers",
        description: "Please answer at least one question before completing the interview.",
        variant: "destructive",
      });
      setIsBatchLoading(false);
      return;
    }
    let realFeedback = null;
    try {
      const filteredAudioMetrics = audioMetrics.filter((m, idx) => filteredQaPairs[idx]);
      const filteredBodyLanguageMetrics = bodyLanguageMetrics.filter((m, idx) => filteredQaPairs[idx]);
      const res = await axios.post('http://localhost:5001/llm-batch-feedback', {
        qnaPairs: filteredQaPairs,
        audioMetrics: filteredAudioMetrics,
        bodyLanguageMetrics: filteredBodyLanguageMetrics,
      });
      setBatchFeedback(res.data.feedback);
      realFeedback = res.data.feedback;
        // Debug log after getting feedback
        console.log('After setting realFeedback:', realFeedback);
        console.log('user:', user, 'realFeedback:', realFeedback);
        // Save feedback to Appwrite if user is logged in
        if (user && realFeedback) {
          try {
            console.log('Attempting to save feedback to Appwrite:', {
              user,
              APPWRITE_DB_ID,
              APPWRITE_FEEDBACK_COLLECTION_ID,
              feedback: realFeedback,
              createdAt: new Date().toISOString(),
              role: role
            });
            const result = await appwriteDatabases.createDocument(
              APPWRITE_DB_ID,
              APPWRITE_FEEDBACK_COLLECTION_ID,
              ID.unique(),
              {
                userId: user.$id,
                createdAt: new Date().toISOString(),
                role: role,
                feedback: JSON.stringify(realFeedback),
                summary: realFeedback.overallSummary || "",
              }
            );
            console.log('Successfully saved feedback to Appwrite:', result);
          } catch (err) {
            console.error("Failed to save feedback to Appwrite", err);
          }
        }
    } catch (err) {
      setBatchFeedback('Failed to get batch feedback.');
    }
    setIsBatchLoading(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    toast({
      title: "Interview completed!",
      description: "Analyzing your video performance...",
    });
      const endNow = Date.now();
      setInterviewEndTime(endNow);
      console.log('Interview ended at', endNow);
    setTimeout(() => {
      if (realFeedback) {
        const filteredAudioMetrics = audioMetrics.filter((m, idx) => filteredQaPairs[idx]);
        const filteredBodyLanguageMetrics = bodyLanguageMetrics.filter((m, idx) => filteredQaPairs[idx]);
          // Use endNow directly instead of interviewEndTime state
          const interviewDurationSec = interviewStartTime && endNow ? Math.round((endNow - interviewStartTime) / 1000) : null;
          console.log('Duration sent to dashboard:', interviewDurationSec);
        onInterviewComplete({
          ...realFeedback,
          bodyLanguageMetrics: filteredBodyLanguageMetrics,
          audioMetrics: filteredAudioMetrics,
            interviewDurationSec,
            durations, // <-- add this
        });
      }
    }, 2000);
    }
  };

  // Send transcript to LLM for feedback
  const getLLMFeedback = async (questionIdx: number) => {
    const transcript = transcripts[questionIdx];
    const question = questions[questionIdx];
    if (!transcript) return;
    try {
      const res = await axios.post('http://localhost:5001/llm-feedback', { question, transcript });
      setFeedbacks((prev) => {
        const updated = [...prev];
        updated[questionIdx] = res.data.feedback;
        return updated;
      });
    } catch (err) {
      setFeedbacks((prev) => {
        const updated = [...prev];
        updated[questionIdx] = 'LLM feedback failed.';
        return updated;
      });
    }
  };

  // Send all Q&A pairs to backend for batch feedback
  const getBatchLLMFeedback = async () => {
    setIsBatchLoading(true);
    const qnaPairs = questions.map((q, idx) => ({ question: q, transcript: transcripts[idx] }));
    try {
      const res = await axios.post('http://localhost:5001/llm-batch-feedback', { qnaPairs });
      setBatchFeedback(res.data.feedback);
    } catch (err) {
      setBatchFeedback('Batch LLM feedback failed.');
    } finally {
      setIsBatchLoading(false);
    }
  };

  const startInterview = () => {
    if (!isVideoEnabled || !isAudioEnabled) {
      toast({
        title: "Camera and microphone required",
        description: "Please enable camera and microphone to start the interview",
        variant: "destructive",
      });
      return;
    }
    setIsInterviewStarted(true);
    const now = Date.now();
    setInterviewStartTime(now); // Record start time
    console.log('Interview started at', now);
    if (questions.length > 0) speakQuestion(questions[0]);
    toast({
      title: "Interview started",
      description: "Listen to the AI interviewer and respond naturally",
    });
  };

  const runMediaPipeTests = async () => {
    try {
      toast({
        title: "Testing MediaPipe models...",
        description: "Check console for detailed results",
      });
      
      const results = await MediaPipeTests.testModels();
      setTestResults(results);
      
      if (results.success) {
        toast({
          title: "✅ MediaPipe tests passed!",
          description: "All models loaded successfully",
        });
      } else {
        toast({
          title: "⚠️ MediaPipe tests failed",
          description: `Check console for details. Errors: ${results.errors.length}`,
          variant: "destructive",
        });
      }
      
      console.log('MediaPipe test results:', results);
    } catch (error) {
      console.error('MediaPipe test error:', error);
      toast({
        title: "❌ MediaPipe test failed",
        description: "Check console for error details",
        variant: "destructive",
      });
    }
  };

  // Interview tips for display
  const interviewTips = [
    "Look directly at the camera for better eye contact.",
    "Speak clearly and at a moderate pace.",
    "Keep your background tidy and professional.",
    "Use natural hand gestures to emphasize points.",
    "Smile and maintain positive body language.",
    "Prepare a glass of water nearby in case you need it.",
    "Take a deep breath before answering each question."
  ];
  const randomTip = interviewTips[Math.floor(Math.random() * interviewTips.length)];

  // For LIVE badge
  const isLive = isInterviewStarted && isVideoEnabled && isAudioEnabled && isRecording;

  if (loadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">Generating personalized questions...</div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">No questions available. Please try again.</div>
      </div>
    );
  }

  if (isComplete) {
    const noAnswers = transcripts.every(t => !t || t.trim() === "");
    if (noAnswers) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 to-indigo-600/8" />
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1000" />
          <Card className="max-w-2xl min-w-[400px] mx-auto text-center shadow-2xl border-0 bg-white/90 backdrop-blur-sm relative z-10 flex flex-col items-center justify-center py-12 my-8">
            <div className="flex flex-col items-center">
              <svg width="56" height="56" fill="none" viewBox="0 0 56 56" className="mb-4">
                <circle cx="28" cy="28" r="28" fill="#e0e7ff" />
                <path d="M18 24c0-5 4-9 9-9s9 4 9 9c0 4.5-3.5 8.2-8 8.9V37h-2v-4.1C21.5 32.2 18 28.5 18 24Zm9-7c-3.9 0-7 3.1-7 7 0 3.3 2.5 6.1 6 6.8.3.1.5.3.5.6V35h2v-3.6c0-.3.2-.5.5-.6 3.5-.7 6-3.5 6-6.8 0-3.9-3.1-7-7-7Zm-1 7h2v2h-2v-2Zm0-4h2v2h-2v-2Z" fill="#6366f1" />
              </svg>
              <h3 className="text-2xl font-bold text-indigo-700 mb-2">No Questions Answered</h3>
              <p className="text-gray-500 mb-6 text-center max-w-xs">You didn't answer any questions in this interview session. Try again to get personalized feedback and improve your skills!</p>
              <button
                onClick={() => window.location.href = "/"}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Go to Home
              </button>
            </div>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/8 to-emerald-600/8" />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1000" />
        <Card className="max-w-2xl mx-auto text-center shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-green-600">Interview Complete!</CardTitle>
            <CardDescription>
              We're analyzing your video interview performance...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                <Video className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-600">Processing video analysis and feedback...</p>
              <Progress value={100} className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-600/8 to-gray-600/8" />
      <div className="absolute top-1/4 left-1/3 w-88 h-88 bg-slate-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-2000" />
      
      <Card className="max-w-4xl mx-auto border-0 bg-white/80 backdrop-blur-sm relative z-10 p-1 rounded-2xl my-2 sm:my-8"
        style={{ boxShadow: '0 8px 40px 0 rgba(80,120,255,0.10)', borderRadius: '1rem', borderImage: 'linear-gradient(90deg, #6366f1 0%, #38bdf8 100%) 1', borderWidth: '2px', borderStyle: 'solid' }}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Live AI Video Interview</CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Role: {role} | Question {currentQuestion + 1} of {questions.length}
              </CardDescription>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Questions Progress: {currentQuestion + 1}/{questions.length}</div>
            </div>
          </div>
          <Progress value={((currentQuestion + (isInterviewStarted ? 1 : 0)) / questions.length) * 100} className="w-full mt-4" />
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-2 sm:p-6">
          {/* Video Feed - Modernized UI */}
          <div className={`relative transition-shadow duration-300 ${isVideoEnabled && isAudioEnabled ? 'shadow-[0_0_0_4px_rgba(34,197,94,0.25),0_8px_40px_0_rgba(80,120,255,0.10)] ring-2 ring-green-400/40' : 'shadow-2xl' } rounded-2xl`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
                className="w-full h-48 sm:h-96 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl object-cover border-2 border-blue-100"
                style={{ display: 'block', borderRadius: '1rem' }}
              />
              
              {/* Face Mesh Debug Overlay */}
              {showDebug && isVideoEnabled && (
                <FaceMeshDebug 
                  videoRef={videoRef}
                  enabled={isVideoEnabled && isInterviewStarted}
                  onMetricsUpdate={(metrics) => {
                    console.log('Debug metrics:', metrics);
                  }}
                />
              )}
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border-2 border-blue-100 z-10" style={{ borderRadius: '1rem' }}>
                  <div className="animate-pulse mb-4">
                    <svg width="64" height="64" fill="none" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="32" fill="#e0e7ff" />
                      <path d="M24 28c0-5.5 4.5-10 10-10s10 4.5 10 10c0 5-4 9-9 9v5h-2v-5c-5-0.5-9-4.5-9-9Zm10-8c-4.4 0-8 3.6-8 8 0 4 3 7.3 7 7.9.3.1.5.3.5.6V42h2v-3.5c0-.3.2-.5.5-.6 4-.6 7-3.9 7-7.9 0-4.4-3.6-8-8-8Zm-1 8h2v2h-2v-2Zm0-4h2v2h-2v-2Z" fill="#6366f1" />
                    </svg>
                  </div>
                  <div className="text-lg font-semibold text-blue-200 mb-2">Camera is Off</div>
                  <div className="text-sm text-blue-100">Enable your camera to start the interview</div>
                </div>
              )}
              {/* LIVE badge */}
              {isLive && (
                <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse z-20">LIVE</div>
              )}
              <div className="absolute top-4 left-4 flex space-x-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center ${isVideoEnabled ? 'bg-green-500' : 'bg-red-500'} transition-all hover:scale-110`}>
                      {isVideoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{isVideoEnabled ? 'Camera On' : 'Camera Off'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center ${isAudioEnabled ? 'bg-green-500' : 'bg-red-500'} transition-all hover:scale-110`}>
                      {isAudioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{isAudioEnabled ? 'Mic On' : 'Mic Off'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowDebug(!showDebug)}
                      className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center ${showDebug ? 'bg-blue-500' : 'bg-gray-500'} transition-all hover:scale-110`}
                    >
                      <Eye className="h-5 w-5 text-white" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{showDebug ? 'Hide Face Mesh Debug' : 'Show Face Mesh Debug'}</TooltipContent>
                </Tooltip>
              </div>
            {isAISpeaking && (
              <div className="absolute bottom-4 left-4 bg-slate-500 text-white px-4 py-3 rounded-lg flex items-center space-x-2 animate-pulse shadow-lg">
                <Volume2 className="h-5 w-5" />
                <span className="text-sm font-medium">AI Speaking...</span>
              </div>
            )}
          </div>

          {/* Current Question */}
          {isInterviewStarted && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-6">
              <div className="flex items-center mb-2">
                <h3 className="text-xl font-bold text-slate-900 mr-4">Question {currentQuestion + 1}</h3>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <p className="text-slate-900 text-2xl font-semibold leading-relaxed mb-2">
                {questions[currentQuestion]}
              </p>
              <div className="mt-4 flex items-center space-x-4">
                {/* Remove or comment out the audio player for each question */}
                {/* {audioBlobs[currentQuestion] && (
                  <audio controls src={URL.createObjectURL(audioBlobs[currentQuestion]!)} className="ml-2" />
                )} */}
                {transcripts[currentQuestion] && (
                  <span className="ml-4 text-sm text-gray-700">Transcript: {transcripts[currentQuestion]}</span>
                )}
                {transcripts[currentQuestion] && !feedbacks[currentQuestion] && (
                  <Button onClick={() => getLLMFeedback(currentQuestion)} size="sm" className="ml-2">Get Feedback</Button>
                )}
                {feedbacks[currentQuestion] && (
                  <span className="ml-4 text-sm text-blue-700">Feedback: {feedbacks[currentQuestion]}</span>
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col items-center space-y-3 sm:space-y-4">
            {!isVideoEnabled ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={startCamera} size="sm" className="w-full sm:w-auto px-4 sm:px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg transition-transform duration-200 hover:scale-105">
                <Video className="mr-2 h-5 w-5" />
                Enable Camera & Microphone
              </Button>
                </TooltipTrigger>
                <TooltipContent>Enable your camera and microphone</TooltipContent>
              </Tooltip>
            ) : !isInterviewStarted ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={startInterview} size="sm" className="w-full sm:w-auto px-4 sm:px-8 bg-green-600 hover:bg-green-700">
                <Video className="mr-2 h-5 w-5" />
                Start Live Interview
              </Button>
                </TooltipTrigger>
                <TooltipContent>Start the interview</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                <Button 
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)} 
                  variant={isVideoEnabled ? "default" : "destructive"}
                      size="sm"
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 ${isVideoEnabled ? 'bg-blue-600 text-white' : ''}`}
                >
                      {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isVideoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                <Button 
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)} 
                  variant={isAudioEnabled ? "default" : "destructive"}
                      size="sm"
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 ${isAudioEnabled ? 'bg-blue-600 text-white' : ''}`}
                >
                      {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}</TooltipContent>
                </Tooltip>
                {!isAISpeaking && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={nextQuestion} size="sm" className="w-full sm:w-auto px-4 sm:px-8 transition-transform duration-200 hover:scale-105" disabled={isTranscribingLast}>
                    {isTranscribingLast ? (
                      <>
                            <Mic className="h-5 w-5 animate-bounce mr-2" />
                            Processing your answer...
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">{currentQuestion < questions.length - 1 ? 'Next Question' : 'Complete Interview'}</span>
                        <span className="sm:hidden">{currentQuestion < questions.length - 1 ? 'Next' : 'Complete'}</span>
                      </>
                    )}
                  </Button>
                    </TooltipTrigger>
                    <TooltipContent>{currentQuestion < questions.length - 1 ? 'Go to next question' : 'Complete the interview'}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
            {/* Show a random tip when camera is off */}
            {!isVideoEnabled && (
              <div className="mt-2 text-blue-700 text-sm font-medium bg-blue-50 rounded-lg px-4 py-2 shadow-sm animate-fade-in">
                <span className="font-semibold">Tip:</span> {randomTip}
              </div>
            )}

            {/* MediaPipe Test Button */}
            <div className="mt-4 flex justify-center">
              <Button 
                onClick={runMediaPipeTests} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                🧪 Test MediaPipe Models
              </Button>
            </div>

            {/* Test Results Display */}
            {testResults && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                <div className="font-semibold mb-2">MediaPipe Test Results:</div>
                <div className="space-y-1">
                  <div>WebGL: {testResults.webglBackend ? '✅' : '❌'}</div>
                  <div>Face Model: {testResults.faceModel ? '✅' : '❌'}</div>
                  <div>Hand Model: {testResults.handModel ? '✅' : '❌'}</div>
                  <div>Pose Model: {testResults.poseModel ? '✅' : '❌'}</div>
                  {testResults.errors.length > 0 && (
                    <div className="text-red-600">
                      Errors: {testResults.errors.length}
                    </div>
                  )}
                  {testResults.warnings.length > 0 && (
                    <div className="text-yellow-600">
                      Warnings: {testResults.warnings.length}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Interview Tips */}
          {isInterviewStarted && (
            <Collapsible open={showTips} onOpenChange={setShowTips}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-center space-x-2">
                  <Info className="h-4 w-4" />
                  <span>{showTips ? 'Hide' : 'Show'} Interview Tips</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-2">
                  <h4 className="font-medium text-slate-900 mb-3">Interview Tips</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-800">
                    <div>• Look directly at the camera</div>
                    <div>• Use natural hand gestures</div>
                    <div>• Maintain good posture</div>
                    <div>• Ensure proper lighting</div>
                    <div>• Keep background professional</div>
                    <div>• Speak clearly and calmly</div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Remove the 'Get Full Interview Feedback' button */}
          {/* <div className="my-6 flex flex-col items-center">
            <Button onClick={getBatchLLMFeedback} disabled={isBatchLoading} className="mb-2">
              {isBatchLoading ? 'Analyzing All Answers...' : 'Get Full Interview Feedback'}
            </Button>
          </div> */}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};

export default InterviewSession;
