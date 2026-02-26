import { useState, useMemo, useRef, useEffect } from 'react';
import type { Column, Item, ColumnType, View } from '../../types';
import { useCreateItem, useUpdateItem, useDeleteItem, useRestoreItem } from '../../hooks/useItems';
import { useAddColumn, useDeleteColumn, useUpdateColumn, useReorderColumns, useUpdateView, useCreateView, useDeleteView } from '../../hooks/useLists';
import { AddColumnModal, EditColumnModal } from '../columns';
import { DateCell, ChoiceCell, BooleanCell, CurrencyCell, HyperlinkCell } from '../cells';
import { ConfirmModal, Modal } from '../ui';
import { FilterPanel } from './FilterPanel';
import { useSettings } from '../../contexts/SettingsContext';

interface GridViewProps {
  listId: string;
  columns: Column[];
  items: Item[];
  views: View[];
  showInternalColumns?: boolean;
  showDeletedItems?: boolean;
}

type SortDirection = 'asc' | 'desc';

// Internal column definitions for created_at, updated_at, deleted_at
interface InternalColumnDef {
  id: string;
  name: string;
  key: 'created_at' | 'updated_at' | 'deleted_at';
}

const INTERNAL_COLUMNS: InternalColumnDef[] = [
  { id: '__created_at', name: 'Created', key: 'created_at' },
  { id: '__updated_at', name: 'Modified', key: 'updated_at' },
  { id: '__deleted_at', name: 'Deleted', key: 'deleted_at' },
];

// Ensure UTC datetime strings from backend are interpreted correctly
function formatUtcDate(isoString: string): string {
  const s = isoString.endsWith('Z') ? isoString : isoString + 'Z';
  return new Date(s).toLocaleString();
}

