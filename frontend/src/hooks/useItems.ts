import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../api/items';
import type { CreateItemPayload, UpdateItemPayload } from '../types';

export function useItems(listId: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['items', listId, { includeDeleted }],
    queryFn: () => itemsApi.getAll(listId, 0, 100, includeDeleted),
    enabled: !!listId,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, ...payload }: { listId: string } & CreateItemPayload) =>
      itemsApi.create(listId, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.listId] });
      return data; // Return the created item
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, itemId, ...payload }: { listId: string; itemId: string } & UpdateItemPayload) =>
      itemsApi.update(listId, itemId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.listId] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      itemsApi.delete(listId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['recycle-bin'] });
    },
  });
}

export function useRestoreItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      itemsApi.restore(listId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['recycle-bin'] });
    },
  });
}

export function useRecycleBin() {
  return useQuery({
    queryKey: ['recycle-bin'],
    queryFn: () => itemsApi.getRecycleBin(),
  });
}

export function useRestoreFromRecycleBin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => itemsApi.restoreFromRecycleBin(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycle-bin'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function usePermanentDeleteFromRecycleBin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => itemsApi.permanentDeleteFromRecycleBin(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycle-bin'] });
    },
  });
}
