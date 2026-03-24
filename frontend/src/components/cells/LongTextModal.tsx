import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
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
          <>
            {value && (
              <button className="btn btn-sm btn-ghost" onClick={handleCopy} title="Copy markdown source">
                {copied ? '✓ Copied' : '⎘ Copy'}
              </button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={() => setIsEditing(true)}>
              ✎ Edit
            </button>
          </>
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
        <div className="min-h-[200px] p-4 rounded-lg bg-base-200 overflow-auto">
          {value ? (
            <div className="prose prose-sm max-w-none
              prose-headings:text-base-content
              prose-p:text-base-content
              prose-strong:text-base-content
              prose-code:text-base-content prose-code:bg-base-300 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-base-300 prose-pre:text-base-content
              prose-a:text-primary
              prose-li:text-base-content
              prose-table:text-base-content
              prose-th:text-base-content prose-th:bg-base-300
              prose-td:text-base-content
              [&_table]:border-collapse [&_table]:w-full
              [&_th]:border [&_th]:border-base-content/20 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left
              [&_td]:border [&_td]:border-base-content/20 [&_td]:px-3 [&_td]:py-2
              [&_tr:nth-child(even)]:bg-base-300/50
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:text-base-content/70
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <span className="text-base-content/40 text-sm">
              No content — click Edit to add content
            </span>
          )}
        </div>
      )}
    </Modal>
  );
}
