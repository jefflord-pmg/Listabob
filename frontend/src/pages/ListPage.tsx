import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useList, useUpdateList, useDeleteList } from '../hooks/useLists';
import { useItems } from '../hooks/useItems';
import { GridView } from '../components/views';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal, Modal } from '../components/ui';

export function ListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: list, isLoading: listLoading, error: listError } = useList(id!);
  const { data: items, isLoading: itemsLoading } = useItems(id!);
  const updateList = useUpdateList();
  const deleteList = useDeleteList();
  
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (listLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (listError || !list) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          <span>List not found</span>
        </div>
        <Link to="/" className="btn btn-ghost mt-4">← Back to Home</Link>
      </div>
    );
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    await deleteList.mutateAsync(list.id);
    navigate('/');
  };

  const toggleFavorite = () => {
    updateList.mutate({ id: list.id, is_favorite: !list.is_favorite });
  };

  const handleExport = (includeHeader: boolean) => {
    const url = `/api/export/csv/${list.id}?include_header=${includeHeader}`;
    window.location.href = url;
  };

  const openRenameModal = () => {
    setNewName(list.name);
    setIsRenameModalOpen(true);
  };

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== list.name) {
      updateList.mutate({ id: list.id, name: newName.trim() });
    }
    setIsRenameModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-base-300 p-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="btn btn-ghost btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-2xl">{list.icon || '📋'}</span>
          <h1 className="text-xl font-bold flex-1">{list.name}</h1>
          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleFavorite}
          >
            {list.is_favorite ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
          </button>
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </label>
            <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow bg-base-200 rounded-box w-52">
              <li><button onClick={openRenameModal}>Rename List</button></li>
              <li className="divider"></li>
              <li className="menu-title"><span>Export CSV</span></li>
              <li><button onClick={() => handleExport(true)}>With Headers</button></li>
              <li><button onClick={() => handleExport(false)}>Without Headers</button></li>
              <li className="divider"></li>
              <li><button onClick={handleDelete} className="text-error">Delete List</button></li>
            </ul>
          </div>
        </div>
        {list.description && (
          <p className="text-base-content/70 mt-2 ml-14">{list.description}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {list.columns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base-content/70">No columns yet. Add columns to start tracking data.</p>
          </div>
        ) : (
          <GridView 
            listId={list.id} 
            columns={list.columns} 
            items={items || []} 
            views={list.views || []}
          />
        )}
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title="Rename List"
      >
        <div className="form-control">
          <label className="label" htmlFor="list-name">
            <span className="label-text">List Name</span>
          </label>
          <input
            id="list-name"
            type="text"
            className="input input-bordered"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                handleRename();
              }
            }}
          />
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => setIsRenameModalOpen(false)}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleRename}
            disabled={!newName.trim()}
          >
            Save
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete List"
        message={`Are you sure you want to delete "${list.name}"? This will delete all items and cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
