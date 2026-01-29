import { useState, useEffect } from 'react';
import type { Column } from '../../types';
import { ConfirmModal } from '../ui';

interface EditColumnModalProps {
  isOpen: boolean;
  column: Column | null;
  onClose: () => void;
  onSave: (columnId: string, updates: { name?: string; config?: Record<string, unknown> }) => void;
  onDelete: (columnId: string) => void;
}

export function EditColumnModal({ isOpen, column, onClose, onSave, onDelete }: EditColumnModalProps) {
  const [name, setName] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (column) {
      setName(column.name);
      if (column.column_type === 'choice' || column.column_type === 'multiple_choice') {
        setChoices((column.config?.choices as string[]) || []);
      } else {
        setChoices([]);
      }
    }
  }, [column]);

  if (!isOpen || !column) return null;

  const hasChoices = column.column_type === 'choice' || column.column_type === 'multiple_choice';

  const handleSave = () => {
    const updates: { name?: string; config?: Record<string, unknown> } = {};
    
    if (name.trim() !== column.name) {
      updates.name = name.trim();
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
      <dialog className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Edit Column</h3>
          
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Column Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Column name"
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Column Type</span>
            </label>
            <input
              type="text"
              className="input input-bordered bg-base-200"
              value={getColumnTypeLabel(column.column_type)}
              disabled
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">Column type cannot be changed</span>
            </label>
          </div>

          {hasChoices && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Options</span>
              </label>
              <div className="space-y-2">
                {choices.map((choice, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered input-sm flex-1"
                      value={choice}
                      onChange={(e) => handleChoiceChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => handleRemoveChoice(index)}
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
          
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
      </dialog>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Column"
        message={`Are you sure you want to delete the column "${column.name}"? This will also delete all data in this column. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
