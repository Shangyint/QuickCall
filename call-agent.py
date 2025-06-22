#!/usr/bin/env python3

import os
import sys
import json
import logging

from dotenv import load_dotenv
from letta_client import Letta

from livekit import agents, api
from livekit.agents import AgentSession, Agent, AutoSubscribe, get_job_context
from livekit.plugins import (
    openai,
    cartesia,
    deepgram,
)

load_dotenv()

logger = logging.getLogger("quickcall-agent")

# Global variables set from command line
AGENT_ID = None
ROOM_NAME = None
PHONE_NUMBER = None

async def entrypoint(ctx: agents.JobContext):
    global AGENT_ID, ROOM_NAME, PHONE_NUMBER
    
    logger.info(f"Starting telephony agent for Letta agent: {AGENT_ID}")
    logger.info(f"Room: {ROOM_NAME}, Phone: {PHONE_NUMBER}")
    
    await ctx.connect()

    # Initialize voice assistant session
    session = AgentSession(
        llm=openai.LLM.with_letta(
            agent_id=AGENT_ID,
        ),
        stt=deepgram.STT(),
        tts=cartesia.TTS(),
    )

    await session.start(
        room=ctx.room,
        agent=Agent(instructions=""), # instructions should be set in the Letta agent
    )

    # Greet the caller when connected
    if PHONE_NUMBER:
        # This is an outbound call
        session.say("Hello! This is your AI assistant calling. I can hear you now. How can I help you today?")
        logger.info(f"Outbound call connected - greeted caller at {PHONE_NUMBER}")
    else:
        # This is an inbound call
        session.say("Hello, thank you for calling. How can I assist you today?")
        logger.info("Inbound call connected - greeted caller")
    
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) != 4:
        print("Usage: python call-agent.py <agent_id> <room_name> <phone_number>")
        sys.exit(1)
    
    # Set global variables
    AGENT_ID = sys.argv[1]
    ROOM_NAME = sys.argv[2]  
    PHONE_NUMBER = sys.argv[3]
    
    print(f"Using Letta agent: {AGENT_ID}")
    print(f"Room: {ROOM_NAME}")
    print(f"Phone: {PHONE_NUMBER}")
    
    # Use CLI but run in connect mode to connect to specific room
    import asyncio
    
    # Set environment variable for room to connect to
    os.environ['LIVEKIT_ROOM'] = ROOM_NAME
    
    # Run the CLI with connect command to join the specific room
    sys.argv = ['call-agent.py', 'connect', '--room', ROOM_NAME]
    
    agents.cli.run_app(agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="telephony-agent"
    ))