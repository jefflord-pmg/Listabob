import { useState, useRef, useEffect } from 'react';

interface ChoiceCellProps {
  value: string | null;
  choices: string[];
  onChange: (value: string | null) => void;
  multiple?: boolean;
}

const CHOICE_COLORS = [
  'badge-primary',
  'badge-secondary', 
  'badge-accent',
  'badge-info',
  'badge-success',
  'badge-warning',
  'badge-error',
];

export function ChoiceCell({ value, choices, onChange, multiple = false }: ChoiceCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getColorClass = (choice: string) => {
    const index = choices.indexOf(choice);
    return CHOICE_COLORS[index % CHOICE_COLORS.length];
  };

  const selectedValues = multiple && value 
    ? (typeof value === 'string' ? [value] : (value as unknown as string[]))
    : (value ? [value] : []);

  const handleSelect = (choice: string) => {
    if (multiple) {
      const current = selectedValues;
      if (current.includes(choice)) {
        const newValue = current.filter(v => v !== choice);
        onChange(newValue.length > 0 ? newValue.join(',') : null);
      } else {
        onChange([...current, choice].join(','));
      }
    } else {
      onChange(choice);
      setIsOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded flex flex-wrap gap-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedValues.length > 0 ? (
          selectedValues.map((v) => (
            <span key={v} className={`badge badge-sm ${getColorClass(v)}`}>
              {v}
            </span>
          ))
        ) : (
          <span className="text-base-content/30">Select...</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-base-200 rounded-box shadow-lg py-1 min-w-[150px] max-h-48 overflow-auto">
          {choices.map((choice) => (
            <button
              key={choice}
              className={`w-full text-left px-3 py-1 hover:bg-base-300 text-sm flex items-center gap-2 ${
                selectedValues.includes(choice) ? 'bg-base-300' : ''
              }`}
              onClick={() => handleSelect(choice)}
            >
              {multiple && (
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={selectedValues.includes(choice)}
                  readOnly
                />
              )}
              <span className={`badge badge-sm ${getColorClass(choice)}`}>{choice}</span>
            </button>
          ))}
          {value && !multiple && (
            <button
              className="w-full text-left px-3 py-1 hover:bg-base-300 text-sm text-base-content/50"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
