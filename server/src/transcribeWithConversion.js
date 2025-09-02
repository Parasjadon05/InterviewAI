const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { transcribeAudioFile, getAudioDuration, calculateAudioMetrics } = require('./services/transcriptionService');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function convertWebmToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

async function transcribeWebmWithConversion(webmPath) {
  const wavPath = webmPath + '.wav'; // Always a new file
  await convertWebmToWav(webmPath, wavPath);
  const duration = await getAudioDuration(wavPath);
  const transcript = await transcribeAudioFile(wavPath);
  const metrics = calculateAudioMetrics(transcript, duration);
  fs.unlinkSync(webmPath);
  fs.unlinkSync(wavPath);
  return { transcript, metrics };
}

module.exports = { transcribeWebmWithConversion }; 