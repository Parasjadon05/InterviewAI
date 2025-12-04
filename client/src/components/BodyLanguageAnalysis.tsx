import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Eye, User, Smile, Monitor, Lightbulb, CheckCircle } from 'lucide-react';

interface BodyLanguageAnalysisProps {
  analysis: {
    eyeContact: {
      score: number;
      percentage: number;
      feedback: string;
    };
    posture: {
      score: number;
      feedback: string;
    };
    confidence: {
      score: number;
      feedback: string;
    };
    professionalAppearance: {
      score: number;
      lighting: number;
      background: number;
      feedback: string;
    };
    overallScore: number;
    recommendations: string[];
  };
}

const BodyLanguageAnalysis: React.FC<BodyLanguageAnalysisProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Overall Visual Presence Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}/100
            </div>
            <Badge className={getScoreBadgeColor(analysis.overallScore)}>
              {analysis.overallScore >= 80 ? 'Excellent' : 
               analysis.overallScore >= 60 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Eye Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Eye Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Score</span>
                <Badge className={getScoreBadgeColor(analysis.eyeContact.score)}>
                  {analysis.eyeContact.score}/100
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Percentage</span>
                <span className="text-sm">{analysis.eyeContact.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={analysis.eyeContact.score} className="h-2" />
              <p className="text-sm text-gray-600">{analysis.eyeContact.feedback}</p>
            </div>
          </CardContent>
        </Card>

        {/* Posture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Posture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Score</span>
                <Badge className={getScoreBadgeColor(analysis.posture.score)}>
                  {analysis.posture.score}/100
                </Badge>
              </div>
              <Progress value={analysis.posture.score} className="h-2" />
              <p className="text-sm text-gray-600">{analysis.posture.feedback}</p>
            </div>
          </CardContent>
        </Card>

        {/* Confidence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smile className="h-5 w-5" />
              Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Score</span>
                <Badge className={getScoreBadgeColor(analysis.confidence.score)}>
                  {analysis.confidence.score}/100
                </Badge>
              </div>
              <Progress value={analysis.confidence.score} className="h-2" />
              <p className="text-sm text-gray-600">{analysis.confidence.feedback}</p>
            </div>
          </CardContent>
        </Card>

        {/* Professional Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Professional Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Score</span>
                <Badge className={getScoreBadgeColor(analysis.professionalAppearance.score)}>
                  {analysis.professionalAppearance.score}/100
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Lighting</span>
                  <span className="text-sm">{analysis.professionalAppearance.lighting}/100</span>
                </div>
                <Progress value={analysis.professionalAppearance.lighting} className="h-1" />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Background</span>
                  <span className="text-sm">{analysis.professionalAppearance.background}/100</span>
                </div>
                <Progress value={analysis.professionalAppearance.background} className="h-1" />
              </div>
              <p className="text-sm text-gray-600">{analysis.professionalAppearance.feedback}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{recommendation}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BodyLanguageAnalysis;

