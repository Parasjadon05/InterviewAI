const axios = require('axios');
require('dotenv').config();

/**
 * Generates tailored interview questions based on resume text and role.
 * @param {string} resumeText - The plain text extracted from the user's resume.
 * @param {string} role - The job role selected by the user.
 * @param {number} questionCount - The number of questions to generate (5, 10, or 15).
 * @returns {Promise<string[]>} - Array of interview questions.
 */
async function generateInterviewQuestions(resumeText, role, questionCount = 15) {
  const prompt = `You are an expert interviewer for the role of "${role}". Given the following resume, generate ${questionCount} unique, challenging, and realistic interview questions that test both technical and behavioral skills. The questions should be tailored to the candidate's experience, skills, and the requirements of the role. Avoid generic questions. Number each question. Only return the questions, nothing else.\n\nResume:\n${resumeText}`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;

    // Extract questions (assuming numbered list)
    const questions = text
      .split(/\n+/)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 0)
      .slice(0, questionCount);

    return questions;
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generates generic interview questions based on role only (fallback when resume parsing fails).
 * @param {string} role - The job role selected by the user.
 * @param {number} questionCount - The number of questions to generate (5, 10, or 15).
 * @returns {Promise<string[]>} - Array of interview questions.
 */
async function generateRoleBasedQuestions(role, questionCount = 15) {
  const prompt = `You are an expert interviewer for the role of "${role}". Generate ${questionCount} unique, challenging, and realistic interview questions that test both technical and behavioral skills for this role. The questions should be comprehensive and cover various aspects of the position. Number each question. Only return the questions, nothing else.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;

    // Extract questions (assuming numbered list)
    const questions = text
      .split(/\n+/)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 0)
      .slice(0, questionCount);

    return questions;
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { generateInterviewQuestions, generateRoleBasedQuestions };