import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { ListSummary } from '../../types';
import { useUpdateList } from '../../hooks/useLists';
import { Modal } from '../ui';
import { ColorIconPicker } from './ColorIconPicker';

interface ListCardProps {
  list: ListSummary;
}

export function ListCard({ list }: ListCardProps) {
  const updateList = useUpdateList();
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editColor, setEditColor] = useState<string | null>(null);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateList.mutate({ id: list.id, is_favorite: !list.is_favorite });
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const openSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditName(list.name);
    setEditIcon(list.icon);
    setEditColor(list.color);
    setShowMenu(false);
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    const updates: { name?: string; icon?: string; color?: string } = {};
    
    if (editName.trim() && editName.trim() !== list.name) {
      updates.name = editName.trim();
    }
    if (editIcon !== list.icon) {
      updates.icon = editIcon || undefined;
    }
    if (editColor !== list.color) {
      updates.color = editColor || undefined;
    }
    
    if (Object.keys(updates).length > 0) {
      updateList.mutate({ id: list.id, ...updates });
    }
    setShowSettings(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking menu area
    if ((e.target as HTMLElement).closest('.card-menu')) {
      e.preventDefault();
      return;
    }
  };

  const defaultColor = '#64748b'; // slate-500 as fallback

  return (
    <>
      <Link
        to={`/list/${list.id}`}
        className="card bg-base-200 hover:shadow-lg transition-all cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Colored header area */}
        <div 
          className="h-20 relative flex items-center justify-center rounded-t-2xl"
          style={{ backgroundColor: list.color || defaultColor }}
        >
          {/* Icon */}
          <span className="text-4xl drop-shadow-md">
            {list.icon || '📋'}
          </span>
          
          {/* Favorite star */}
          <button
            onClick={toggleFavorite}
            className="absolute top-2 right-2 btn btn-ghost btn-xs btn-circle text-white/80 hover:text-white hover:bg-white/20"
            aria-label={list.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {list.is_favorite ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
          </button>
        </div>

        {/* Card body */}
        <div className="card-body p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="card-title text-sm font-medium truncate flex-1">{list.name}</h3>
            
            {/* Menu dropdown */}
            <div className="card-menu relative">
              <button
                onClick={handleMenuClick}
                className="btn btn-ghost btn-xs btn-circle"
                aria-label="List options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div 
                    className="fixed inset-0 z-[99]" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); }}
                  />
                  <ul className="absolute right-0 top-full mt-1 z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-40">
                    <li><button onClick={openSettings}>Settings</button></li>
                  </ul>
                </>
              )}
            </div>
          </div>
          
          <div className="text-xs text-base-content/50">
            Updated {formatDistanceToNow(new Date(list.updated_at + 'Z'), { addSuffix: true })}
          </div>
        </div>
      </Link>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="List Settings"
      >
        <div className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="card-list-name">
              <span className="label-text">List Name</span>
            </label>
            <input
              id="card-list-name"
              type="text"
              className="input input-bordered"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
          </div>
          
          <ColorIconPicker
            selectedColor={editColor}
            selectedIcon={editIcon}
            onColorChange={setEditColor}
            onIconChange={setEditIcon}
          />
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveSettings}
            disabled={!editName.trim()}
          >
            Save
          </button>
        </div>
      </Modal>
    </>
  );
}
