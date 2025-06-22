import React, { useState } from 'react';
import { 
  Save, 
  Upload, 
  Trash2, 
  File, 
  FileText, 
  Image, 
  Music, 
  Video,
  Download,
  Edit3
} from 'lucide-react';
import { FileItem } from '../types';
import clsx from 'clsx';

interface StatusPanelProps {
  context: string;
  files: FileItem[];
  isContextUpdating: boolean;
  onContextUpdate: (context: string) => void;
  onFileUpload: (files: FileList) => void;
  onFileDelete: (fileId: string) => void;
  onFileDownload: (file: FileItem) => void;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  context,
  files,
  isContextUpdating,
  onContextUpdate,
  onFileUpload,
  onFileDelete,
  onFileDownload,
}) => {
  const [localContext, setLocalContext] = useState(context);
  const [isEditing, setIsEditing] = useState(false);

  const handleContextSave = () => {
    onContextUpdate(localContext);
    setIsEditing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileUpload(e.target.files);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    if (type.startsWith('video/')) return <Video size={16} className="text-purple-500" />;
    if (type.startsWith('audio/')) return <Music size={16} className="text-green-500" />;
    if (type.includes('text') || type.includes('json')) return <FileText size={16} className="text-yellow-500" />;
    return <File size={16} className="text-dark-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-dark-100 border-l border-dark-200">
      {/* Context Section */}
      <div className="p-4 border-b border-dark-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Context</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 text-dark-400 hover:text-white transition-colors"
            title="Edit context"
          >
            <Edit3 size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={localContext}
                onChange={(e) => setLocalContext(e.target.value)}
                placeholder="Enter context information for the AI agent..."
                className="w-full h-32 p-3 bg-dark-200 border border-dark-300 rounded-lg text-white placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleContextSave}
                  disabled={isContextUpdating}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isContextUpdating
                      ? 'bg-dark-300 text-dark-500 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  )}
                >
                  <Save size={14} />
                  {isContextUpdating ? 'Updating...' : 'Update'}
                </button>
                <button
                  onClick={() => {
                    setLocalContext(context);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 bg-dark-300 hover:bg-dark-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className="min-h-[8rem] p-3 bg-dark-200 border border-dark-300 rounded-lg text-dark-300 text-sm cursor-pointer hover:bg-dark-200/70 transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {context || (
                <span className="text-dark-500 italic">
                  Click to add context information...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Management Section */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-dark-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Files</h3>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg cursor-pointer transition-colors text-sm font-medium">
              <Upload size={14} />
              Upload
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-sm text-dark-500">
            {files.length} file{files.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Upload size={48} className="text-dark-400 mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No Files</h4>
              <p className="text-dark-500 mb-4 text-sm">
                Upload files to provide additional context to your AI agents.
              </p>
              <label className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg cursor-pointer transition-colors">
                <Upload size={16} />
                Upload Files
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="p-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-dark-200/50 hover:bg-dark-200 rounded-lg mb-2 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate text-sm">
                      {file.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-dark-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.uploadDate.toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onFileDownload(file)}
                      className="p-1.5 text-dark-400 hover:text-white transition-colors"
                      title="Download file"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => onFileDelete(file.id)}
                      className="p-1.5 text-dark-400 hover:text-red-400 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 