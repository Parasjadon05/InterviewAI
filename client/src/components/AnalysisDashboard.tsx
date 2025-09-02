import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Clock, Volume2, CheckCircle, AlertCircle, BookOpen, Eye, Lightbulb, Target, Brain, Users, Award, List, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import html2pdf from "html2pdf.js";
import PDFReport from "./PDFReport";

interface AnalysisDashboardProps {
  interviewData: any;
  role: string;
}

// Transform backend response to the rich dashboard shape
function transformAnalysisData(data: any): any {
  // Debug logs to diagnose speaking pace issue
  console.log("Questions:", data.questions);              
  console.log("Audio Metrics:", data.audioMetrics);
  if (!data || !data.questions) return null;
  const questionAnalysis = data.questions.map((q: any, idx: number) => ({
    question: q.question || `Question ${idx + 1}`,
    score: q.score ?? 'N/A',
    feedback: q.strengths ?? 'N/A',
    // Improved splitting for improvements: split on newlines, semicolons, or periods followed by space+capital letter
    improvements: q.improvements
      ? q.improvements
          .split(/\n|;|\.(?= [A-Z])/)
          .map((s: string) => s.trim())
          .filter((s: string) => s && s !== '"' && s.toLowerCase() !== 'none')
      : [],
  }));
  // Use backend's overallScore if present, else fallback to average
  const overallScore = (typeof data.overallScore === 'number')
    ? data.overallScore
    : (questionAnalysis.length
        ? Math.round(questionAnalysis.reduce((a, q) => a + (typeof q.score === 'number' ? q.score : 0), 0) / questionAnalysis.length)
        : 'N/A');
  // LLM-based filler word count: count how many times 'filler word' or common fillers are mentioned in improvements
  const fillerRegex = /filler word|filler\s*\(s\)|\b(um|uh|like|you know|so|actually|basically|literally|right|i mean|kind of|sort of|well|hmm)\b/gi;
  let llmFillerCount = 0;
  if (Array.isArray(data.questions)) {
    data.questions.forEach(q => {
      if (q.improvements && typeof q.improvements === 'string') {
        const matches = q.improvements.match(fillerRegex);
        if (matches) llmFillerCount += matches.length;
      }
    });
  }
  // Aggregate audio metrics if present (for other metrics)
  let avgPace = 'N/A', totalDuration = 'N/A', questionsAnswered = 'N/A';
  let audioFillerWords = 0;
  if (typeof data.interviewDurationSec === 'number') {
    const secs = data.interviewDurationSec;
    if (secs < 60) {
      totalDuration = `${secs} sec`;
    } else {
      const mins = Math.floor(secs / 60);
      const rem = secs % 60;
      totalDuration = `${mins} min${rem > 0 ? ` ${rem} sec` : ''}`;
    }
  } else if (Array.isArray(data.audioMetrics) && data.audioMetrics.length > 0) {
    const valid = data.audioMetrics.filter(Boolean);
    // --- NEW: Calculate total words and total duration for overall speaking pace ---
    const totalWords = valid.reduce((a, m) => a + (m.wordCount || 0), 0);
    const totalSeconds = valid.reduce((a, m) => a + (m.durationSeconds || 0), 0);
    avgPace = (totalSeconds > 0) ? `${Math.round(totalWords / (totalSeconds / 60))}` : 'N/A';
    // --- END NEW ---
    if (totalSeconds < 60) {
      totalDuration = `${totalSeconds} sec`;
    } else {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      totalDuration = `${mins} min${secs > 0 ? ` ${secs} sec` : ''}`;
    }
    audioFillerWords = valid.reduce((a, m) => a + (m.fillerCount || 0), 0);
  }
  // Always use the number of questions answered, not audio metrics
  questionsAnswered = Array.isArray(data.questions) ? `${data.questions.length}` : 'N/A';
  return {
    questionAnalysis,
    overallScore,
    overallScoreExplanation: data.overallScoreExplanation ?? '',
    fillerWordsUsed: data.fillerWordsUsed ?? 0,
    audioFillerWords,
    detailedFeedback: {
      strengths: questionAnalysis.map(q => ({ category: q.question, details: q.feedback })).filter(q => q.details),
      improvements: questionAnalysis.map(q => ({ category: q.question, details: q.improvements.join(', ') })).filter(q => q.details),
    },
    areasOfStrength: questionAnalysis.map(q => q.feedback).filter(Boolean),
    areasForImprovement: questionAnalysis.flatMap(q => q.improvements).filter(Boolean),
    interviewMetrics: {
      speakingPace: String(avgPace),
      fillerWordCount: llmFillerCount,
      totalDuration: String(totalDuration),
      questionsAnswered: String(questionsAnswered),
    },
    toneAnalysis: data.toneAnalysis ?? {},
    responseQuality: data.responseQuality ?? {},
    bodyLanguageAnalysis: data.bodyLanguageAnalysis ?? {},
    communicationSkills: data.communicationSkills ?? {},
    industryComparison: data.industryComparison ?? {},
    nextSteps: data.nextSteps ?? [],
    summary: data.overallSummary ?? '',
    actionPlan: data.actionPlan ?? '',
    overallStrengths: data.overallStrengths ?? [],
    overallImprovements: data.overallImprovements ?? [],
    questions: data.questions ?? [],
  };
}

