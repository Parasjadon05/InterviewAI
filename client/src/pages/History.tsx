import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { appwriteDatabases, APPWRITE_DB_ID, APPWRITE_FEEDBACK_COLLECTION_ID } from "@/lib/appwrite";
import { useEffect, useState } from "react";
import { Query } from "appwrite";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import Spinner from "@/components/ui/Spinner";

function getScoreColor(score: number) {
  if (score >= 85) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    appwriteDatabases
      .listDocuments(
        APPWRITE_DB_ID,
        APPWRITE_FEEDBACK_COLLECTION_ID,
        [Query.equal("userId", user.$id), Query.orderDesc("createdAt")]
      )
      .then((res) => setHistory(res.documents))
      .catch((err) => console.error("Failed to fetch history", err))
      .finally(() => setLoading(false));
  }, [user]);

  const handleCardClick = (item: any) => {
    navigate(`/history/${item.$id}`);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex flex-col items-center justify-start p-6 relative">
      {/* Back Button (floating style) */}
      <Button
        variant="ghost"
        className="fixed top-20 left-6 w-12 h-12 rounded-full flex items-center justify-center z-50 text-blue-600 hover:bg-blue-50 border border-blue-100 shadow-lg p-0"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-6 h-6 text-blue-600" />
      </Button>
      <div className="w-full max-w-5xl mx-auto mt-12">
        <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-2">Your Interview History</h1>
        <p className="text-lg text-center text-gray-500 mb-10">Review your past AI interview sessions and track your progress over time.</p>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size={48} className="mb-4" />
            <span className="text-lg text-gray-500 mb-2">Loading your history...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-blue-300 mb-4" />
            <p className="text-lg text-gray-500 mb-2">No interviews found yet.</p>
            <p className="text-sm text-gray-400">Your completed interviews will appear here for easy access and review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {history.map((item) => {
              let feedbackObj = null;
              let score = null;
              try { feedbackObj = JSON.parse(item.feedback); } catch {}
              if (feedbackObj && typeof feedbackObj.overallScore === 'number') score = feedbackObj.overallScore;
              // Use file name as title, fallback to 'Interview'
              const title = item.fileName || item.role || 'Interview';
              return (
                <div
                  key={item.$id}
                  className="relative bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:scale-105 hover:shadow-2xl cursor-pointer"
                  onClick={() => handleCardClick(item)}
                >
                  {/* Score badge */}
                  {score !== null && (
                    <div className={`absolute top-4 right-4 flex items-center justify-center w-12 h-12 rounded-full border text-lg font-bold ${getScoreColor(score)}`}
                      style={{ backgroundColor: 'rgba(255, 236, 139, 0.3)' }}
                    >
                      {score}
                    </div>
                  )}
                  <div className="flex items-center mb-2">
                    <FileText className="w-6 h-6 text-blue-400 mr-2" />
                    <span className="text-lg font-bold text-gray-900">{title}</span>
                  </div>
                  <div className="text-gray-500 text-sm mb-1">Role: <span className="font-medium text-gray-700">{item.role || 'N/A'}</span></div>
                  <div className="text-gray-400 text-xs">Uploaded: {new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History; 