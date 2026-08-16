import { useState, useMemo } from 'react';
import type { Column, Item, ColumnFilter } from '../../types';

interface FilterPanelProps {
  columns: Column[];
  items: Item[];
  filters: Record<string, ColumnFilter>;
  onFiltersChange: (filters: Record<string, ColumnFilter>) => void;
  onClose: () => void;
  filteredCount: number;
  totalCount: number;
}

const MAX_VISIBLE_OPTIONS = 5;

export function FilterPanel({ 
  columns, 
  items, 
  filters, 
  onFiltersChange, 
  onClose,
  filteredCount,
  totalCount
}: FilterPanelProps) {
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});

  // Get unique values for each column from items
  const columnValues = useMemo(() => {
    const values: Record<string, Set<string>> = {};
    
    columns.forEach(column => {
      values[column.id] = new Set<string>();
      
      items.forEach(item => {
        const value = item.values[column.id];
        
        if (value === null || value === undefined || value === '') {
          values[column.id].add('__empty__');
        } else if (column.column_type === 'multiple_choice' && typeof value === 'string') {
          // Split comma-separated values
          value.split(',').filter(Boolean).forEach(v => values[column.id].add(v.trim()));
        } else if (column.column_type === 'boolean') {
          values[column.id].add(value ? 'Yes' : 'No');
        } else {
          values[column.id].add(String(value));
        }
      });
    });
    
    return values;
  }, [columns, items]);

  const toggleFilter = (columnId: string, value: string) => {
    const newFilters = { ...filters };
    const current = newFilters[columnId]
      ? { values: new Set(newFilters[columnId].values), inverted: !!newFilters[columnId].inverted }
      : { values: new Set<string>(), inverted: false };
    
    if (current.values.has(value)) {
      current.values.delete(value);
      if (current.values.size === 0) {
        delete newFilters[columnId];
      } else {
        newFilters[columnId] = current;
      }
    } else {
      current.values.add(value);
      newFilters[columnId] = current;
    }
    
    onFiltersChange(newFilters);
  };

  const toggleInvert = (columnId: string) => {
    const newFilters = { ...filters };
    const current = newFilters[columnId]
      ? { values: new Set(newFilters[columnId].values), inverted: !newFilters[columnId].inverted }
      : { values: new Set<string>(), inverted: true };
    
    if (current.values.size > 0 || current.inverted) {
      newFilters[columnId] = current;
    } else {
      delete newFilters[columnId];
    }
    onFiltersChange(newFilters);
  };

  const clearColumnFilter = (columnId: string) => {
    if (!filters[columnId]) return;
    const newFilters = { ...filters };
    delete newFilters[columnId];
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const toggleExpanded = (columnId: string) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(columnId)) {
      newExpanded.delete(columnId);
    } else {
      newExpanded.add(columnId);
    }
    setExpandedColumns(newExpanded);
  };

  const hasActiveFilters = Object.values(filters).some(f => f.values.size > 0);

  const renderColumnFilter = (column: Column) => {
    const values = Array.from(columnValues[column.id] || []).sort((a, b) => {
      if (a === '__empty__') return -1;
      if (b === '__empty__') return 1;
      return a.localeCompare(b);
    });
    
    if (values.length === 0) return null;
    
    const hasMore = values.length > MAX_VISIBLE_OPTIONS;
    const searchQuery = (columnSearch[column.id] || '').trim().toLowerCase();

    let filteredValues = values;
    if (searchQuery) {
      filteredValues = values.filter(v => {
        if (v === '__empty__') {
          return 'empty'.includes(searchQuery) || '(empty)'.includes(searchQuery);
        }
        return v.toLowerCase().includes(searchQuery);
      });
    }

    const isExpanded = expandedColumns.has(column.id);
    const visibleValues = isExpanded ? filteredValues : filteredValues.slice(0, MAX_VISIBLE_OPTIONS);
    const showExpandButton = filteredValues.length > MAX_VISIBLE_OPTIONS;
    const activeFilter = filters[column.id];
    const activeValues = activeFilter?.values || new Set<string>();
    const isInverted = !!activeFilter?.inverted;
    const activeCount = activeValues.size;

    return (
      <div key={column.id} className="mb-4 pb-3 border-b border-base-200 last:border-b-0">
        <div className="font-medium text-sm mb-1 flex items-center justify-between">
          <span className="truncate mr-2 font-semibold" title={column.name}>{column.name}</span>
          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs text-base-content/50 hover:text-error px-1 h-5 min-h-0"
                onClick={() => clearColumnFilter(column.id)}
                title={`Clear filter for ${column.name}`}
              >
                ✕
              </button>
            )}
            {activeCount > 0 && (
              <span className={`badge badge-sm ${isInverted ? 'badge-warning' : 'badge-primary'}`}>
                {activeCount}
              </span>
            )}
          </div>
        </div>

        {/* Invert toggle and mode status */}
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className={isInverted ? 'text-warning font-medium' : 'text-base-content/60'}>
            {isInverted ? 'Exclude matches:' : 'Match:'}
          </span>
          <button
            type="button"
            className={`btn btn-xs gap-1 h-6 min-h-0 px-2 ${
              isInverted
                ? 'btn-warning text-warning-content font-medium shadow-xs'
                : 'btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200'
            }`}
            onClick={() => toggleInvert(column.id)}
            title={isInverted ? 'Switch to normal match (include selected)' : 'Invert match (exclude items matching selected)'}
          >
            {isInverted ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.366zm1.414-1.414L6.525 5.11a6 6 0 018.366 8.366zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
                Inverted
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Invert
              </>
            )}
          </button>
        </div>

        {/* Search choices within column when there are enough options to need "See all" */}
        {hasMore && (
          <div className="relative mb-2">
            <input
              type="text"
              className="input input-xs input-bordered w-full pl-7 pr-6"
              placeholder="Search choices..."
              value={columnSearch[column.id] || ''}
              onChange={(e) => setColumnSearch(prev => ({ ...prev, [column.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setColumnSearch(prev => ({ ...prev, [column.id]: '' }));
                }
              }}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {columnSearch[column.id] && (
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content text-xs px-1"
                onClick={() => setColumnSearch(prev => ({ ...prev, [column.id]: '' }))}
                title="Clear choice search"
              >
                ✕
              </button>
            )}
          </div>
        )}
        
        <div className="space-y-1">
          {visibleValues.map(value => (
            <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-2 py-1 rounded">
              <input
                type="checkbox"
                className={`checkbox checkbox-sm ${isInverted ? 'checkbox-warning' : 'checkbox-primary'}`}
                checked={activeValues.has(value)}
                onChange={() => toggleFilter(column.id, value)}
              />
              <span className="text-sm truncate">
                {value === '__empty__' ? (
                  <span className="text-base-content/50 italic">(Empty)</span>
                ) : (
                  value
                )}
              </span>
            </label>
          ))}
          {filteredValues.length === 0 && searchQuery && (
            <div className="text-xs text-base-content/50 italic py-1 px-1">
              No matching choices
            </div>
          )}
        </div>
        
        {showExpandButton && (
          <button
            className="text-sm text-primary hover:underline mt-1 px-2"
            onClick={() => toggleExpanded(column.id)}
          >
            {isExpanded 
              ? 'Show less' 
              : searchQuery 
                ? `See all matching (${filteredValues.length})` 
                : `See all (${values.length})`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-72 bg-base-100 border-l border-base-300 h-full flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Filters</h3>
          <p className="text-sm text-base-content/60">
            {filteredCount === totalCount 
              ? `${totalCount} items` 
              : `${filteredCount} of ${totalCount} items`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearAllFilters}
              title="Clear all filters"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Filter sections */}
      <div className="flex-1 overflow-auto p-4">
        {columns.map(renderColumnFilter)}
        
        {columns.length === 0 && (
          <p className="text-base-content/50 text-sm">No columns to filter</p>
        )}
      </div>
    </div>
  );
}
