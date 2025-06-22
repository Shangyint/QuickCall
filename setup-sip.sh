#!/bin/bash

echo "🚀 Setting up LiveKit SIP Integration..."

# Check if LiveKit CLI is available
if ! command -v lk &> /dev/null; then
    echo "❌ LiveKit CLI not found. Please install it first:"
    echo "curl -sSL https://get.livekit.io | bash"
    exit 1
fi

# Check if LiveKit is configured
if ! lk config show &> /dev/null; then
    echo "❌ LiveKit CLI not configured. Please run:"
    echo "lk config set url $LIVEKIT_WS_URL"
    echo "lk config set api-key $LIVEKIT_API_KEY" 
    echo "lk config set api-secret $LIVEKIT_API_SECRET"
    exit 1
fi

echo "✅ LiveKit CLI configured"

# Create dispatch rule for inbound calls
echo "📋 Creating dispatch rule for inbound calls..."
if lk sip dispatch create dispatch-rule.json; then
    echo "✅ Dispatch rule created successfully"
else
    echo "⚠️ Dispatch rule creation failed (might already exist)"
fi

# List existing SIP configuration
echo "📞 Current SIP configuration:"
echo ""
echo "Inbound trunks:"
lk sip inbound list || echo "No inbound trunks configured"

echo ""
echo "Outbound trunks:"
lk sip outbound list || echo "No outbound trunks configured"

echo ""
echo "Dispatch rules:"
lk sip dispatch list || echo "No dispatch rules configured"

echo ""
echo "🎉 SIP setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your SIP trunk provider (Twilio, Telnyx, etc.)"
echo "2. Create inbound trunk: lk sip inbound create inbound-trunk.json"
echo "3. Create outbound trunk: lk sip outbound create outbound-trunk.json"
echo "4. Get trunk ID: lk sip outbound list"
echo "5. Update .env.agent with: LIVEKIT_SIP_TRUNK_ID=ST_xxxx"