import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Mic, FileText, BarChart3, CheckCircle, Users, Award, Clock, ArrowDown, ChevronRight, Home, Menu, X } from "lucide-react";
import ResumeUpload from "@/components/ResumeUpload";
import RoleSelection from "@/components/RoleSelection";
import InterviewSession from "@/components/InterviewSession";
import AnalysisDashboard from "@/components/AnalysisDashboard";

import About from "@/components/About";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import AuthDialog from "@/components/AuthDialog";
import axios from 'axios';

type Step = "upload" | "role" | "interview" | "analysis";

type IndexProps = {
  showLandingPage: boolean;
  setShowLandingPage: (show: boolean) => void;
};

const Index = ({ showLandingPage, setShowLandingPage }: IndexProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [interviewData, setInterviewData] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [questions, setQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const steps = [
    { id: "upload", title: "Upload Resume", description: "Share your background", icon: Upload, completed: !!uploadedFile },
    { id: "role", title: "Select Role", description: "Choose target position", icon: FileText, completed: !!selectedRole },
    { id: "interview", title: "AI Interview", description: "Practice with AI", icon: Mic, completed: !!interviewData },
    { id: "analysis", title: "Analysis", description: "Review feedback", icon: BarChart3, completed: false },
  ];

  const features = [
    {
      icon: CheckCircle,
      title: "Smart Resume Analysis",
      description: "Our AI analyzes your resume to create personalized interview questions tailored to your experience."
    },
    {
      icon: Users,
      title: "Real-time Voice Interview",
      description: "Practice with our advanced AI interviewer that conducts realistic conversations."
    },
    {
      icon: Award,
      title: "Detailed Feedback",
      description: "Get comprehensive analysis on your responses, tone, and areas for improvement."
    },
    {
      icon: Clock,
      title: "Instant Results",
      description: "Receive immediate feedback and actionable insights to boost your interview performance."
    }
  ];

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setCurrentStep("role");
    setIsSidebarOpen(false); // Close sidebar on mobile after action
  };

  const handleRoleSelect = async (role: string) => {
    setSelectedRole(role);
    if (uploadedFile) {
      setLoadingQuestions(true);
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('role', role);
      try {
        const res = await axios.post('/generate-questions', formData, {
          baseURL: 'http://localhost:5001',
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setQuestions(res.data.questions);
        setCurrentStep('interview');
      } catch (err) {
        setQuestions([]);
        alert('Failed to generate questions. Please try again.');
      } finally {
        setLoadingQuestions(false);
      }
    }
    setIsSidebarOpen(false);
  };

  const handleInterviewComplete = (data: any) => {
    setInterviewData(data);
    setCurrentStep("analysis");
    setIsSidebarOpen(false); // Close sidebar on mobile after action
  };

  const resetInterview = () => {
    setCurrentStep("upload");
    setUploadedFile(null);
    setSelectedRole("");
    setInterviewData(null);
    setShowLandingPage(true);
    setIsSidebarOpen(false);
  };

  const startInterview = () => {
    if (!user) {
      setAuthTab("signin");
      setAuthDialogOpen(true);
      return;
    }
    setShowLandingPage(false);
  };

  const scrollToGetStarted = () => {
    const element = document.getElementById('get-started');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getCurrentStepIndex = () => steps.findIndex(s => s.id === currentStep);

  if (!showLandingPage) {
    return (
      <>
        {/* Mobile Top Left Buttons */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-4 left-4 z-50 flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow hover:bg-blue-50 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 mr-2 text-blue-600" />
            Menu
          </button>
        )}
        {/* Mobile Overlay to close sidebar */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex overflow-hidden">
          {/* Enhanced Left Sidebar - Responsive */}
          <div className={`
            fixed lg:relative w-80 lg:w-80 h-screen max-h-screen overflow-y-auto bg-white/95 backdrop-blur-xl shadow-2xl border-r border-gray-200/50 flex-shrink-0 z-40 transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            {/* Header with better styling */}
            <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Interview Coach</h1>
                  <p className="text-sm text-gray-600">Step {getCurrentStepIndex() + 1} of {steps.length}</p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((getCurrentStepIndex() + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Enhanced Vertical Progress Steps */}
            <div className="p-6 space-y-4 flex-1 overflow-auto custom-scrollbar">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = step.completed;
                const isPast = index < getCurrentStepIndex();
                
                return (
                  <div key={step.id} className="relative">
                    <div className={`
                      flex items-center p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
                      ${isActive ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg scale-105' : 
                        isCompleted || isPast ? 'border-green-200 bg-green-50 hover:bg-green-100' : 
                        'border-gray-200 bg-gray-50 hover:bg-gray-100'}
                    `}>
                      {/* Icon with enhanced styling */}
                      <div className={`
                        flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all duration-300 mr-4
                        ${isActive ? 'border-blue-500 bg-blue-500 text-white shadow-lg' : 
                          isCompleted || isPast ? 'border-green-500 bg-green-500 text-white' : 
                          'border-gray-300 bg-white text-gray-400'}
                      `}>
                        {isCompleted || isPast ? <CheckCircle size={20} /> : <Icon size={20} />}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-semibold text-sm transition-colors ${
                              isActive ? 'text-blue-700' : 
                              isCompleted || isPast ? 'text-green-700' : 
                              'text-gray-600'
                            }`}>
                              {step.title}
                            </p>
                            <p className={`text-xs mt-1 ${
                              isActive ? 'text-blue-600' : 
                              isCompleted || isPast ? 'text-green-600' : 
                              'text-gray-500'
                            }`}>
                              {step.description}
                            </p>
                          </div>
                          {isActive && (
                            <ChevronRight className="w-4 h-4 text-blue-500 animate-pulse" />
                          )}
                        </div>
                        
                        {/* Status indicator */}
                        <div className="mt-2">
                          {isActive && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Current Step
                            </span>
                          )}
                          {(isCompleted || isPast) && !isActive && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Connecting line */}
                    {index < steps.length - 1 && (
                      <div className="flex justify-center py-2">
                        <div className={`w-0.5 h-6 rounded-full transition-all duration-500 ${
                          isCompleted || isPast ? 'bg-green-400' : 'bg-gray-300'
                        }`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Enhanced Footer */}
            <div className="p-6 border-t border-gray-200/50 bg-gray-50/50">
              <Button 
                variant="outline" 
                onClick={resetInterview} 
                className="w-full group hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              >
                <Home className="w-4 h-4 mr-2 group-hover:text-blue-600" />
                Back to Home
              </Button>
            </div>
          </div>

          {/* Main Content Area with enhanced styling - Responsive */}
          <div className="flex-1 h-full overflow-auto relative z-10 lg:ml-0 pt-16 lg:pt-0">
            <div className="animate-fade-in h-full overflow-auto pt-8 px-2">
              {currentStep === "upload" && (
                <ResumeUpload onFileUpload={handleFileUpload} />
              )}
              
              {currentStep === "role" && (
                <RoleSelection 
                  selectedRole={selectedRole}
                  onRoleSelect={handleRoleSelect}
                  uploadedFileName={uploadedFile?.name || ""}
                  loadingQuestions={loadingQuestions}
                />
              )}
              
              {currentStep === "interview" && (
                <InterviewSession 
                  role={selectedRole}
                  questions={questions}
                  loadingQuestions={loadingQuestions}
                  onInterviewComplete={handleInterviewComplete}
                />
              )}
              
              {currentStep === "analysis" && (
                <div className="w-full h-full overflow-auto pt-8 px-2">
                  <AnalysisDashboard 
                    interviewData={interviewData}
                    role={selectedRole}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <AuthDialog
          open={authDialogOpen}
          onOpenChange={setAuthDialogOpen}
          defaultTab={authTab}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section id="home" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10" />
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000" />
          <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 animate-fade-in">
                Ace Your Next
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block mt-2"> Interview</span>
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed animate-fade-in delay-200">
                Practice with our AI-powered interview coach. Upload your resume, get personalized questions, 
                and receive detailed feedback to boost your confidence and performance.
              </p>
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in delay-400">
                <Button 
                  onClick={startInterview}
                  size="lg" 
                  className="px-8 lg:px-12 py-3 lg:py-4 text-base lg:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  Start Free Interview
                </Button>
                <Button 
                  onClick={scrollToGetStarted}
                  variant="outline" 
                  size="lg"
                  className="px-8 lg:px-12 py-3 lg:py-4 text-base lg:text-lg font-semibold border-2 hover:bg-gray-50 transition-all hover:scale-105"
                >
                  Learn More
                </Button>
              </div>
              {/* Stats */}
              <div className="flex flex-wrap justify-center gap-8 lg:gap-12 mb-16 animate-fade-in delay-600">
                <div className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-blue-600">10K+</div>
                  <div className="text-sm lg:text-base text-gray-600 font-medium">Interviews Practiced</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-indigo-600">95%</div>
                  <div className="text-sm lg:text-base text-gray-600 font-medium">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-slate-600">24/7</div>
                  <div className="text-sm lg:text-base text-gray-600 font-medium">Available</div>
                </div>
              </div>
              {/* Scroll indicator */}
              <div className="animate-bounce cursor-pointer" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
                <ArrowDown className="w-6 lg:w-8 h-6 lg:h-8 text-gray-400 mx-auto" />
              </div>
            </div>
          </div>
        </section>
        {/* About Section with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/8 to-teal-600/8" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-500" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1500" />
          <div className="relative z-10">
            <About />
          </div>
        </div>
        {/* How It Works Section with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/8 to-purple-600/8" />
          <div className="absolute top-1/3 right-1/4 w-88 h-88 bg-violet-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" />
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-2000" />
          <div className="relative z-10">
            <HowItWorks />
          </div>
        </div>
        {/* Features Section */}
        <section id="features" className="py-16 lg:py-20 relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/8 to-amber-600/8" />
          <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-700" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1200" />
          <div className="relative z-10 max-w-7xl mx-auto px-4">
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">Why Choose InterviewAI?</h2>
              <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Our AI-powered platform provides everything you need to excel in your next interview
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
        {/* CTA Section */}
        <section id="get-started" className="py-16 lg:py-20 relative overflow-hidden bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-600/90 to-violet-600/90" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500" />
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1500" />
          <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-lg lg:text-xl text-rose-100 mb-8 leading-relaxed">
              Join thousands of professionals who have improved their interview skills with our AI coach.
            </p>
            <Button 
              onClick={startInterview}
              size="lg" 
              className="px-8 lg:px-12 py-3 lg:py-4 text-base lg:text-lg font-semibold bg-white text-rose-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Start Your Free Interview Now
            </Button>
            <div className="mt-8 text-rose-100 text-sm lg:text-base">
              ✨ Completely Free • Instant Feedback
            </div>
          </div>
        </section>
        {/* Footer with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/5 to-gray-600/5" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000" />
          <div className="relative z-10">
            <Footer />
          </div>
        </div>
      </div>
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authTab}
      />
    </>
  );
};

export default Index;
