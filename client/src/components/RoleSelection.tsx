
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText } from "lucide-react";

interface RoleSelectionProps {
  selectedRole: string;
  onRoleSelect: (role: string) => void;
  uploadedFileName: string;
  loadingQuestions?: boolean;
}

const roleCategories = [
  {
    category: "Engineering",
    roles: [
      "Software Engineer",
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "DevOps Engineer",
      "Data Engineer",
      "Mobile Developer",
      "QA Engineer"
    ]
  },
  {
    category: "Product & Design",
    roles: [
      "Product Manager",
      "UI/UX Designer",
      "Product Designer",
      "Product Owner",
      "Business Analyst",
      "Technical Product Manager"
    ]
  },
  {
    category: "Data & Analytics",
    roles: [
      "Data Scientist",
      "Data Analyst",
      "Machine Learning Engineer",
      "Research Scientist",
      "AI Engineer",
      "Business Intelligence Analyst"
    ]
  },
  {
    category: "Business & Marketing",
    roles: [
      "Marketing Manager",
      "Sales Representative",
      "Business Development",
      "Content Marketing",
      "Digital Marketing",
      "Growth Manager",
      "Account Manager"
    ]
  }
];

const RoleSelection = ({ selectedRole, onRoleSelect, uploadedFileName, loadingQuestions = false }: RoleSelectionProps) => {
  const [tempSelectedRole, setTempSelectedRole] = useState(selectedRole);

  const handleRoleClick = (role: string) => {
    setTempSelectedRole(role);
  };

  const proceedToInterview = () => {
    if (tempSelectedRole) {
      onRoleSelect(tempSelectedRole);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/8 to-purple-600/8" />
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1000" />
      
      <Card className="max-w-4xl mx-auto shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Select Your Target Role</CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Choose the position you're interviewing for to get relevant questions
          </CardDescription>
          
          {uploadedFileName && (
            <div className="flex items-center justify-center mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <FileText className="h-5 w-5 text-indigo-600 mr-2" />
              <span className="text-sm text-indigo-800">Resume uploaded: {uploadedFileName}</span>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid gap-6">
            {roleCategories.map((category) => (
              <div key={category.category} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  {category.category}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {category.roles.map((role) => (
                    <div
                      key={role}
                      onClick={() => handleRoleClick(role)}
                      className={`
                        relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                        ${tempSelectedRole === role 
                          ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{role}</span>
                        {tempSelectedRole === role && (
                          <CheckCircle className="h-5 w-5 text-indigo-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {tempSelectedRole && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-indigo-900">Selected Role:</h4>
                  <Badge variant="secondary" className="mt-1 bg-indigo-100 text-indigo-800">
                    {tempSelectedRole}
                  </Badge>
                </div>
                <Button onClick={proceedToInterview} size="lg" className="px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" disabled={loadingQuestions}>
                  {loadingQuestions ? (
                    <span>
                      <svg className="inline w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Generating Questions...
                    </span>
                  ) : (
                    "Start AI Interview"
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">What to expect in your interview:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 5-8 role-specific questions tailored to your background</li>
              <li>• Real-time audio recording and analysis</li>
              <li>• Questions about technical skills, experience, and problem-solving</li>
              <li>• Behavioral questions to assess soft skills</li>
              <li>• Detailed feedback on your responses and delivery</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSelection;
