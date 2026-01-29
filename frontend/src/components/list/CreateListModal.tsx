import { useState } from 'react';
import { useCreateList } from '../../hooks/useLists';
import { Modal } from '../ui/Modal';
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

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New List">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label" htmlFor="list-name">
            <span className="label-text">Name</span>
          </label>
          <input
            id="list-name"
            type="text"
            placeholder="My List"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-control">
          <label className="label" htmlFor="list-description">
            <span className="label-text">Description (optional)</span>
          </label>
          <textarea
            id="list-description"
            placeholder="What is this list for?"
            className="textarea textarea-bordered w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="modal-action">
          <button type="button" className="btn" onClick={handleClose}>
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
    </Modal>
  );
}
