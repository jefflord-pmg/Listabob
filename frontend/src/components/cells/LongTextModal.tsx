import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Modal } from '../ui/Modal';

interface LongTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function LongTextModal({ isOpen, onClose, title, value, onChange }: LongTextModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEditValue(value || '');
      setIsEditing(false);
    }
  }, [isOpen, value]);

  const handleSave = () => {
    const newValue = editValue.trim() || null;
    onChange(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-3xl w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1" />
        {isEditing ? (
          <>
            <button className="btn btn-sm" onClick={handleCancel}>
              Cancel
            </button>
            <button className="btn btn-sm btn-primary" onClick={handleSave}>
              Save
            </button>
          </>
        ) : (
          <button className="btn btn-sm btn-ghost" onClick={() => setIsEditing(true)}>
            ✎ Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <textarea
          className="textarea textarea-bordered w-full font-mono text-sm"
          style={{ minHeight: '400px', resize: 'vertical' }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="Write markdown here..."
          autoFocus
        />
      ) : (
        <div
          className="prose prose-sm max-w-none min-h-[200px] p-3 rounded-lg bg-base-200 cursor-pointer hover:bg-base-300 transition-colors"
          onClick={() => setIsEditing(true)}
          title="Click to edit"
        >
          {value ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <span className="text-base-content/40 not-prose">
              No content — click to edit
            </span>
          )}
        </div>
      )}
    </Modal>
  );
}
