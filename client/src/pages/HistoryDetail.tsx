import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { appwriteDatabases, APPWRITE_DB_ID, APPWRITE_FEEDBACK_COLLECTION_ID } from "@/lib/appwrite";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

const HistoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    appwriteDatabases
      .getDocument(APPWRITE_DB_ID, APPWRITE_FEEDBACK_COLLECTION_ID, id)
      .then((doc) => {
        let feedbackObj = null;
        try { feedbackObj = JSON.parse(doc.feedback); } catch {}
        setFeedback(feedbackObj);
        setRole(doc.role || "Interview");
      })
      .catch((err) => {
        setFeedback(null);
        setRole("");
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 flex flex-col items-center justify-start p-6 relative overflow-hidden">
      {/* Decorative blurred gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 z-0" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 z-0" />
      <Button
        variant="ghost"
        className="fixed top-20 left-6 w-12 h-12 rounded-full flex items-center justify-center z-50 text-blue-600 hover:bg-blue-50 border border-blue-100 shadow-lg p-0"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-6 h-6 text-blue-600" />
      </Button>
      <div className="w-full max-w-5xl mx-auto mt-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size={48} className="mb-4" />
            <span className="text-lg text-gray-500 mb-2">Loading feedback...</span>
          </div>
        ) : feedback ? (
          <AnalysisDashboard interviewData={feedback} role={role} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-lg text-red-500 mb-2">Feedback not found.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryDetail; 