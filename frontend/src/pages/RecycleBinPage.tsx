import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecycleBin, useRestoreFromRecycleBin, usePermanentDeleteFromRecycleBin } from '../hooks/useItems';
import { ConfirmModal } from '../components/ui';

function formatUtcDate(isoString: string): string {
  const s = isoString.endsWith('Z') ? isoString : isoString + 'Z';
  return new Date(s).toLocaleString();
}

export function RecycleBinPage() {
  const { data: deletedItems, isLoading } = useRecycleBin();
  const restoreItem = useRestoreFromRecycleBin();
  const permanentDelete = usePermanentDeleteFromRecycleBin();
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; itemId: string; itemLabel: string }>({
    isOpen: false, itemId: '', itemLabel: ''
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const handlePermanentDelete = (itemId: string, label: string) => {
    setConfirmModal({ isOpen: true, itemId, itemLabel: label });
  };

  const confirmPermanentDelete = () => {
    permanentDelete.mutate(confirmModal.itemId);
    setConfirmModal({ isOpen: false, itemId: '', itemLabel: '' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-base-300 p-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="btn btn-ghost btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-2xl">🗑️</span>
          <h1 className="text-xl font-bold flex-1">Recycle Bin</h1>
          <span className="text-sm text-base-content/60">
            {deletedItems?.length || 0} deleted item{deletedItems?.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!deletedItems || deletedItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">🗑️</p>
            <p className="text-base-content/70">The recycle bin is empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>List</th>
                  <th>Item Preview</th>
                  <th>Deleted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedItems.map((item) => {
                  // Show first few values as preview
                  const preview = Object.values(item.values)
                    .filter(v => v != null && String(v).trim() !== '')
                    .slice(0, 3)
                    .map(v => String(v))
                    .join(' · ');

                  return (
                    <tr key={item.id} className="hover">
                      <td>
                        <Link to={`/list/${item.list_id}`} className="flex items-center gap-2 hover:text-primary">
                          <span
                            className="text-lg w-7 h-7 flex items-center justify-center rounded"
                            style={item.list_color ? { backgroundColor: item.list_color } : undefined}
                          >
                            {item.list_icon || '📋'}
                          </span>
                          <span className="font-medium">{item.list_name}</span>
                        </Link>
                      </td>
                      <td className="max-w-md truncate text-base-content/70">
                        {preview || <span className="italic text-base-content/40">Empty row</span>}
                      </td>
                      <td className="whitespace-nowrap text-sm text-base-content/50">
                        {formatUtcDate(item.deleted_at)}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-xs text-success"
                            onClick={() => restoreItem.mutate(item.id)}
                            title="Restore"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Restore
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handlePermanentDelete(item.id, preview || 'this item')}
                            title="Delete permanently"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Permanently Delete"
        message={`This will permanently delete this item. This action cannot be undone.`}
        confirmText="Delete Forever"
        onConfirm={confirmPermanentDelete}
        onCancel={() => setConfirmModal({ isOpen: false, itemId: '', itemLabel: '' })}
      />
    </div>
  );
}
