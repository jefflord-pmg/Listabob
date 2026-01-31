import { useState } from 'react';

interface DateCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
  includeTime?: boolean;
}

export function DateCell({ value, onChange, includeTime = false }: DateCellProps) {
  const [isEditing, setIsEditing] = useState(false);

  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    try {
      // For date-only strings (YYYY-MM-DD), parse as local date to avoid timezone shift
      if (!includeTime && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  const formatDisplay = (dateStr: string | null) => {
    const date = parseDate(dateStr);
    if (!date) return '';
    try {
      if (includeTime) {
        return date.toLocaleString();
      }
      return date.toLocaleDateString();
    } catch {
      return dateStr || '';
    }
  };

  const formatForInput = (dateStr: string | null) => {
    const date = parseDate(dateStr);
    if (!date) return '';
    try {
      if (includeTime) {
        // For datetime, use local ISO format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
      // For date-only, format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
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
