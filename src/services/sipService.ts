// SIP Service following LiveKit telephony documentation
import { Room, ConnectionState, RoomEvent, RemoteParticipant } from 'livekit-client';

export interface SipConfig {
  livekitUrl: string;
  token: string;
  roomName: string;
  phoneNumber?: string;
}

export class SipService {
  private room: Room | null = null;
  private eventHandlers: ((event: any) => void)[] = [];

  async startSipCall(config: SipConfig): Promise<void> {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.setupEventListeners();

      // Connect to LiveKit room (SIP integration handled server-side)
      await this.room.connect(config.livekitUrl, config.token);
      
      console.log('Connected to SIP-enabled LiveKit room:', config.roomName);
      
      // Enable microphone for SIP call
      await this.room.localParticipant.setMicrophoneEnabled(true);
      
      this.emit({ type: 'call_started', data: { phoneNumber: config.phoneNumber } });

    } catch (error) {
      console.error('Failed to start SIP call:', error);
      this.emit({ type: 'error', data: error });
      throw error;
    }
  }

  async endCall(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
      this.emit({ type: 'call_ended' });
      console.log('SIP call ended');
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
  }

  getConnectionState(): ConnectionState {
    return this.room?.state || ConnectionState.Disconnected;
  }

  isInCall(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  onEvent(handler: (event: any) => void): void {
    this.eventHandlers.push(handler);
  }

  removeEvent(handler: (event: any) => void): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  private setupEventListeners(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('SIP participant connected:', participant.identity);
      this.emit({ type: 'participant_connected', data: { participant } });

      // Auto-play audio from SIP participant
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          const audioElement = publication.track.attach();
          audioElement.play().catch(e => console.error('Failed to play SIP audio:', e));
        }
      });
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('SIP participant disconnected:', participant.identity);
      this.emit({ type: 'participant_disconnected', data: { participant } });
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from SIP room');
      this.emit({ type: 'call_ended' });
    });
  }

  private emit(event: any): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in SIP event handler:', error);
      }
    });
  }
}

// Generate LiveKit token for SIP calls (calls backend)
export async function generateSipToken(
  roomName: string, 
  participantName: string,
  phoneNumber?: string
): Promise<string> {
  try {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3002';
    
    const response = await fetch(`${backendUrl}/api/sip-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName,
        participantName,
        phoneNumber
      })
    });

    if (!response.ok) {
      throw new Error(`SIP token generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to generate SIP token:', error);
    throw error;
  }
}