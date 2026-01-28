import { useState } from 'react';

interface HyperlinkCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function HyperlinkCell({ value, onChange }: HyperlinkCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const startEditing = () => {
    setEditValue(value || '');
    setIsEditing(true);
  };

  const save = () => {
    onChange(editValue.trim() || null);
    setIsEditing(false);
  };

  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  if (isEditing) {
    return (
      <input
        type="url"
        className="input input-sm input-bordered w-full"
        placeholder="https://example.com"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        autoFocus
      />
    );
  }

  if (value && isValidUrl(value)) {
    return (
      <div className="flex items-center gap-1 min-h-[1.5rem] px-2 py-1">
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="link link-primary text-sm truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {new URL(value).hostname}
        </a>
        <button
          className="btn btn-ghost btn-xs opacity-50 hover:opacity-100"
          onClick={startEditing}
        >
          ✎
        </button>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded"
      onClick={startEditing}
    >
      {value || <span className="text-base-content/30">Add link...</span>}
    </div>
  );
}
