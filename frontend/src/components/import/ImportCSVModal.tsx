import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'choice'
  | 'multiple_choice'
  | 'boolean'
  | 'hyperlink'
  | 'image'
  | 'attachment'
  | 'rating'
  | 'person'
  | 'location';

interface ColumnPreview {
  name: string;
  guessed_type: ColumnType;
  sample_values: string[];
  distinct_values: string[] | null;
}

interface CSVPreviewResponse {
  columns: ColumnPreview[];
  sample_rows: Record<string, string>[];
  total_rows: number;
}

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Number',
  currency: 'Currency',
  date: 'Date',
  datetime: 'Date & Time',
  choice: 'Choice',
  multiple_choice: 'Multiple Choice',
  boolean: 'Checkbox',
  rating: 'Rating',
  hyperlink: 'Hyperlink',
  image: 'Image',
  attachment: 'Attachment',
  person: 'Person',
  location: 'Location',
};

const AVAILABLE_TYPES: ColumnType[] = [
  'text', 'number', 'currency', 'date', 'choice', 'multiple_choice', 'boolean', 'rating', 'hyperlink'
];

export function ImportCSVModal({ isOpen, onClose }: ImportCSVModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'configure'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [preview, setPreview] = useState<CSVPreviewResponse | null>(null);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setListName(selectedFile.name.replace(/\.csv$/i, ''));
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith('.csv')) {
      setFile(droppedFile);
      setListName(droppedFile.name.replace(/\.csv$/i, ''));
      setError(null);
    } else {
      setError('Please drop a CSV file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handlePreview = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('has_header_row', String(hasHeaderRow));
      
      const response = await fetch('/api/import/csv/preview', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to parse CSV');
      }
      
      const data: CSVPreviewResponse = await response.json();
      setPreview(data);
      
      // Initialize column types with guessed types
      const types: Record<string, ColumnType> = {};
      data.columns.forEach(col => {
        types[col.name] = col.guessed_type;
      });
      setColumnTypes(types);
      
      setStep('configure');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || !listName.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Re-read file to get all data
      const formData = new FormData();
      formData.append('file', file!);
      formData.append('has_header_row', String(hasHeaderRow));
      
      const previewResponse = await fetch('/api/import/csv/preview', {
        method: 'POST',
        body: formData,
      });
      
      if (!previewResponse.ok) {
        throw new Error('Failed to read CSV');
      }
      
      // We need all data, not just preview - let's read the file directly
      const fileText = await file!.text();
      const lines = fileText.split(/\r?\n/).filter(line => line.trim());
      
      // Parse CSV manually (simple parser)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };
      
      // Use clean column names from preview (backend already stripped quotes)
      const columnNames = preview.columns.map(c => c.name);
      const dataLines = hasHeaderRow ? lines.slice(1) : lines;
      
      const data = dataLines.map(line => {
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        columnNames.forEach((col, i) => {
          row[col] = values[i] || '';
        });
        return row;
      });
      
      const response = await api.post('/import/csv/create', {
        list_name: listName.trim(),
        list_description: listDescription.trim(),
        has_header_row: hasHeaderRow,
        columns: preview.columns.map(col => ({
          name: col.name,
          column_type: columnTypes[col.name] || col.guessed_type,
        })),
        data,
      });
      
      // Navigate to the new list
      navigate(`/list/${response.data.list_id}`);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setHasHeaderRow(true);
    setListName('');
    setListDescription('');
    setPreview(null);
    setColumnTypes({});
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      }}
    >
      <div className="modal-box max-w-4xl">
        <h3 id="import-modal-title" className="font-bold text-lg mb-4">Import CSV</h3>

        {error && (
          <div className="alert alert-error mb-4" role="alert">
            <span>{error}</span>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/10' 
                  : file 
                    ? 'border-success bg-success/10' 
                    : 'border-base-300 hover:border-primary'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label={file ? `Selected file: ${file.name}. Click or drop to replace` : 'Drop CSV file here or click to browse'}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
                aria-label="Select CSV file"
              />
              {file ? (
                <div>
                  <div className="text-4xl mb-2" aria-hidden="true">📄</div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm text-base-content/60">Click or drop to replace</div>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2" aria-hidden="true">📂</div>
                  <div className="font-medium">Drop CSV file here</div>
                  <div className="text-sm text-base-content/60">or click to browse</div>
                </div>
              )}
            </div>

            {file && (
              <>
                <div className="form-control">
                  <label className="label" htmlFor="import-list-name">
                    <span className="label-text">List Name</span>
                  </label>
                  <input
                    id="import-list-name"
                    type="text"
                    className="input input-bordered"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="Enter a name for the new list"
                  />
                </div>

                <div className="form-control">
                  <label className="label" htmlFor="import-list-description">
                    <span className="label-text">Description (optional)</span>
                  </label>
                  <input
                    id="import-list-description"
                    type="text"
                    className="input input-bordered"
                    value={listDescription}
                    onChange={(e) => setListDescription(e.target.value)}
                    placeholder="Enter a description"
                  />
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={hasHeaderRow}
                      onChange={(e) => setHasHeaderRow(e.target.checked)}
                      id="import-has-header"
                    />
                    <span className="label-text">First row contains column names</span>
                  </label>
                </div>
              </>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={handlePreview}
                disabled={!file || !listName.trim() || loading}
              >
                {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Next'}
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && preview && (
          <div className="space-y-4">
            <div className="text-sm text-base-content/70">
              Found <strong>{preview.total_rows}</strong> rows and <strong>{preview.columns.length}</strong> columns
            </div>

            <div className="divider">Configure Columns</div>

            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="table table-sm table-zebra">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>Column Name</th>
                    <th>Type</th>
                    <th>Sample Values</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.columns.map((col) => (
                    <tr key={col.name}>
                      <td className="font-medium">{col.name}</td>
                      <td>
                        <select
                          className="select select-bordered select-sm w-full max-w-xs"
                          value={columnTypes[col.name] || col.guessed_type}
                          onChange={(e) => setColumnTypes({
                            ...columnTypes,
                            [col.name]: e.target.value as ColumnType
                          })}
                        >
                          {AVAILABLE_TYPES.map(type => (
                            <option key={type} value={type}>
                              {COLUMN_TYPE_LABELS[type]}
                              {type === col.guessed_type ? ' (suggested)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {col.sample_values.slice(0, 3).map((val, i) => (
                            <span key={i} className="badge badge-sm badge-ghost truncate max-w-[100px]" title={val}>
                              {val || '(empty)'}
                            </span>
                          ))}
                        </div>
                        {col.distinct_values && (
                          <div className="text-xs text-base-content/50 mt-1">
                            {col.distinct_values.length} options detected
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divider">Data Preview</div>

            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="table table-xs">
                <thead className="sticky top-0 bg-base-200">
                  <tr>
                    <th>#</th>
                    {preview.columns.map(col => (
                      <th key={col.name}>{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample_rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      {preview.columns.map(col => (
                        <td key={col.name} className="max-w-[150px] truncate" title={row[col.name]}>
                          {row[col.name] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setStep('upload')}>Back</button>
              <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Importing...
                  </>
                ) : (
                  `Import ${preview.total_rows} Rows`
                )}
              </button>
            </div>
          </div>
        )}

        <button 
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={handleClose}
          aria-label="Close modal"
        >
          ✕
        </button>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={handleClose} aria-hidden="true" />
    </div>
  );
}
