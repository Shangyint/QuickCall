# LiveKit Telephony Setup Guide

This guide explains how to set up LiveKit telephony integration for real phone calls using SIP trunks.

## Overview

LiveKit telephony enables your AI agents to make and receive real phone calls through SIP (Session Initiation Protocol) integration. This requires:

1. **SIP Provider** (Twilio, Plivo, etc.)
2. **LiveKit Server** with telephony support
3. **Server-side token generation**
4. **Webhook endpoints** for call events

## 1. Choose a SIP Provider

### Recommended Providers:

- **Twilio** - Most popular, great documentation
- **Plivo** - Cost-effective alternative
- **Vonage** - Enterprise-grade
- **Bandwidth** - Direct carrier connectivity

### Twilio Setup (Recommended):

1. **Create Twilio Account**: https://console.twilio.com
2. **Purchase a phone number** in Console → Phone Numbers
3. **Get SIP credentials** from Console → Voice → SIP

## 2. Configure LiveKit Server

### Option A: LiveKit Cloud (Easiest)

1. **Enable telephony** in your LiveKit Cloud project:
   ```
   Project Settings → Features → Enable Telephony
   ```

2. **Add SIP trunk configuration**:
   ```json
   {
     "sip_trunk_id": "your-trunk-id",
     "provider": "twilio",
     "credentials": {
       "account_sid": "your-twilio-account-sid",
       "auth_token": "your-twilio-auth-token"
     },
     "numbers": ["+15551234567"]
   }
   ```

### Option B: Self-hosted LiveKit

1. **Install LiveKit Server** with telephony support:
   ```bash
   # Download from https://github.com/livekit/livekit
   # Enable SIP in config.yaml
   sip:
     inbound_username: "your-username"
     inbound_password: "your-password" 
     outbound_username: "your-username"
     outbound_password: "your-password"
   ```

## 3. Server-side Token Generation

Create an API endpoint to generate LiveKit tokens with telephony permissions:

### Node.js Example:

```javascript
const { AccessToken } = require('livekit-server-sdk');

app.post('/api/telephony-token', async (req, res) => {
  const { roomName, participantName, phoneNumber } = req.body;
  
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantName,
      ttl: '1h',
    }
  );
  
  // Grant telephony permissions
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    // Telephony-specific permissions
    canPublishData: true,
    hidden: false,
  });
  
  res.json({ token: token.toJwt() });
});
```

### Python Example:

```python
from livekit import api

def generate_telephony_token(room_name, participant_name, phone_number=None):
    token = api.AccessToken(
        api_key=os.getenv('LIVEKIT_API_KEY'),
        api_secret=os.getenv('LIVEKIT_API_SECRET')
    )
    
    token.with_identity(participant_name)
    token.with_ttl(timedelta(hours=1))
    token.with_grants(api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True
    ))
    
    return token.to_jwt()
```

## 4. Update Frontend Configuration

Update your frontend to use the server-generated tokens:

```typescript
// In your telephonyService.ts
export async function generateTelephonyToken(
  roomName: string, 
  participantName: string,
  phoneNumber?: string
): Promise<string> {
  const response = await fetch('/api/telephony-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName,
      participantName,
      phoneNumber
    })
  });
  
  const { token } = await response.json();
  return token;
}
```

## 5. SIP Trunk Configuration

### Twilio SIP Configuration:

1. **Create SIP Domain**: Console → Voice → SIP → Domains
   ```
   Domain: your-app.sip.twilio.com
   ```

2. **Configure Authentication**:
   ```
   Username/Password: Set credentials for your app
   ```

3. **Set Webhook URLs**:
   ```
   Voice URL: https://your-livekit-server.com/sip/inbound
   ```

### LiveKit SIP Integration:

```yaml
# config.yaml
sip:
  enabled: true
  inbound:
    # Twilio will send calls here
    listen_port: 5060
    username: "your-sip-username"
    password: "your-sip-password"
  outbound:
    # For making outbound calls
    proxy: "your-provider.sip.com:5060"
    username: "your-outbound-username"
    password: "your-outbound-password"
```

## 6. Webhook Setup

Set up webhooks to handle call events:

```javascript
// Webhook endpoint for call events
app.post('/webhook/call-events', (req, res) => {
  const { event, roomName, participantId, sipCallId } = req.body;
  
  switch (event) {
    case 'sip_call_started':
      console.log(`Call started in room ${roomName}`);
      // Update your database, notify frontend, etc.
      break;
      
    case 'sip_call_ended':
      console.log(`Call ended in room ${roomName}`);
      // Clean up, save call data, etc.
      break;
      
    case 'participant_joined':
      console.log(`Participant ${participantId} joined`);
      // Start your AI agent logic
      break;
  }
  
  res.status(200).send('OK');
});
```

## 7. Environment Variables

Update your `.env` file:

```env
# LiveKit Configuration
REACT_APP_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
REACT_APP_LIVEKIT_API_KEY=your_api_key
REACT_APP_LIVEKIT_API_SECRET=your_api_secret

# SIP Provider (Twilio example)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+15551234567

# Backend API
REACT_APP_BACKEND_URL=http://localhost:3001
```

## 8. Testing the Setup

### Test Outbound Calls:

1. Use your app to dial a phone number
2. Check LiveKit logs for SIP connectivity
3. Verify audio quality and connection

### Test Inbound Calls:

1. Call your Twilio number
2. Verify call routes to LiveKit
3. Check that your agent responds

### Debugging Commands:

```bash
# Check LiveKit logs
docker logs livekit-server

# Test SIP connectivity
sip-test-tool --target your-provider.sip.com:5060

# Verify webhook delivery
curl -X POST https://your-app.com/webhook/test
```

## 9. Production Considerations

### Security:
- Use HTTPS for all webhooks
- Validate webhook signatures
- Rotate API credentials regularly

### Scalability:
- Use LiveKit Cloud for auto-scaling
- Implement proper error handling
- Monitor call quality metrics

### Monitoring:
- Set up alerts for failed calls
- Track call duration and quality
- Monitor SIP trunk capacity

## Common Issues & Solutions

### "Token generation failed":
- Verify API keys are correct
- Check token permissions include telephony
- Ensure server endpoint is accessible

### "SIP connection failed":
- Verify SIP credentials with provider
- Check firewall settings (port 5060)
- Test SIP connectivity directly

### "No audio in calls":
- Check microphone permissions
- Verify codec compatibility
- Test with different browsers

## Next Steps

1. **Implement the server-side token generation**
2. **Configure your SIP provider**
3. **Test with a simple phone call**
4. **Add error handling and monitoring**
5. **Scale for production use**

For more details, see:
- [LiveKit Telephony Docs](https://docs.livekit.io/agents/start/telephony/)
- [Twilio SIP Documentation](https://www.twilio.com/docs/voice/sip)
- [LiveKit Server SDK](https://github.com/livekit/server-sdk-js)