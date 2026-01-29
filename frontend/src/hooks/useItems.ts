import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../api/items';
import type { CreateItemPayload, UpdateItemPayload } from '../types';

export function useItems(listId: string) {
  return useQuery({
    queryKey: ['items', listId],
    queryFn: () => itemsApi.getAll(listId),
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
    },
  });
}
