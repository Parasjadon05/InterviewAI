const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');
const { transcribeAudioFile, getAudioDuration, calculateAudioMetrics } = require('./services/transcriptionService');
const { getLLMFeedback, getBatchLLMFeedback } = require('./services/llmFeedbackService');
const { transcribeWebmWithConversion } = require('./transcribeWithConversion');
const { generateInterviewQuestions, generateRoleBasedQuestions } = require('../questionGenerator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Explicit CORS configuration to satisfy strict browser checks
const corsOptions = {
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

app.use(cors(corsOptions));
// Ensure headers are present for any route and short-circuit preflight
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  const requestedHeaders = req.headers['access-control-request-headers'] || 'Content-Type, Authorization';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Headers', requestedHeaders);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '5mb' }));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Health check
app.get('/', (req, res) => {
  res.send('InterviewAI backend is running.');
});

// POST /generate-questions (file upload)
app.post('/generate-questions', upload.single('file'), async (req, res) => {
  const { role } = req.body;
  const file = req.file;
  
  try {
    let resumeText = '';
    
    // Parse resume file if uploaded
    if (file && fs.existsSync(file.path)) {
      const ext = path.extname(file.originalname || file.path).toLowerCase();
      
      if (ext === '.pdf') {
        const data = await pdfParse(fs.readFileSync(file.path));
        resumeText = data.text;
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: file.path });
        resumeText = result.value;
      } else if (ext === '.txt' || ext === '') {
        resumeText = fs.readFileSync(file.path, 'utf-8');
      }
      
      // Clean up uploaded file
      fs.unlinkSync(file.path);
    }
    
    // Generate questions based on resume and role, or just role if no resume
    let questions;
    if (resumeText && resumeText.trim().length > 0) {
      questions = await generateInterviewQuestions(resumeText, role, 10);
    } else {
      questions = await generateRoleBasedQuestions(role, 10);
    }
    
    res.json({ questions });
  } catch (error) {
    console.error('Error generating questions:', error);
    // Fallback to role-based questions if generation fails
    try {
      const questions = await generateRoleBasedQuestions(role || 'Software Engineer', 10);
      res.json({ questions });
    } catch (fallbackError) {
      console.error('Fallback question generation also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to generate questions' });
    }
  }
});

// POST /transcribe-audio (audio upload)
app.post('/transcribe-audio', upload.single('audio'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Missing audio file' });
  }
  if (file.size === 0) {
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'Empty audio file' });
  }
  console.log('Received file:', file.originalname, file.size, file.mimetype);
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    let transcript, metrics;
    if (ext === '.webm') {
      const result = await transcribeWebmWithConversion(file.path);
      transcript = result.transcript;
      metrics = result.metrics;
    } else {
      const duration = await getAudioDuration(file.path);
      transcript = await transcribeAudioFile(file.path);
      metrics = calculateAudioMetrics(transcript, duration);
      fs.unlinkSync(file.path);
    }
    console.log('Transcript:', transcript);
    res.json({ transcript, metrics });
  } catch (error) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// POST /llm-feedback
app.post('/llm-feedback', async (req, res) => {
  const { question, transcript } = req.body;
  if (!question || !transcript) {
    return res.status(400).json({ error: 'Missing question or transcript' });
  }
  try {
    const feedback = await getLLMFeedback(question, transcript);
    res.json({ feedback });
  } catch (error) {
    console.error('Error getting LLM feedback:', error);
    res.status(500).json({ error: 'Failed to get LLM feedback' });
  }
});

// POST /llm-batch-feedback
app.post('/llm-batch-feedback', async (req, res) => {
  let { qnaPairs, audioMetrics, bodyLanguageMetrics } = req.body;
  if (!Array.isArray(qnaPairs)) qnaPairs = [];
  // Filter out invalid/null pairs
  qnaPairs = qnaPairs.filter(pair => pair && pair.question && pair.transcript);
  if (qnaPairs.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid qnaPairs' });
  }
  try {
    const feedback = await getBatchLLMFeedback(qnaPairs);
    // Merge audio and body metrics if present
    const response = { ...feedback };
    if (Array.isArray(audioMetrics)) response.audioMetrics = audioMetrics;
    if (Array.isArray(bodyLanguageMetrics)) response.bodyLanguageMetrics = bodyLanguageMetrics;

    // --- Body Language Summary Logic ---
    if (Array.isArray(bodyLanguageMetrics) && bodyLanguageMetrics.length > 0) {
      // Calculate averages for each metric
      const keys = Object.keys(bodyLanguageMetrics[0] || {});
      const summary = {};
      keys.forEach(key => {
        const vals = bodyLanguageMetrics.map(m => (m && typeof m[key] === 'number' ? m[key] : 0));
        summary[key] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      });
      // Less strict, more encouraging summary string
      let summaryText = [];
      if (summary.eyeContactPercent >= 60) summaryText.push('Great eye contact');
      else if (summary.eyeContactPercent >= 30) summaryText.push('Moderate eye contact');
      else summaryText.push('Try to make more eye contact');
      if (summary.postureScore >= 60) summaryText.push('Good posture');
      else if (summary.postureScore >= 30) summaryText.push('Posture is okay, but could be improved');
      else summaryText.push('Work on improving posture');
      if (summary.smilePercent >= 40) summaryText.push('Friendly and approachable demeanor');
      if (summary.gestureCount >= 3) summaryText.push('Used hand gestures effectively');
      if (summary.handPresencePercent < 10) summaryText.push('Try to use hands a bit more for expression');
      response.bodyLanguageAnalysis = { ...summary, summary: summaryText.join('. ') };
    } else {
      response.bodyLanguageAnalysis = {};
    }
    // --- End Body Language Summary Logic ---

    res.json({ feedback: response });
  } catch (error) {
    console.error('Error getting batch LLM feedback:', error);
    res.status(500).json({ error: 'Failed to get batch LLM feedback' });
  }
});

app.post('/test', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 