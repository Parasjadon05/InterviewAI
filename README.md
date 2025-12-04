# 🎯 InterviewAI - AI-Powered Interview Practice Platform

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)

AI-powered interview practice platform that generates role-specific questions and provides comprehensive feedback to help job seekers ace their interviews.

## 🌟 Features

### 🤖 AI-Powered Interview Generation
- **Smart Question Generation**: AI generates role-specific interview questions using Google's Generative AI
- **Resume Analysis**: Upload your resume for personalized question generation
- **Multiple Role Support**: Software Engineer, Data Scientist, Product Manager, and more

### 🎥 Interactive Interview Sessions
- **Video/Audio Recording**: Record practice sessions for review
- **Real-time Transcription**: Speech-to-text with feedback generation
- **AI Feedback**: Detailed analysis of responses
- **Progress Tracking**: Historical data and improvement metrics

### 📊 Comprehensive Analytics
- **Performance Dashboard**: Visual analytics of interview performance
- **Audio Metrics**: Speaking pace, filler words, pause analysis
- **PDF Reports**: Exportable detailed feedback reports
- **Historical Tracking**: View past interviews and improvement trends

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** + **shadcn/ui** for modern UI
- **React Query** for state management
- **React Router** for navigation

### Backend
- **Node.js** with Express
- **Google Generative AI** for question generation
- **FFmpeg** for audio processing
- **Multer** for file uploads
- **PDF parsing** for resume analysis

### Audio Processing
- **WebRTC**: Real-time audio recording
- **AssemblyAI**: Speech-to-text transcription
- **Audio Analysis**: Speaking pace, filler words, pause detection

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Modern browser with camera/microphone access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Parasjadon05/InterviewAI.git
   cd InterviewAI
   ```

2. **Install dependencies**
   ```bash
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create environment file in server directory
   cd server
   cp .env.example .env
   
   # Add your API keys to .env:
   GOOGLE_API_KEY=your_google_generative_ai_api_key
   PORT=3001
   ```

4. **Start the development servers**
   ```bash
   # Terminal 1: Start the server
   cd server
   npm run dev
   
   # Terminal 2: Start the client (new terminal)
   cd client
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📱 Usage

1. **Select Role**: Choose your target interview role (Software Engineer, Data Scientist, etc.)
2. **Upload Resume** (Optional): Upload your resume for personalized questions
3. **Start Interview**: Enable camera/microphone for recording
4. **Practice**: Answer AI-generated questions
5. **Review**: Get detailed feedback on responses and audio metrics
6. **Improve**: Track progress over multiple sessions

## 🔬 Audio Analysis Details

### Speech Transcription
- Real-time audio recording and transcription using AssemblyAI
- High-accuracy speech-to-text conversion
- Support for multiple audio formats

### Speaking Metrics
- **Speaking Pace**: Words per minute analysis
- **Filler Words**: Detection of "um", "uh", "like", etc.
- **Pause Analysis**: Identification of speaking pauses
- **Duration Tracking**: Total speaking time per question

### Audio Quality
- Automatic audio format conversion
- Noise reduction and audio enhancement
- Support for various microphone types

## 📁 Project Structure

```
InterviewAI/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   ├── lib/            # Utilities and config
│   │   └── utils/          # Helper functions
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── services/       # Business logic services
│   │   └── index.js        # Main server file
│   ├── uploads/            # File upload directory
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server` directory:

```env
# Google Generative AI
GOOGLE_API_KEY=your_google_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Optional: Appwrite Configuration (for user authentication)
APPWRITE_ENDPOINT=your_appwrite_endpoint
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
```

### API Keys Setup

1. **Google Generative AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Appwrite** (Optional): Set up at [Appwrite Cloud](https://cloud.appwrite.io/) for user authentication

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for computer vision capabilities
- [Google Generative AI](https://ai.google.dev/) for intelligent question generation
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [TensorFlow.js](https://www.tensorflow.org/js) for machine learning in the browser

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the [documentation](https://github.com/Parasjadon05/InterviewAI/wiki)
- Contact: [Your Contact Information]

---

**Made with ❤️ for better interview preparation**
