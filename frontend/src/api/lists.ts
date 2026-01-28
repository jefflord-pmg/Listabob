import api from './client';
import type { List, ListSummary, CreateListPayload, Column, CreateColumnPayload, View } from '../types';

export const listsApi = {
  getAll: async (favoriteOnly = false): Promise<ListSummary[]> => {
    const { data } = await api.get('/lists', { params: { favorite_only: favoriteOnly } });
    return data;
  },

  getById: async (id: string): Promise<List> => {
    const { data } = await api.get(`/lists/${id}`);
    return data;
  },

  create: async (payload: CreateListPayload): Promise<List> => {
    const { data } = await api.post('/lists', payload);
    return data;
  },

  update: async (id: string, payload: Partial<CreateListPayload & { is_favorite: boolean }>): Promise<List> => {
    const { data } = await api.put(`/lists/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/lists/${id}`);
  },

  // Column operations
  addColumn: async (listId: string, payload: CreateColumnPayload): Promise<Column> => {
    const { data } = await api.post(`/lists/${listId}/columns`, payload);
    return data;
  },

  updateColumn: async (listId: string, columnId: string, payload: Partial<CreateColumnPayload>): Promise<Column> => {
    const { data } = await api.put(`/lists/${listId}/columns/${columnId}`, payload);
    return data;
  },

  deleteColumn: async (listId: string, columnId: string): Promise<void> => {
    await api.delete(`/lists/${listId}/columns/${columnId}`);
  },

  reorderColumns: async (listId: string, columnIds: string[]): Promise<Column[]> => {
    const { data } = await api.put(`/lists/${listId}/columns/reorder`, { column_ids: columnIds });
    return data;
  },

  // View operations
  updateView: async (listId: string, viewId: string, payload: { config?: Record<string, unknown> }): Promise<View> => {
    const { data } = await api.put(`/lists/${listId}/views/${viewId}`, payload);
    return data;
  },
};
