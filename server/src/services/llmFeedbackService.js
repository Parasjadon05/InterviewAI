const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getLLMFeedback(question, transcript) {
  const prompt = `You are an expert interview coach. Analyze the following answer to the question: "${question}".\n\nThe answer is: "${transcript}".\n\nGive feedback on:\n- Clarity\n- Structure\n- Relevance to the question\n- Confidence\n- Technical depth (if applicable)\nProvide a score (out of 10) for each, and a short summary of strengths and areas for improvement. Format your response as:\n\nClarity: <score>/10\nStructure: <score>/10\nRelevance: <score>/10\nConfidence: <score>/10\nTechnical depth: <score>/10\n\nStrengths: <summary>\nAreas for improvement: <summary>`;

  const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });
  const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

function parseBatchFeedback(text, numQuestions) {
  // Enhanced parser for richer Gemini format
  const result = {
    questions: [],
    overallSummary: '',
    actionPlan: '',
    toneAnalysis: {},
    toneAnalysisSummary: '',
    responseQuality: {},
    responseQualitySummary: '',
    communicationSkills: {},
    communicationSkillsSummary: '',
  };
  const qRegex = /Q(\d+):([\s\S]*?)(?=Q\d+:|OVERALL TONE ANALYSIS:|OVERALL RESPONSE QUALITY ANALYSIS:|OVERALL COMMUNICATION SKILLS ANALYSIS:|OVERALL STRENGTHS ANALYSIS:|OVERALL IMPROVEMENT AREAS:|Overall Summary:|Action Plan:|$)/g;
  let match;
  while ((match = qRegex.exec(text)) !== null) {
    const qIdx = parseInt(match[1], 10) - 1;
    const qText = match[2];
    // Extract question and original answer
    const questionMatch = /Question:\s*([\s\S]*?)(?=Original Answer:|Score:|Clarity:|Structure:|Relevance:|Confidence:|Technical depth:|Strengths:|Areas for improvement:|Improved Answer:|$)/.exec(qText);
    const originalAnswerMatch = /Original Answer:\s*([\s\S]*?)(?=Score:|Clarity:|Structure:|Relevance:|Confidence:|Technical depth:|Strengths:|Areas for improvement:|Improved Answer:|$)/.exec(qText);
    // Extract score (out of 100) as a separate field
    const scoreMatch = /Score:\s*(\d{1,3})\s*\/\s*100/.exec(qText);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
    // Remove 'Score: .../100' from the original answer if present
    let cleanOriginalAnswer = originalAnswerMatch?.[1]?.replace(/Score:\s*\d{1,3}\s*\/\s*100/, '').trim() || '';
    const improvedAnswerMatch = /Improved Answer:\s*([\s\S]*?)(?=Q\d+:|Clarity:|Structure:|Relevance:|Confidence:|Technical depth:|Strengths:|Areas for improvement:|$)/.exec(qText);
    const scores = {};
    ['Clarity', 'Structure', 'Relevance', 'Confidence', 'Technical depth'].forEach((key) => {
      const scoreMatch = new RegExp(`${key}: (\d+)/10`).exec(qText);
      scores[key.toLowerCase().replace(' ', '')] = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
    });
    // Tone analysis
    const tone = {};
    ['Confidence', 'Clarity', 'Pace', 'Energy', 'Professionalism', 'Enthusiasm'].forEach((key) => {
      const m = new RegExp(`${key}: (\d+)/10`).exec(qText);
      tone[key.toLowerCase()] = m ? parseInt(m[1], 10) : null;
    });
    // Response quality
    const resp = {};
    ['Relevance', 'Completeness', 'Structure', 'Examples', 'Specificity', 'Impact'].forEach((key) => {
      const m = new RegExp(`${key}: (\d+)/10`).exec(qText);
      resp[key.toLowerCase()] = m ? parseInt(m[1], 10) : null;
    });
    // Communication skills
    const comm = {};
    ['Active listening', 'Storytelling', 'Technical explanation', 'Persuasiveness', 'Adaptability'].forEach((key) => {
      const m = new RegExp(`${key}: (\d+)/10`).exec(qText);
      comm[key.toLowerCase().replace(' ', '')] = m ? parseInt(m[1], 10) : null;
    });
    const strengths = /Strengths:([\s\S]*?)(Areas for improvement:|$)/.exec(qText)?.[1]?.trim() || '';
    const improvements = /Areas for improvement:([\s\S]*?)(Improved Answer:|$)/.exec(qText)?.[1]?.trim() || '';
    result.questions[qIdx] = {
      question: questionMatch?.[1]?.trim() || '',
      originalAnswer: cleanOriginalAnswer,
      improvedAnswer: improvedAnswerMatch?.[1]?.trim() || '',
      score, // <-- add score field
      scores,
      strengths,
      improvements,
      toneAnalysis: tone,
      responseQuality: resp,
      communicationSkills: comm,
    };
  }
  // Extract OVERALL TONE ANALYSIS block
  const overallToneMatch = /OVERALL TONE ANALYSIS:[\s\S]*?(?:\*+)?\s*Confidence:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Clarity:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Pace:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Energy:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Professionalism:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Enthusiasm:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Summary:\s*(?:\*+)?\s*([^\n]*)/i.exec(text);
  if (overallToneMatch) {
    result.toneAnalysis = {
      confidence: parseFloat(overallToneMatch[1]),
      clarity: parseFloat(overallToneMatch[2]),
      pace: parseFloat(overallToneMatch[3]),
      energy: parseFloat(overallToneMatch[4]),
      professionalism: parseFloat(overallToneMatch[5]),
      enthusiasm: parseFloat(overallToneMatch[6]),
    };
    result.toneAnalysisSummary = overallToneMatch[7]?.trim() || '';
  }
  // Extract OVERALL RESPONSE QUALITY ANALYSIS block
  const overallRespMatch = /OVERALL RESPONSE QUALITY ANALYSIS:[\s\S]*?(?:\*+)?\s*Relevance:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Completeness:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Structure:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Examples:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Specificity:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Impact:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Summary:\s*(?:\*+)?\s*([^\n]*)/i.exec(text);
  if (overallRespMatch) {
    result.responseQuality = {
      relevance: parseFloat(overallRespMatch[1]),
      completeness: parseFloat(overallRespMatch[2]),
      structure: parseFloat(overallRespMatch[3]),
      examples: parseFloat(overallRespMatch[4]),
      specificity: parseFloat(overallRespMatch[5]),
      impact: parseFloat(overallRespMatch[6]),
    };
    result.responseQualitySummary = overallRespMatch[7]?.trim() || '';
  }
  // Extract OVERALL COMMUNICATION SKILLS ANALYSIS block
  const overallCommMatch = /OVERALL COMMUNICATION SKILLS ANALYSIS:[\s\S]*?(?:\*+)?\s*Active listening:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Storytelling:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Technical explanation:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Persuasiveness:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Adaptability:\s*(?:\*+)?\s*([\d.]+)\/10[\s\S]*?(?:\*+)?\s*Summary:\s*(?:\*+)?\s*([^\n]*)/i.exec(text);
  if (overallCommMatch) {
    result.communicationSkills = {
      activelistening: parseFloat(overallCommMatch[1]),
      storytelling: parseFloat(overallCommMatch[2]),
      technicalexplanation: parseFloat(overallCommMatch[3]),
      persuasiveness: parseFloat(overallCommMatch[4]),
      adaptability: parseFloat(overallCommMatch[5]),
    };
    result.communicationSkillsSummary = overallCommMatch[6]?.trim() || '';
  }
  // Overall summary
  const overallMatch = /\*\*Overall Summary:\*\*([\s\S]*?)(\*\*Action Plan:\*\*|Action Plan:|$)/.exec(text);
  result.overallSummary = overallMatch?.[1]?.trim() || '';
  const actionMatch = /(?:\*\*Action Plan:\*\*|Action Plan:)([\s\S]*)/.exec(text);
  result.actionPlan = actionMatch?.[1]?.trim() || '';
  // Pre-process: ensure every new step starts on a new line
  if (result.actionPlan) {
    result.actionPlan = result.actionPlan.replace(/(?!^)(\*\*[\w\s&]+\*\*\s*\([^)]+\)\s*\[[^\]]+\]:)/g, '\n$1');
    result.actionPlan = result.actionPlan
      .split('\n')
      .filter(line =>
        !/^OVERALL INTERVIEW SCORE:/i.test(line) &&
        !/^Weighting Explanation:/i.test(line) &&
        !/^Filler Words Used:/i.test(line)
      )
      .join('\n')
      .trim();
  }
  return result;
}

