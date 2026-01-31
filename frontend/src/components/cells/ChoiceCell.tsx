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
  const [filterText, setFilterText] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilterText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getColorClass = (choice: string) => {
    const index = choices.indexOf(choice);
    return CHOICE_COLORS[index % CHOICE_COLORS.length];
  };

  const selectedValues = multiple && value 
    ? (typeof value === 'string' ? value.split(',').filter(Boolean) : (value as unknown as string[]))
    : (value ? [value] : []);

  const filteredChoices = choices.filter(choice =>
    choice.toLowerCase().includes(filterText.toLowerCase())
  );

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
      setFilterText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setFilterText('');
    } else if (e.key === 'Enter' && filteredChoices.length === 1) {
      handleSelect(filteredChoices[0]);
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFilterText('');
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded flex flex-wrap gap-1"
        onClick={handleOpen}
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
        <div className="absolute top-full left-0 mt-1 z-50 bg-base-200 rounded-box shadow-lg min-w-[150px] max-h-64 flex flex-col">
          <div className="p-1 border-b border-base-300">
            <input
              ref={inputRef}
              type="text"
              className="input input-xs input-bordered w-full"
              placeholder="Type to filter..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="overflow-auto py-1">
            {filteredChoices.length > 0 ? (
              filteredChoices.map((choice) => (
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
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-base-content/50">No matches</div>
            )}
            {value && !multiple && !filterText && (
              <button
                className="w-full text-left px-3 py-1 hover:bg-base-300 text-sm text-base-content/50"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setFilterText('');
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
