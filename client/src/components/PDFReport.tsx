import React from "react";

// Copied from AnalysisDashboard for consistent parsing
function parseActionPlan(actionPlan: string) {
  if (!actionPlan) return null;
  const lines = actionPlan.split(/\n|\r|\r\n/).map(l => l.trim()).filter(Boolean);
  const steps = [];
  let current = null;
  lines.forEach(line => {
    // Match: **Title** (Priority) [Timeline]: Description
    const match = line.match(/^\*\*?([\w\s\-\/]+)\*\*?\s*(?:\(([^)]+)\))?\s*(?:\[([^\]]+)\])?\s*[:\-—]?\s*(.*)$/);
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

interface PDFReportProps {
  analysis: any;
  role: string;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "#16a34a"; // green
  if (score >= 60) return "#ca8a04"; // yellow
  return "#dc2626"; // red
};
const getScoreBadge = (score: number) => {
  if (score >= 80) return { background: "#bbf7d0", color: "#166534", border: "1px solid #bbf7d0" };
  if (score >= 60) return { background: "#fef9c3", color: "#854d0e", border: "1px solid #fef9c3" };
  return { background: "#fecaca", color: "#7f1d1d", border: "1px solid #fecaca" };
};
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "High": return { background: "#fecaca", color: "#b91c1c", border: "1px solid #fecaca" };
    case "Medium": return { background: "#fef9c3", color: "#a16207", border: "1px solid #fef9c3" };
    case "Low": return { background: "#bbf7d0", color: "#166534", border: "1px solid #bbf7d0" };
    default: return { background: "#e5e7eb", color: "#374151", border: "1px solid #e5e7eb" };
  }
};

const cardBreakStyle = {
  breakInside: 'avoid',
  pageBreakInside: 'avoid',
  boxSizing: 'border-box' as const,
};

