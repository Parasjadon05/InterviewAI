
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Users, Target, Award } from "lucide-react";

const About = () => {
  const stats = [
    { icon: Users, label: "Happy Users", value: "10,000+" },
    { icon: Brain, label: "AI Interviews", value: "50,000+" },
    { icon: Target, label: "Success Rate", value: "95%" },
    { icon: Award, label: "Companies Trust Us", value: "500+" },
  ];

  return (
    <section id="about" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">About InterviewAI</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We're revolutionizing interview preparation with cutting-edge AI technology. 
            Our platform helps job seekers practice and perfect their interview skills through 
            personalized, intelligent feedback and real-time analysis.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-gray-900">Our Mission</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              We believe everyone deserves the opportunity to showcase their best self in interviews. 
              Our AI-powered platform provides personalized coaching, helping candidates build 
              confidence and improve their interview performance.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Personalized interview questions based on your resume</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-gray-700">Real-time voice analysis and feedback</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <span className="text-gray-700">Comprehensive performance analytics</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <Brain className="w-16 h-16 mb-6" />
              <h4 className="text-2xl font-bold mb-4">AI-Powered Intelligence</h4>
              <p className="text-blue-100">
                Our advanced AI analyzes your responses, tone, and body language to provide 
                actionable insights that help you improve with every practice session.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default About;
