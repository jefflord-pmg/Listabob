import { useState } from 'react';
import { LongTextModal } from './LongTextModal';

interface LongTextCellProps {
  value: string | null;
  columnName: string;
  onChange: (value: string | null) => void;
}

export function LongTextCell({ value, columnName, onChange }: LongTextCellProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const preview = value
    ? value.replace(/[#*`_~[\]]/g, '').replace(/\n+/g, ' ').trim().slice(0, 60) +
      (value.length > 60 ? '…' : '')
    : null;

  return (
    <>
      <div className="flex items-center gap-1 min-h-[1.5rem] px-2 py-1">
        {preview ? (
          <span className="text-sm truncate flex-1 text-base-content/70">{preview}</span>
        ) : (
          <span className="text-sm flex-1 text-base-content/30">No content</span>
        )}
        <button
          className="btn btn-ghost btn-xs shrink-0 opacity-60 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
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
