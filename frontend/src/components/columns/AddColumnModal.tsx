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

const DATE_DEFAULT_OPTIONS = [
  { value: '', label: 'No default' },
  { value: 'today', label: 'Today' },
  { value: 'now', label: 'Now (current time)' },
  { value: '+1 days', label: 'Tomorrow' },
  { value: '+7 days', label: 'In 1 week' },
  { value: '+30 days', label: 'In 30 days' },
];

export function AddColumnModal({ isOpen, onClose, onAdd }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [columnType, setColumnType] = useState<ColumnType>('text');
  const [choices, setChoices] = useState<string[]>(['']);
  const [defaultValue, setDefaultValue] = useState<string>('');
  const [customDateDefault, setCustomDateDefault] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const config: Record<string, unknown> = {};
    
    if (columnType === 'choice' || columnType === 'multiple_choice') {
      const validChoices = choices.filter(c => c.trim());
      if (validChoices.length > 0) {
        config.choices = validChoices;
      }
      if (defaultValue) {
        config.default_value = defaultValue;
      }
    } else if (columnType === 'date' || columnType === 'datetime') {
      const dateDefault = defaultValue === 'custom' ? customDateDefault : defaultValue;
      if (dateDefault) {
        config.default_value = dateDefault;
      }
    } else if (columnType === 'boolean') {
      if (defaultValue === 'true' || defaultValue === 'false') {
        config.default_value = defaultValue === 'true';
      }
    } else if (defaultValue) {
      config.default_value = columnType === 'number' || columnType === 'currency' || columnType === 'rating'
        ? parseFloat(defaultValue) || undefined
        : defaultValue;
    }

    onAdd(name.trim(), columnType, Object.keys(config).length > 0 ? config : undefined);
    
    // Reset form
    setName('');
    setColumnType('text');
    setChoices(['']);
    setDefaultValue('');
    setCustomDateDefault('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setColumnType('text');
    setChoices(['']);
    setDefaultValue('');
    setCustomDateDefault('');
    onClose();
  };

  const handleTypeChange = (newType: ColumnType) => {
    setColumnType(newType);
    setDefaultValue('');
    setCustomDateDefault('');
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
  const isDateType = columnType === 'date' || columnType === 'datetime';
  const isBooleanType = columnType === 'boolean';
  const isNumberType = columnType === 'number' || columnType === 'currency' || columnType === 'rating';
  const isTextType = columnType === 'text' || columnType === 'hyperlink';

  const renderDefaultValueInput = () => {
    if (needsChoices) {
      const validChoices = choices.filter(c => c.trim());
      if (validChoices.length === 0) return null;
      return (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Default Value</span>
          </label>
          <select
            className="select select-bordered select-sm w-full"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
          >
            <option value="">No default</option>
            {validChoices.map((choice) => (
              <option key={choice} value={choice}>{choice}</option>
            ))}
          </select>
        </div>
      );
    }

    if (isDateType) {
      return (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Default Value</span>
          </label>
          <select
            className="select select-bordered select-sm w-full"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
          >
            {DATE_DEFAULT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            <option value="custom">Custom (e.g., "+3 days")</option>
          </select>
          {defaultValue === 'custom' && (
            <input
              type="text"
              className="input input-bordered input-sm w-full mt-2"
              placeholder="e.g., +3 days, -1 week"
              value={customDateDefault}
              onChange={(e) => setCustomDateDefault(e.target.value)}
            />
          )}
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              Supports: today, now, +N days, +N weeks
            </span>
          </label>
        </div>
      );
    }

    if (isBooleanType) {
      return (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Default Value</span>
          </label>
          <select
            className="select select-bordered select-sm w-full"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
          >
            <option value="">No default</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      );
    }

    if (isNumberType) {
      return (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Default Value</span>
          </label>
          <input
            type="number"
            className="input input-bordered input-sm w-full"
            placeholder="Enter default number"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
          />
        </div>
      );
    }

    if (isTextType) {
      return (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Default Value</span>
          </label>
          <input
            type="text"
            className="input input-bordered input-sm w-full"
            placeholder="Enter default text"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
          />
        </div>
      );
    }

    return null;
  };

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
            onChange={(e) => handleTypeChange(e.target.value as ColumnType)}
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

        {/* Default Value */}
        {renderDefaultValueInput()}

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
