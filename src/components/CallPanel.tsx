import React, { useState, useEffect, useCallback } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneIncoming,
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  User,
  Clock
} from 'lucide-react';
import { VoiceCall, Agent } from '../types';
import { TelephonyService, formatPhoneNumber, isValidPhoneNumber, generateTelephonyToken } from '../services/telephonyService';
import clsx from 'clsx';

interface CallPanelProps {
  agent: Agent | null;
  currentCall: VoiceCall | null;
  onStartCall: (agentId: string, phoneNumber?: string) => void;
  onEndCall: () => void;
  onCallStatusUpdate: (call: VoiceCall) => void;
}

export function CallPanel({ 
  agent, 
  currentCall, 
  onStartCall, 
  onEndCall, 
  onCallStatusUpdate 
}: CallPanelProps) {
  const [telephonyService] = useState(() => new TelephonyService());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  // Update call duration every second when in active call
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentCall && currentCall.status === 'connected') {
      interval = setInterval(() => {
        const duration = Math.floor((new Date().getTime() - currentCall.startTime.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentCall]);

  // Setup telephony service event handlers
  useEffect(() => {
    const handleTelephonyEvent = (event: any) => {
      if (!currentCall) return;

      switch (event.type) {
        case 'call_started':
          onCallStatusUpdate({
            ...currentCall,
            status: 'connected',
          });
          break;
        case 'call_ended':
          onCallStatusUpdate({
            ...currentCall,
            status: 'ended',
            endTime: new Date(),
          });
          break;
        case 'participant_connected':
          console.log('Caller connected to the call');
          break;
        case 'error':
          onCallStatusUpdate({
            ...currentCall,
            status: 'failed',
            endTime: new Date(),
          });
          break;
      }
    };

    telephonyService.onEvent(handleTelephonyEvent);

    return () => {
      telephonyService.removeEvent(handleTelephonyEvent);
    };
  }, [currentCall, onCallStatusUpdate, telephonyService]);

  const handleStartOutboundCall = async () => {
    if (!agent || !phoneNumber.trim()) return;

    const cleanPhoneNumber = phoneNumber.trim();
    if (!isValidPhoneNumber(cleanPhoneNumber)) {
      alert('Please enter a valid phone number');
      return;
    }

    setIsConnecting(true);
    try {
      const roomName = `outbound-${agent.id}-${Date.now()}`;
      const livekitUrl = process.env.REACT_APP_LIVEKIT_URL;
      
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured');
      }

      // Generate a proper LiveKit token from your backend
      console.log('Generating token for room:', roomName);
      const token = await generateTelephonyToken(
        roomName, 
        `agent-${agent.id}`, 
        cleanPhoneNumber
      );
      console.log('Token generated successfully');

      await telephonyService.startOutboundCall({
        livekitUrl,
        token,
        roomName,
        phoneNumber: cleanPhoneNumber,
      });

      onStartCall(agent.id, cleanPhoneNumber);
      setShowPhoneInput(false);
    } catch (error) {
      console.error('Failed to start outbound call:', error);
      alert('Failed to start call. Please check your configuration.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndCall = async () => {
    try {
      await telephonyService.endCall();
      onEndCall();
      setCallDuration(0);
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const handleToggleMic = async () => {
    try {
      await telephonyService.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      telephonyService.endCall();
    };
  }, [telephonyService]);

  if (!agent) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-dark-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-dark-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Agent Selected</h3>
        <p className="text-sm text-dark-400">Select an agent to make phone calls</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Agent Info */}
      <div className="text-center">
        <div className="w-16 h-16 bg-dark-200 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="w-8 h-8 text-dark-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
        <p className="text-sm text-dark-400">{agent.description}</p>
        
        {agent.assignedPhoneNumber && (
          <div className="mt-2 text-xs text-dark-400">
            Assigned: {formatPhoneNumber(agent.assignedPhoneNumber)}
          </div>
        )}
        
        {agent.autoReceiveCalls && (
          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-400">
            <PhoneIncoming size={12} />
            <span>Auto-receiving calls</span>
          </div>
        )}
      </div>

      {/* Current Call Status */}
      {currentCall ? (
        <div className="bg-dark-100 border border-dark-200 rounded-lg p-4 space-y-4">
          <div className="text-center">
            <div className={`text-sm font-medium ${getCallStatusColor(currentCall.status)}`}>
              {getCallStatusText(currentCall.status)}
            </div>
            
            {currentCall.callerInfo?.phone && (
              <div className="text-lg font-mono text-white mt-1">
                {formatPhoneNumber(currentCall.callerInfo.phone)}
              </div>
            )}
            
            {currentCall.callerInfo?.name && (
              <div className="text-sm text-dark-400">
                {currentCall.callerInfo.name}
              </div>
            )}
            
            {currentCall.status === 'connected' && (
              <div className="flex items-center justify-center gap-1 text-sm text-dark-400 mt-2">
                <Clock size={14} />
                <span>{formatDuration(callDuration)}</span>
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleToggleMic}
              className={clsx(
                'p-3 rounded-full transition-colors',
                isMicEnabled 
                  ? 'bg-dark-300 hover:bg-dark-200 text-white' 
                  : 'bg-red-600 hover:bg-red-500 text-white'
              )}
              disabled={currentCall.status !== 'connected'}
              title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
              title="End call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Make New Call */
        <div className="bg-dark-100 border border-dark-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-white text-center">Make Phone Call</h4>
          
          {!showPhoneInput ? (
            <button
              onClick={() => setShowPhoneInput(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
            >
              <PhoneCall className="w-5 h-5" />
              <span>Start New Call</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-dark-300 mb-2">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleStartOutboundCall}
                  disabled={isConnecting || !phoneNumber.trim() || !isValidPhoneNumber(phoneNumber)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-600 hover:bg-green-500 disabled:bg-dark-300 disabled:text-dark-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{isConnecting ? 'Calling...' : 'Call'}</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowPhoneInput(false);
                    setPhoneNumber('');
                  }}
                  className="px-3 py-2 bg-dark-300 hover:bg-dark-200 text-white rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
              
              {phoneNumber && !isValidPhoneNumber(phoneNumber) && (
                <p className="text-xs text-red-400">Please enter a valid phone number</p>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}