import axios from 'axios';

export interface LettaAgent {
  id: string;
  name: string;
  persona: string;
  human: string;
  created_at: string;
  updated_at: string;
  memory?: {
    persona: string;
    human: string;
  };
}

export interface CreateAgentRequest {
  name: string;
  persona?: string;
  human?: string;
  voiceSettings?: {
    enabled: boolean;
    agentType: 'basic' | 'voice_convo_agent';
    enableSleeptime: boolean;
    maxMessageBufferLength: number;
    minMessageBufferLength: number;
  };
}

export interface CreateAgentResponse {
  id: string;
  name: string;
  persona: string;
  human: string;
  created_at: string;
  updated_at: string;
}

class LettaApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // Use CORS proxy in development to avoid CORS issues
    this.baseUrl = process.env.REACT_APP_LETTA_API_URL || 'http://localhost:8284';
    this.apiKey = process.env.REACT_APP_LETTA_API_KEY || '';
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  async createAgent(agentData: CreateAgentRequest): Promise<CreateAgentResponse> {
    try {
      const voiceSettings = agentData.voiceSettings;
      const isVoiceAgent = voiceSettings?.enabled && voiceSettings?.agentType === 'voice_convo_agent';
      
      const requestPayload: any = {
        name: agentData.name,
        memory_blocks: [
          {
            label: "persona",
            value: agentData.persona || 'You are a helpful AI assistant that can make and receive phone calls.'
          },
          {
            label: "human", 
            value: agentData.human || 'The user is a human who needs assistance with phone calls.'
          }
        ],
        llm_config: {
          model: "gpt-4o-mini",
          model_endpoint_type: "openai",
          model_endpoint: "https://api.openai.com/v1",
          context_window: 128000
        },
        embedding_config: {
          embedding_model: "text-embedding-3-small",
          embedding_endpoint_type: "openai",
          embedding_endpoint: "https://api.openai.com/v1",
          embedding_dim: 1536
        }
      };

      // Add voice-specific configuration if voice agent is selected
      if (isVoiceAgent) {
        requestPayload.agent_type = "voice_convo_agent";
        requestPayload.enable_sleeptime = voiceSettings.enableSleeptime;
        requestPayload.max_message_buffer_length = voiceSettings.maxMessageBufferLength;
        requestPayload.min_message_buffer_length = voiceSettings.minMessageBufferLength;
      }
      
      const response = await axios.post(
        `${this.baseUrl}/v1/agents/`,
        requestPayload,
        {
          headers: this.getHeaders(),
          timeout: 10000,
          maxRedirects: 5,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating Letta agent:', error);
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message;
        const statusCode = error.response?.status;
        const fullError = `Status: ${statusCode}, Error: ${errorMsg}, URL: ${error.config?.url}`;
        console.error('Full error details:', fullError);
        throw new Error(`Failed to create agent: ${fullError}`);
      }
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAgents(): Promise<LettaAgent[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/agents/`, {
        headers: this.getHeaders(),
        timeout: 10000,
        maxRedirects: 5,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching Letta agents:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch agents: ${error.response?.data?.message || error.message}`);
      }
      throw new Error('Failed to fetch agents: Unknown error');
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/v1/agents/${agentId}`, {
        headers: this.getHeaders(),
        timeout: 10000,
        maxRedirects: 5,
      });
    } catch (error) {
      console.error('Error deleting Letta agent:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete agent: ${error.response?.data?.message || error.message}`);
      }
      throw new Error('Failed to delete agent: Unknown error');
    }
  }

  async deleteAllAgents(): Promise<void> {
    try {
      // First get all agents
      const agents = await this.getAgents();
      console.log(`Found ${agents.length} agents to delete`);
      
      if (agents.length === 0) {
        console.log('No agents to delete');
        return;
      }
      
      // Track deletion results
      const results = [];
      
      // Delete each agent sequentially to avoid overwhelming the server
      for (const agent of agents) {
        try {
          console.log(`Deleting agent: ${agent.id} (${agent.name})`);
          await this.deleteAgent(agent.id);
          console.log(`Successfully deleted agent: ${agent.id}`);
          results.push({ id: agent.id, success: true });
        } catch (error) {
          console.error(`Failed to delete agent ${agent.id}:`, error);
          results.push({ id: agent.id, success: false, error });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log(`Deletion complete: ${successCount} successful, ${failCount} failed`);
      
      // Only throw error if ALL deletions failed
      if (failCount > 0 && successCount === 0) {
        throw new Error(`All ${failCount} agent deletions failed`);
      }
      
      // If some succeeded, log but don't throw error
      if (failCount > 0) {
        console.warn(`${failCount} out of ${agents.length} agents failed to delete, but ${successCount} were successful`);
      }
      
    } catch (error) {
      console.error('Error in deleteAllAgents:', error);
      // Only rethrow if it's not our controlled error above
      if (error instanceof Error && error.message?.includes('agent deletions failed')) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete all agents: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Failed to delete all agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessages(agentId: string, start?: number, count?: number): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (start !== undefined) params.append('start', start.toString());
      if (count !== undefined) params.append('count', count.toString());
      
      const response = await axios.get(
        `${this.baseUrl}/v1/agents/${agentId}/messages?${params.toString()}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching Letta messages:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch messages: ${error.response?.data?.message || error.message}`);
      }
      throw new Error('Failed to fetch messages: Unknown error');
    }
  }

  getVoiceEndpoint(agentId: string): string {
    // Voice endpoint for Letta Voice API
    const voiceBaseUrl = this.baseUrl.replace(':8284', ':8283'); // Voice API typically runs on 8283
    return `${voiceBaseUrl}/v1/voice-beta/${agentId}`;
  }
}

export const lettaApi = new LettaApiService();