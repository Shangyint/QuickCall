# LiveKit SIP Telephony Setup

This guide explains how to set up the correct telephony integration using LiveKit SIP trunks instead of direct Twilio integration.

## Overview

The integration now follows LiveKit's recommended approach:
- **SIP Trunks**: Handle inbound/outbound telephony routing
- **Agent Dispatch**: Routes calls to named agents using dispatch rules
- **SIP Participants**: Created programmatically for outbound calls

## Prerequisites

1. **LiveKit Cloud Account** with SIP features enabled
2. **LiveKit CLI** installed and configured
3. **SIP Trunk Provider** (Twilio, Telnyx, etc.)

## Setup Steps

### 1. Configure SIP Trunks

#### Inbound Trunk
```bash
# Create inbound trunk configuration
lk sip inbound create inbound-trunk.json
```

#### Outbound Trunk  
```bash
# Create outbound trunk configuration
lk sip outbound create outbound-trunk.json
```

### 2. Set up Agent Dispatch Rules

```bash
# Create dispatch rule for inbound calls
lk sip dispatch create dispatch-rule.json
```

This routes all inbound calls to new rooms with the "telephony-agent".

### 3. Configure Environment Variables

Update `.env.agent` with your SIP trunk ID:
```bash
# Get your SIP trunk ID
lk sip outbound list

# Add to .env.agent
LIVEKIT_SIP_TRUNK_ID=ST_your_trunk_id
```

### 4. Start the Agent

The agent now uses explicit dispatch:
```bash
python livekit-agent.py
```

## How It Works

### Inbound Calls
1. SIP trunk receives call
2. Dispatch rule creates new room with prefix "call-"
3. Agent automatically joins room
4. Agent greets caller

### Outbound Calls
1. Frontend triggers `/api/make-call`
2. Server creates room and dispatches agent with phone number metadata
3. Agent places SIP call using `create_sip_participant`
4. Call connects when answered

## Key Differences from Previous Approach

- ❌ **Old**: Direct Twilio webhooks and TwiML
- ✅ **New**: LiveKit SIP trunks with agent dispatch

- ❌ **Old**: Manual Twilio media streaming setup  
- ✅ **New**: Automatic SIP participant creation

- ❌ **Old**: Complex webhook routing
- ✅ **New**: Simple dispatch rules

## Testing

1. **Start agent**: `python livekit-agent.py` 
2. **Inbound**: Call your SIP trunk number
3. **Outbound**: Use frontend "Start Call" button

## Troubleshooting

- **No inbound calls**: Check dispatch rules with `lk sip dispatch list`
- **Outbound fails**: Verify SIP trunk ID in environment
- **Agent not dispatching**: Ensure agent name matches dispatch rule

## Next Steps

1. Configure your SIP trunk provider
2. Test inbound calling
3. Set up outbound trunk for outbound calling
4. Configure phone numbers and routing rules