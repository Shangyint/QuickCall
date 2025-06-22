import React, { useRef, useEffect, useState } from 'react';
import { Phone, PhoneCall, PhoneOff, User, Bot, Mic, MicOff, PhoneIncoming } from 'lucide-react';
import { ChatSession, Message, Agent, VoiceCall } from '../types';
import { TelephonyService, formatPhoneNumber, isValidPhoneNumber, generateTelephonyToken } from '../services/telephonyService';
import clsx from 'clsx';

interface ChatHistoryProps {
  session: ChatSession | null;
  agent: Agent | null;
  currentCall: VoiceCall | null;
  onStartCall: (agentId: string, phoneNumber?: string) => void;
  onEndCall: () => void;
  onCallStatusUpdate: (call: VoiceCall) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ 
  session, 
  agent, 
  currentCall, 
  onStartCall, 
  onEndCall, 
  onCallStatusUpdate 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [telephonyService] = useState(() => new TelephonyService());
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartOutboundCall = async () => {
    if (!agent || !phoneNumber.trim()) return;

    const cleanPhoneNumber = phoneNumber.trim();
    if (!isValidPhoneNumber(cleanPhoneNumber)) {
      alert('Please enter a valid phone number');
      return;
    }

    setIsConnecting(true);
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const roomName = `outbound-${agent.id}-${Date.now()}`;
      const livekitUrl = process.env.REACT_APP_LIVEKIT_URL;
      
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured');
      }

      // Generate token from backend
      const token = await generateTelephonyToken(
        roomName, 
        `agent-${agent.id}`, 
        cleanPhoneNumber
      );

      // Listen for telephony events
      telephonyService.onEvent((event) => {
        console.log('Telephony event:', event.type, event.data);
      });

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

  const getCallStatusColor = (status: VoiceCall['status']) => {
    switch (status) {
      case 'connecting': return 'text-yellow-400';
      case 'connected': return 'text-green-400';
      case 'ended': return 'text-gray-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const renderMessage = (message: Message) => {
    const isAgent = message.sender === 'agent';

    return (
      <div
        key={message.id}
        className={clsx(
          'flex gap-3 mb-4',
          isAgent ? 'justify-start' : 'justify-end'
        )}
      >
        {isAgent && (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <span className="text-xs text-dark-500 mt-1">Agent</span>
          </div>
        )}

        <div
          className={clsx(
            'max-w-[70%] rounded-lg p-3',
            isAgent
              ? 'bg-dark-200 text-white'
              : 'bg-primary-600 text-white ml-auto'
          )}
        >
          <div className="text-sm">{message.content}</div>
          <div
            className={clsx(
              'text-xs mt-1',
              isAgent ? 'text-dark-400' : 'text-primary-100'
            )}
          >
            {formatTime(message.timestamp)}
          </div>
        </div>

        {!isAgent && (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <span className="text-xs text-dark-500 mt-1">Caller</span>
          </div>
        )}
      </div>
    );
  };

  if (!session || !agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-50 text-center p-8">
        <Phone size={64} className="text-dark-400 mb-6" />
        <h2 className="text-2xl font-semibold text-white mb-2">
          Select an Agent
        </h2>
        <p className="text-dark-500 mb-6 max-w-md">
          Choose an AI agent from the left panel to view call history and start managing phone conversations.
        </p>
        <div className="flex items-center gap-4 text-sm text-dark-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
            <span>Agent (You)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span>Caller</span>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (session.status) {
      case 'active':
        return <PhoneCall size={16} className="text-green-500 animate-pulse" />;
      case 'paused':
        return <Phone size={16} className="text-yellow-500" />;
      case 'ended':
        return <Phone size={16} className="text-red-500" />;
      default:
        return <Phone size={16} className="text-dark-400" />;
    }
  };

  const getStatusText = () => {
    switch (session.status) {
      case 'active':
        return 'Call in Progress';
      case 'paused':
        return 'Call Paused';
      case 'ended':
        return 'Call Ended';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-50">
      {/* Header */}
      <div className="border-b border-dark-200 bg-dark-100">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">{agent.name}</h2>
              <div className="flex items-center gap-2 text-sm text-dark-500">
                {currentCall ? (
                  <>
                    <div className={clsx('flex items-center gap-1', getCallStatusColor(currentCall.status))}>
                      {currentCall.status === 'connected' ? (
                        <PhoneCall size={12} className="animate-pulse" />
                      ) : currentCall.status === 'connecting' ? (
                        <Phone size={12} className="animate-pulse" />
                      ) : (
                        <PhoneOff size={12} />
                      )}
                      <span className="capitalize">{currentCall.status}</span>
                    </div>
                    {currentCall.status === 'connected' && (
                      <span className="text-dark-400">• {formatDuration(callDuration)}</span>
                    )}
                  </>
                ) : (
                  <>
                    {getStatusIcon()}
                    <span>{getStatusText()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {agent.autoReceiveCalls && (
              <div className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                <PhoneIncoming size={12} />
                <span>Auto-receive</span>
              </div>
            )}
            
            {currentCall?.callerInfo?.phone && (
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {formatPhoneNumber(currentCall.callerInfo.phone)}
                </div>
                {currentCall.callerInfo.name && (
                  <div className="text-xs text-dark-500">
                    {currentCall.callerInfo.name}
                  </div>
                )}
              </div>
            )}

            {session?.callerInfo && !currentCall && (
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {session.callerInfo.name || 'Unknown Caller'}
                </div>
                {session.callerInfo.phone && (
                  <div className="text-xs text-dark-500">
                    {session.callerInfo.phone}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Call Controls Bar */}
        {currentCall && (
          <div className="px-4 pb-3 flex items-center justify-center gap-4">
            <button
              onClick={handleToggleMic}
              className={clsx(
                'p-2 rounded-full transition-colors',
                isMicEnabled 
                  ? 'bg-dark-300 hover:bg-dark-200 text-white' 
                  : 'bg-red-600 hover:bg-red-500 text-white'
              )}
              disabled={currentCall.status !== 'connected'}
              title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={handleEndCall}
              className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
              title="End call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {session.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PhoneCall size={48} className="text-dark-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No Messages Yet
            </h3>
            <p className="text-dark-500">
              This conversation will appear here once the call starts.
            </p>
          </div>
        ) : (
          <>
            {session.messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Footer - Call Controls or Session Info */}
      <div className="p-4 border-t border-dark-200 bg-dark-100">
        {currentCall ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-dark-500">
              Call duration: {formatDuration(callDuration)}
            </div>
            
            {currentCall.status === 'connected' && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-red-500 font-medium">LIVE CALL</span>
              </div>
            )}
          </div>
        ) : !showPhoneInput ? (
          <div className="flex items-center justify-between">
            {session ? (
              <div className="text-sm text-dark-500">
                Call duration: {
                  session.endTime
                    ? `${Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60)} min`
                    : `${Math.round((Date.now() - session.startTime.getTime()) / 1000 / 60)} min`
                }
              </div>
            ) : (
              <div className="text-sm text-dark-500">
                Ready to make calls
              </div>
            )}
            
            <button
              onClick={() => setShowPhoneInput(true)}
              disabled={!agent || agent.status === 'offline' || agent.status === 'busy'}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-dark-300 disabled:text-dark-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Make Call</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
                className="flex-1 px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-sm"
                autoFocus
              />
              
              <button
                onClick={handleStartOutboundCall}
                disabled={isConnecting || !phoneNumber.trim() || !isValidPhoneNumber(phoneNumber)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-dark-300 disabled:text-dark-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
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
    </div>
  );
}; 