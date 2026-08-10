import { useState } from 'react';
import { LongTextModal } from './LongTextModal';

interface LongTextCellProps {
  value: string | null;
  columnName: string;
  onChange: (value: string | null) => void;
}

export function LongTextCell({ value, columnName, onChange }: LongTextCellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const preview = value
    ? value.replace(/[#*`_~[\]]/g, '').replace(/\n+/g, ' ').trim().slice(0, 60) +
      (value.length > 60 ? '…' : '')
    : null;

  const openModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <>
      <div className="flex items-center gap-1 min-h-[1.5rem] px-2 py-1">
        <button
          className="text-sm truncate flex-1 text-left hover:text-primary transition-colors"
          onClick={openModal}
          title="Open text editor"
        >
          {preview ? (
            <span className="text-base-content/70 hover:text-primary">{preview}</span>
          ) : (
            <span className="text-base-content/30">No content</span>
          )}
        </button>
        {value && (
          <button
            className="btn btn-ghost btn-xs shrink-0 opacity-60 hover:opacity-100"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy text'}
          >
            {copied ? '✓' : '⎘'}
          </button>
        )}
        <button
          className="btn btn-ghost btn-xs shrink-0 opacity-60 hover:opacity-100"
          onClick={openModal}
          title="Open text editor"
        >
          ⤢
        </button>
      </div>

      <LongTextModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={columnName}
        value={value}
        onChange={(v) => {
          onChange(v);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