function cleanFeedback(text: string) {
  if (!text) return '';
  // Remove leading/trailing asterisks, spaces, and newlines
  return text.replace(/(^\s*\*+\s*)|(\s*\*+\s*$)/g, '').trim();
}

// Enhanced parseActionPlan to extract title, description, priority, and timeline
function parseActionPlan(actionPlan: string) {
  if (!actionPlan) return null;
  // Pre-process: ensure every new step starts on a new line
  actionPlan = actionPlan.replace(/(?!^)(\*\*[\w\s&]+\*\*\s*\([^)]+\)\s*\[[^\]]+\]:)/g, '\n$1');
  const lines = actionPlan.split(/\n|\r|\r\n/).map(l => l.trim()).filter(Boolean);
  const steps = [];
  let current = null;
  lines.forEach(line => {
    // Match: **Title** (Priority) [Timeline]: Description
    const match = line.match(/^\*\*?([\w\s\-&\/]+)\*\*?\s*(?:\(([^)]+)\))?\s*(?:\[([^\]]+)\])?\s*[:\-—]?\s*(.*)$/);
    if (match) {
      if (current) steps.push(current);
      current = {
        action: match[1].trim(),
        priority: match[2]?.trim() || '',
        timeline: match[3]?.trim() || '',
        description: match[4]?.trim() || ''
      };
    } else if (current) {
      // If the line is not a new step, append to description
      current.description += ' ' + line;
    }
  });
  if (current) steps.push(current);
  // Fallback: If no steps found, try to parse as simple dash/numbered list
  if (steps.length === 0) {
    lines.forEach(line => {
      const fallback = line.match(/^(?:\d+\.|[-*])\s*(.+?)(?::|\.|\-|—)\s*(.+)$/);
      if (fallback) {
        steps.push({ action: fallback[1], description: fallback[2], priority: '', timeline: '' });
      }
    });
  }
  return steps.length > 0 ? steps : null;
}

const tabConfig = [
  { value: "summary", label: "Summary", icon: BarChart3 },
  { value: "tone", label: "Voice", icon: Volume2 },
  { value: "body", label: "Body", icon: Eye },
  { value: "responses", label: "Responses", icon: BookOpen },
  { value: "detailed", label: "Detailed", icon: List },
  { value: "action", label: "Action", icon: CheckCircle },
];

