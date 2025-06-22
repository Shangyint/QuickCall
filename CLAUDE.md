# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuickCall is a React-based frontend for an AI phone assistant application that integrates Letta (stateful AI agents) with LiveKit for voice communications. The app features a three-panel dark theme interface for managing AI agents, monitoring live conversations, and handling context/files.

## Development Commands

```bash
# Start development server
npm start

# Build for production  
npm run build

# Run tests
npm test

# Start CORS proxy (for Letta API development)
node cors-proxy.js
```

## Architecture

### Core Structure
- **Three-panel layout**: Agent management (left), chat history (center), context/files (right)
- **State management**: Single `AppState` object managing agents, sessions, context, and files
- **Mock data**: Currently uses mock data for agents, messages, and sessions
- **API integration**: Letta API service for agent creation/management

### Key Components
- `App.tsx` - Main application with centralized state management
- `AgentList` - Agent selection and creation interface
- `ChatHistory` - Real-time conversation display
- `StatusPanel` - Context editor and file management
- `CreateAgentModal` - Modal for creating new Letta agents

### Services & Types
- `lettaApi.ts` - Letta API integration with axios (agents CRUD operations)
- `types/index.ts` - TypeScript definitions for Agent, Message, ChatSession, FileItem
- CORS proxy at `cors-proxy.js` for development (proxies localhost:8283 → 8284)

## Technology Stack

- **React 18** with TypeScript and strict mode
- **Tailwind CSS** with custom dark theme (`dark-50` color scheme)
- **Lucide React** for icons
- **Axios** for HTTP requests
- **Headless UI** for accessible components

## Environment Variables

Required `.env` variables:
```
REACT_APP_LETTA_API_KEY=your_letta_api_key
REACT_APP_LETTA_API_URL=http://localhost:8284
REACT_APP_LIVEKIT_URL=wss://your-room.livekit.cloud
REACT_APP_LIVEKIT_API_KEY=your_livekit_api_key
REACT_APP_LIVEKIT_API_SECRET=your_livekit_api_secret
REACT_APP_DEEPGRAM_API_KEY=your_deepgram_api_key
REACT_APP_CARTESIA_API_KEY=your_cartesia_api_key
```

## Integration Points

### Letta API Integration
- Agent creation with persona/human memory blocks
- Uses OpenAI GPT-4o-mini model and text-embedding-3-small
- Error handling with detailed axios error reporting
- Base URL configurable via environment variable

### Expected Backend APIs
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id/context` - Update context
- `GET /api/sessions/:agentId` - Get session
- `POST /api/sessions` - Start session
- WebSocket for real-time message updates
- File management endpoints for upload/download/delete

## Current Implementation Status

### Implemented
- Agent list with status indicators (online/busy/offline)
- Agent creation via Letta API
- Context editing interface
- File upload/management UI
- Mock chat history display
- Responsive three-panel layout

### Mock/Placeholder
- Chat sessions and messages (uses mock data)
- Real-time WebSocket connections
- File upload/download functionality
- Live call status and duration tracking

## Development Notes

- Uses React 18 concurrent features and hooks
- All state managed in App.tsx with useCallback for performance
- TypeScript strict mode enabled
- ESLint configured with react-app rules
- Custom Tailwind theme with dark color palette