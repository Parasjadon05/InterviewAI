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
  // For testing, return 3 fixed questions
  return [
    'What is your name?',
    'What is your profession?',
    'What project you are working?'
  ];
}

module.exports = { generateInterviewQuestions }; 