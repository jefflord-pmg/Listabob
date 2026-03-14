import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../ui';
import { chatApi } from '../../api/chat';
import { itemsApi } from '../../api/items';
import { listsApi } from '../../api/lists';
import { useQueryClient } from '@tanstack/react-query';
import type { Column, Item, GeminiModel } from '../../types';

interface AICompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  columns: Column[];
  items: Item[];
}

interface ItemResult {
  itemId: string;
  label: string;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'error';
  value?: string | null;
  error?: string;
}

const BATCH_OPTIONS = [
  { label: '1 — one at a time', value: 1 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: 'All at once', value: 0 },
];

export function AICompletionModal({ isOpen, onClose, listId, listName, columns, items }: AICompletionModalProps) {
  const queryClient = useQueryClient();
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [skipExisting, setSkipExisting] = useState(true);
  const [batchSize, setBatchSize] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef(false);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  const activeItems = items.filter(i => !i.deleted_at);

  useEffect(() => {
    if (isOpen && models.length === 0) {
      fetchModels();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) {
      setSelectedColumnId('');
      setResults([]);
      setProgress({ done: 0, total: 0 });
      setIsRunning(false);
      abortRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [results]);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const result = await chatApi.getModels();
      setModels(result);
      const configResp = await fetch('/api/system/config');
      if (configResp.ok) {
        const config = await configResp.json();
        if (config.gemini_model) {
          setSelectedModel(config.gemini_model);
        } else if (result.length > 0) {
          const flash = result.find(m => m.id.includes('flash'));
          setSelectedModel(flash?.id || result[0].id);
        }
      }
    } catch {
      // silently fall back to text input
    } finally {
      setLoadingModels(false);
    }
  };

  const getItemLabel = useCallback((item: Item): string => {
    const firstCol = columns[0];
    if (firstCol && item.values[firstCol.id] != null) {
      return String(item.values[firstCol.id]);
    }
    return `Item ${item.id.slice(0, 8)}`;
  }, [columns]);

  const buildItemContext = (item: Item, targetColId: string): Record<string, unknown> => {
    const ctx: Record<string, unknown> = {};
    for (const col of columns) {
      const val = item.values[col.id];
      if (val != null && val !== '' && col.id !== targetColId) {
        ctx[col.name] = val;
      }
    }
    return ctx;
  };

  const handleStart = async () => {
    const targetCol = columns.find(c => c.id === selectedColumnId);
    if (!targetCol) return;

    const isChoiceType = targetCol.column_type === 'choice' || targetCol.column_type === 'multiple_choice';
    const isMultiChoice = targetCol.column_type === 'multiple_choice';

    // Track current choices (mutable across batches so we can accumulate new ones)
    const currentChoicesRef = { current: (targetCol.config?.choices as string[] | undefined) ? [...(targetCol.config!.choices as string[])] : [] };

    abortRef.current = false;
    setIsRunning(true);

    // Build initial results list
    const initialResults: ItemResult[] = activeItems.map(item => {
      const existingValue = item.values[targetCol.id];
      const hasValue = existingValue != null && existingValue !== '';
      return {
        itemId: item.id,
        label: getItemLabel(item),
        status: (skipExisting && hasValue) ? 'skipped' as const : 'pending' as const,
        value: hasValue ? String(existingValue) : undefined,
      };
    });

    setResults(initialResults);
    const itemsToProcess = initialResults.filter(r => r.status === 'pending');
    setProgress({ done: 0, total: itemsToProcess.length });

    // Resolve effective batch size
    const effectiveBatchSize = batchSize === 0 ? itemsToProcess.length : batchSize;

    let doneCount = 0;

    // Helper: ensure new choice values are added to column config
    const ensureChoices = async (newValues: string[]) => {
      if (!isChoiceType) return;
      const existingLower = currentChoicesRef.current.map(c => c.toLowerCase());
      const toAdd = newValues.filter(v => v && !existingLower.includes(v.toLowerCase()));
      if (toAdd.length === 0) return;
      currentChoicesRef.current = [...currentChoicesRef.current, ...toAdd];
      await listsApi.updateColumn(listId, targetCol.id, {
        config: { ...targetCol.config, choices: currentChoicesRef.current },
      });
    };

    // Helper: encode value for storage
    const encodeValue = (raw: string): string => {
      // multiple_choice is stored as comma-separated
      return raw;
    };

    // Process in batches
    for (let i = 0; i < itemsToProcess.length; i += effectiveBatchSize) {
      if (abortRef.current) break;

      const batchResults = itemsToProcess.slice(i, i + effectiveBatchSize);

      // Mark entire batch as processing
      setResults(prev => prev.map(r =>
        batchResults.some(b => b.itemId === r.itemId) ? { ...r, status: 'processing' } : r
      ));

      if (effectiveBatchSize === 1) {
        // Single-item path
        const result = batchResults[0];
        const item = activeItems.find(it => it.id === result.itemId)!;
        try {
          const response = await chatApi.completeColumn({
            list_name: listName,
            item_context: buildItemContext(item, targetCol.id),
            target_column: targetCol.name,
            column_type: targetCol.column_type,
            column_config: targetCol.config,
            model: selectedModel || undefined,
          });
          if (abortRef.current) break;
          if (response.value != null) {
            // Ensure any new choice values are added to the column
            if (isChoiceType) {
              const vals = isMultiChoice
                ? response.value.split(',').map(v => v.trim()).filter(Boolean)
                : [response.value.trim()];
              await ensureChoices(vals);
            }
            const storeValue = encodeValue(response.value);
            await itemsApi.update(listId, item.id, { values: { ...item.values, [targetCol.id]: storeValue } });
            setResults(prev => prev.map(r =>
              r.itemId === result.itemId ? { ...r, status: 'success', value: storeValue } : r
            ));
          } else {
            setResults(prev => prev.map(r =>
              r.itemId === result.itemId ? { ...r, status: 'skipped', value: 'UNKNOWN' } : r
            ));
          }
        } catch (err: unknown) {
          const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed';
          setResults(prev => prev.map(r =>
            r.itemId === result.itemId ? { ...r, status: 'error', error: message } : r
          ));
        }
        doneCount++;
      } else {
        // Batch path
        const batchItems = batchResults.map(r => {
          const item = activeItems.find(it => it.id === r.itemId)!;
          return { item_context: buildItemContext(item, targetCol.id) };
        });

        try {
          const response = await chatApi.completeColumnBatch({
            list_name: listName,
            items: batchItems,
            target_column: targetCol.name,
            column_type: targetCol.column_type,
            column_config: targetCol.config,
            model: selectedModel || undefined,
          });

          if (abortRef.current) break;

          // Collect all new choice values from the whole batch first, then update once
          if (isChoiceType) {
            const allVals: string[] = [];
            response.values.forEach(v => {
              if (v == null) return;
              if (isMultiChoice) {
                v.split(',').map(s => s.trim()).filter(Boolean).forEach(s => allVals.push(s));
              } else {
                allVals.push(v.trim());
              }
            });
            await ensureChoices(allVals);
          }

          // Apply each value and update items
          await Promise.all(
            batchResults.map(async (result, idx) => {
              const value = response.values[idx] ?? null;
              const item = activeItems.find(it => it.id === result.itemId)!;
              if (value != null) {
                const storeValue = encodeValue(value);
                await itemsApi.update(listId, item.id, { values: { ...item.values, [targetCol.id]: storeValue } });
                setResults(prev => prev.map(r =>
                  r.itemId === result.itemId ? { ...r, status: 'success', value: storeValue } : r
                ));
              } else {
                setResults(prev => prev.map(r =>
                  r.itemId === result.itemId ? { ...r, status: 'skipped', value: 'UNKNOWN' } : r
                ));
              }
            })
          );
        } catch (err: unknown) {
          const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed';
          setResults(prev => prev.map(r =>
            batchResults.some(b => b.itemId === r.itemId) ? { ...r, status: 'error', error: message } : r
          ));
        }
        doneCount += batchResults.length;
      }

      setProgress({ done: doneCount, total: itemsToProcess.length });
    }

    queryClient.invalidateQueries({ queryKey: ['items', listId] });
    queryClient.invalidateQueries({ queryKey: ['list', listId] });
    setIsRunning(false);
  };

  const handleStop = () => { abortRef.current = true; };

  const selectedColumn = columns.find(c => c.id === selectedColumnId);
  const itemsWithExisting = selectedColumnId
    ? activeItems.filter(i => { const v = i.values[selectedColumnId]; return v != null && v !== ''; }).length
    : 0;
  const itemsToFill = activeItems.length - (skipExisting ? itemsWithExisting : 0);
  const effectiveBatch = batchSize === 0 ? itemsToFill : batchSize;
  const estimatedCalls = itemsToFill > 0 ? Math.ceil(itemsToFill / effectiveBatch) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isRunning ? () => {} : onClose}
      title="AI Column Completion"
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Column selector */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Column to fill</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedColumnId}
            onChange={(e) => setSelectedColumnId(e.target.value)}
            disabled={isRunning}
          >
            <option value="">Select a column...</option>
            {columns.map(col => (
              <option key={col.id} value={col.id}>{col.name} ({col.column_type})</option>
            ))}
          </select>
          {selectedColumn && (
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                {itemsWithExisting} of {activeItems.length} items already have a value
                {itemsToFill > 0 && ` · ${itemsToFill} to fill`}
              </span>
            </label>
          )}
        </div>

        {/* Model selector */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Model</span>
          </label>
          {loadingModels ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : models.length > 0 ? (
            <select
              className="select select-bordered select-sm w-full"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isRunning}
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              placeholder="e.g. gemini-2.0-flash"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isRunning}
            />
          )}
        </div>

        {/* Options row */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="label cursor-pointer gap-2 p-0">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={skipExisting}
              onChange={(e) => setSkipExisting(e.target.checked)}
              disabled={isRunning}
            />
            <span className="label-text">Skip items with existing values</span>
          </label>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm label-text font-medium">Batch size:</span>
            <select
              className="select select-bordered select-sm"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              disabled={isRunning}
            >
              {BATCH_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Estimate */}
        {selectedColumn && itemsToFill > 0 && (
          <p className="text-xs text-base-content/50">
            {estimatedCalls} API call{estimatedCalls !== 1 ? 's' : ''} to process {itemsToFill} item{itemsToFill !== 1 ? 's' : ''}
            {batchSize !== 1 ? ` (${effectiveBatch} items per request)` : ''}
          </p>
        )}

        {/* Progress */}
        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Progress: {progress.done} / {progress.total}
              </span>
              <div className="flex gap-2 text-xs">
                <span className="text-success">✓ {results.filter(r => r.status === 'success').length}</span>
                <span className="text-base-content/50">⊘ {results.filter(r => r.status === 'skipped').length}</span>
                <span className="text-error">✗ {results.filter(r => r.status === 'error').length}</span>
              </div>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={progress.done}
              max={progress.total || 1}
            />
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div className="max-h-60 overflow-y-auto bg-base-200 rounded-lg p-2 space-y-1 text-sm">
            {results.map(r => (
              <div key={r.itemId} className="flex items-center gap-2 py-0.5">
                {r.status === 'pending' && <span className="text-base-content/30">○</span>}
                {r.status === 'processing' && <span className="loading loading-spinner loading-xs"></span>}
                {r.status === 'success' && <span className="text-success">✓</span>}
                {r.status === 'skipped' && <span className="text-base-content/40">⊘</span>}
                {r.status === 'error' && <span className="text-error">✗</span>}
                <span className="flex-1 truncate">{r.label}</span>
                {r.status === 'success' && r.value && (
                  <span className="text-success text-xs truncate max-w-32">{r.value}</span>
                )}
                {r.status === 'skipped' && r.value && r.value !== 'UNKNOWN' && (
                  <span className="text-base-content/40 text-xs truncate max-w-32">{r.value}</span>
                )}
                {r.status === 'skipped' && r.value === 'UNKNOWN' && (
                  <span className="text-base-content/40 text-xs italic">unknown</span>
                )}
                {r.status === 'error' && r.error && (
                  <span className="text-error text-xs truncate max-w-32">{r.error}</span>
                )}
              </div>
            ))}
            <div ref={resultsEndRef} />
          </div>
        )}

        {/* Actions */}
        <div className="modal-action">
          {isRunning ? (
            <button className="btn btn-warning" onClick={handleStop}>
              Stop
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onClose}>
                {results.length > 0 ? 'Done' : 'Cancel'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={!selectedColumnId || activeItems.length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Start
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}


interface AICompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  columns: Column[];
  items: Item[];
}

interface ItemResult {
  itemId: string;
  label: string;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'error';
  value?: string | null;
  error?: string;
}
