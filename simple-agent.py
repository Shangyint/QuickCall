#!/usr/bin/env python3

import os
import json
import logging
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, AutoSubscribe

# Just for testing - use a simple TTS
from livekit.plugins import openai, cartesia, deepgram

load_dotenv()

logger = logging.getLogger("simple-agent")

async def entrypoint(ctx: agents.JobContext):
    logger.info(f"Agent joining room: {ctx.room.name}")
    
    await ctx.connect()
    
    # Initialize a simple session for testing
    session = AgentSession(
        llm=openai.LLM(),  # Simple OpenAI LLM
        stt=deepgram.STT(),
        tts=cartesia.TTS(),
    )

    await session.start(
        room=ctx.room,
        agent=Agent(instructions="You are a helpful AI assistant. Keep responses short and conversational."),
    )

    # Always greet when joining
    session.say("Hello! I'm your AI assistant. I can hear you now. How can I help you?")
    logger.info(f"Agent greeted caller in room {ctx.room.name}")

if __name__ == "__main__":
    # Run as a persistent worker
    agents.cli.run_app(agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="telephony-agent"
    ))