import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useSettings } from '../../contexts/SettingsContext';
import { chatApi } from '../../api/chat';
import type { GeminiModel } from '../../types';

interface SystemStats {
  total_lists: number;
  total_items: number;
  total_columns: number;
  total_views: number;
  total_values: number;
  database_size_mb: number;
}

interface SystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

type SettingsTab = 'overview' | 'preferences' | 'ai' | 'backup';

export function SystemModal({ isOpen, onClose, onLogout }: SystemModalProps) {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [version, setVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Backup
  const [backupPath, setBackupPath] = useState('');
  const [backingUp, setBackingUp] = useState(false);

  // Gemini AI
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('');
  const [geminiSystemPrompt, setGeminiSystemPrompt] = useState('');
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showPromptHelp, setShowPromptHelp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      fetchConfig();
      fetchVersion();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersion = async () => {
    try {
      const response = await fetch('/api/system/version');
      if (response.ok) {
        const data = await response.json();
        setVersion(data.version);
      }
    } catch (err) {
      console.error('Failed to fetch version:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system/config');
      if (response.ok) {
        const data = await response.json();
        if (data.backup_path) setBackupPath(data.backup_path);
        if (data.gemini_api_key) setGeminiApiKey(data.gemini_api_key);
        if (data.gemini_model) setGeminiModel(data.gemini_model);
        if (data.gemini_system_prompt) setGeminiSystemPrompt(data.gemini_system_prompt);
        if (data.gemini_api_key) {
          fetchModels();
        }
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const models = await chatApi.getModels();
      setAvailableModels(models);
    } catch {
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);
    
    if (!currentPassword || !newPassword) {
      setError('Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }
    
    setChangingPassword(true);
    try {
      const response = await fetch('/api/system/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      
      if (response.ok) {
        setSuccess('Password changed! You will be logged out.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onLogout();
          onClose();
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleBackup = async () => {
    setError(null);
    setSuccess(null);
    
    if (!backupPath.trim()) {
      setError('Please specify a backup path');
      return;
    }
    
    setBackingUp(true);
    try {
      const response = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_path: backupPath }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Backup created: ${data.backup_file}`);
      } else {
        setError(data.detail || 'Backup failed');
      }
    } catch (err) {
      setError('Backup failed');
    } finally {
      setBackingUp(false);
    }
  };

  const handleTriStateSortChange = async (enabled: boolean) => {
    updateSettings({ useTriStateSort: enabled });
    try {
      await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_tristate_sort: enabled }),
      });
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  };

  const handleUnknownSortPositionChange = async (position: 'top' | 'bottom') => {
    updateSettings({ unknownSortPosition: position });
    try {
      await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unknown_sort_position: position }),
      });
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  };

  const handleConfirmDeleteChange = async (enabled: boolean) => {
    updateSettings({ confirmDelete: enabled });
    try {
      await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_delete: enabled }),
      });
    } catch (err) {
      console.error('Failed to save setting:', err);
    }
  };

  const handleSaveGeminiSettings = async () => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: geminiApiKey || null,
          gemini_model: geminiModel || null,
          gemini_system_prompt: geminiSystemPrompt || null,
        }),
      });
      if (response.ok) {
        setSuccess('AI settings saved');
        if (geminiApiKey) {
          fetchModels();
        }
      } else {
        setError('Failed to save AI settings');
      }
    } catch (err) {
      console.error('Failed to save AI settings:', err);
      setError('Failed to save AI settings');
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleTabChange = (tab: SettingsTab) => {
    setError(null);
    setSuccess(null);
    setActiveTab(tab);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="System Settings" className="max-w-2xl">
      {/* Tab bar */}
      <div role="tablist" className="tabs tabs-bordered -mt-2 mb-4 flex-shrink-0">
        <button role="tab" className={`tab ${activeTab === 'overview' ? 'tab-active' : ''}`} onClick={() => handleTabChange('overview')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Overview
        </button>
        <button role="tab" className={`tab ${activeTab === 'preferences' ? 'tab-active' : ''}`} onClick={() => handleTabChange('preferences')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Preferences
        </button>
        <button role="tab" className={`tab ${activeTab === 'ai' ? 'tab-active' : ''}`} onClick={() => handleTabChange('ai')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI
        </button>
        <button role="tab" className={`tab ${activeTab === 'backup' ? 'tab-active' : ''}`} onClick={() => handleTabChange('backup')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Backup
        </button>
      </div>

      {/* Status messages */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {version && (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <span className="font-medium">Version</span>
              <span className="font-mono badge badge-ghost badge-sm">{version}</span>
            </div>
          )}
          <h3 className="font-semibold text-base text-base-content/70">Database Statistics</h3>
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="stat bg-base-200 rounded-lg p-3">
                <div className="stat-title text-xs">Lists</div>
                <div className="stat-value text-2xl">{stats.total_lists}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-3">
                <div className="stat-title text-xs">Items</div>
                <div className="stat-value text-2xl">{stats.total_items}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-3">
                <div className="stat-title text-xs">Columns</div>
                <div className="stat-value text-2xl">{stats.total_columns}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-3">
                <div className="stat-title text-xs">Views</div>
                <div className="stat-value text-2xl">{stats.total_views}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-3">
                <div className="stat-title text-xs">Values</div>
                <div className="stat-value text-2xl">{stats.total_values}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg p-3">
                <div className="stat-title text-xs">DB Size</div>
                <div className="stat-value text-2xl">{stats.database_size_mb} <span className="text-sm">MB</span></div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.useTriStateSort}
                onChange={(e) => handleTriStateSortChange(e.target.checked)}
              />
              <div>
                <span className="label-text font-medium">Use tri-state sort</span>
                <p className="text-xs text-base-content/60 mt-0.5">
                  {settings.useTriStateSort 
                    ? "Click cycles: ascending → descending → unsorted" 
                    : "Click cycles: ascending → descending only"}
                </p>
              </div>
            </label>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Where to sort unknown values</span>
            </label>
            <select
              className="select select-bordered select-sm w-full max-w-xs"
              value={settings.unknownSortPosition}
              onChange={(e) => handleUnknownSortPositionChange(e.target.value as 'top' | 'bottom')}
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
            </select>
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                Items with empty/unknown values are placed at the {settings.unknownSortPosition} when sorting
              </span>
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.confirmDelete}
                onChange={(e) => handleConfirmDeleteChange(e.target.checked)}
              />
              <div>
                <span className="label-text font-medium">Confirm before deleting</span>
                <p className="text-xs text-base-content/60 mt-0.5">
                  {settings.confirmDelete
                    ? "Show confirmation dialog before deleting items"
                    : "Delete items immediately (they go to Recycle Bin)"}
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* AI Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Gemini API Key</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="input input-bordered w-full"
              placeholder={geminiApiKey ? '(key saved — enter new value to change)' : 'Enter your Google Gemini API key'}
              value={geminiApiKey}
              onChange={(e) => {
                setGeminiApiKey(e.target.value);
                setAvailableModels([]);
              }}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                Get a key from{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="link link-primary">
                  Google AI Studio
                </a>
              </span>
            </label>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Default Model</span>
            </label>
            {loadingModels ? (
              <div className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                <span className="text-sm text-base-content/60">Loading models...</span>
              </div>
            ) : availableModels.length > 0 ? (
              <select
                className="select select-bordered w-full"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              >
                <option value="">Default (gemini-2.0-flash)</option>
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder="e.g. gemini-2.0-flash"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                />
                {geminiApiKey && (
                  <button
                    className="btn btn-ghost btn-sm self-center"
                    onClick={fetchModels}
                    title="Load models"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                You can also select a model in the chat modal
              </span>
            </label>
          </div>
          <div className="form-control">
            <div className="label">
              <span className="label-text">System Prompt</span>
              <button
                type="button"
                className="label-text-alt link link-primary text-xs"
                onClick={() => setShowPromptHelp(h => !h)}
              >
                {showPromptHelp ? 'hide help' : 'show help'}
              </button>
            </div>
            {showPromptHelp && (
              <div className="text-xs text-base-content/60 bg-base-200 rounded-lg p-3 mb-2 leading-relaxed">
                Use <code className="bg-base-300 px-1 rounded">{'{list_name}'}</code> for the list name and{' '}
                <code className="bg-base-300 px-1 rounded">{'{item_context_str}'}</code> for the current item's data.
                Leave empty to use the default prompt.
              </div>
            )}
            <textarea
              className="textarea textarea-bordered w-full font-mono text-xs"
              rows={6}
              placeholder="Leave empty for default prompt"
              value={geminiSystemPrompt}
              onChange={(e) => setGeminiSystemPrompt(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveGeminiSettings}
          >
            Save AI Settings
          </button>
        </div>
      )}

      {/* Backup & Security Tab */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Database Backup */}
          <div>
            <h3 className="font-semibold text-base text-base-content/70 mb-3">Database Backup</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Backup Directory Path</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="C:\Backups\Listabob or /home/user/backups"
                value={backupPath}
                onChange={(e) => setBackupPath(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt">The backup file will be timestamped automatically</span>
              </label>
            </div>
            <button
              className="btn btn-primary mt-2"
              onClick={handleBackup}
              disabled={backingUp || !backupPath.trim()}
            >
              {backingUp ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Backing up...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Create Backup
                </>
              )}
            </button>
          </div>

          <div className="divider"></div>

          {/* Change Password */}
          <div>
            <h3 className="font-semibold text-base text-base-content/70 mb-3">Change Password</h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Current Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                className="btn btn-warning"
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="modal-action mt-4">
        <button className="btn" onClick={handleClose}>Close</button>
      </div>
    </Modal>
  );
}

interface SystemStats {
  total_lists: number;
  total_items: number;
  total_columns: number;
  total_views: number;
  total_values: number;
  database_size_mb: number;
}
