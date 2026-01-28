import { useState } from 'react';

interface DateCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
  includeTime?: boolean;
}

export function DateCell({ value, onChange, includeTime = false }: DateCellProps) {
  const [isEditing, setIsEditing] = useState(false);

  const formatDisplay = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (includeTime) {
        return date.toLocaleString();
      }
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const formatForInput = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (includeTime) {
        return date.toISOString().slice(0, 16);
      }
      return date.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  if (isEditing) {
    return (
      <input
        type={includeTime ? 'datetime-local' : 'date'}
        className="input input-sm input-bordered w-full"
        value={formatForInput(value)}
        onChange={(e) => onChange(e.target.value || null)}
        onBlur={() => setIsEditing(false)}
        autoFocus
      />
    );
  }

  return (
    <div
      className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded"
      onClick={() => setIsEditing(true)}
    >
      {formatDisplay(value) || <span className="text-base-content/30">Select date...</span>}
    </div>
  );
}
