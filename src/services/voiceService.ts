import { Room, RemoteParticipant, RemoteTrack, RemoteTrackPublication, RoomEvent, Track } from 'livekit-client';

export interface VoiceServiceConfig {
  livekitUrl: string;
  token: string;
  roomName: string;
}

export interface VoiceCallbacks {
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onTrackSubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onTrackUnsubscribed?: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  onConnectionStateChanged?: (state: string) => void;
  onError?: (error: Error) => void;
}

export class VoiceService {
  private room: Room | null = null;
  private callbacks: VoiceCallbacks = {};
  private isConnected = false;

  constructor(callbacks: VoiceCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async connect(config: VoiceServiceConfig): Promise<void> {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.setupEventListeners();

      await this.room.connect(config.livekitUrl, config.token);
      this.isConnected = true;
      
      console.log('Connected to LiveKit room:', config.roomName);
    } catch (error) {
      console.error('Failed to connect to LiveKit:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
      this.isConnected = false;
      console.log('Disconnected from LiveKit room');
    }
  }

  async enableMicrophone(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(true);
      console.log('Microphone enabled');
    } catch (error) {
      console.error('Failed to enable microphone:', error);
      throw error;
    }
  }

  async disableMicrophone(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(false);
      console.log('Microphone disabled');
    } catch (error) {
      console.error('Failed to disable microphone:', error);
      throw error;
    }
  }

  async enableSpeaker(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      // Enable audio playback by setting volume
      this.room.remoteParticipants.forEach(participant => {
        participant.audioTrackPublications.forEach(publication => {
          if (publication.track) {
            const audioElement = publication.track.attach();
            if (audioElement instanceof HTMLAudioElement) {
              audioElement.volume = 1.0;
            }
          }
        });
      });
      console.log('Speaker enabled');
    } catch (error) {
      console.error('Failed to enable speaker:', error);
      throw error;
    }
  }

  async disableSpeaker(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      // Disable audio playback by setting volume to 0
      this.room.remoteParticipants.forEach(participant => {
        participant.audioTrackPublications.forEach(publication => {
          if (publication.track) {
            const audioElement = publication.track.attach();
            if (audioElement instanceof HTMLAudioElement) {
              audioElement.volume = 0;
            }
          }
        });
      });
      console.log('Speaker disabled');
    } catch (error) {
      console.error('Failed to disable speaker:', error);
      throw error;
    }
  }

  getConnectionState(): string {
    return this.room?.state || 'disconnected';
  }

  isRoomConnected(): boolean {
    return this.isConnected && this.room?.state === 'connected';
  }

  getParticipants(): RemoteParticipant[] {
    return this.room ? Array.from(this.room.remoteParticipants.values()) : [];
  }

  private setupEventListeners(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      this.callbacks.onParticipantConnected?.(participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      this.callbacks.onParticipantDisconnected?.(participant);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
      
      if (track.kind === Track.Kind.Audio) {
        // Auto-play audio tracks
        const audioElement = track.attach();
        audioElement.play().catch(e => console.error('Failed to play audio:', e));
      }
      
      this.callbacks.onTrackSubscribed?.(track, publication, participant);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
      track.detach();
      this.callbacks.onTrackUnsubscribed?.(track, publication, participant);
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state: string) => {
      console.log('Connection state changed:', state);
      this.callbacks.onConnectionStateChanged?.(state);
    });

    this.room.on(RoomEvent.Disconnected, (reason?: any) => {
      console.log('Room disconnected:', reason);
      this.isConnected = false;
    });
  }
}

// Utility function to generate LiveKit token (in production, this should be done server-side)
export function generateLiveKitToken(roomName: string, participantName: string): string {
  // This is a placeholder - in production, tokens should be generated server-side
  // For development, you can use the LiveKit CLI or dashboard to generate tokens
  const apiKey = process.env.REACT_APP_LIVEKIT_API_KEY;
  const apiSecret = process.env.REACT_APP_LIVEKIT_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API key and secret are required');
  }
  
  // In a real implementation, you would use the LiveKit server SDK to generate tokens
  // For now, return a placeholder that needs to be replaced with actual token generation
  console.warn('Token generation should be implemented server-side');
  return 'placeholder-token-implement-server-side';
}