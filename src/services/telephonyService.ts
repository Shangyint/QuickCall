import { Room, ConnectionState, RoomEvent, RemoteParticipant } from 'livekit-client';

export interface TelephonyConfig {
  livekitUrl: string;
  token: string;
  roomName: string;
  phoneNumber?: string;
}

export interface CallEvent {
  type: 'participant_connected' | 'participant_disconnected' | 'call_started' | 'call_ended' | 'error';
  data?: any;
}

export class TelephonyService {
  private room: Room | null = null;
  private eventHandlers: ((event: CallEvent) => void)[] = [];

  constructor() {
    // Initialize telephony service
  }

  /**
   * Start an outbound call to a phone number
   */
  async startOutboundCall(config: TelephonyConfig): Promise<void> {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.setupEventListeners();

      // Connect to LiveKit room
      await this.room.connect(config.livekitUrl, config.token);
      
      // Enable local microphone for two-way audio
      await this.room.localParticipant.setMicrophoneEnabled(true);
      
      // For telephony, LiveKit uses SIP integration
      // The actual phone call will be handled by the LiveKit server with SIP trunk
      console.log('Connected to telephony room:', config.roomName);
      console.log('Local microphone enabled:', this.room.localParticipant.isMicrophoneEnabled);
      
      if (config.phoneNumber) {
        // In a real implementation, this would trigger the SIP call via LiveKit's telephony API
        // For now, we'll simulate the call setup
        this.emit({ type: 'call_started', data: { phoneNumber: config.phoneNumber } });
      }

    } catch (error) {
      console.error('Failed to start outbound call:', error);
      this.emit({ type: 'error', data: error });
      throw error;
    }
  }

  /**
   * Handle incoming call (when auto-receive is enabled)
   */
  async handleIncomingCall(config: TelephonyConfig): Promise<void> {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.setupEventListeners();
      await this.room.connect(config.livekitUrl, config.token);

      console.log('Ready to receive incoming calls on room:', config.roomName);
      this.emit({ type: 'call_started', data: { incoming: true } });

    } catch (error) {
      console.error('Failed to setup incoming call handler:', error);
      this.emit({ type: 'error', data: error });
      throw error;
    }
  }

  /**
   * End the current call
   */
  async endCall(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
      this.emit({ type: 'call_ended' });
      console.log('Call ended');
    }
  }

  /**
   * Enable/disable microphone
   */
  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.room?.state || ConnectionState.Disconnected;
  }

  /**
   * Check if currently in a call
   */
  isInCall(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  /**
   * Add event listener
   */
  onEvent(handler: (event: CallEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event listener
   */
  removeEvent(handler: (event: CallEvent) => void): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  private setupEventListeners(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected to call:', participant.identity);
      this.emit({ type: 'participant_connected', data: { participant } });

      // Auto-subscribe to audio tracks for telephony
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          const audioElement = publication.track.attach();
          document.body.appendChild(audioElement); // Ensure audio element is in DOM
          audioElement.play().catch(e => console.error('Failed to play audio:', e));
        }
      });

      // Handle tracks that are published after connection
      participant.on('trackPublished', (publication) => {
        console.log('Track published:', publication.trackName, publication.kind);
        if (publication.kind === 'audio') {
          publication.setSubscribed(true);
        }
      });

      participant.on('trackSubscribed', (track, publication) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        if (track.kind === 'audio') {
          const audioElement = track.attach();
          audioElement.style.display = 'none'; // Hide the audio element
          document.body.appendChild(audioElement); // Ensure audio element is in DOM
          
          // Set volume and try to play
          audioElement.volume = 1.0;
          audioElement.play()
            .then(() => console.log('Audio playback started successfully'))
            .catch(e => {
              console.error('Failed to play audio:', e);
              // Try to play on user interaction
              document.addEventListener('click', () => {
                audioElement.play().catch(err => console.error('Retry play failed:', err));
              }, { once: true });
            });
        }
      });

      // Log any track errors
      participant.on('trackUnsubscribed', (track) => {
        console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
      });
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected from call:', participant.identity);
      this.emit({ type: 'participant_disconnected', data: { participant } });
    });

    this.room.on('disconnected', () => {
      console.log('Disconnected from telephony room');
      this.emit({ type: 'call_ended' });
    });
  }

  private emit(event: CallEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });
  }
}

/**
 * Generate a LiveKit token for telephony
 * In production, this should be done server-side for security
 */
export async function generateTelephonyToken(
  roomName: string, 
  participantName: string,
  phoneNumber?: string
): Promise<string> {
  try {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3002';
    
    const response = await fetch(`${backendUrl}/api/livekit-token`, {
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
      throw new Error(`Token generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to generate telephony token:', error);
    throw error;
  }
}

/**
 * Utility to format phone numbers for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return original if not a standard US format
  return phoneNumber;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}