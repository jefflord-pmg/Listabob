import { useState, useMemo } from 'react';
import type { Column, Item } from '../../types';

interface FilterPanelProps {
  columns: Column[];
  items: Item[];
  filters: Record<string, Set<string>>;
  onFiltersChange: (filters: Record<string, Set<string>>) => void;
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
    
    if (!newFilters[columnId]) {
      newFilters[columnId] = new Set();
    } else {
      newFilters[columnId] = new Set(newFilters[columnId]);
    }
    
    if (newFilters[columnId].has(value)) {
      newFilters[columnId].delete(value);
      if (newFilters[columnId].size === 0) {
        delete newFilters[columnId];
      }
    } else {
      newFilters[columnId].add(value);
    }
    
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

  const hasActiveFilters = Object.keys(filters).length > 0;

  const renderColumnFilter = (column: Column) => {
    const values = Array.from(columnValues[column.id] || []).sort((a, b) => {
      if (a === '__empty__') return -1;
      if (b === '__empty__') return 1;
      return a.localeCompare(b);
    });
    
    if (values.length === 0) return null;
    
    const isExpanded = expandedColumns.has(column.id);
    const visibleValues = isExpanded ? values : values.slice(0, MAX_VISIBLE_OPTIONS);
    const hasMore = values.length > MAX_VISIBLE_OPTIONS;
    const activeFilters = filters[column.id] || new Set();

    return (
      <div key={column.id} className="mb-4">
        <div className="font-medium text-sm mb-2 flex items-center justify-between">
          <span>{column.name}</span>
          {activeFilters.size > 0 && (
            <span className="badge badge-sm badge-primary">{activeFilters.size}</span>
          )}
        </div>
        
        <div className="space-y-1">
          {visibleValues.map(value => (
            <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-base-200 px-2 py-1 rounded">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={activeFilters.has(value)}
                onChange={() => toggleFilter(column.id, value)}
              />
              <span className="text-sm">
                {value === '__empty__' ? (
                  <span className="text-base-content/50 italic">(Empty)</span>
                ) : (
                  value
                )}
              </span>
            </label>
          ))}
        </div>
        
        {hasMore && (
          <button
            className="text-sm text-primary hover:underline mt-1 px-2"
            onClick={() => toggleExpanded(column.id)}
          >
            {isExpanded ? 'Show less' : `See all (${values.length})`}
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
