const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates 15 tailored interview questions based on resume text and role.
 * @param {string} resumeText - The plain text extracted from the user's resume.
 * @param {string} role - The job role selected by the user.
 * @returns {Promise<string[]>} - Array of 15 interview questions.
 */
async function generateInterviewQuestions(resumeText, role) {
  const prompt = `You are an expert interviewer for the role of "${role}". Given the following resume, generate 15 unique, challenging, and realistic interview questions that test both technical and behavioral skills. The questions should be tailored to the candidate's experience, skills, and the requirements of the role. Avoid generic questions. Number each question. Only return the questions, nothing else.\n\nResume:\n${resumeText}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract questions (assuming numbered list)
  const questions = text
    .split(/\n+/)
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(q => q.length > 0)
    .slice(0, 15);

  return questions;
}

module.exports = { generateInterviewQuestions }; 