export function GridView({ listId, columns, items, views, showInternalColumns = false, showDeletedItems = false }: GridViewProps) {
  const { settings } = useSettings();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const restoreItem = useRestoreItem();
  const addColumn = useAddColumn();
  const deleteColumn = useDeleteColumn();
  const updateColumn = useUpdateColumn();
  const reorderColumns = useReorderColumns();
  const updateView = useUpdateView();
  const createView = useCreateView();
  const deleteView = useDeleteView();
  
  const [editingCell, setEditingCell] = useState<{ itemId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editOriginalValue, setEditOriginalValue] = useState('');
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isSaveFilterModalOpen, setIsSaveFilterModalOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  
  // Get saved filter views (non-default views with filters in config)
  const savedFilters = views.filter(v => !v.is_default && v.config?.filters);
  const defaultView = views.find(v => v.is_default) || views[0];
  
  // Get sort config from active view or default view
  const activeView = activeViewId ? views.find(v => v.id === activeViewId) : defaultView;
  const sortColumnId = (activeView?.config?.sortBy as string) || null;
  const sortDirection = (activeView?.config?.sortDir as SortDirection) || null;
  
  // Load filters when active view changes
  useEffect(() => {
    if (activeViewId) {
      const view = views.find(v => v.id === activeViewId);
      if (view?.config?.filters) {
        const savedFilters = view.config.filters as Record<string, string[]>;
        const loadedFilters: Record<string, Set<string>> = {};
        for (const [colId, values] of Object.entries(savedFilters)) {
          loadedFilters[colId] = new Set(values);
        }
        setFilters(loadedFilters);
      }
    }
  }, [activeViewId, views]);
  
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

  // Simple text filter
  const [simpleFilter, setSimpleFilter] = useState('');

  // Track newly created item IDs to show at bottom
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Filter items based on active filters and simple text filter
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply simple text filter first
    if (simpleFilter.trim()) {
      const searchTerm = simpleFilter.toLowerCase().trim();
      result = result.filter(item => {
        // Check all column values for matching text
        return columns.some(column => {
          const value = item.values[column.id];
          if (value === null || value === undefined) return false;
          
          // Convert value to display text based on column type
          let displayText = '';
          switch (column.column_type) {
            case 'boolean':
              displayText = value ? 'yes' : 'no';
              break;
            case 'rating':
              displayText = String(value);
              break;
            case 'date':
            case 'datetime':
              displayText = String(value);
              break;
            default:
              displayText = String(value);
          }
          
          return displayText.toLowerCase().includes(searchTerm);
        });
      });
    }
    
    // Then apply column-specific filters
    if (Object.keys(filters).length === 0) return result;
    
    return result.filter(item => {
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
  }, [items, filters, columns, simpleFilter]);

  // Sorted items based on view config
  const sortedItems = useMemo(() => {
    // Separate new items, deleted items, and regular items
    const regularItems = filteredItems.filter(item => !newItemIds.has(item.id) && !item.deleted_at);
    const deletedItems = filteredItems.filter(item => !!item.deleted_at);
    const newItems = filteredItems.filter(item => newItemIds.has(item.id));
    
    const nullsGoToBottom = settings.unknownSortPosition === 'bottom';
    
    let sortedRegular = regularItems;
    
    if (sortColumnId && sortDirection) {
      // Check if sorting by internal column
      const internalCol = INTERNAL_COLUMNS.find(c => c.id === sortColumnId);
      
      if (internalCol) {
        sortedRegular = [...regularItems].sort((a, b) => {
          const aVal = a[internalCol.key];
          const bVal = b[internalCol.key];
          
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return nullsGoToBottom ? 1 : -1;
          if (bVal == null) return nullsGoToBottom ? -1 : 1;
          
          const comparison = new Date(aVal).getTime() - new Date(bVal).getTime();
          return sortDirection === 'desc' ? -comparison : comparison;
        });
      } else {
        const column = columns.find(c => c.id === sortColumnId);
        if (column) {
          sortedRegular = [...regularItems].sort((a, b) => {
            const aVal = a.values[sortColumnId];
            const bVal = b.values[sortColumnId];
            
            // Handle null/undefined — always push to configured position
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return nullsGoToBottom ? 1 : -1;
            if (bVal == null) return nullsGoToBottom ? -1 : 1;
            
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
    }
    
    // New items always go at the bottom, deleted items after that
    return [...sortedRegular, ...newItems, ...deletedItems];
  }, [filteredItems, sortColumnId, sortDirection, columns, newItemIds, settings.unknownSortPosition]);

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
    } else if (settings.useTriStateSort) {
      // Same column, was desc - clear sort (tri-state mode)
      newSortBy = null;
      newSortDir = null;
    } else {
      // Same column, was desc - cycle back to asc (two-state mode)
      newSortDir = 'asc';
    }
    
    // Use the active view (or default) to save sort settings
    const viewToUpdate = activeView || defaultView;
    if (!viewToUpdate) return;
    
    const newConfig = {
      ...viewToUpdate.config,
      sortBy: newSortBy,
      sortDir: newSortDir,
    };
    
    updateView.mutate({ listId, viewId: viewToUpdate.id, config: newConfig });
  };

  // Convert filters to serializable format for saving
  const serializeFilters = (f: Record<string, Set<string>>) => {
    const result: Record<string, string[]> = {};
    for (const [colId, values] of Object.entries(f)) {
      if (values.size > 0) {
        result[colId] = Array.from(values);
      }
    }
    return result;
  };

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    
    const config = {
      filters: serializeFilters(filters),
      sortBy: sortColumnId,
      sortDir: sortDirection,
    };
    
    createView.mutate({ listId, name: newFilterName.trim(), config });
    setIsSaveFilterModalOpen(false);
    setNewFilterName('');
  };

  const handleLoadFilter = (viewId: string) => {
    setActiveViewId(viewId);
    setSimpleFilter(''); // Clear search when loading a saved filter
  };

  const handleClearFilters = () => {
    setFilters({});
    setActiveViewId(null);
    setSimpleFilter(''); // Clear search when clearing filters
  };

  const handleDeleteFilter = (viewId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Saved Filter',
      message: 'Are you sure you want to delete this saved filter?',
      onConfirm: () => {
        deleteView.mutate({ listId, viewId });
        if (activeViewId === viewId) {
          setActiveViewId(null);
          setFilters({});
        }
        setConfirmModal(m => ({ ...m, isOpen: false }));
      },
    });
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
    // Clear filters so the new row is visible
    if (simpleFilter || Object.keys(filters).length > 0) {
      setSimpleFilter('');
      setFilters({});
      setActiveViewId(null);
    }
    
    const result = await createItem.mutateAsync({ listId, values: {} });
    if (result?.id) {
      setNewItemIds(prev => new Set(prev).add(result.id));
      // Scroll to the bottom of the table container after a brief delay for render
      setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
        }
        // Auto-focus the first cell of the new row
        if (columns.length > 0) {
          startEditing(result.id, columns[0].id, '');
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
    const strValue = currentValue?.toString() || '';
    setEditValue(strValue);
    setEditOriginalValue(strValue);
  };

  const saveEdit = () => {
    if (!editingCell) return;
    
    // Skip update if value hasn't changed
    if (editValue === editOriginalValue) {
      setEditingCell(null);
      return;
    }
    
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
      // If this is a new row (unedited), delete it on ESC
      if (editingCell && newItemIds.has(editingCell.itemId)) {
        deleteItem.mutate({ listId, itemId: editingCell.itemId });
        setNewItemIds(prev => {
          const next = new Set(prev);
          next.delete(editingCell.itemId);
          return next;
        });
      }
      setEditingCell(null);
    }
  };

  const handleDeleteRow = (itemId: string) => {
    if (settings.confirmDelete) {
      setConfirmModal({
        isOpen: true,
        title: 'Delete Row',
        message: 'Are you sure you want to delete this row?',
        onConfirm: () => {
          deleteItem.mutate({ listId, itemId });
          setConfirmModal(m => ({ ...m, isOpen: false }));
        },
      });
    } else {
      deleteItem.mutate({ listId, itemId });
    }
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
            tabIndex={0}
            onFocus={() => startEditing(item.id, column.id, value)}
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
            tabIndex={0}
            onFocus={() => startEditing(item.id, column.id, value)}
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
            tabIndex={0}
            onFocus={() => startEditing(item.id, column.id, value)}
            onClick={() => startEditing(item.id, column.id, value)}
          >
            {value !== null && value !== undefined ? String(value) : ''}
          </div>
        );
    }
  };

  const hasActiveFilters = Object.keys(filters).length > 0 && Object.values(filters).some(s => s.size > 0);
  const activeFilterView = activeViewId ? views.find(v => v.id === activeViewId) : null;

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-2 px-1 pt-2 flex-shrink-0 flex-wrap">
          {/* Simple text filter */}
          <div className="relative">
            <input
              type="text"
              className="input input-sm input-bordered w-48 pl-8"
              placeholder="Search..."
              value={simpleFilter}
              onChange={(e) => setSimpleFilter(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {simpleFilter && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                onClick={() => setSimpleFilter('')}
              >
                ✕
              </button>
            )}
          </div>
          
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
          
          {/* Saved Filters Dropdown */}
          {savedFilters.length > 0 && (
            <div className="dropdown">
              <label tabIndex={0} className="btn btn-sm btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Saved Filters
              </label>
              <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-lg bg-base-100 rounded-box w-56">
                {savedFilters.map(filter => (
                  <li key={filter.id}>
                    <div className="flex justify-between items-center">
                      <button 
                        className={`flex-1 text-left ${activeViewId === filter.id ? 'font-bold' : ''}`}
                        onClick={(e) => {
                          handleLoadFilter(filter.id);
                          // Close dropdown unless Ctrl/Cmd is held (for quick preview)
                          if (!e.ctrlKey && !e.metaKey) {
                            (document.activeElement as HTMLElement)?.blur();
                          }
                        }}
                      >
                        {filter.name}
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs text-error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFilter(filter.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Save Current Filter */}
          {hasActiveFilters && !activeFilterView && (
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => setIsSaveFilterModalOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Filter
            </button>
          )}
          
          {/* Active filter indicator and clear */}
          {activeFilterView && (
            <span className="badge badge-primary gap-1">
              {activeFilterView.name}
              <button onClick={handleClearFilters} className="hover:text-primary-content">✕</button>
            </span>
          )}
          
          {hasActiveFilters && !activeFilterView && (
            <button className="btn btn-sm btn-ghost text-error" onClick={handleClearFilters}>
              Clear
            </button>
          )}
          
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-base-content/60">
              {hasActiveFilters ? `${sortedItems.length} of ${items.length}` : items.length} item{items.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleAddRow}
              className="btn btn-xs btn-circle btn-primary"
              title="Add new row"
              disabled={createItem.isPending}
            >
              {createItem.isPending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>
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
              {showInternalColumns && INTERNAL_COLUMNS
                .filter(ic => ic.key !== 'deleted_at' || showDeletedItems)
                .map((ic) => (
                <th key={ic.id} className="bg-base-200 select-none">
                  <span
                    className="cursor-pointer hover:text-primary text-base-content/60 italic"
                    onClick={() => handleSort(ic.id)}
                  >
                    {ic.name}
                    {getSortIcon(ic.id)}
                  </span>
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
          {sortedItems.map((item) => {
            const isDeleted = !!item.deleted_at;
            return (
            <tr 
              key={item.id} 
              className={`hover ${newItemIds.has(item.id) ? 'bg-primary/10' : ''} ${isDeleted ? 'opacity-40' : ''}`}
            >
              {columns.map((column) => (
                <td key={column.id} className={isDeleted ? 'line-through' : ''}>
                  {isDeleted ? (
                    <span className="px-2 py-1">{item.values[column.id] != null ? String(item.values[column.id]) : ''}</span>
                  ) : (
                    renderCell(item, column)
                  )}
                </td>
              ))}
              {showInternalColumns && INTERNAL_COLUMNS
                .filter(ic => ic.key !== 'deleted_at' || showDeletedItems)
                .map((ic) => (
                <td key={ic.id} className="text-base-content/50 text-xs whitespace-nowrap">
                  {item[ic.key] ? formatUtcDate(item[ic.key] as string) : '—'}
                </td>
              ))}
              <td>
                {isDeleted ? (
                  <button
                    className="btn btn-ghost btn-xs text-success"
                    onClick={() => restoreItem.mutate({ listId, itemId: item.id })}
                    title="Restore item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleDeleteRow(item.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </td>
            </tr>
            );
          })}
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
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            // Clear active view when manually changing filters
            if (activeViewId) {
              setActiveViewId(null);
            }
          }}
          onClose={() => setIsFilterPanelOpen(false)}
          filteredCount={sortedItems.length}
          totalCount={items.length}
        />
      )}

      {/* Save Filter Modal */}
      <Modal
        isOpen={isSaveFilterModalOpen}
        onClose={() => {
          setIsSaveFilterModalOpen(false);
          setNewFilterName('');
        }}
        title="Save Filter"
      >
        <div className="form-control">
          <label className="label" htmlFor="filter-name">
            <span className="label-text">Filter Name</span>
          </label>
          <input
            id="filter-name"
            type="text"
            className="input input-bordered"
            value={newFilterName}
            onChange={(e) => setNewFilterName(e.target.value)}
            placeholder="e.g., Unwatched Shows"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFilterName.trim()) {
                handleSaveFilter();
              }
            }}
          />
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => {
            setIsSaveFilterModalOpen(false);
            setNewFilterName('');
          }}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveFilter}
            disabled={!newFilterName.trim()}
          >
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}
