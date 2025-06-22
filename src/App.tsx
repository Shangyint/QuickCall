import React, { useState, useCallback, useEffect } from 'react';
import { AgentList } from './components/AgentList';
import { MainPanel } from './components/MainPanel';
import { StatusPanel } from './components/StatusPanel';
import { CreateAgentModal } from './components/CreateAgentModal';
import { Agent, ChatSession, Message, FileItem, AppState, VoiceCall } from './types';
import { lettaApi } from './services/lettaApi';



const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'customer_support_guide.pdf',
    size: 1024000,
    type: 'application/pdf',
    uploadDate: new Date(Date.now() - 86400000),
  },
  {
    id: '2',
    name: 'product_catalog.xlsx',
    size: 2048000,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadDate: new Date(Date.now() - 172800000),
  },
  {
    id: '3',
    name: 'company_logo.png',
    size: 512000,
    type: 'image/png',
    uploadDate: new Date(Date.now() - 259200000),
  },
];

function App() {
  const [appState, setAppState] = useState<AppState>({
    agents: [],
    selectedAgent: null,
    currentSession: null,
    currentCall: null,
    context: 'You are a helpful customer support agent. Be polite, professional, and solve customer issues efficiently. Always confirm understanding before providing solutions.',
    files: mockFiles,
    isContextUpdating: false,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  // Load existing Letta agents on startup
  useEffect(() => {
    const loadLettaAgents = async () => {
      try {
        const lettaAgents = await lettaApi.getAgents();
        const formattedAgents: Agent[] = lettaAgents
          .filter(agent => !agent.name.endsWith('sleeptime'))
          .map(agent => ({
            id: agent.id,
            name: agent.name,
            status: 'online',
            lastActive: new Date(agent.updated_at),
            description: agent.persona ? agent.persona.split('.')[0] : 'Letta AI Agent',
            autoReceiveCalls: true,
          }));

        setAppState(prev => ({
          ...prev,
          agents: formattedAgents,
        }));
      } catch (error) {
        console.error('Failed to load Letta agents:', error);
      }
    };

    loadLettaAgents();
  }, []);

  // Poll for new messages every 5 seconds when an agent is selected
  useEffect(() => {
    if (!appState.selectedAgent?.id) return;

    const pollMessages = async () => {
      try {
        const messages = await lettaApi.getMessages(appState.selectedAgent!.id);
        const formattedMessages: Message[] = messages
          .filter((msg: any) => msg.message_type === 'assistant_message' || msg.message_type === 'user_message')
          .map((msg: any, index: number) => ({
            id: msg.id || `msg-${index}`,
            content: msg.message || msg.content || '',
            timestamp: new Date(msg.created_at || Date.now()),
            sender: msg.message_type === 'assistant_message' ? 'agent' : 'caller',
            type: 'text',
          }));

        setAppState(prev => ({
          ...prev,
          currentSession: prev.currentSession ? {
            ...prev.currentSession,
            messages: formattedMessages,
          } : null,
        }));
      } catch (error) {
        // Only log error if it's not a 404 (which is expected for new agents)
        if (!(error instanceof Error && error.message.includes('404'))) {
          console.error('Failed to poll messages:', error);
        }
      }
    };

    const interval = setInterval(pollMessages, 5000);
    return () => clearInterval(interval);
  }, [appState.selectedAgent?.id]);

  const handleAgentSelect = useCallback(async (agent: Agent) => {
    setAppState(prev => ({
      ...prev,
      selectedAgent: agent,
      currentSession: {
        id: `session-${agent.id}`,
        agentId: agent.id,
        messages: [],
        status: 'active',
        startTime: new Date(),
      },
    }));

    // Fetch messages for the selected agent
    try {
      const messages = await lettaApi.getMessages(agent.id);
      const formattedMessages: Message[] = messages
        .filter((msg: any) => msg.message_type === 'assistant_message' || msg.message_type === 'user_message')
        .map((msg: any, index: number) => ({
          id: msg.id || `msg-${index}`,
          content: msg.message || msg.content || '',
          timestamp: new Date(msg.created_at || Date.now()),
          sender: msg.message_type === 'assistant_message' ? 'agent' : 'caller',
          type: 'text',
        }));

      setAppState(prev => ({
        ...prev,
        currentSession: prev.currentSession ? {
          ...prev.currentSession,
          messages: formattedMessages,
        } : null,
      }));
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('404'))) {
        console.error('Failed to fetch messages for agent:', agent.id, error);
      }
    }
  }, []);

  const handleNewAgent = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleDeleteAllAgents = useCallback(async () => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete ALL agents from the Letta server? This action cannot be undone.'
    );
    
    if (!confirmDelete) return;

    try {
      await lettaApi.deleteAllAgents();
      
      // Always refresh the agent list from server to see actual state
      const lettaAgents = await lettaApi.getAgents();
      const formattedAgents: Agent[] = lettaAgents
        .filter(agent => !agent.name.endsWith('sleeptime'))
        .map(agent => ({
          id: agent.id,
          name: agent.name,
          status: 'online',
          lastActive: new Date(agent.updated_at),
          description: agent.persona ? agent.persona.split('.')[0] : 'Letta AI Agent',
          autoReceiveCalls: true,
        }));
      
      setAppState(prev => ({
        ...prev,
        agents: formattedAgents,
        selectedAgent: null,
        currentSession: null,
      }));
      
      if (formattedAgents.length === 0) {
        alert('✅ All agents have been successfully deleted from the server.');
      } else {
        alert(`⚠️ Deletion completed. ${formattedAgents.length} agents remain on the server.`);
      }
    } catch (error) {
      console.error('Failed to delete all agents:', error);
      alert(`❌ Failed to delete agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const handleCreateAgent = useCallback(async (agentData: {
    name: string;
    persona: string;
    human: string;
    voiceSettings: {
      enabled: boolean;
      agentType: 'basic' | 'voice_convo_agent';
      enableSleeptime: boolean;
      maxMessageBufferLength: number;
      minMessageBufferLength: number;
    };
  }) => {
    setIsCreatingAgent(true);
    try {
      const lettaAgent = await lettaApi.createAgent({
        name: agentData.name,
        persona: agentData.persona,
        human: agentData.human,
        voiceSettings: agentData.voiceSettings,
      });

      const newAgent: Agent = {
        id: lettaAgent.id,
        name: lettaAgent.name,
        status: 'online',
        lastActive: new Date(),
        description: agentData.persona.split('.')[0],
      };

      setAppState(prev => ({
        ...prev,
        agents: [...prev.agents, newAgent],
        selectedAgent: newAgent,
        currentSession: null,
      }));

      setIsCreateModalOpen(false);
      console.log('Agent created successfully:', lettaAgent);
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingAgent(false);
    }
  }, []);

  const handleContextUpdate = useCallback(async (newContext: string) => {
    setAppState(prev => ({ ...prev, isContextUpdating: true }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setAppState(prev => ({
      ...prev,
      context: newContext,
      isContextUpdating: false,
    }));
    
    console.log('Context updated:', newContext);
  }, []);

  const handleFileUpload = useCallback((fileList: FileList) => {
    const newFiles: FileItem[] = Array.from(fileList).map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date(),
    }));

    setAppState(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }));

    console.log('Files uploaded:', newFiles);
  }, []);

  const handleFileDelete = useCallback((fileId: string) => {
    setAppState(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId),
    }));
    
    console.log('File deleted:', fileId);
  }, []);

  const handleFileDownload = useCallback((file: FileItem) => {
    // This would typically trigger a download
    console.log('Downloading file:', file.name);
    alert(`Download feature for ${file.name} coming soon!`);
  }, []);

  const handleToggleAutoReceive = useCallback((agentId: string, enabled: boolean) => {
    setAppState(prev => ({
      ...prev,
      agents: prev.agents.map(agent =>
        agent.id === agentId
          ? { ...agent, autoReceiveCalls: enabled }
          : agent
      ),
    }));
    
    console.log(`Auto-receive calls ${enabled ? 'enabled' : 'disabled'} for agent ${agentId}`);
  }, []);



  const handleStartCall = useCallback(async (agentId: string, phoneNumber?: string) => {
    const agent = appState.agents.find(a => a.id === agentId);
    if (!agent) {
      alert('Agent not found');
      return;
    }


    if (!phoneNumber) {
      alert('Please enter a phone number to call');
      return;
    }

    const newCall: VoiceCall = {
      id: `call-${Date.now()}`,
      agentId,
      status: 'connecting',
      startTime: new Date(),
      callerInfo: {
        phone: phoneNumber,
      },
    };

    setAppState(prev => ({
      ...prev,
      currentCall: newCall,
      agents: prev.agents.map(a =>
        a.id === agentId
          ? { ...a, status: 'busy' as const }
          : a
      ),
    }));

    try {
      // Make outbound call via LiveKit SIP
      const response = await fetch('http://localhost:3002/api/make-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          agentId: agentId,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific error cases with beautiful messaging
        if (response.status === 409 && responseData.error === 'number_busy') {
          alert(`${responseData.message}\n\n${responseData.details}\n\nPlease try a different number or wait for the current call to end.`);
          
          // Reset call state
          setAppState(prev => ({
            ...prev,
            currentCall: null,
            agents: prev.agents.map(a =>
              a.id === agentId
                ? { ...a, status: 'online' as const }
                : a
            ),
          }));
          return;
        }
        
        
        // Handle demo mode gracefully (if LiveKit not configured)
        if (response.status === 503 && responseData.error?.includes('demo mode')) {
          alert('⚠️ LiveKit SIP not configured.\n\nTo enable real calls:\n1. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in .env\n2. Configure SIP trunk ID in .env.agent\n3. Restart the server');
          
          // Reset call state
          setAppState(prev => ({
            ...prev,
            currentCall: null,
            agents: prev.agents.map(a =>
              a.id === agentId
                ? { ...a, status: 'online' as const }
                : a
            ),
          }));
          return;
        }
        throw new Error(`Failed to make call: ${responseData.error || response.statusText}`);
      }

      console.log('Outbound call dispatched:', responseData);

      // Update call with room name
      setAppState(prev => ({
        ...prev,
        currentCall: prev.currentCall ? {
          ...prev.currentCall,
          id: responseData.roomName || `call-${Date.now()}`,
          status: 'connected',
        } : null,
      }));

    } catch (error) {
      console.error('Failed to start call:', error);
      
      // Reset call state on error
      setAppState(prev => ({
        ...prev,
        currentCall: null,
        agents: prev.agents.map(a =>
          a.id === agentId
            ? { ...a, status: 'online' as const }
            : a
        ),
      }));
      
      alert(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [appState.agents, appState.currentCall]);

  const handleEndCall = useCallback(async () => {
    if (appState.currentCall) {
      const endedCall: VoiceCall = {
        ...appState.currentCall,
        status: 'ended',
        endTime: new Date(),
        duration: Math.floor((new Date().getTime() - appState.currentCall.startTime.getTime()) / 1000),
      };

      try {
        // Notify backend to end the call
        await fetch('http://localhost:3002/api/end-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: appState.currentCall.callerInfo?.phone,
            agentId: appState.currentCall.agentId,
          }),
        });
      } catch (error) {
        console.error('Failed to end call on backend:', error);
      }

      setAppState(prev => ({
        ...prev,
        currentCall: null,
        agents: prev.agents.map(agent =>
          agent.id === endedCall.agentId
            ? { ...agent, status: 'online' as const }
            : agent
        ),
      }));

      console.log('Call ended:', endedCall);
    }
  }, [appState.currentCall]);

  const handleCallStatusUpdate = useCallback((call: VoiceCall) => {
    setAppState(prev => ({
      ...prev,
      currentCall: call,
    }));
  }, []);

  return (
    <div className="flex h-screen bg-dark-50 text-white">
      {/* Left Panel - Agent List */}
      <div className="w-80 flex-shrink-0">
        <AgentList
          agents={appState.agents}
          selectedAgent={appState.selectedAgent}
          onAgentSelect={handleAgentSelect}
          onNewAgent={handleNewAgent}
          onToggleAutoReceive={handleToggleAutoReceive}
          onDeleteAllAgents={handleDeleteAllAgents}
        />
      </div>

      {/* Main Panel - Chat History & Call Panel */}
      <div className="flex-1">
        <MainPanel
          agent={appState.selectedAgent}
          session={appState.currentSession}
          currentCall={appState.currentCall}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          onCallStatusUpdate={handleCallStatusUpdate}
        />
      </div>

      {/* Right Panel - Status Panel */}
      <div className="w-80 flex-shrink-0">
        <StatusPanel
          context={appState.context}
          files={appState.files}
          isContextUpdating={appState.isContextUpdating}
          onContextUpdate={handleContextUpdate}
          onFileUpload={handleFileUpload}
          onFileDelete={handleFileDelete}
          onFileDownload={handleFileDownload}
        />
      </div>

      {/* Create Agent Modal */}
      <CreateAgentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateAgent={handleCreateAgent}
        isCreating={isCreatingAgent}
      />
    </div>
  );
}

export default App; 