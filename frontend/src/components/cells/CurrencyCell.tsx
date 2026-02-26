import { useState } from 'react';

interface CurrencyCellProps {
  value: number | null;
  onChange: (value: number | null) => void;
  symbol?: string;
}

export function CurrencyCell({ value, onChange, symbol = '$' }: CurrencyCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const startEditing = () => {
    setEditValue(value?.toString() || '');
    setIsEditing(true);
  };

  const save = () => {
    const num = parseFloat(editValue);
    const newValue = isNaN(num) ? null : num;
    if (newValue !== value) {
      onChange(newValue);
    }
    setIsEditing(false);
  };

  const formatDisplay = (num: number | null) => {
    if (num === null || num === undefined) return '';
    return `${symbol}${num.toFixed(2)}`;
  };

  if (isEditing) {
    return (
      <div className="flex items-center">
        <span className="text-base-content/50 mr-1">{symbol}</span>
        <input
          type="number"
          step="0.01"
          className="input input-sm input-bordered w-full"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded"
      onClick={startEditing}
    >
      {formatDisplay(value) || <span className="text-base-content/30">{symbol}0.00</span>}
    </div>
  );
}
