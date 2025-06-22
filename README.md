# QuickCall - AI Phone Assistant

A beautiful, modern frontend interface for an AI phone call application that integrates [Letta](https://docs.letta.com/guides/voice/livekit) with LiveKit for stateful voice agents.

## 🌟 Features

- **Beautiful Dark Theme Interface** - Modern, sleek design optimized for professional use
- **Three-Column Layout**:
  - **Left Panel**: Agent management with real-time status indicators
  - **Main Panel**: Live conversation view with agent and caller messages  
  - **Right Panel**: Context editor and file management system
- **Real-time Agent Status** - Online, busy, and offline indicators
- **Live Call Monitoring** - Track active conversations with duration and status
- **Context Management** - Editable context for AI agent behavior
- **File Management** - Upload and manage files for agent context
- **Responsive Design** - Works beautifully on all screen sizes

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Accounts with:
  - [Letta Cloud](https://letta.com) or self-hosted Letta server
  - [LiveKit](https://livekit.io) for voice connections
  - [Deepgram](https://deepgram.com) for speech-to-text
  - [Cartesia](https://cartesia.ai) for text-to-speech

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd QuickCall
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_LETTA_API_KEY=your_letta_api_key
   REACT_APP_LIVEKIT_URL=wss://your-room.livekit.cloud
   REACT_APP_LIVEKIT_API_KEY=your_livekit_api_key
   REACT_APP_LIVEKIT_API_SECRET=your_livekit_api_secret
   REACT_APP_DEEPGRAM_API_KEY=your_deepgram_api_key
   REACT_APP_CARTESIA_API_KEY=your_cartesia_api_key
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to see the app

## 🎨 UI Overview

### Left Panel - Agent Management
- View all available AI agents
- Real-time status indicators (Online, Busy, Offline)
- Agent selection and creation
- Last active timestamps

### Main Panel - Conversation View
- Real-time chat history between agent and caller
- Visual distinction between agent (blue) and caller (green) messages
- Call status and duration tracking
- Live call indicators

### Right Panel - Control Center
- **Context Editor**: Modify AI agent behavior and instructions
- **File Management**: Upload documents, images, and other files for agent context
- Drag-and-drop file uploads
- File type icons and size information

## 🔧 Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom dark theme
- **Icons**: Lucide React
- **Backend Integration**: Axios for API calls
- **Voice**: LiveKit for real-time audio
- **AI**: Letta for stateful agents

## 🎯 Integration with Letta + LiveKit

This frontend is designed to work seamlessly with the [Letta voice integration](https://docs.letta.com/guides/voice/livekit). The backend should implement:

1. **Agent Management API**
   - `GET /api/agents` - List all agents
   - `POST /api/agents` - Create new agent
   - `PUT /api/agents/:id/context` - Update agent context

2. **Session Management API**
   - `GET /api/sessions/:agentId` - Get active session
   - `POST /api/sessions` - Start new session
   - `WebSocket` - Real-time message updates

3. **File Management API**
   - `POST /api/files` - Upload files
   - `DELETE /api/files/:id` - Delete files
   - `GET /api/files/:id/download` - Download files

## 🔮 Future Enhancements

- [ ] Real-time WebSocket integration
- [ ] Voice waveform visualization
- [ ] Call recording and playback
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Call scheduling and automation
- [ ] Integration with CRM systems

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions and support:
- Check the [Letta Documentation](https://docs.letta.com)
- Review [LiveKit Guides](https://docs.livekit.io)
- Open an issue in this repository

---

Built with ❤️ for the future of AI-powered communication
