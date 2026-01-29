import { useState, useEffect, useMemo } from 'react';
import type { Column, ColumnType, Item } from '../../types';
import { ConfirmModal } from '../ui';
import { Modal } from '../ui/Modal';

interface EditColumnModalProps {
  isOpen: boolean;
  column: Column | null;
  items: Item[];
  onClose: () => void;
  onSave: (columnId: string, updates: { name?: string; column_type?: ColumnType; config?: Record<string, unknown> }) => void;
  onDelete: (columnId: string) => void;
}

export function EditColumnModal({ isOpen, column, items, onClose, onSave, onDelete }: EditColumnModalProps) {
  const [name, setName] = useState('');
  const [columnType, setColumnType] = useState<ColumnType>('text');
  const [choices, setChoices] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [pendingConvertType, setPendingConvertType] = useState<ColumnType | null>(null);

  // Get unique values from items for this column
  const uniqueValues = useMemo(() => {
    if (!column) return [];
    const values = new Set<string>();
    items.forEach(item => {
      const value = item.values[column.id];
      if (value !== null && value !== undefined && value !== '') {
        values.add(String(value).trim());
      }
    });
    return Array.from(values).sort();
  }, [column, items]);

  useEffect(() => {
    if (column) {
      setName(column.name);
      setColumnType(column.column_type);
      if (column.column_type === 'choice' || column.column_type === 'multiple_choice') {
        setChoices((column.config?.choices as string[]) || []);
      } else {
        setChoices([]);
      }
    }
  }, [column]);

  if (!column) return null;

  const hasChoices = columnType === 'choice' || columnType === 'multiple_choice';
  const isTextType = column.column_type === 'text';
  const canConvert = isTextType;

  const handleSave = () => {
    const updates: { name?: string; column_type?: ColumnType; config?: Record<string, unknown> } = {};
    
    if (name.trim() !== column.name) {
      updates.name = name.trim();
    }
    
    // Check if type changed
    if (columnType !== column.column_type) {
      updates.column_type = columnType;
    }
    
    if (hasChoices) {
      const filteredChoices = choices.filter(c => c.trim());
      updates.config = { ...column.config, choices: filteredChoices };
    }
    
    if (Object.keys(updates).length > 0) {
      onSave(column.id, updates);
    }
    onClose();
  };

  const handleConvertTo = (newType: ColumnType) => {
    setPendingConvertType(newType);
    setShowConvertConfirm(true);
  };

  const confirmConvert = () => {
    if (!pendingConvertType) return;
    
    setColumnType(pendingConvertType);
    // Populate choices with unique values from existing data
    setChoices(uniqueValues);
    setShowConvertConfirm(false);
    setPendingConvertType(null);
  };

  const handleAddChoice = () => {
    setChoices([...choices, '']);
  };

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const handleRemoveChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(column.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const getColumnTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'Text',
      number: 'Number',
      currency: 'Currency',
      date: 'Date',
      datetime: 'Date & Time',
      choice: 'Choice',
      multiple_choice: 'Multiple Choice',
      boolean: 'Yes/No',
      rating: 'Rating',
      hyperlink: 'Hyperlink',
    };
    return labels[type] || type;
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Column">
        <div className="form-control mb-4">
          <label className="label" htmlFor="edit-column-name">
            <span className="label-text">Column Name</span>
          </label>
          <input
            id="edit-column-name"
            type="text"
            className="input input-bordered"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Column name"
          />
        </div>

        <div className="form-control mb-4">
          <label className="label" htmlFor="edit-column-type">
            <span className="label-text">Column Type</span>
          </label>
          <input
            id="edit-column-type"
            type="text"
            className="input input-bordered bg-base-200"
            value={getColumnTypeLabel(columnType)}
            disabled
            aria-describedby="column-type-hint"
          />
          
          {canConvert && columnType === 'text' && (
            <div className="mt-2" id="column-type-hint">
              <span className="label-text-alt text-base-content/60">Convert to:</span>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handleConvertTo('choice')}
                >
                  Choice
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handleConvertTo('multiple_choice')}
                >
                  Multiple Choice
                </button>
              </div>
              {uniqueValues.length > 0 && (
                <p className="text-xs text-base-content/50 mt-1">
                  {uniqueValues.length} unique value{uniqueValues.length !== 1 ? 's' : ''} will become options
                </p>
              )}
            </div>
          )}
          
          {!canConvert && !hasChoices && (
            <label className="label">
              <span className="label-text-alt text-base-content/50">Column type cannot be changed</span>
            </label>
          )}
        </div>

        {hasChoices && (
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Options</span>
            </label>
            <div className="space-y-2 max-h-48 overflow-auto" role="list" aria-label="Column options">
              {choices.map((choice, index) => (
                <div key={index} className="flex gap-2" role="listitem">
                  <input
                    type="text"
                    className="input input-bordered input-sm flex-1"
                    value={choice}
                    onChange={(e) => handleChoiceChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    aria-label={`Option ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => handleRemoveChoice(index)}
                    aria-label={`Remove option ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-2 self-start"
              onClick={handleAddChoice}
            >
              + Add option
            </button>
          </div>
        )}

        <div className="divider"></div>

        <div className="flex justify-between">
          <button
            className="btn btn-error btn-outline"
            onClick={handleDelete}
          >
            Delete Column
          </button>
          
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Column"
        message={`Are you sure you want to delete the column "${column.name}"? This will also delete all data in this column. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={showConvertConfirm}
        title="Convert Column Type"
        message={`Convert "${column.name}" from Text to ${pendingConvertType === 'choice' ? 'Choice' : 'Multiple Choice'}? ${uniqueValues.length > 0 ? `The ${uniqueValues.length} unique value${uniqueValues.length !== 1 ? 's' : ''} will become the options.` : 'No existing values found.'}`}
        confirmText="Convert"
        onConfirm={confirmConvert}
        onCancel={() => {
          setShowConvertConfirm(false);
          setPendingConvertType(null);
        }}
      />
    </>
  );
}
