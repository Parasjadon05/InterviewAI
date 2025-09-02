const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_UPLOAD_URL = 'https://api.assemblyai.com/v2/upload';
const ASSEMBLYAI_TRANSCRIBE_URL = 'https://api.assemblyai.com/v2/transcript';

async function uploadAudioToAssemblyAI(filePath) {
  const audioData = fs.readFileSync(filePath);
  const response = await axios.post(ASSEMBLYAI_UPLOAD_URL, audioData, {
    headers: {
      'authorization': ASSEMBLYAI_API_KEY,
      'transfer-encoding': 'chunked',
      'content-type': 'application/octet-stream',
    },
  });
  return response.data.upload_url;
}

async function transcribeAudioWithAssemblyAI(audioUrl) {
  const response = await axios.post(ASSEMBLYAI_TRANSCRIBE_URL, {
    audio_url: audioUrl,
    speaker_labels: false,
    auto_chapters: false,
    iab_categories: false,
    entity_detection: false,
    sentiment_analysis: false
  }, {
    headers: {
      'authorization': ASSEMBLYAI_API_KEY,
      'content-type': 'application/json',
    },
  });
  const transcriptId = response.data.id;

  // Poll for completion
  let transcript;
  while (true) {
    const pollRes = await axios.get(`${ASSEMBLYAI_TRANSCRIBE_URL}/${transcriptId}`, {
      headers: { 'authorization': ASSEMBLYAI_API_KEY },
    });
    transcript = pollRes.data;
    if (transcript.status === 'completed') break;
    if (transcript.status === 'failed') throw new Error('Transcription failed');
    await new Promise(res => setTimeout(res, 2000));
  }
  return transcript.text;
}

async function transcribeAudioFile(filePath) {
  const audioUrl = await uploadAudioToAssemblyAI(filePath);
  const transcript = await transcribeAudioWithAssemblyAI(audioUrl);
  return transcript;
}

// Utility to get audio duration in seconds using ffmpeg
const getAudioDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
};

// Calculate audio metrics from transcript and duration
function calculateAudioMetrics(transcript, durationSeconds) {
  // Speaking pace: words per minute
  const words = transcript.trim().split(/\s+/).length;
  const minutes = durationSeconds / 60;
  const pace = minutes > 0 ? words / minutes : 0;

  // Filler words count
  const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically', 'literally', 'right', 'I mean'];
  const fillerRegex = new RegExp(`\\b(${fillerWords.join('|')})\\b`, 'gi');
  const fillerCount = (transcript.match(fillerRegex) || []).length;

  // Pauses: estimate by counting ellipses, dashes, or long spaces (for basic estimation)
  const pauseCount = (transcript.match(/(\.\.\.|--|\s{3,})/g) || []).length;

  return {
    paceWPM: Math.round(pace),
    fillerCount,
    pauseCount,
    wordCount: words,
    durationSeconds: Math.round(durationSeconds)
  };
}

module.exports = { transcribeAudioFile, getAudioDuration, calculateAudioMetrics }; 