const AnalysisDashboard = ({ interviewData, role }: AnalysisDashboardProps) => {
  if (!interviewData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-500">Loading analysis...</div>
      </div>
    );
  }
  const analysis = transformAnalysisData(interviewData);
  if (!analysis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-500">No analysis data available.</div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    return "bg-red-100 text-red-800 border border-red-200";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-800 border border-red-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "Low": return "bg-green-100 text-green-800 border border-green-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const [activeTab, setActiveTab] = useState("summary");

  // Animated score count-up
  const [displayedScore, setDisplayedScore] = useState(0);
  useEffect(() => {
    if (typeof analysis?.overallScore === 'number') {
      let start = 0;
      const end = analysis.overallScore;
      if (start === end) return;
      const duration = 1200; // ms
      const increment = end > 0 ? 1 : -1;
      const stepTime = Math.abs(Math.floor(duration / (end - start || 1)));
      let current = start;
      const timer = setInterval(() => {
        current += increment;
        setDisplayedScore(current);
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
          setDisplayedScore(end);
          clearInterval(timer);
        }
      }, stepTime);
      return () => clearInterval(timer);
    } else {
      setDisplayedScore(analysis?.overallScore ?? 0);
    }
  }, [analysis?.overallScore]);

  const reportRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  // PDF Download Handler
  const handleDownloadReport = () => {
    if (!pdfRef.current) return;
    const opt = {
      margin:       0.5,
      filename:     'interview_report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(pdfRef.current).save();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 to-indigo-600/8" />
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1000" />
      
      {/* Hidden PDF report for download */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px', zIndex: -1, pointerEvents: 'none' }}>
        <div ref={pdfRef} id="pdf-report-content">
          <PDFReport analysis={analysis} role={role} />
        </div>
      </div>
      {/* PDF CAPTURE REGION START */}
      <div ref={reportRef} id="report-pdf-content">
      <div className="relative max-w-7xl mx-auto p-4 lg:p-6 space-y-6 lg:space-y-8 pb-20">
        {/* Enhanced Header */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-3xl transition-all duration-300">
          <CardHeader className="text-center py-6 lg:py-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">Interview Analysis Report</CardTitle>
            <CardDescription className="text-base lg:text-lg text-gray-600 mb-4 lg:mb-6">
              Role: <span className="font-semibold text-blue-600">{role}</span> | Completed on {new Date().toLocaleDateString()}
            </CardDescription>
            
              <div className="flex flex-col items-center justify-center w-full">
                <div className={`text-3xl lg:text-5xl font-bold ${getScoreColor(analysis.overallScore ?? 0)} mb-2 transition-all duration-500`}> 
                  {typeof analysis.overallScore === 'number' ? displayedScore : 'N/A'}/100
                </div>
                <Badge
                  className={`${getScoreBadge(analysis.overallScore ?? 0)} px-3 lg:px-4 py-1 lg:py-2 text-xs lg:text-sm font-medium`}
                  title={analysis.overallScoreExplanation || undefined}
                >
                  Overall Performance
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Enhanced Tab Bar with Icons, Animated Indicator, and Effects */}
          <div className="relative w-full bg-white/90 backdrop-blur-sm shadow-lg rounded-lg p-1 mb-6 lg:mb-8">
            {/* Mobile: 2 rows of 3, Desktop: 1 row of 6 */}
            <div className="hidden sm:flex relative w-full">
              {tabConfig.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 py-3 px-2 lg:px-4 text-base lg:text-lg font-semibold rounded-lg transition-all duration-200 relative
                      ${isActive ? "text-white z-10" : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"}
                    `}
                    style={{ zIndex: isActive ? 10 : 1 }}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-blue-400 group-hover:text-blue-600"} hidden sm:inline`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
              {/* Animated pill indicator for desktop */}
              <div
                className="absolute top-1 left-0 h-[calc(100%-0.5rem)] transition-all duration-300 ease-in-out rounded-lg shadow-lg bg-gradient-to-r from-blue-500 to-indigo-500"
                style={{
                  width: `calc(100% / ${tabConfig.length})`,
                  left: `calc(${tabConfig.findIndex(t => t.value === activeTab)} * 100% / ${tabConfig.length})`,
                  boxShadow: "0 4px 24px 0 rgba(80,120,255,0.10)",
                }}
              />
                </div>
            {/* Mobile: 2 rows of 3 */}
            <div className="sm:hidden w-full">
              <div className="flex w-full">
                {tabConfig.slice(0, 3).map((tab, idx) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-base font-semibold rounded-lg transition-all duration-200 transition-colors hover:scale-105 relative ${isActive ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow z-10" : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"}`}
                      style={{ zIndex: isActive ? 10 : 1 }}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-blue-400 group-hover:text-blue-600"} hidden sm:inline`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex w-full mt-1">
                {tabConfig.slice(3, 6).map((tab, idx) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-base font-semibold rounded-lg transition-all duration-200 transition-colors hover:scale-105 relative ${isActive ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow z-10" : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"}`}
                      style={{ zIndex: isActive ? 10 : 1 }}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-blue-400 group-hover:text-blue-600"} hidden sm:inline`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tabs Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="summary" className="space-y-6 lg:space-y-8 mt-6 lg:mt-8">
            {/* Enhanced Metrics Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-xs lg:text-sm font-medium text-gray-700">Duration</CardTitle>
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-lg lg:text-2xl font-bold text-gray-900">{String(analysis.interviewMetrics.totalDuration ?? 'N/A')}</div>
                  <p className="text-xs text-gray-500 mt-1">Total interview time</p>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-xs lg:text-sm font-medium text-gray-700">Speaking Pace</CardTitle>
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Volume2 className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-lg lg:text-2xl font-bold text-gray-900">{String(analysis.interviewMetrics.speakingPace ?? 'N/A')}</div>
                  <p className="text-xs text-gray-500 mt-1">Words per minute</p>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-xs lg:text-sm font-medium text-gray-700">Filler Words</CardTitle>
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-3 w-3 lg:h-4 lg:w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="text-lg lg:text-2xl font-bold text-orange-600">{analysis.audioFillerWords + analysis.fillerWordsUsed}</div>
                  <p className="text-xs text-gray-500 mt-1">Total count</p>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                  <CardTitle className="text-xs lg:text-sm font-medium text-gray-700">Questions</CardTitle>
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-lg lg:text-2xl font-bold text-gray-900">{String(analysis.interviewMetrics.questionsAnswered ?? 'N/A')}</div>
                  <p className="text-xs text-gray-500 mt-1">Completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Strengths and Improvements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-base lg:text-lg">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Award className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                    </div>
                    Top Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 lg:space-y-4">
                    {analysis.areasOfStrength.map((strength, index) => (
                      <li key={index} className="flex items-start p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0" />
                          <span className="text-xs lg:text-sm text-green-800 font-medium">{cleanFeedback(strength)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-base lg:text-lg">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <Target className="h-3 w-3 lg:h-4 lg:w-4 text-yellow-600" />
                    </div>
                    Key Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 lg:space-y-4">
                      {analysis.areasForImprovement
                        .map((improvement, index) => cleanFeedback(improvement))
                        .filter(Boolean)
                        .map((improvement, index) => (
                      <li key={index} className="flex items-start p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3 mt-2 flex-shrink-0" />
                        <span className="text-xs lg:text-sm text-yellow-800 font-medium">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tone" className="space-y-6 lg:space-y-8 mt-6 lg:mt-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="text-lg lg:text-xl">Voice and Delivery Analysis</CardTitle>
                <CardDescription className="text-sm lg:text-base">
                  Comprehensive analysis of your speaking patterns, tone, and vocal delivery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                  {/* Show overall tone analysis summary if present */}
                  {analysis.toneAnalysisSummary && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-sm lg:text-base font-medium mb-4">
                      {analysis.toneAnalysisSummary}
                    </div>
                  )}
                {Object.entries(analysis.toneAnalysis).map(([key, value]) => (
                  <div key={key} className="space-y-3 p-3 lg:p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-xs lg:text-sm font-semibold capitalize text-gray-700">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className={`text-xs lg:text-sm font-bold ${getScoreColor(Number(value ?? 0) * 10)}`}>{typeof value === 'number' ? value * 10 : 'N/A'}%</span>
                    </div>
                      <Progress value={typeof value === 'number' ? value * 10 : 0} className="w-full h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="body" className="space-y-6 lg:space-y-8 mt-6 lg:mt-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center text-lg lg:text-xl">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Eye className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
                  </div>
                  Body Language & Visual Presence
                </CardTitle>
                <CardDescription className="text-sm lg:text-base">
                  Analysis of your non-verbal communication and professional presentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                  {/* Show summary string if present */}
                  {analysis.bodyLanguageAnalysis.summary && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-sm lg:text-base font-medium mb-4">
                      {analysis.bodyLanguageAnalysis.summary}
                    </div>
                  )}
                  {Object.entries(analysis.bodyLanguageAnalysis)
                    .filter(([key]) => key !== 'summary')
                    .map(([key, value]) => (
                  <div key={key} className="space-y-3 p-3 lg:p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-xs lg:text-sm font-semibold capitalize text-gray-700">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={`text-xs lg:text-sm font-bold ${getScoreColor(Number(value ?? 0))}`}>{String(value ?? 'N/A')}%</span>
                    </div>
                    <Progress value={Number(value ?? 0)} className="w-full h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responses" className="space-y-6 lg:space-y-8 mt-6 lg:mt-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="text-lg lg:text-xl">Response Quality Analysis</CardTitle>
                <CardDescription className="text-sm lg:text-base">
                  Detailed evaluation of your answer content, structure, and effectiveness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                  {/* Show overall response quality summary if present */}
                  {analysis.responseQualitySummary && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-sm lg:text-base font-medium mb-4">
                      {analysis.responseQualitySummary}
                    </div>
                  )}
                {Object.entries(analysis.responseQuality).map(([key, value]) => (
                  <div key={key} className="space-y-3 p-3 lg:p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-xs lg:text-sm font-semibold capitalize text-gray-700">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className={`text-xs lg:text-sm font-bold ${getScoreColor(Number(value ?? 0) * 10)}`}>{typeof value === 'number' ? value * 10 : 'N/A'}%</span>
                    </div>
                      <Progress value={typeof value === 'number' ? value * 10 : 0} className="w-full h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Enhanced Individual Question Analysis */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="text-lg lg:text-xl">Question-by-Question Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                  {Array.isArray(analysis.questions) && analysis.questions.length > 0 &&
                    analysis.questions.every(q => !q.originalAnswer || q.originalAnswer.trim() === "") ? (
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg flex flex-col items-center justify-center py-12 my-8">
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
                  ) : (
                    (analysis.questions || []).map((q, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 lg:pl-6 p-3 lg:p-4 bg-blue-50 rounded-r-lg space-y-3">
                        <h4 className="font-semibold text-gray-900 text-sm lg:text-lg">Q{index + 1}: {q.question || `Question ${index + 1}`}</h4>
                        {q.originalAnswer && (
                          <div className="mb-2">
                            <span className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Your Answer:</span>
                            <p className="text-xs lg:text-sm text-gray-700 leading-relaxed bg-white/70 rounded p-2 border border-gray-200">{q.originalAnswer}</p>
                          </div>
                        )}
                    <div className="flex items-center space-x-3">
                          <Badge className={`${getScoreBadge(Number(q.score ?? 0))} px-2 lg:px-3 py-1`}>Score: {q.score !== null && q.score !== undefined ? String(q.score) : 'N/A'}/100</Badge>
                    </div>
                        <p className="text-xs lg:text-sm text-gray-700 leading-relaxed">{q.strengths}</p>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Specific improvements:</p>
                      <ul className="text-xs lg:text-sm text-gray-600 space-y-1">
                            {(Array.isArray(q.improvements) ? q.improvements : (q.improvements ? q.improvements.split(/\n|;|\.(?= [A-Z])/).map(s => s.trim()).filter(Boolean) : [])).map((imp, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                        {q.improvedAnswer && (
                          <div className="mt-3">
                            <span className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Improved Answer:</span>
                            <p className="text-xs lg:text-sm text-blue-900 leading-relaxed bg-blue-100 rounded p-2 border border-blue-200">{q.improvedAnswer}</p>
                          </div>
                        )}
                  </div>
                    ))
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6 lg:space-y-8 mt-6 lg:mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Strengths Analysis by Category */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center text-base lg:text-lg">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                    </div>
                    Detailed Strengths Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 lg:space-y-6">
                    {Array.isArray(analysis.overallStrengths) && analysis.overallStrengths.length > 0 ? (
                      analysis.overallStrengths.map((item, index) => (
                        <div key={index} className="space-y-3 p-3 lg:p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-sm lg:text-base text-green-800">{item.category}</h4>
                          <p className="text-xs lg:text-sm text-green-700 leading-relaxed">{item.detail}</p>
                        </div>
                      ))
                    ) : (
                      analysis.detailedFeedback.strengths.map((strength, index) => (
                    <div key={index} className="space-y-3 p-3 lg:p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-sm lg:text-base text-green-800">{strength.category}</h4>
                          <p className="text-xs lg:text-sm text-green-700 leading-relaxed">{cleanFeedback(strength.details)}</p>
                    </div>
                      ))
                    )}
                </CardContent>
              </Card>

                {/* Improvement Areas by Category */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center text-base lg:text-lg">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <Lightbulb className="h-3 w-3 lg:h-4 lg:w-4 text-yellow-600" />
                    </div>
                    Detailed Improvement Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 lg:space-y-6">
                    {Array.isArray(analysis.overallImprovements) && analysis.overallImprovements.length > 0 ? (
                      analysis.overallImprovements.map((item, index) => (
                        <div key={index} className="space-y-3 p-3 lg:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="font-semibold text-sm lg:text-base text-yellow-800">{item.category}</h4>
                          <p className="text-xs lg:text-sm text-yellow-700 leading-relaxed">{item.detail}</p>
                        </div>
                      ))
                    ) : (
                      analysis.detailedFeedback.improvements.map((improvement, index) => (
                    <div key={index} className="space-y-3 p-3 lg:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-sm lg:text-base text-yellow-800">{improvement.category}</h4>
                          <p className="text-xs lg:text-sm text-yellow-700 leading-relaxed">{cleanFeedback(improvement.details)}</p>
                    </div>
                      ))
                    )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Communication Skills Analysis */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center text-lg lg:text-xl">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <Users className="h-3 w-3 lg:h-4 lg:w-4 text-purple-600" />
                  </div>
                  Communication Skills Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                  {/* Show overall communication skills summary if present */}
                  {analysis.communicationSkillsSummary && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-sm lg:text-base font-medium mb-4">
                      {analysis.communicationSkillsSummary}
                    </div>
                  )}
                {Object.entries(analysis.communicationSkills).map(([key, value]) => (
                  <div key={key} className="space-y-3 p-3 lg:p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-xs lg:text-sm font-semibold capitalize text-gray-700">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className={`text-xs lg:text-sm font-bold ${getScoreColor(Number(value ?? 0) * 10)}`}>{typeof value === 'number' ? value * 10 : 'N/A'}%</span>
                    </div>
                      <Progress value={typeof value === 'number' ? value * 10 : 0} className="w-full h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="action" className="space-y-6 lg:space-y-8 mt-6 lg:mt-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center text-lg lg:text-xl">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Brain className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
                  </div>
                  Personalized Action Plan
                </CardTitle>
                <CardDescription className="text-sm lg:text-base">
                  Prioritized steps to improve your interview performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                  {analysis.actionPlan && parseActionPlan(analysis.actionPlan) ? (
                    parseActionPlan(analysis.actionPlan).map((step, index) => (
                      <div key={index} className="border rounded-xl p-4 lg:p-6 space-y-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <h4 className="font-semibold text-gray-900 text-sm lg:text-lg">{step.action}</h4>
                          <div className="flex items-center space-x-2 lg:space-x-3">
                            {step.priority && (
                              <Badge className={`${getPriorityColor(step.priority)} px-2 lg:px-3 py-1 text-xs`}>
                                {step.priority} Priority
                              </Badge>
                            )}
                            {step.timeline && (
                              <Badge variant="outline" className="px-2 lg:px-3 py-1 border-gray-300 text-xs">{step.timeline}</Badge>
                            )}
                          </div>
                        </div>
                        {step.description && (
                          <p className="text-xs lg:text-sm text-gray-700 leading-relaxed">{step.description}</p>
                        )}
                      </div>
                    ))
                  ) : analysis.actionPlan ? (
                    <div className="whitespace-pre-line text-gray-800 text-base lg:text-lg bg-blue-50 rounded-lg p-4 border border-blue-200">
                      {analysis.actionPlan}
                    </div>
                  ) : (
                    analysis.nextSteps.map((step, index) => (
                  <div key={index} className="border rounded-xl p-4 lg:p-6 space-y-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h4 className="font-semibold text-gray-900 text-sm lg:text-lg">{step.action}</h4>
                      <div className="flex items-center space-x-2 lg:space-x-3">
                        <Badge className={`${getPriorityColor(step.priority)} px-2 lg:px-3 py-1 text-xs`}>
                          {step.priority} Priority
                        </Badge>
                        <Badge variant="outline" className="px-2 lg:px-3 py-1 border-gray-300 text-xs">{step.timeline}</Badge>
                      </div>
                    </div>
                    <p className="text-xs lg:text-sm text-gray-700 leading-relaxed">{step.description}</p>
                  </div>
                    ))
                  )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="text-lg lg:text-xl text-white">Continue Practicing</CardTitle>
                <CardDescription className="text-blue-100 text-sm lg:text-base">Keep improving with more practice sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-center gap-3 lg:gap-4">
                  <Button size="lg" className="px-6 lg:px-8 text-sm lg:text-base bg-white text-blue-600 hover:bg-gray-100 font-semibold">
                    Take Another Practice Interview
                  </Button>
                    <Button size="lg" className="px-6 lg:px-8 text-sm lg:text-base bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:from-blue-600 hover:to-indigo-700 font-semibold flex items-center gap-2" onClick={handleDownloadReport}>
                      <Download className="w-5 h-5" />
                    Download Full Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
      {/* PDF CAPTURE REGION END */}
    </div>
  );
};

export default AnalysisDashboard;
