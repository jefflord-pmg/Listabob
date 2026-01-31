import { useState, useRef, useEffect } from 'react';

interface ChoiceCellProps {
  value: string | null;
  choices: string[];
  onChange: (value: string | null) => void;
  multiple?: boolean;
  autoFocus?: boolean;
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

export function ChoiceCell({ value, choices, onChange, multiple = false, autoFocus = false }: ChoiceCellProps) {
  const [isOpen, setIsOpen] = useState(autoFocus);
  const [filterText, setFilterText] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilterText('');
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const buttons = listRef.current.querySelectorAll('button[data-choice]');
      if (buttons[focusedIndex]) {
        buttons[focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

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
      setFocusedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setFilterText('');
      setFocusedIndex(-1);
    } else if (e.key === 'Tab') {
      // Close dropdown and allow Tab to move to next element
      setIsOpen(false);
      setFilterText('');
      setFocusedIndex(-1);
      // Don't prevent default - let Tab naturally move focus
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => 
        prev < filteredChoices.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0 && focusedIndex < filteredChoices.length) {
      e.preventDefault();
      handleSelect(filteredChoices[focusedIndex]);
    } else if (e.key === 'Enter' && filteredChoices.length === 1) {
      e.preventDefault();
      handleSelect(filteredChoices[0]);
    }
  };

  const openDropdown = () => {
    if (!isOpen) {
      setIsOpen(true);
      setFilterText('');
      setFocusedIndex(-1);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded flex flex-wrap gap-1"
        onClick={openDropdown}
        tabIndex={0}
        onFocus={openDropdown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDropdown();
          }
        }}
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
              onChange={(e) => {
                setFilterText(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div ref={listRef} className="overflow-auto py-1">
            {filteredChoices.length > 0 ? (
              filteredChoices.map((choice, index) => (
                <button
                  key={choice}
                  tabIndex={-1}
                  data-choice={choice}
                  className={`w-full text-left px-3 py-1 hover:bg-base-300 text-sm flex items-center gap-2 ${
                    selectedValues.includes(choice) ? 'bg-base-300' : ''
                  } ${focusedIndex === index ? 'ring-2 ring-primary ring-inset' : ''}`}
                  onClick={() => handleSelect(choice)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {multiple && (
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={selectedValues.includes(choice)}
                      tabIndex={-1}
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
                tabIndex={-1}
                className="w-full text-left px-3 py-1 hover:bg-base-300 text-sm text-base-content/50"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setFilterText('');
                  setFocusedIndex(-1);
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
