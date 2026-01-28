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

export interface List {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
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
