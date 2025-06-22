export interface Agent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
  lastActive: Date;
  description?: string;
  autoReceiveCalls?: boolean;
  assignedPhoneNumber?: string;
  workerStatus?: 'stopped' | 'starting' | 'running' | 'stopping';
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'agent' | 'caller';
  type: 'text' | 'audio';
}

export interface ChatSession {
  id: string;
  agentId: string;
  messages: Message[];
  status: 'active' | 'ended' | 'paused';
  startTime: Date;
  endTime?: Date;
  callerInfo?: {
    name?: string;
    phone?: string;
  };
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  url?: string;
}

export interface VoiceCall {
  id: string;
  agentId: string;
  status: 'connecting' | 'connected' | 'ended' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  callerInfo?: {
    name?: string;
    phone?: string;
  };
}

export interface AppState {
  agents: Agent[];
  selectedAgent: Agent | null;
  currentSession: ChatSession | null;
  currentCall: VoiceCall | null;
  context: string;
  files: FileItem[];
  isContextUpdating: boolean;
}

export interface LettaAgentConfig {
  name: string;
  persona: string;
  human: string;
  model?: string;
  embedding?: string;
  agentType?: 'basic' | 'voice_convo_agent';
  enableSleeptime?: boolean;
  maxMessageBufferLength?: number;
  minMessageBufferLength?: number;
}

export interface VoiceSettings {
  enabled: boolean;
  agentType: 'basic' | 'voice_convo_agent';
  enableSleeptime: boolean;
  maxMessageBufferLength: number;
  minMessageBufferLength: number;
} 