async function getBatchLLMFeedback(qnaPairs) {
  let prompt = `You are an expert interview coach. Here are several interview questions and the candidate's answers.\n\n`;
  qnaPairs.forEach((pair, idx) => {
    prompt += `Q${idx + 1}: ${pair.question}\nA${idx + 1}: ${pair.transcript}\n\n`;
  });
  prompt += `\nFor each question, provide:\n- The question\n- The candidate's original answer\n- Score (out of 100)\n- Strengths (short summary)\n- Areas for improvement (short summary)\n- Improved Answer: Rewrite the candidate's answer to address the areas for improvement, making it more effective and professional.\n\nFormat for each question:\nQ1:\nQuestion: ...\nOriginal Answer: ...\nScore: .../100\nStrengths: ...\nAreas for improvement: ...\nImproved Answer: ...\n\n...\n\nAfter all questions, provide an OVERALL TONE ANALYSIS for the entire interview, with overall scores (out of 10) for:\n- Confidence\n- Clarity\n- Pace\n- Energy\n- Professionalism\n- Enthusiasm\nAnd a short summary of the candidate's overall vocal delivery and tone.\n\nAlso provide an OVERALL RESPONSE QUALITY ANALYSIS for the entire interview, with overall scores (out of 10) for:\n- Relevance\n- Completeness\n- Structure\n- Examples\n- Specificity\n- Impact\nAnd a short summary of the candidate's overall response quality.\n\nAlso provide an OVERALL COMMUNICATION SKILLS ANALYSIS for the entire interview, with overall scores (out of 10) for:\n- Active listening\n- Storytelling\n- Technical explanation\n- Persuasiveness\n- Adaptability\nAnd a short summary of the candidate's overall communication skills.\n\nAfter all analyses, provide an OVERALL STRENGTHS ANALYSIS and an OVERALL IMPROVEMENT AREAS section for the entire interview.\n\nFor each section, group feedback by category. For each category, provide:\n- A short, descriptive heading (e.g., "Technical Expertise", "Communication", "Storytelling", "Enthusiasm")\n- A 1-2 sentence detail explaining the candidate's performance in that area.\n\nFormat as:\n\nOVERALL STRENGTHS ANALYSIS:\nCategory 1: Description\nCategory 2: Description\n...\n\nOVERALL IMPROVEMENT AREAS:\nCategory 1: Description\nCategory 2: Description\n...\n\nExample:\n\nOVERALL STRENGTHS ANALYSIS:\nTechnical Expertise: Demonstrated deep understanding of software architecture and modern development practices.\nProblem-Solving: Showed excellent analytical thinking and systematic debugging.\nCommunication: Maintained professional tone and explained complex concepts clearly.\n\nOVERALL IMPROVEMENT AREAS:\nStorytelling: Add more context and use the STAR method more consistently.\nEnthusiasm: Show more excitement about the role and company.\nBehavioral Responses: Prepare more specific examples of leadership and collaboration.\n\nFormat the action plan as a list of 3-5 prioritized steps. For each step, include:\n- A short, bolded title\n- A 1-2 sentence description\n- Priority (High, Medium, or Low)\n- Timeline (e.g., 'This week', 'Next 2 weeks', 'Before next interview')\n\nFormat each step as:\n**Title** (Priority) [Timeline]: Description\n\nImportant: Only the title should be bold. Do NOT include the priority or timeline inside the title.\n\nExample:\n**Practice STAR method responses** (High) [This week]: Prepare 5-7 behavioral stories using Situation, Task, Action, Result format.\n**Reduce filler words** (High) [Next 2 weeks]: Practice speaking exercises and record yourself to monitor progress.\n**Prepare company-specific questions** (Medium) [Before next interview]: Research the company and prepare 3-4 thoughtful questions about the role.\n**Quantify achievements** (Medium) [This week]: Add specific metrics and numbers to your accomplishment stories.\n\nFormat your response as:\n\nQ1:\nStrengths: ...\nAreas for improvement: ...\nImproved Answer: ...\n\nQ2:\n...\n\nOVERALL TONE ANALYSIS:\nConfidence: ...\nClarity: ...\nPace: ...\nEnergy: ...\nProfessionalism: ...\nEnthusiasm: ...\nSummary: ...\n\nOVERALL RESPONSE QUALITY ANALYSIS:\nRelevance: ...\nCompleteness: ...\nStructure: ...\nExamples: ...\nSpecificity: ...\nImpact: ...\nSummary: ...\n\nOVERALL COMMUNICATION SKILLS ANALYSIS:\nActive listening: ...\nStorytelling: ...\nTechnical explanation: ...\nPersuasiveness: ...\nAdaptability: ...\nSummary: ...\n\nOVERALL STRENGTHS ANALYSIS:\n...\n\nOVERALL IMPROVEMENT AREAS:\n...\n\nOverall Summary: ...\nAction Plan: ...`;
  prompt += `\nAfter all analyses, provide an OVERALL INTERVIEW SCORE (out of 100) for the candidate, considering every aspect: communication skills, tone/voice, body language & visual presence, and question/answer analysis. Assign a weight to each feature according to its importance in a real interview. Provide a short explanation of the weighting you used.\n\nFormat as:\nOVERALL INTERVIEW SCORE: <score>/100\nWeighting Explanation: <short explanation>\n`;
  prompt += `\nAlso, provide the total number of filler words used by the candidate across all answers.\nFormat as:\nFiller Words Used: <number>\n`;

  const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });
  const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('Gemini raw output:', text);
  // Parse the text into a structured object
  const parsedResult = parseBatchFeedback(text, qnaPairs.length);

  // Debug log for parsed batch feedback
  console.log('Parsed batch feedback:', JSON.stringify(parsedResult, null, 2));

  // Parse OVERALL INTERVIEW SCORE and weighting explanation
  const overallScoreMatch = /OVERALL INTERVIEW SCORE:\s*(\d{1,3})\s*\/\s*100/i.exec(text);
  parsedResult.overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1], 10) : null;
  const overallScoreExplanationMatch = /Weighting Explanation:\s*([\s\S]*?)(?=\n[A-Z ]+?:|$)/i.exec(text);
  parsedResult.overallScoreExplanation = overallScoreExplanationMatch ? overallScoreExplanationMatch[1].trim() : '';
  // Parse Filler Words Used
  const fillerWordsMatch = /Filler Words Used:\s*(\d+)/i.exec(text);
  parsedResult.fillerWordsUsed = fillerWordsMatch ? parseInt(fillerWordsMatch[1], 10) : 0;

  // Parse OVERALL STRENGTHS ANALYSIS
  const strengthsMatch = /OVERALL STRENGTHS ANALYSIS:[\s\S]*?(?=OVERALL IMPROVEMENT AREAS:|Overall Summary:|Action Plan:|$)/.exec(text);
  if (strengthsMatch) {
    const lines = strengthsMatch[0].split(/\n/).slice(1).map(l => l.trim()).filter(Boolean);
    parsedResult.overallStrengths = lines.map(line => {
      const m = line.match(/^([^:]+):\s*(.+)$/);
      return m ? { category: m[1].trim(), detail: m[2].trim() } : null;
    }).filter(Boolean);
  } else {
    parsedResult.overallStrengths = [];
  }
  // Parse OVERALL IMPROVEMENT AREAS
  const improvementsMatch = /OVERALL IMPROVEMENT AREAS:[\s\S]*?(?=OVERALL STRENGTHS ANALYSIS:|Overall Summary:|Action Plan:|$)/.exec(text);
  if (improvementsMatch) {
    const lines = improvementsMatch[0].split(/\n/).slice(1).map(l => l.trim()).filter(Boolean);
    parsedResult.overallImprovements = lines.map(line => {
      const m = line.match(/^([^:]+):\s*(.+)$/);
      return m ? { category: m[1].trim(), detail: m[2].trim() } : null;
    }).filter(Boolean);
  } else {
    parsedResult.overallImprovements = [];
  }

  return parsedResult;
}

module.exports = { getLLMFeedback, getBatchLLMFeedback }; 