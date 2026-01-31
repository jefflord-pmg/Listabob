import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useSettings } from '../../contexts/SettingsContext';

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

export function SystemModal({ isOpen, onClose, onLogout }: SystemModalProps) {
  const { settings, updateSettings } = useSettings();
  const [stats, setStats] = useState<SystemStats | null>(null);
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

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      fetchConfig();
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

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system/config');
      if (response.ok) {
        const data = await response.json();
        if (data.backup_path) setBackupPath(data.backup_path);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
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
        // Log out after a short delay
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

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="System Settings">
      <div className="space-y-6">
        {/* Messages */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <span>{success}</span>
          </div>
        )}

        {/* Database Stats */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Database Statistics
          </h3>
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

        <div className="divider"></div>

        {/* Preferences Section */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </h3>
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
        </div>

        <div className="divider"></div>

        {/* Backup Section */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Database Backup
          </h3>
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

        {/* Change Password Section */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change Password
          </h3>
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

        <div className="modal-action">
          <button className="btn" onClick={handleClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
