import { useState, useRef, useEffect } from 'react';

interface ColumnHeaderMenuProps {
  columnId: string;
  columnName: string;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

export function ColumnHeaderMenu({ columnId, columnName, onRename, onDelete }: ColumnHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(columnName);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsRenaming(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRename = () => {
    if (newName.trim() && newName !== columnName) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete();
    setIsOpen(false);
  };

  if (isRenaming) {
    return (
      <div ref={menuRef} className="flex items-center gap-1">
        <input
          type="text"
          className="input input-xs input-bordered w-24"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') {
              setIsRenaming(false);
              setNewName(columnName);
            }
          }}
          autoFocus
        />
        <button className="btn btn-xs btn-ghost" onClick={handleRename}>✓</button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative inline-flex items-center">
      <button
        className="btn btn-ghost btn-xs opacity-50 hover:opacity-100 px-1"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-base-200 rounded-box shadow-lg py-1 min-w-[120px]">
          <button
            className="w-full text-left px-3 py-1 hover:bg-base-300 text-sm"
            onClick={() => {
              setIsRenaming(true);
              setIsOpen(false);
            }}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-3 py-1 hover:bg-base-300 text-sm text-error"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
