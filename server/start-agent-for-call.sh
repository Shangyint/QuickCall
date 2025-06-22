#!/bin/bash

# Script to start LiveKit agent for a specific agent
# Usage: ./start-agent-for-call.sh <agent_id>

AGENT_ID=$1

if [ -z "$AGENT_ID" ]; then
    echo "Usage: $0 <agent_id>"
    exit 1
fi

echo "Starting LiveKit agent for agent: $AGENT_ID"

# Activate conda environment (try different conda paths)
if [ -f ~/miniconda3/etc/profile.d/conda.sh ]; then
    source ~/miniconda3/etc/profile.d/conda.sh
elif [ -f ~/anaconda3/etc/profile.d/conda.sh ]; then
    source ~/anaconda3/etc/profile.d/conda.sh
elif [ -f /opt/homebrew/Caskroom/miniconda/base/etc/profile.d/conda.sh ]; then
    source /opt/homebrew/Caskroom/miniconda/base/etc/profile.d/conda.sh
else
    echo "❌ Conda not found - using system Python"
fi

# Try to activate letta environment
if command -v conda > /dev/null 2>&1; then
    conda activate letta
    echo "✅ Activated conda environment: letta"
else
    echo "⚠️ Conda not available - using system Python"
fi

# Set environment variables for this specific agent
export LETTA_AGENT_ID="$AGENT_ID"

# Load environment variables from .env.agent
if [ -f "../.env.agent" ]; then
    export $(cat ../.env.agent | grep -v '^#' | xargs)
fi

# Change to project root and run the agent
cd ..
python livekit-agent.py