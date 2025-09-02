
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ResumeUploadProps {
  onFileUpload: (file: File) => void;
}

const ResumeUpload = ({ onFileUpload }: ResumeUploadProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: "Resume uploaded successfully",
      description: `${file.name} is ready for analysis`,
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const proceedToNext = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 to-indigo-600/8" />
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1000" />
      
      <div className="animate-fade-in relative z-10">
        <Card className="max-w-2xl mx-auto shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Upload Your Resume</CardTitle>
            <CardDescription className="text-lg text-gray-600 leading-relaxed">
              Let our AI analyze your background to create personalized interview questions that match your experience level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedFile ? (
              <div
                className={`
                  relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer overflow-hidden
                  ${dragOver ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'}
                `}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5" />
                <div className="absolute top-4 right-4">
                  <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
                </div>
                
                <div className="relative">
                  <div className={`transition-transform duration-300 ${dragOver ? 'scale-110' : ''}`}>
                    <Upload className="mx-auto h-16 w-16 text-gray-400 mb-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Drop your resume here, or click to browse
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Supports PDF and Word documents up to 10MB
                  </p>
                  <div className="flex justify-center space-x-4 text-sm text-gray-400">
                    <span className="bg-gray-100 px-3 py-1 rounded-full">.PDF</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">.DOC</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">.DOCX</span>
                  </div>
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border rounded-xl p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg animate-scale-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 text-lg">{selectedFile.name}</p>
                      <p className="text-sm text-blue-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for analysis
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-all"
                  >
                    <X size={18} />
                  </Button>
                </div>
              </div>
            )}

            {selectedFile && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={proceedToNext} 
                  size="lg" 
                  className="px-12 py-3 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  Continue to Role Selection →
                </Button>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Why do we need your resume?
              </h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Personalize interview questions based on your experience
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Identify areas of strength and improvement opportunities
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Provide more relevant feedback and actionable suggestions
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  Ensure questions match your career level and aspirations
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResumeUpload;
