#!/bin/bash

# Create SIP Trunk following LiveKit documentation
# https://docs.livekit.io/sip/quickstarts/configuring-twilio-trunk/

# Set your environment variables
export LIVEKIT_URL="wss://test-9m0bd0iw.livekit.cloud"
export LIVEKIT_API_KEY="APIWcyarhpX5Z3S"
export LIVEKIT_API_SECRET="********"  # Replace with your actual secret

# Create SIP Trunk
curl -X POST "$LIVEKIT_URL/twirp/livekit.SIPService/CreateSIPTrunk" \
  -H "Authorization: Bearer $(echo -n "$LIVEKIT_API_KEY:$LIVEKIT_API_SECRET" | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "sip_trunk_id": "twilio-trunk-1",
    "kind": "TRUNK_TWILIO",
    "twilio_config": {
      "account_sid": "YOUR_TWILIO_ACCOUNT_SID",
      "api_key_sid": "YOUR_TWILIO_API_KEY_SID", 
      "api_key_secret": "YOUR_TWILIO_API_KEY_SECRET"
    }
  }'