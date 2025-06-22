import React, { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX, User } from 'lucide-react';
import { VoiceCall, Agent } from '../types';
import { VoiceService, VoiceServiceConfig } from '../services/voiceService';

interface VoiceCallPanelProps {
  agent: Agent | null;
  currentCall: VoiceCall | null;
  onStartCall: (agentId: string) => void;
  onEndCall: () => void;
  onCallStatusUpdate: (call: VoiceCall) => void;
}

export function VoiceCallPanel({ 
  agent, 
  currentCall, 
  onStartCall, 
  onEndCall, 
  onCallStatusUpdate 
}: VoiceCallPanelProps) {
  const [voiceService] = useState(() => new VoiceService({
    onConnectionStateChanged: (state) => {
      console.log('Voice connection state:', state);
      if (currentCall) {
        const updatedCall: VoiceCall = {
          ...currentCall,
          status: state === 'connected' ? 'connected' : 
                 state === 'disconnected' ? 'ended' : 'connecting'
        };
        onCallStatusUpdate(updatedCall);
      }
    },
    onError: (error) => {
      console.error('Voice service error:', error);
      if (currentCall) {
        const updatedCall: VoiceCall = {
          ...currentCall,
          status: 'failed',
          endTime: new Date()
        };
        onCallStatusUpdate(updatedCall);
      }
    }
  }));

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleStartCall = async () => {
    if (!agent) return;
    
    setIsConnecting(true);
    try {
      // Generate room name based on agent ID and timestamp
      const roomName = `agent-${agent.id}-${Date.now()}`;
      
      // In production, token should be fetched from your backend
      const livekitUrl = process.env.REACT_APP_LIVEKIT_URL;
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured');
      }

      // For development, you'll need to implement token generation
      // This is just a placeholder - tokens should be generated server-side
      const config: VoiceServiceConfig = {
        livekitUrl,
        token: 'your-token-here', // This needs to be implemented
        roomName
      };

      await voiceService.connect(config);
      await voiceService.enableMicrophone();
      await voiceService.enableSpeaker();

      onStartCall(agent.id);
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Failed to start call. Please check your configuration.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndCall = async () => {
    try {
      await voiceService.disconnect();
      onEndCall();
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const handleToggleMic = async () => {
    try {
      if (isMicEnabled) {
        await voiceService.disableMicrophone();
      } else {
        await voiceService.enableMicrophone();
      }
      setIsMicEnabled(!isMicEnabled);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const handleToggleSpeaker = async () => {
    try {
      if (isSpeakerEnabled) {
        await voiceService.disableSpeaker();
      } else {
        await voiceService.enableSpeaker();
      }
      setIsSpeakerEnabled(!isSpeakerEnabled);
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
    }
  };

  const formatCallDuration = useCallback((call: VoiceCall) => {
    const endTime = call.endTime || new Date();
    const duration = Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const getCallStatusColor = (status: VoiceCall['status']) => {
    switch (status) {
      case 'connecting': return 'text-yellow-400';
      case 'connected': return 'text-green-400';
      case 'ended': return 'text-gray-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getCallStatusText = (status: VoiceCall['status']) => {
    switch (status) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'ended': return 'Call Ended';
      case 'failed': return 'Call Failed';
      default: return 'Unknown';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceService.disconnect();
    };
  }, [voiceService]);

  if (!agent) {
    return (
      <div className="p-4 text-center text-gray-400">
        <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Select an agent to start a call</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Voice Call</h3>
        <p className="text-sm text-gray-400 mb-4">Agent: {agent.name}</p>
        
        {currentCall ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-sm font-medium ${getCallStatusColor(currentCall.status)}`}>
                {getCallStatusText(currentCall.status)}
              </div>
              {currentCall.status === 'connected' && (
                <div className="text-xs text-gray-400 mt-1">
                  Duration: {formatCallDuration(currentCall)}
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleToggleMic}
                className={`p-3 rounded-full transition-colors ${
                  isMicEnabled 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
                disabled={currentCall.status !== 'connected'}
              >
                {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={handleToggleSpeaker}
                className={`p-3 rounded-full transition-colors ${
                  isSpeakerEnabled 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                }`}
                disabled={currentCall.status !== 'connected'}
              >
                {isSpeakerEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <button
                onClick={handleEndCall}
                className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
                disabled={currentCall.status === 'ended'}
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleStartCall}
            disabled={isConnecting || agent.status === 'offline'}
            className="flex items-center justify-center space-x-2 w-full py-3 px-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <PhoneCall className="w-5 h-5" />
            <span>{isConnecting ? 'Connecting...' : 'Start Call'}</span>
          </button>
        )}
      </div>

      {agent.status === 'offline' && !currentCall && (
        <div className="text-center text-sm text-yellow-400 bg-yellow-400/10 p-2 rounded">
          Agent is offline and cannot receive calls
        </div>
      )}
    </div>
  );
}