#!/bin/bash

# Activate conda environment for Letta
echo "Activating conda environment: letta"
source ~/miniconda3/etc/profile.d/conda.sh
conda activate letta

# Check if required packages are installed
echo "Checking Python dependencies..."
python -c "import livekit, letta_client" 2>/dev/null || {
    echo "Installing required packages..."
    pip install -r requirements.txt
}

# Set environment variables from .env.agent
if [ -f ".env.agent" ]; then
    echo "Loading environment variables from .env.agent"
    export $(cat .env.agent | grep -v '^#' | xargs)
else
    echo "Warning: .env.agent file not found"
fi

# Run the LiveKit agent
echo "Starting LiveKit agent..."
python livekit-agent.py