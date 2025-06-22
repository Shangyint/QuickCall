const express = require('express');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
// Load environment variables from parent directory and current directory
require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Environment variables
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || process.env.REACT_APP_LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || process.env.REACT_APP_LIVEKIT_API_SECRET;
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL || process.env.REACT_APP_LIVEKIT_URL;

console.log('LiveKit credentials loaded:');
console.log('API Key:', LIVEKIT_API_KEY);
console.log('Secret length:', LIVEKIT_API_SECRET?.length);
console.log('WS URL:', LIVEKIT_WS_URL);

// Initialize LiveKit Room Service Client
const roomService = new RoomServiceClient(LIVEKIT_WS_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// Generate LiveKit token for telephony
async function generateLiveKitToken(roomName, participantName, phoneNumber) {
  console.log('Generating token with:', { roomName, participantName, phoneNumber });
  console.log('Using API key:', LIVEKIT_API_KEY);
  
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit API credentials not configured');
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
    ttl: '10m', // Token expires in 10 minutes
  });

  at.addGrant({ 
    roomJoin: true, 
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  const jwt = await at.toJwt();
  console.log('Generated JWT token:', jwt ? 'Success' : 'Failed');
  console.log('JWT type:', typeof jwt, 'length:', jwt?.length);
  
  if (typeof jwt === 'string' && jwt.length > 0) {
    return jwt;
  } else {
    throw new Error('Failed to generate valid JWT token');
  }
}


// Note: Inbound calls are now handled by LiveKit SIP trunks
// and dispatch rules, not direct Twilio webhooks

// API endpoint to generate LiveKit tokens for frontend
app.post('/api/livekit-token', async (req, res) => {
  try {
    const { roomName, participantName, phoneNumber } = req.body;
    console.log('Token request received:', { roomName, participantName, phoneNumber });
    
    if (!roomName || !participantName) {
      return res.status(400).json({ 
        error: 'roomName and participantName are required' 
      });
    }
    
    const token = await generateLiveKitToken(roomName, participantName, phoneNumber);
    console.log('Token generated, type:', typeof token, 'length:', token?.length);
    
    res.json({ 
      token,
      wsUrl: LIVEKIT_WS_URL,
      roomName,
      participantName
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
});

// API endpoint to make outbound calls via LiveKit SIP
app.post('/api/make-call', async (req, res) => {
  try {
    const { to, agentId } = req.body;
    
    if (!to || !agentId) {
      return res.status(400).json({ 
        error: 'Phone number and agentId are required' 
      });
    }
    
    // Ensure phone number is in E.164 format
    const phoneNumber = to.startsWith('+') ? to : `+1${to}`;
    
    
    // Create a unique room for this outbound call
    const roomName = `outbound-${agentId}-${Date.now()}`;
    
    // Check if LiveKit is configured
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(503).json({ 
        error: 'LiveKit not configured - demo mode only' 
      });
    }

    // Create the room first with agent metadata
    const room = await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 2,
      metadata: JSON.stringify({
        agent_id: agentId,
        phone_number: phoneNumber
      })
    });


    // First, start the Letta agent for this specific call
    const agentScript = path.join(__dirname, '../livekit-agent.py');
    
    console.log(`🤖 Starting agent for agent ID: ${agentId}`);
    console.log(`📍 Agent script path: ${agentScript}`);
    console.log(`🏠 Room name: ${roomName}`);
    console.log(`🔑 Environment variables:`);
    console.log(`   - LIVEKIT_URL: ${LIVEKIT_WS_URL}`);
    console.log(`   - LIVEKIT_API_KEY: ${LIVEKIT_API_KEY}`);
    console.log(`   - LETTA_AGENT_ID: ${agentId}`);
    
    // Create logs directory and file for agent output
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
    const agentLogFile = path.join(logsDir, `agent-${roomName}-${timestamp}.log`);
    const agentLogStream = fs.createWriteStream(agentLogFile, { flags: 'a' });
    
    console.log(`📝 Agent log file: ${agentLogFile}`);
    agentLogStream.write(`=== Agent Process Starting ===\n`);
    agentLogStream.write(`Timestamp: ${new Date().toISOString()}\n`);
    agentLogStream.write(`Room: ${roomName}\n`);
    agentLogStream.write(`Agent ID: ${agentId}\n`);
    agentLogStream.write(`Command: conda run -n letta python ${agentScript} connect --room ${roomName}\n\n`);
    
    // Get OpenAI API key to use as Letta API key
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY || '';
    
    if (!openaiApiKey) {
      console.log('⚠️  WARNING: No OpenAI API key found. Letta integration will fail!');
      console.log('   Set OPENAI_API_KEY or REACT_APP_OPENAI_API_KEY in your .env file');
    }
    
    const agentProcess = spawn('conda', ['run', '-n', 'letta', 'python', agentScript, 'connect', '--room', roomName], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LIVEKIT_URL: LIVEKIT_WS_URL,
        LIVEKIT_API_KEY: LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: LIVEKIT_API_SECRET,
        LIVEKIT_SIP_TRUNK_ID: 'ST_LgQdMYv7NnfA',
        LETTA_AGENT_ID: agentId,  // Pass the agent ID directly
        LETTA_API_KEY: openaiApiKey,  // Use OpenAI API key as Letta API key
        OPENAI_API_KEY: openaiApiKey,  // Also pass it as OpenAI API key
        PYTHONUNBUFFERED: '1',  // Force Python to flush output immediately
        LIVEKIT_LOG_LEVEL: 'debug'  // Enable debug logging
      }
    });

    let agentOutput = '';
    let agentError = '';

    agentProcess.stdout.on('data', (data) => {
      const text = data.toString();
      agentOutput += text;
      agentLogStream.write(`[STDOUT] ${text}`);
      
      const lines = text.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`🤖 [AGENT STDOUT]: ${line}`);
      });
    });

    agentProcess.stderr.on('data', (data) => {
      const text = data.toString();
      agentError += text;
      agentLogStream.write(`[STDERR] ${text}`);
      
      const lines = text.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`🤖 [AGENT STDERR]: ${line}`);
      });
    });

    agentProcess.on('error', (error) => {
      const errorMsg = `Failed to start agent process: ${error.message}`;
      console.error(errorMsg);
      agentLogStream.write(`[ERROR] ${errorMsg}\n`);
      agentLogStream.write(`[ERROR] Stack trace: ${error.stack}\n`);
    });

    agentProcess.on('close', (code) => {
      console.log(`🤖 [AGENT EXIT]: Process exited with code ${code}`);
      agentLogStream.write(`\n=== Agent Process Exited ===\n`);
      agentLogStream.write(`Exit code: ${code}\n`);
      agentLogStream.write(`Timestamp: ${new Date().toISOString()}\n`);
      
      if (code !== 0) {
        console.log(`❌ Agent failed with exit code ${code}`);
        console.log(`📄 Check full logs at: ${agentLogFile}`);
        
        if (agentOutput) {
          console.log(`📄 Full agent output:\n${agentOutput}`);
        }
        if (agentError) {
          console.log(`❌ Full agent error:\n${agentError}`);
        }
      }
    });

    // Wait a moment for agent to start, then create SIP participant
    setTimeout(() => {
      console.log(`📞 Creating SIP call to ${phoneNumber}`);
      const dispatchProcess = spawn('lk', [
        'sip', 'participant', 'create',
        '--room', roomName,
        '--trunk', 'ST_LgQdMYv7NnfA',
        '--call', phoneNumber,
        '--identity', `sip-${Date.now()}`
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          LIVEKIT_URL: LIVEKIT_WS_URL,
          LIVEKIT_API_KEY: LIVEKIT_API_KEY,
          LIVEKIT_API_SECRET: LIVEKIT_API_SECRET
        }
      });

      let output = '';
      let error = '';

      dispatchProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      dispatchProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      dispatchProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Outbound call created to: ${phoneNumber}`);
          console.log(`📞 SIP participant created successfully`);
          console.log(`🔗 Room: ${roomName}`);
          res.json({
            roomName,
            status: 'dispatched',
            phoneNumber: phoneNumber,
            agentId: agentId
          });
        } else {
          console.error(`❌ SIP call failed with code ${code}`);
          console.error(`📝 SIP Error output: ${error}`);
          console.error(`📝 SIP Standard output: ${output}`);
          agentProcess.kill(); // Kill the agent if SIP call fails
          res.status(500).json({ error: `SIP call failed: ${error || 'Unknown error'}` });
        }
      });
    }, 2000); // Wait 2 seconds for agent to initialize



  } catch (error) {
    console.error('Error making call:', error);
    res.status(500).json({ error: 'Failed to make call' });
  }
});

// API endpoint to end a call
app.post('/api/end-call', (req, res) => {
  const { phoneNumber, agentId } = req.body;
  console.log(`📞 Call ended: ${phoneNumber}`);
  res.json({ success: true, phoneNumber });
});

// Note: Outbound calls are now handled by LiveKit SIP participants
// created via the agent dispatch system

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`QuickCall server running on port ${PORT}`);
  console.log(`LiveKit token endpoint: http://localhost:${PORT}/api/livekit-token`);
  console.log(`Make call endpoint: http://localhost:${PORT}/api/make-call`);
});

module.exports = app;