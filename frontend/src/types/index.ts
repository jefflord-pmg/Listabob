export type ColumnType =
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

export interface Column {
  id: string;
  list_id: string;
  name: string;
  column_type: ColumnType;
  position: number;
  is_required: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
}

export interface List {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  columns: Column[];
  views: View[];
}

export interface ListSummary {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  list_id: string;
  position: number | null;
  values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface View {
  id: string;
  list_id: string;
  name: string;
  view_type: ViewType;
  config: Record<string, unknown> | null;
  is_default: boolean;
  position: number | null;
  created_at: string;
}

export type ViewType = 'grid' | 'gallery' | 'calendar' | 'board';

export interface CreateListPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  columns?: CreateColumnPayload[];
}

export interface CreateColumnPayload {
  name: string;
  column_type: ColumnType;
  is_required?: boolean;
  config?: Record<string, unknown>;
}

export interface CreateItemPayload {
  values: Record<string, unknown>;
}

export interface UpdateItemPayload {
  values: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  list_name: string;
  item_context: Record<string, unknown>;
  messages: ChatMessage[];
  model?: string;
}

export interface ChatResponse {
  message: string;
  model: string;
}

export interface GeminiModel {
  id: string;
  name: string;
}

export interface CompletionRequest {
  list_name: string;
  item_context: Record<string, unknown>;
  target_column: string;
  column_type: string;
  model?: string;
}

export interface CompletionResponse {
  value: string | null;
  model: string;
}

export interface RecycleBinItem {
  id: string;
  list_id: string;
  list_name: string;
  list_icon: string | null;
  list_color: string | null;
  position: number | null;
  values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}
