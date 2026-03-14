import { useState, useEffect } from 'react';
import { chatApi } from '../../api/chat';
import { itemsApi } from '../../api/items';
import { listsApi } from '../../api/lists';
import { useQueryClient } from '@tanstack/react-query';
import type { Column, Item, GeminiModel, TargetColumnInfo } from '../../types';

interface ItemCompletionTabProps {
  listId: string;
  listName: string;
  item: Item;
  columns: Column[];
  models: GeminiModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  loadingModels: boolean;
}

interface ColumnResult {
  columnId: string;
  columnName: string;
  value: string | string[] | null;
  isNew?: boolean; // for choice fields, whether value was not in existing options
}

export function ItemCompletionTab({
  listId,
  listName,
  item,
  columns,
  models,
  selectedModel,
  onModelChange,
  loadingModels,
}: ItemCompletionTabProps) {
  const queryClient = useQueryClient();
  const [selectedColumnIds, setSelectedColumnIds] = useState<Set<string>>(new Set());
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ColumnResult[] | null>(null);

  // Reset results when item changes
  useEffect(() => {
    setResults(null);
    setError(null);
  }, [item.id]);

  // Build item context from current values
  const itemContext: Record<string, unknown> = {};
  for (const col of columns) {
    const val = item.values[col.id];
    if (val != null && val !== '') {
      itemContext[col.name] = val;
    }
  }

  const toggleColumn = (colId: string) => {
    setSelectedColumnIds(prev => {
      const next = new Set(prev);
      if (next.has(colId)) {
        next.delete(colId);
      } else {
        next.add(colId);
      }
      return next;
    });
    // Clear results when selection changes
    setResults(null);
    setError(null);
  };

  const selectAll = () => {
    setSelectedColumnIds(new Set(columns.map(c => c.id)));
    setResults(null);
    setError(null);
  };

  const selectNone = () => {
    setSelectedColumnIds(new Set());
    setResults(null);
    setError(null);
  };

  const selectEmpty = () => {
    const emptyIds = columns
      .filter(c => {
        const val = item.values[c.id];
        return val == null || val === '';
      })
      .map(c => c.id);
    setSelectedColumnIds(new Set(emptyIds));
    setResults(null);
    setError(null);
  };

  const handleComplete = async () => {
    if (selectedColumnIds.size === 0) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    const targetColumns: TargetColumnInfo[] = columns
      .filter(c => selectedColumnIds.has(c.id))
      .map(c => ({
        name: c.name,
        column_type: c.column_type,
        config: c.config,
      }));

    try {
      const response = await chatApi.completeItem({
        list_name: listName,
        item_context: itemContext,
        target_columns: targetColumns,
        model: selectedModel || undefined,
        additional_prompt: additionalPrompt.trim() || undefined,
      });

      // Map results back to column IDs
      const columnResults: ColumnResult[] = [];
      for (const col of columns) {
        if (!selectedColumnIds.has(col.id)) continue;
        const val = response.values[col.name] ?? null;

        // Check if choice values are new
        let isNew = false;
        if (val != null && (col.column_type === 'choice' || col.column_type === 'multiple_choice')) {
          const existingChoices = ((col.config?.choices as string[]) || []).map(c => c.toLowerCase());
          if (col.column_type === 'choice' && typeof val === 'string') {
            isNew = !existingChoices.includes(val.toLowerCase());
          } else if (col.column_type === 'multiple_choice' && Array.isArray(val)) {
            isNew = val.some(v => !existingChoices.includes(v.toLowerCase()));
          }
        }

        columnResults.push({
          columnId: col.id,
          columnName: col.name,
          value: val,
          isNew,
        });
      }

      setResults(columnResults);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || 'Failed to get AI completion';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!results) return;

    setIsApplying(true);
    setError(null);

    try {
      const newValues: Record<string, unknown> = { ...item.values };

      for (const result of results) {
        if (result.value == null) continue;

        const col = columns.find(c => c.id === result.columnId);
        if (!col) continue;

        // For choice/multiple_choice, add new options to column config first
        if (result.isNew && (col.column_type === 'choice' || col.column_type === 'multiple_choice')) {
          const existingChoices = (col.config?.choices as string[]) || [];
          const existingLower = existingChoices.map(c => c.toLowerCase());
          const newChoices = [...existingChoices];

          if (col.column_type === 'choice' && typeof result.value === 'string') {
            if (!existingLower.includes(result.value.toLowerCase())) {
              newChoices.push(result.value);
            }
          } else if (col.column_type === 'multiple_choice' && Array.isArray(result.value)) {
            for (const v of result.value) {
              if (!existingLower.includes(v.toLowerCase())) {
                newChoices.push(v);
                existingLower.push(v.toLowerCase());
              }
            }
          }

          if (newChoices.length > existingChoices.length) {
            await listsApi.updateColumn(listId, col.id, {
              config: { ...col.config, choices: newChoices },
            });
          }
        }

        // Set the value - for multiple_choice, join as comma-separated
        if (col.column_type === 'multiple_choice' && Array.isArray(result.value)) {
          newValues[col.id] = result.value.join(',');
        } else {
          newValues[col.id] = result.value;
        }
      }

      await itemsApi.update(listId, item.id, { values: newValues });
      queryClient.invalidateQueries({ queryKey: ['items', listId] });
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
      setResults(null);
      setSelectedColumnIds(new Set());
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || 'Failed to apply values';
      setError(message);
    } finally {
      setIsApplying(false);
    }
  };

  const formatValue = (val: string | string[] | null): string => {
    if (val == null) return '—';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  const appliedCount = results?.filter(r => r.value != null).length ?? 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 -mt-2">
      {/* Model selector */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <label className="text-xs text-base-content/60">Model:</label>
        {loadingModels ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : models.length > 0 ? (
          <select
            className="select select-bordered select-xs flex-1"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isLoading || isApplying}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className="input input-bordered input-xs flex-1"
            placeholder="e.g. gemini-2.0-flash"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isLoading || isApplying}
          />
        )}
      </div>

      {/* Item context summary */}
      <div className="bg-base-200 rounded-lg p-3 mb-3 flex-shrink-0 max-h-28 overflow-y-auto">
        <div className="text-xs text-base-content/60 mb-1 font-semibold">Item Context — {listName}</div>
        <div className="text-xs space-y-0.5">
          {Object.entries(itemContext).map(([key, val]) => (
            <div key={key}>
              <span className="font-medium">{key}:</span>{' '}
              <span className="text-base-content/80">{String(val)}</span>
            </div>
          ))}
          {Object.keys(itemContext).length === 0 && (
            <span className="text-base-content/40 italic">No data in this item</span>
          )}
        </div>
      </div>

      {/* Column selector */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Columns to fill</span>
          <div className="flex gap-1">
            <button
              className="btn btn-ghost btn-xs"
              onClick={selectAll}
              disabled={isLoading || isApplying}
            >
              All
            </button>
            <button
              className="btn btn-ghost btn-xs"
              onClick={selectEmpty}
              disabled={isLoading || isApplying}
              title="Select only columns with no value"
            >
              Empty
            </button>
            <button
              className="btn btn-ghost btn-xs"
              onClick={selectNone}
              disabled={isLoading || isApplying}
            >
              None
            </button>
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto bg-base-200 rounded-lg p-2 space-y-1">
          {columns.map(col => {
            const hasValue = item.values[col.id] != null && item.values[col.id] !== '';
            return (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-base-300 rounded px-1">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={selectedColumnIds.has(col.id)}
                  onChange={() => toggleColumn(col.id)}
                  disabled={isLoading || isApplying}
                />
                <span className="text-sm flex-1">{col.name}</span>
                <span className="text-xs text-base-content/40">{col.column_type}</span>
                {hasValue && (
                  <span className="text-xs text-base-content/50 truncate max-w-24" title={String(item.values[col.id])}>
                    = {String(item.values[col.id])}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <div className="text-xs text-base-content/50 mt-1">
          {selectedColumnIds.size} column{selectedColumnIds.size !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Additional prompt */}
      <div className="flex-shrink-0 mb-3">
        <label className="text-xs text-base-content/60 mb-1 block">Additional instructions (optional)</label>
        <textarea
          className="textarea textarea-bordered w-full text-sm resize-none"
          placeholder="e.g. Use formal language, prefer shorter values, classify as..."
          value={additionalPrompt}
          onChange={(e) => setAdditionalPrompt(e.target.value)}
          rows={2}
          disabled={isLoading || isApplying}
        />
      </div>

      {/* Results preview */}
      {results && (
        <div className="flex-1 overflow-y-auto mb-3 min-h-0">
          <div className="text-sm font-medium mb-2">
            Results Preview
            <span className="text-xs text-base-content/50 ml-2">
              {appliedCount} value{appliedCount !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="bg-base-200 rounded-lg p-2 space-y-1.5">
            {results.map(r => (
              <div key={r.columnId} className="flex items-start gap-2 text-sm py-0.5">
                {r.value != null ? (
                  <span className="text-success mt-0.5">✓</span>
                ) : (
                  <span className="text-base-content/30 mt-0.5">—</span>
                )}
                <span className="font-medium min-w-0">{r.columnName}:</span>
                <span className={`flex-1 min-w-0 ${r.value != null ? '' : 'text-base-content/40 italic'}`}>
                  {formatValue(r.value)}
                </span>
                {r.isNew && (
                  <span className="badge badge-xs badge-warning flex-shrink-0">new option</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="alert alert-error text-sm py-2 mb-3 flex-shrink-0">
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end flex-shrink-0">
        {results ? (
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setResults(null)}
              disabled={isApplying}
            >
              Back
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleApply}
              disabled={appliedCount === 0 || isApplying}
            >
              {isApplying ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Apply {appliedCount} value{appliedCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleComplete}
            disabled={selectedColumnIds.size === 0 || isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Complete
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
