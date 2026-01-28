import { useState } from 'react';
import { useCreateList } from '../../hooks/useLists';
import type { ColumnType } from '../../types';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultColumns: { name: string; column_type: ColumnType }[] = [
  { name: 'Title', column_type: 'text' },
];

export function CreateListModal({ isOpen, onClose }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createList = useCreateList();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createList.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        columns: defaultColumns,
      });
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Create New List</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              placeholder="My List"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description (optional)</span>
            </label>
            <textarea
              placeholder="What is this list for?"
              className="textarea textarea-bordered w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || createList.isPending}
            >
              {createList.isPending ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
