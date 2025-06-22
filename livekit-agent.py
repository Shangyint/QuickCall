import os
import json
import logging
import sys
import asyncio
from datetime import datetime

from dotenv import load_dotenv
from letta_client import Letta

from livekit import agents, api, rtc
from livekit.agents import AgentSession, Agent, AutoSubscribe, get_job_context, ChatMessage
from livekit.plugins import (
    openai,
    cartesia,
    deepgram,
)
load_dotenv()

# Create logs directory if it doesn't exist
logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Create a unique log file for this run
log_filename = os.path.join(logs_dir, f'livekit-agent-{datetime.now().strftime("%Y%m%d-%H%M%S")}.log')

# Configure logging with both file and console handlers
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.StreamHandler(sys.stderr),
        logging.FileHandler(log_filename, mode='a')
    ]
)
logger = logging.getLogger("telephony-agent")

# Also enable debug logging for LiveKit
logging.getLogger("livekit").setLevel(logging.DEBUG)
logging.getLogger("livekit.agents").setLevel(logging.DEBUG)

# Log startup information
logger.info(f"Logging to file: {log_filename}")
logger.info(f"Process PID: {os.getpid()}")
logger.info(f"Working directory: {os.getcwd()}")

async def hangup_call():
    """End the call by deleting the room"""
    ctx = get_job_context()
    if ctx is None:
        return
    
    await ctx.api.room.delete_room(
        api.DeleteRoomRequest(
            room=ctx.room.name,
        )
    )

