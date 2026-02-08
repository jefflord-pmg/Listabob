import api from './client';
import type { Item, CreateItemPayload, UpdateItemPayload, RecycleBinItem } from '../types';

export const itemsApi = {
  getAll: async (listId: string, skip = 0, limit = 100, includeDeleted = false): Promise<Item[]> => {
    const { data } = await api.get(`/lists/${listId}/items`, { params: { skip, limit, include_deleted: includeDeleted } });
    return data;
  },

  getById: async (listId: string, itemId: string): Promise<Item> => {
    const { data } = await api.get(`/lists/${listId}/items/${itemId}`);
    return data;
  },

  create: async (listId: string, payload: CreateItemPayload): Promise<Item> => {
    const { data } = await api.post(`/lists/${listId}/items`, payload);
    return data;
  },

  update: async (listId: string, itemId: string, payload: UpdateItemPayload): Promise<Item> => {
    const { data } = await api.put(`/lists/${listId}/items/${itemId}`, payload);
    return data;
  },

  delete: async (listId: string, itemId: string): Promise<void> => {
    await api.delete(`/lists/${listId}/items/${itemId}`);
  },

  restore: async (listId: string, itemId: string): Promise<Item> => {
    const { data } = await api.post(`/lists/${listId}/items/${itemId}/restore`);
    return data;
  },

  permanentDelete: async (listId: string, itemId: string): Promise<void> => {
    await api.delete(`/lists/${listId}/items/${itemId}/permanent`);
  },

  // Global recycle bin
  getRecycleBin: async (): Promise<RecycleBinItem[]> => {
    const { data } = await api.get('/system/recycle-bin');
    return data;
  },

  restoreFromRecycleBin: async (itemId: string): Promise<Item> => {
    const { data } = await api.post(`/system/recycle-bin/${itemId}/restore`);
    return data;
  },

  permanentDeleteFromRecycleBin: async (itemId: string): Promise<void> => {
    await api.delete(`/system/recycle-bin/${itemId}`);
  },
};
