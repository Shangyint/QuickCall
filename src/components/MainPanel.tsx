import React from 'react';
import { ChatHistory } from './ChatHistory';
import { Agent, ChatSession, VoiceCall } from '../types';

interface MainPanelProps {
  agent: Agent | null;
  session: ChatSession | null;
  currentCall: VoiceCall | null;
  onStartCall: (agentId: string, phoneNumber?: string) => void;
  onEndCall: () => void;
  onCallStatusUpdate: (call: VoiceCall) => void;
}

export const MainPanel: React.FC<MainPanelProps> = ({
  agent,
  session,
  currentCall,
  onStartCall,
  onEndCall,
  onCallStatusUpdate,
}) => {
  return (
    <div className="flex flex-col h-full bg-dark-50">
      <ChatHistory 
        session={session} 
        agent={agent}
        currentCall={currentCall}
        onStartCall={onStartCall}
        onEndCall={onEndCall}
        onCallStatusUpdate={onCallStatusUpdate}
      />
    </div>
  );
};