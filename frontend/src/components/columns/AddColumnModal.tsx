import { useState } from 'react';
import { Modal } from '../ui/Modal';
import type { ColumnType } from '../../types';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, columnType: ColumnType, config?: Record<string, unknown>) => void;
}

const COLUMN_TYPES: { value: ColumnType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line of text' },
  { value: 'number', label: 'Number', description: 'Numeric values' },
  { value: 'currency', label: 'Currency', description: 'Money values with $ symbol' },
  { value: 'date', label: 'Date', description: 'Calendar date' },
  { value: 'datetime', label: 'Date & Time', description: 'Date with time' },
  { value: 'choice', label: 'Choice', description: 'Dropdown with options' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Select multiple options' },
  { value: 'boolean', label: 'Yes/No', description: 'Checkbox true/false' },
  { value: 'rating', label: 'Rating', description: 'Star rating (1-5)' },
  { value: 'hyperlink', label: 'Hyperlink', description: 'URL link' },
];

export function AddColumnModal({ isOpen, onClose, onAdd }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [columnType, setColumnType] = useState<ColumnType>('text');
  const [choices, setChoices] = useState<string[]>(['']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let config: Record<string, unknown> | undefined;
    
    if (columnType === 'choice' || columnType === 'multiple_choice') {
      const validChoices = choices.filter(c => c.trim());
      if (validChoices.length > 0) {
        config = { choices: validChoices };
      }
    }

    onAdd(name.trim(), columnType, config);
    
    // Reset form
    setName('');
    setColumnType('text');
    setChoices(['']);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setColumnType('text');
    setChoices(['']);
    onClose();
  };

  const addChoice = () => {
    setChoices([...choices, '']);
  };

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const removeChoice = (index: number) => {
    if (choices.length > 1) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const needsChoices = columnType === 'choice' || columnType === 'multiple_choice';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Column">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Column Name */}
        <div className="form-control">
          <label className="label" htmlFor="column-name">
            <span className="label-text">Column Name</span>
          </label>
          <input
            id="column-name"
            type="text"
            placeholder="e.g., Status, Due Date, Priority"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Column Type */}
        <div className="form-control">
          <label className="label" htmlFor="column-type">
            <span className="label-text">Column Type</span>
          </label>
          <select
            id="column-type"
            className="select select-bordered w-full"
            value={columnType}
            onChange={(e) => setColumnType(e.target.value as ColumnType)}
          >
            {COLUMN_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
        </div>

        {/* Choice Options (for choice/multiple_choice types) */}
        {needsChoices && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Options</span>
            </label>
            <div className="space-y-2">
              {choices.map((choice, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    className="input input-bordered input-sm flex-1"
                    value={choice}
                    onChange={(e) => updateChoice(index, e.target.value)}
                    aria-label={`Option ${index + 1}`}
                  />
                  {choices.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square"
                      onClick={() => removeChoice(index)}
                      aria-label={`Remove option ${index + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={addChoice}
              >
                + Add option
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal-action">
          <button type="button" className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!name.trim()}
          >
            Add Column
          </button>
        </div>
      </form>
    </Modal>
  );
}