const PDFReport: React.FC<PDFReportProps> = ({ analysis, role }) => {
  const today = new Date().toLocaleDateString();
  // Parse action plan if it's a string
  let actionPlanSteps = Array.isArray(analysis.actionPlan)
    ? analysis.actionPlan
    : (typeof analysis.actionPlan === 'string' ? parseActionPlan(analysis.actionPlan) : []);
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#fff', color: '#111', padding: 0, margin: 0, width: '100%' }}>
      {/* Print/PDF page-break control styles */}
      <style>{`
        .pdf-card, .pdf-section { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          .pdf-card, .pdf-section { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '32px 0 16px 0' }} className="pdf-section">
        <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '50%', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 32, color: '#fff', fontWeight: 700 }}>📊</span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Interview Analysis Report</h1>
        <div style={{ fontSize: 16, color: '#6366f1', margin: '8px 0' }}>Role: <span style={{ color: '#2563eb', fontWeight: 600 }}>{role}</span> | Completed on {today}</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: getScoreColor(analysis.overallScore ?? 0), margin: '16px 0 0 0' }}>{typeof analysis.overallScore === 'number' ? analysis.overallScore : 'N/A'}/100</div>
        <div style={{ ...getScoreBadge(analysis.overallScore ?? 0), display: 'inline-block', borderRadius: 16, padding: '4px 16px', fontWeight: 600, fontSize: 16, margin: '8px 0' }}>Overall Performance</div>
        {analysis.overallScoreExplanation && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{analysis.overallScoreExplanation}</div>}
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div style={{ maxWidth: 700, margin: '32px auto 0 auto', background: '#f1f5f9', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001', ...cardBreakStyle }} className="pdf-card">
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1e293b' }}>Summary</h2>
          <div style={{ fontSize: 16, color: '#334155', marginTop: 8 }}>{analysis.summary}</div>
        </div>
      )}

      {/* Strengths & Improvements by Category */}
      <div style={{ maxWidth: 700, margin: '32px auto 0 auto', display: 'flex', gap: 24, flexWrap: 'wrap' }} className="pdf-section">
        {/* Strengths */}
        {Array.isArray(analysis.overallStrengths) && analysis.overallStrengths.length > 0 && (
          <div style={{ flex: 1, minWidth: 300 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginBottom: 12 }}>Strengths by Category</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analysis.overallStrengths.map((cat: any, idx: number) => (
                <div key={idx} style={{ background: '#f0fdf4', borderRadius: 12, padding: 14, border: '1px solid #bbf7d0', ...cardBreakStyle }} className="pdf-card">
                  <div style={{ fontWeight: 600, color: '#166534', fontSize: 15 }}>{cat.category}</div>
                  <div style={{ color: '#166534', fontSize: 14, marginTop: 4 }}>{cat.details}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Improvements */}
        {Array.isArray(analysis.overallImprovements) && analysis.overallImprovements.length > 0 && (
          <div style={{ flex: 1, minWidth: 300 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>Improvements by Category</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analysis.overallImprovements.map((cat: any, idx: number) => (
                <div key={idx} style={{ background: '#fef2f2', borderRadius: 12, padding: 14, border: '1px solid #fecaca', ...cardBreakStyle }} className="pdf-card">
                  <div style={{ fontWeight: 600, color: '#b91c1c', fontSize: 15 }}>{cat.category}</div>
                  <div style={{ color: '#b91c1c', fontSize: 14, marginTop: 4 }}>{cat.details}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Question-by-Question Analysis */}
      {Array.isArray(analysis.questions) && analysis.questions.length > 0 && (
        <div style={{ maxWidth: 700, margin: '40px auto 0 auto' }} className="pdf-section">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginBottom: 12 }}>Question-by-Question Analysis</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {analysis.questions.map((q: any, idx: number) => (
              <div key={idx} style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e0e7ef', boxShadow: '0 1px 4px #0001', ...cardBreakStyle }} className="pdf-card">
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15, marginBottom: 4 }}>Q{idx + 1}: {q.question}</div>
                <div style={{ color: '#334155', fontSize: 14, marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Your Answer:</span> {q.originalAnswer}</div>
                {q.improvedAnswer && <div style={{ color: '#0e7490', fontSize: 14, marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Improved Answer:</span> {q.improvedAnswer}</div>}
                <div style={{ color: getScoreColor(q.score ?? 0), fontWeight: 700, fontSize: 14 }}>Score: {typeof q.score === 'number' ? q.score : 'N/A'}/100</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page break before Action Plan at the end */}
      <div style={{ pageBreakBefore: 'always', breakBefore: 'always', height: 0 }} className="pdf-page-break" />
      {/* Action Plan at the end, always on a new page */}
      {Array.isArray(actionPlanSteps) && actionPlanSteps.length > 0 && (
        <div style={{ maxWidth: 700, margin: '32px auto 0 auto' }} className="pdf-section">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Personalized Action Plan</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {actionPlanSteps.map((step: any, idx: number) => (
              <div key={idx} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px #0001', padding: 18, border: '1px solid #e5e7eb', marginBottom: 0, ...cardBreakStyle }} className="pdf-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, minHeight: 32 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', lineHeight: '1.4', verticalAlign: 'middle' }}>{step.action}</span>
                  {step.priority && <span style={{ ...getPriorityBadge(step.priority), borderRadius: 999, padding: '4px 18px', fontSize: 15, fontWeight: 700, lineHeight: '1.4', verticalAlign: 'middle', display: 'inline-block' }}>{step.priority} Priority</span>}
                  {step.timeline && <span style={{ background: '#f1f5f9', color: '#334155', borderRadius: 999, padding: '4px 18px', fontSize: 15, fontWeight: 700, lineHeight: '1.4', verticalAlign: 'middle', border: '1px solid #e5e7eb', display: 'inline-block' }}>{step.timeline}</span>}
                </div>
                {step.description && <div style={{ color: '#334155', fontSize: 15 }}>{step.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, margin: '48px 0 16px 0' }} className="pdf-section">
        InterviewAI &copy; {new Date().getFullYear()} | Confidential Feedback Report
      </div>
    </div>
  );
};

export default PDFReport; 