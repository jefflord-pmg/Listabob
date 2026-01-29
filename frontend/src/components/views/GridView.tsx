import { useState, useMemo, useRef, useEffect } from 'react';
import type { Column, Item, ColumnType, View } from '../../types';
import { useCreateItem, useUpdateItem, useDeleteItem } from '../../hooks/useItems';
import { useAddColumn, useDeleteColumn, useUpdateColumn, useReorderColumns, useUpdateView } from '../../hooks/useLists';
import { AddColumnModal, EditColumnModal } from '../columns';
import { DateCell, ChoiceCell, BooleanCell, CurrencyCell, HyperlinkCell } from '../cells';
import { ConfirmModal } from '../ui';
import { FilterPanel } from './FilterPanel';

interface GridViewProps {
  listId: string;
  columns: Column[];
  items: Item[];
  views: View[];
}

type SortDirection = 'asc' | 'desc';

export function GridView({ listId, columns, items, views }: GridViewProps) {
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const addColumn = useAddColumn();
  const deleteColumn = useDeleteColumn();
  const updateColumn = useUpdateColumn();
  const reorderColumns = useReorderColumns();
  const updateView = useUpdateView();
  
  const [editingCell, setEditingCell] = useState<{ itemId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  
  // Get default view and its sort config
  const defaultView = views.find(v => v.is_default) || views[0];
  const sortColumnId = (defaultView?.config?.sortBy as string) || null;
  const sortDirection = (defaultView?.config?.sortDir as SortDirection) || null;
  
  // Drag and drop state for columns
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Track newly created item IDs to show at bottom
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Filter items based on active filters
  const filteredItems = useMemo(() => {
    if (Object.keys(filters).length === 0) return items;
    
    return items.filter(item => {
      // Check all active filters - item must match ALL column filters
      for (const [columnId, filterValues] of Object.entries(filters)) {
        if (filterValues.size === 0) continue;
        
        const column = columns.find(c => c.id === columnId);
        if (!column) continue;
        
        const itemValue = item.values[columnId];
        const isEmpty = itemValue === null || itemValue === undefined || itemValue === '';
        
        // Check if filtering for empty
        if (filterValues.has('__empty__') && isEmpty) {
          continue; // Matches empty filter
        }
        
        if (isEmpty) {
          return false; // Item is empty but not filtering for empty
        }
        
        // Handle different column types
        if (column.column_type === 'multiple_choice' && typeof itemValue === 'string') {
          // For multiple choice, match if ANY of the item's values match ANY filter value
          const itemValues = itemValue.split(',').map(v => v.trim().toLowerCase());
          const filterLower = new Set([...filterValues].map(v => v.toLowerCase()));
          const hasMatch = itemValues.some(v => filterLower.has(v));
          if (!hasMatch && !filterValues.has('__empty__')) {
            return false;
          }
        } else if (column.column_type === 'boolean') {
          const boolStr = itemValue ? 'Yes' : 'No';
          if (!filterValues.has(boolStr)) {
            return false;
          }
        } else if (column.column_type === 'text') {
          // Case-insensitive match for text columns
          const itemLower = String(itemValue).toLowerCase();
          const filterLower = new Set([...filterValues].map(v => v.toLowerCase()));
          if (!filterLower.has(itemLower)) {
            return false;
          }
        } else {
          // For other types, exact match
          if (!filterValues.has(String(itemValue))) {
            return false;
          }
        }
      }
      return true;
    });
  }, [items, filters, columns]);

  // Sorted items based on view config
  const sortedItems = useMemo(() => {
    // Separate new items from regular items
    const regularItems = filteredItems.filter(item => !newItemIds.has(item.id));
    const newItems = filteredItems.filter(item => newItemIds.has(item.id));
    
    let sortedRegular = regularItems;
    
    if (sortColumnId && sortDirection) {
      const column = columns.find(c => c.id === sortColumnId);
      if (column) {
        sortedRegular = [...regularItems].sort((a, b) => {
          const aVal = a.values[sortColumnId];
          const bVal = b.values[sortColumnId];
          
          // Handle null/undefined
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
          if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
          
          let comparison = 0;
          if (column.column_type === 'number' || column.column_type === 'currency' || column.column_type === 'rating') {
            comparison = Number(aVal) - Number(bVal);
          } else if (column.column_type === 'boolean') {
            comparison = (aVal === bVal) ? 0 : aVal ? -1 : 1;
          } else if (column.column_type === 'date' || column.column_type === 'datetime') {
            comparison = new Date(String(aVal)).getTime() - new Date(String(bVal)).getTime();
          } else {
            comparison = String(aVal).localeCompare(String(bVal));
          }
          
          return sortDirection === 'desc' ? -comparison : comparison;
        });
      }
    }
    
    // New items always go at the bottom
    return [...sortedRegular, ...newItems];
  }, [filteredItems, sortColumnId, sortDirection, columns, newItemIds]);

  const handleSort = (columnId: string) => {
    if (!defaultView) return;
    
    let newSortBy: string | null = columnId;
    let newSortDir: SortDirection | null = 'asc';
    
    if (sortColumnId !== columnId) {
      // New column - set ascending
      newSortBy = columnId;
      newSortDir = 'asc';
    } else if (sortDirection === 'asc') {
      // Same column, was asc - switch to desc
      newSortDir = 'desc';
    } else {
      // Same column, was desc - clear sort
      newSortBy = null;
      newSortDir = null;
    }
    
    const newConfig = {
      ...defaultView.config,
      sortBy: newSortBy,
      sortDir: newSortDir,
    };
    
    updateView.mutate({ listId, viewId: defaultView.id, config: newConfig });
  };

  const getSortIcon = (columnId: string) => {
    if (sortColumnId !== columnId) {
      return <span className="opacity-30 ml-1">↕</span>;
    }
    return sortDirection === 'asc' 
      ? <span className="ml-1 text-primary">↑</span>
      : <span className="ml-1 text-primary">↓</span>;
  };

  // Column drag handlers
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleColumnDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetColumnId) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    // Calculate new order
    const currentOrder = columns.map(c => c.id);
    const draggedIndex = currentOrder.indexOf(draggedColumnId);
    const targetIndex = currentOrder.indexOf(targetColumnId);
    
    // Remove dragged item and insert at target position
    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedColumnId);
    
    reorderColumns.mutate({ listId, columnIds: currentOrder });
    
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  const handleAddRow = async () => {
    const result = await createItem.mutateAsync({ listId, values: {} });
    if (result?.id) {
      setNewItemIds(prev => new Set(prev).add(result.id));
      // Scroll to the bottom of the table container after a brief delay for render
      setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
        }
      }, 150);
    }
  };

  const handleAddColumn = (name: string, columnType: ColumnType, config?: Record<string, unknown>) => {
    addColumn.mutate({ listId, name, column_type: columnType, config });
  };

  const handleDeleteColumn = (columnId: string) => {
    deleteColumn.mutate({ listId, columnId });
  };

  const handleSaveColumn = (columnId: string, updates: { name?: string; column_type?: ColumnType; config?: Record<string, unknown> }) => {
    updateColumn.mutate({ listId, columnId, ...updates });
  };

  const startEditing = (itemId: string, columnId: string, currentValue: unknown) => {
    setEditingCell({ itemId, columnId });
    setEditValue(currentValue?.toString() || '');
  };

  const saveEdit = () => {
    if (!editingCell) return;
    
    const column = columns.find(c => c.id === editingCell.columnId);
    let value: unknown = editValue;
    
    if (column?.column_type === 'number' || column?.column_type === 'currency' || column?.column_type === 'rating') {
      value = editValue ? parseFloat(editValue) : null;
    } else if (column?.column_type === 'boolean') {
      value = editValue === 'true';
    }
    
    // Remove from new items when edited
    if (newItemIds.has(editingCell.itemId)) {
      setNewItemIds(prev => {
        const next = new Set(prev);
        next.delete(editingCell.itemId);
        return next;
      });
    }
    
    updateItem.mutate({
      listId,
      itemId: editingCell.itemId,
      values: { [editingCell.columnId]: value }
    });
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleDeleteRow = (itemId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Row',
      message: 'Are you sure you want to delete this row? This action cannot be undone.',
      onConfirm: () => {
        deleteItem.mutate({ listId, itemId });
        setConfirmModal(m => ({ ...m, isOpen: false }));
      },
    });
  };

  const handleCellChange = (itemId: string, columnId: string, value: unknown) => {
    // Remove from new items when edited - it will sort into place on next render
    if (newItemIds.has(itemId)) {
      setNewItemIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
    updateItem.mutate({
      listId,
      itemId,
      values: { [columnId]: value }
    });
  };

  const renderCell = (item: Item, column: Column) => {
    const value = item.values[column.id];
    const isEditing = editingCell?.itemId === item.id && editingCell?.columnId === column.id;

    // Use specialized cell editors based on column type
    switch (column.column_type) {
      case 'boolean':
        return (
          <BooleanCell
            value={value as boolean | null}
            onChange={(v) => handleCellChange(item.id, column.id, v)}
          />
        );

      case 'date':
        return (
          <DateCell
            value={value as string | null}
            onChange={(v) => handleCellChange(item.id, column.id, v)}
          />
        );

      case 'datetime':
        return (
          <DateCell
            value={value as string | null}
            onChange={(v) => handleCellChange(item.id, column.id, v)}
            includeTime
          />
        );

      case 'choice':
        return (
          <ChoiceCell
            value={value as string | null}
            choices={(column.config?.choices as string[]) || []}
            onChange={(v) => handleCellChange(item.id, column.id, v)}
          />
        );

      case 'multiple_choice':
        return (
          <ChoiceCell
            value={value as string | null}
            choices={(column.config?.choices as string[]) || []}
            onChange={(v) => handleCellChange(item.id, column.id, v)}
            multiple
          />
        );

      case 'currency':
        return (
          <CurrencyCell
            value={value as number | null}
            onChange={(v) => handleCellChange(item.id, column.id, v)}
          />
        );

      case 'hyperlink':
        return (
          <HyperlinkCell
            value={value as string | null}
            onChange={(v) => handleCellChange(item.id, column.id, v)}
          />
        );

      case 'rating':
        if (isEditing) {
          return (
            <input
              type="number"
              min="0"
              max="5"
              className="input input-sm input-bordered w-20"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          );
        }
        return (
          <div
            className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded"
            onClick={() => startEditing(item.id, column.id, value)}
          >
            {value ? '⭐'.repeat(Math.min(Number(value), 5)) : <span className="text-base-content/30">Rate...</span>}
          </div>
        );

      case 'number':
        if (isEditing) {
          return (
            <input
              type="number"
              className="input input-sm input-bordered w-full"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          );
        }
        return (
          <div
            className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded"
            onClick={() => startEditing(item.id, column.id, value)}
          >
            {value !== null && value !== undefined ? String(value) : ''}
          </div>
        );

      default: // text
        if (isEditing) {
          return (
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          );
        }
        return (
          <div
            className="cursor-pointer min-h-[1.5rem] px-2 py-1 hover:bg-base-200 rounded"
            onClick={() => startEditing(item.id, column.id, value)}
          >
            {value !== null && value !== undefined ? String(value) : ''}
          </div>
        );
    }
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-2 px-1 flex-shrink-0">
          <button
            className={`btn btn-sm ${hasActiveFilters ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {hasActiveFilters && (
              <span className="badge badge-sm">{Object.values(filters).reduce((sum, s) => sum + s.size, 0)}</span>
            )}
          </button>
          <span className="text-sm text-base-content/60">
            {hasActiveFilters ? `${sortedItems.length} of ${items.length}` : items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table container with scroll */}
        <div ref={tableContainerRef} className="flex-1 overflow-auto">
        <table className="table table-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.id} 
                  className={`bg-base-200 cursor-move select-none ${
                    dragOverColumnId === column.id ? 'bg-primary/20 border-l-2 border-primary' : ''
                  } ${draggedColumnId === column.id ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={(e) => handleColumnDragStart(e, column.id)}
                  onDragOver={(e) => handleColumnDragOver(e, column.id)}
                  onDragLeave={handleColumnDragLeave}
                  onDrop={(e) => handleColumnDrop(e, column.id)}
                  onDragEnd={handleColumnDragEnd}
                >
                  <div className="flex items-center gap-1">
                    <span className="cursor-move text-base-content/30 mr-1">⠿</span>
                    <span 
                      className="cursor-pointer hover:text-primary flex-1"
                      onClick={() => handleSort(column.id)}
                    >
                      {column.name}
                      {getSortIcon(column.id)}
                    </span>
                    <button
                      className="btn btn-ghost btn-xs opacity-50 hover:opacity-100 px-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingColumn(column);
                      }}
                      title="Edit column"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    {column.is_required && <span className="text-error ml-1">*</span>}
                  </div>
                </th>
              ))}
              <th className="bg-base-200 w-24">
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setIsAddColumnOpen(true)}
                  title="Add column"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Column
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, index) => (
            <tr 
              key={item.id} 
              className={`hover ${newItemIds.has(item.id) ? 'bg-primary/10' : ''}`}
            >
              {columns.map((column) => (
                <td key={column.id}>{renderCell(item, column)}</td>
              ))}
              <td>
                <button
                  className="btn btn-ghost btn-xs text-error"
                  onClick={() => handleDeleteRow(item.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      
      <button
        className="btn btn-ghost btn-sm mt-2 flex-shrink-0"
        onClick={handleAddRow}
        disabled={createItem.isPending}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Row
      </button>

      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
        onAdd={handleAddColumn}
      />

      <EditColumnModal
        isOpen={editingColumn !== null}
        column={editingColumn}
        items={items}
        onClose={() => setEditingColumn(null)}
        onSave={handleSaveColumn}
        onDelete={handleDeleteColumn}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, isOpen: false }))}
      />
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <FilterPanel
          columns={columns}
          items={items}
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setIsFilterPanelOpen(false)}
          filteredCount={sortedItems.length}
          totalCount={items.length}
        />
      )}
    </div>
  );
}
