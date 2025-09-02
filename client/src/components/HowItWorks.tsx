
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, UserCheck, Mic, BarChart3, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Upload,
      title: "Upload Your Resume",
      description: "Start by uploading your resume in PDF or Word format. Our AI will analyze your background and experience.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: UserCheck,
      title: "Select Your Role",
      description: "Choose the position you're applying for. We'll tailor interview questions specifically to that role.",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      icon: Mic,
      title: "Take the AI Interview",
      description: "Participate in a realistic interview session with our AI. Speak naturally as you would in a real interview.",
      color: "from-slate-500 to-slate-600"
    },
    {
      icon: BarChart3,
      title: "Get Detailed Analysis",
      description: "Receive comprehensive feedback on your performance, including tone analysis and improvement suggestions.",
      color: "from-cyan-500 to-cyan-600"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Get started with your interview preparation in just four simple steps. 
            Our intelligent platform guides you through the entire process.
          </p>
        </div>

        <div className="relative">
          {/* Desktop Flow */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex items-center">
                    <Card className="w-72 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <CardHeader className="text-center pb-4">
                        <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold text-gray-600">
                          {index + 1}
                        </div>
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 text-center leading-relaxed">
                          {step.description}
                        </p>
                      </CardContent>
                    </Card>
                    {index < steps.length - 1 && (
                      <div className="flex items-center mx-4">
                        <ArrowRight className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Flow */}
          <div className="lg:hidden space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="text-center pb-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold text-gray-600">
                        {index + 1}
                      </div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-center leading-relaxed">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                  {index < steps.length - 1 && (
                    <div className="flex justify-center my-4">
                      <div className="w-1 h-8 bg-gray-300"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