async def entrypoint(ctx: agents.JobContext):
    logger.info("=" * 60)
    logger.info(f"AGENT STARTING at {datetime.now().isoformat()}")
    logger.info("=" * 60)
    
    # Log all environment variables related to our setup
    logger.info("Environment variables:")
    for key in ['LETTA_AGENT_ID', 'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'DEEPGRAM_API_KEY', 'CARTESIA_API_KEY']:
        value = os.environ.get(key)
        if key.endswith('KEY') and value:
            logger.info(f"  {key}: {'*' * 8}{value[-4:]}")
        else:
            logger.info(f"  {key}: {value}")
    
    # Get agent ID from environment variable first (set by server)
    agent_id = os.environ.get('LETTA_AGENT_ID')
    phone_number = None
    
    logger.info(f"Initial agent_id from env: {agent_id}")
    logger.info(f"Job metadata: {ctx.job.metadata}")
    logger.info(f"Room metadata: {ctx.room.metadata}")
    
    # If not in env, try job metadata
    if not agent_id and ctx.job.metadata:
        try:
            job_data = json.loads(ctx.job.metadata)
            agent_id = job_data.get("agent_id")
            phone_number = job_data.get("phone_number")
            logger.info(f"Parsed from job metadata - agent_id: {agent_id}, phone_number: {phone_number}")
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse job metadata: {e}")
    
    # Fallback: try to get agent ID from room metadata
    if not agent_id and ctx.room.metadata:
        try:
            room_data = json.loads(ctx.room.metadata) if isinstance(ctx.room.metadata, str) else ctx.room.metadata
            agent_id = room_data.get("agent_id")
            logger.info(f"Got agent_id from room metadata: {agent_id}")
        except Exception as e:
            logger.warning(f"Failed to parse room metadata: {e}")
    
    # Final fallback: use a default agent ID
    if not agent_id:
        agent_id = os.environ.get('DEFAULT_LETTA_AGENT_ID', 'agent-1d9ed6b1-6b72-44b3-b3c8-8bb0b70f6a9e')
        logger.warning(f"No agent ID found, using default: {agent_id}")
    
    logger.info(f"Final agent ID: {agent_id}")
    logger.info(f"Room name: {ctx.room.name}")
    logger.info(f"Room SID: {ctx.room.sid}")
    
    logger.info("Connecting to LiveKit room...")
    await ctx.connect()
    logger.info("Successfully connected to LiveKit room")

    # If phone number provided, place outbound call
    if phone_number:
        logger.info(f"Placing outbound call to {phone_number}")
        sip_participant_identity = phone_number
        
        try:
            # Get SIP trunk ID - you'll need to set this in environment
            sip_trunk_id = os.environ.get('LIVEKIT_SIP_TRUNK_ID')
            if not sip_trunk_id:
                logger.error("LIVEKIT_SIP_TRUNK_ID required for outbound calls")
                return
                
            await ctx.api.sip.create_sip_participant(api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,
                sip_trunk_id=sip_trunk_id,
                sip_call_to=phone_number,
                participant_identity=sip_participant_identity,
                wait_until_answered=True,
            ))
            
            logger.info("Outbound call connected successfully")
        except api.TwirpError as e:
            logger.error(f"Error creating SIP participant: {e.message}, "
                        f"SIP status: {e.metadata.get('sip_status_code')} "
                        f"{e.metadata.get('sip_status')}")
            ctx.shutdown()
            return
    
    # Initialize voice assistant session
    letta_base_url = 'http://localhost:8283/v1/voice-beta'
    
    # Add logging to debug
    logger.info(f"Initializing session with Letta base URL: {letta_base_url}")
    logger.info(f"Using Letta agent: {agent_id}")
    
    # Initialize API keys
    deepgram_key = os.environ.get('DEEPGRAM_API_KEY') or os.environ.get('REACT_APP_DEEPGRAM_API_KEY')
    cartesia_key = os.environ.get('CARTESIA_API_KEY') or os.environ.get('REACT_APP_CARTESIA_API_KEY')
    
    logger.info(f"Deepgram API key present: {bool(deepgram_key)}")
    logger.info(f"Cartesia API key present: {bool(cartesia_key)}")
    
    # Test Letta connection first
    logger.info(f"Testing Letta connection to {letta_base_url}...")
    try:
        import requests
        response = requests.get(f"{letta_base_url}/v1/agents/{agent_id}", timeout=5)
        logger.info(f"Letta agent test response: {response.status_code}")
        if response.status_code == 200:
            logger.info("✅ Letta agent is accessible")
        else:
            logger.warning(f"⚠️ Letta agent returned status {response.status_code}")
    except Exception as e:
        logger.error(f"❌ Cannot reach Letta: {e}")
    
    # Use Letta agent with the selected agent ID
    logger.info("Creating AgentSession with:")
    logger.info(f"  - LLM: Letta agent {agent_id}")
    logger.info("  - STT: Deepgram")
    logger.info("  - TTS: Cartesia")
    
    try:
        logger.info("Attempting to create LLM with Letta...")
        llm = openai.LLM.with_letta(
            agent_id=agent_id,
            base_url=letta_base_url
        )
        logger.info("✅ Letta LLM created successfully")
        
        session = AgentSession(
            llm=llm,
            stt=deepgram.STT(api_key=deepgram_key) if deepgram_key else deepgram.STT(),
            tts=cartesia.TTS(api_key=cartesia_key) if cartesia_key else cartesia.TTS(),
        )
        logger.info(f"✅ AgentSession created successfully with Letta agent: {agent_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to create AgentSession with Letta: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        logger.info("🔄 Falling back to regular OpenAI LLM...")
        
        # Fallback to regular OpenAI if Letta fails
        session = AgentSession(
            llm=openai.LLM(model="gpt-4o-mini"),
            stt=deepgram.STT(api_key=deepgram_key) if deepgram_key else deepgram.STT(),
            tts=cartesia.TTS(api_key=cartesia_key) if cartesia_key else cartesia.TTS(),
        )
        logger.info("✅ Fallback AgentSession created with OpenAI")

    logger.info("Connecting with auto_subscribe=AUDIO_ONLY...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info("Connected with audio subscription")
    
    logger.info("Starting agent session...")
    try:
        await session.start(
            room=ctx.room,
            agent=Agent(instructions="You are a helpful AI assistant. Be concise and friendly."),
        )
        logger.info("Agent session started successfully")
    except Exception as e:
        logger.error(f"Failed to start agent session: {e}")
        raise

    # For inbound calls, greet the caller
    # For outbound calls, greet the user when they answer
    logger.info("Preparing to send greeting...")
    if phone_number:
        # This is an outbound call
        greeting = "Hello! This is your AI assistant calling. I can hear you now. How can I help you today?"
        logger.info(f"Sending outbound greeting: {greeting}")
        try:
            session.say(greeting)
            logger.info(f"Outbound call greeting sent successfully to {phone_number}")
        except Exception as e:
            logger.error(f"Failed to send outbound greeting: {e}")
    else:
        # This is an inbound call
        greeting = "Hello, thank you for calling. How can I assist you today?"
        logger.info(f"Sending inbound greeting: {greeting}")
        try:
            session.say(greeting)
            logger.info("Inbound call greeting sent successfully")
        except Exception as e:
            logger.error(f"Failed to send inbound greeting: {e}")
    
    logger.info("Agent is now ready to handle conversation")
    
    # Log session events
    @session.on("agent_started")
    def on_agent_started(agent):
        logger.info("Agent started event fired")
    
    @session.on("agent_stopped") 
    def on_agent_stopped(reason):
        logger.info(f"Agent stopped event fired: {reason}")
    
    @session.on("track_published")
    def on_track_published(track):
        logger.info(f"Track published: {track.kind} - {track.sid}")

if __name__ == "__main__":
    # Print to ensure script is starting
    print(f"LIVEKIT AGENT STARTING AT {datetime.now().isoformat()}", flush=True)
    print(f"Log file: {log_filename}", flush=True)
    
    logger.info("="*80)
    logger.info("LIVEKIT AGENT STARTUP")
    logger.info("="*80)
    logger.info("Starting telephony agent application...")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Python executable: {sys.executable}")
    logger.info(f"LiveKit agents version: {agents.__version__ if hasattr(agents, '__version__') else 'unknown'}")
    logger.info(f"Command line args: {sys.argv}")
    
    # Log all environment variables
    logger.info("Environment variables:")
    for key, value in sorted(os.environ.items()):
        if any(sensitive in key.upper() for sensitive in ['KEY', 'SECRET', 'PASSWORD', 'TOKEN']):
            logger.info(f"  {key}: {'*' * 8}{value[-4:] if value else 'None'}")
        else:
            logger.info(f"  {key}: {value}")
    
    # Run with CLI commands (like "start", "dev", etc.)
    try:
        logger.info("About to start agents.cli.run_app...")
        agents.cli.run_app(agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="telephony-agent"
        ))
    except Exception as e:
        logger.error(f"Failed to start agent: {e}", exc_info=True)
        print(f"ERROR: Failed to start agent: {e}", flush=True)
        sys.exit(1)