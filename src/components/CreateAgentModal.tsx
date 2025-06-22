import React, { useState } from 'react';
import { X, Bot, User, FileText, Mic } from 'lucide-react';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAgent: (agentData: {
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
  }) => Promise<void>;
  isCreating: boolean;
}

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  isOpen,
  onClose,
  onCreateAgent,
  isCreating,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    persona: 'You are a helpful AI phone assistant. You can make and receive phone calls professionally and courteously. Always be polite, clear, and efficient in your communication.',
    human: 'The user is someone who needs assistance with phone calls. They may need help making appointments, handling customer service, or managing business communications.',
  });

  const [voiceSettings, setVoiceSettings] = useState({
    enabled: true,
    agentType: 'voice_convo_agent' as 'basic' | 'voice_convo_agent',
    enableSleeptime: true,
    maxMessageBufferLength: 20,
    minMessageBufferLength: 5,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }
    
    if (!formData.persona.trim()) {
      newErrors.persona = 'Persona is required';
    }
    
    if (!formData.human.trim()) {
      newErrors.human = 'Human description is required';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      try {
        await onCreateAgent({
          ...formData,
          voiceSettings,
        });
        setFormData({
          name: '',
          persona: 'You are a helpful AI phone assistant. You can make and receive phone calls professionally and courteously. Always be polite, clear, and efficient in your communication.',
          human: 'The user is someone who needs assistance with phone calls. They may need help making appointments, handling customer service, or managing business communications.',
        });
        setVoiceSettings({
          enabled: true,
          agentType: 'voice_convo_agent',
          enableSleeptime: true,
          maxMessageBufferLength: 20,
          minMessageBufferLength: 5,
        });
        setErrors({});
      } catch (error) {
        console.error('Error creating agent:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to create agent: ${errorMessage}`);
      }
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-100 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Create New Agent</h2>
              <p className="text-sm text-dark-500">Configure your AI phone assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
            disabled={isCreating}
          >
            <X size={20} className="text-dark-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            {/* Agent Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <User size={16} />
                Agent Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Customer Support Agent"
                className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isCreating}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Persona */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <Bot size={16} />
                Agent Persona
              </label>
              <textarea
                value={formData.persona}
                onChange={(e) => handleChange('persona', e.target.value)}
                placeholder="Describe how the agent should behave and respond..."
                rows={4}
                className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                disabled={isCreating}
              />
              {errors.persona && (
                <p className="text-red-500 text-sm mt-1">{errors.persona}</p>
              )}
              <p className="text-xs text-dark-500 mt-1">
                Define the agent's personality, tone, and behavior during phone calls
              </p>
            </div>

            {/* Human Description */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <FileText size={16} />
                Human Context
              </label>
              <textarea
                value={formData.human}
                onChange={(e) => handleChange('human', e.target.value)}
                placeholder="Describe the typical caller or user context..."
                rows={3}
                className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                disabled={isCreating}
              />
              {errors.human && (
                <p className="text-red-500 text-sm mt-1">{errors.human}</p>
              )}
              <p className="text-xs text-dark-500 mt-1">
                Describe who will be calling and what they typically need help with
              </p>
            </div>

            {/* Voice Settings */}
            <div className="border border-dark-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Mic size={16} className="text-primary-500" />
                <h3 className="text-sm font-medium text-white">Voice Settings</h3>
              </div>
              
              <div className="space-y-4">
                {/* Voice Enabled Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-white font-medium">Enable Voice</label>
                    <p className="text-xs text-dark-500">Enable voice conversation capabilities</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-100 ${
                      voiceSettings.enabled ? 'bg-primary-600' : 'bg-dark-300'
                    }`}
                    disabled={isCreating}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        voiceSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {voiceSettings.enabled && (
                  <>
                    {/* Agent Type */}
                    <div>
                      <label className="text-sm text-white font-medium mb-2 block">Agent Type</label>
                      <select
                        value={voiceSettings.agentType}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, agentType: e.target.value as 'basic' | 'voice_convo_agent' }))}
                        className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        disabled={isCreating}
                      >
                        <option value="basic">Basic Agent</option>
                        <option value="voice_convo_agent">Voice Conversation Agent</option>
                      </select>
                      <p className="text-xs text-dark-500 mt-1">
                        Voice conversation agents are optimized for low-latency voice interactions
                      </p>
                    </div>

                    {/* Sleeptime Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm text-white font-medium">Enable Sleeptime</label>
                        <p className="text-xs text-dark-500">Use separate agent for context management</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVoiceSettings(prev => ({ ...prev, enableSleeptime: !prev.enableSleeptime }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-100 ${
                          voiceSettings.enableSleeptime ? 'bg-primary-600' : 'bg-dark-300'
                        }`}
                        disabled={isCreating}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            voiceSettings.enableSleeptime ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Message Buffer Settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-white font-medium mb-1 block">Max Buffer Length</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={voiceSettings.maxMessageBufferLength}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, maxMessageBufferLength: parseInt(e.target.value) || 20 }))}
                          className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          disabled={isCreating}
                        />
                        <p className="text-xs text-dark-500 mt-1">Maximum messages before compaction</p>
                      </div>
                      <div>
                        <label className="text-sm text-white font-medium mb-1 block">Min Buffer Length</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={voiceSettings.minMessageBufferLength}
                          onChange={(e) => setVoiceSettings(prev => ({ ...prev, minMessageBufferLength: parseInt(e.target.value) || 5 }))}
                          className="w-full px-3 py-2 bg-dark-200 border border-dark-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          disabled={isCreating}
                        />
                        <p className="text-xs text-dark-500 mt-1">Minimum message continuity</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-dark-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-dark-400 hover:text-white transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Bot size={16} />
                  Create Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};