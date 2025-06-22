import React from 'react';
import { Plus, Bot, Circle, Phone, PhoneOff, Trash2 } from 'lucide-react';
import { Agent } from '../types';
import clsx from 'clsx';

interface AgentListProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onAgentSelect: (agent: Agent) => void;
  onNewAgent: () => void;
  onToggleAutoReceive: (agentId: string, enabled: boolean) => void;
  onDeleteAllAgents: () => void;
}

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedAgent,
  onAgentSelect,
  onNewAgent,
  onToggleAutoReceive,
  onDeleteAllAgents,
}) => {
  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'busy':
        return 'text-yellow-500';
      case 'offline':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: Agent['status']) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'busy':
        return 'In Call';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-100 border-r border-dark-200">
      {/* Header */}
      <div className="p-4 border-b border-dark-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">AI Agents</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onDeleteAllAgents}
              className="flex items-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs font-medium"
              title="Delete all agents from server"
            >
              <Trash2 size={12} />
              Clear All
            </button>
            <button
              onClick={onNewAgent}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>
        <div className="text-sm text-dark-500">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => onAgentSelect(agent)}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2',
                selectedAgent?.id === agent.id
                  ? 'bg-primary-600/20 border border-primary-500/30'
                  : 'hover:bg-dark-200/50 border border-transparent'
              )}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 bg-dark-300 rounded-full flex items-center justify-center">
                  {agent.avatar ? (
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Bot size={20} className="text-dark-500" />
                  )}
                </div>
                <Circle
                  size={8}
                  className={clsx(
                    'absolute -bottom-0.5 -right-0.5 fill-current',
                    getStatusColor(agent.status)
                  )}
                />
              </div>

              {/* Agent Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white truncate">
                    {agent.name}
                  </h3>
                  <span className={clsx('text-xs', getStatusColor(agent.status))}>
                    {getStatusText(agent.status)}
                  </span>
                </div>
                {agent.description && (
                  <p className="text-sm text-dark-500 truncate mt-0.5">
                    {agent.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-dark-400">
                    Last active: {agent.lastActive.toLocaleTimeString()}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Auto-receive toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAutoReceive(agent.id, !agent.autoReceiveCalls);
                      }}
                      className={clsx(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                        agent.autoReceiveCalls
                          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                          : 'bg-dark-300 text-dark-500 hover:bg-dark-200'
                      )}
                      title={agent.autoReceiveCalls ? 'Auto-receive calls enabled' : 'Auto-receive calls disabled'}
                    >
                      {agent.autoReceiveCalls ? (
                        <Phone size={12} />
                      ) : (
                        <PhoneOff size={12} />
                      )}
                      <span>{agent.autoReceiveCalls ? 'Auto' : 'Manual'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {agents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <Bot size={48} className="text-dark-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Agents Yet</h3>
            <p className="text-dark-500 mb-4">
              Create your first AI agent to get started with phone calls.
            </p>
            <button
              onClick={onNewAgent}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Create Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 