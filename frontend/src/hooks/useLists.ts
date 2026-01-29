import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '../api/lists';
import type { CreateListPayload, CreateColumnPayload } from '../types';

export function useLists(favoriteOnly = false) {
  return useQuery({
    queryKey: ['lists', { favoriteOnly }],
    queryFn: () => listsApi.getAll(favoriteOnly),
  });
}

export function useList(id: string) {
  return useQuery({
    queryKey: ['list', id],
    queryFn: () => listsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateListPayload) => listsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<CreateListPayload & { is_favorite: boolean }>) =>
      listsApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['list', variables.id] });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useAddColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, ...payload }: { listId: string } & CreateColumnPayload) =>
      listsApi.addColumn(listId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
    },
  });
}

export function useDeleteColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, columnId }: { listId: string; columnId: string }) =>
      listsApi.deleteColumn(listId, columnId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['items', variables.listId] });
    },
  });
}

export function useUpdateColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, columnId, ...payload }: { listId: string; columnId: string; name?: string; config?: Record<string, unknown> }) =>
      listsApi.updateColumn(listId, columnId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
    },
  });
}

export function useReorderColumns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, columnIds }: { listId: string; columnIds: string[] }) =>
      listsApi.reorderColumns(listId, columnIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
    },
  });
}

export function useUpdateView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, viewId, config, name }: { listId: string; viewId: string; config?: Record<string, unknown>; name?: string }) =>
      listsApi.updateView(listId, viewId, { config, name }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
    },
  });
}

export function useCreateView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, name, config }: { listId: string; name: string; config?: Record<string, unknown> }) =>
      listsApi.createView(listId, { name, config }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
    },
  });
}

export function useDeleteView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, viewId }: { listId: string; viewId: string }) =>
      listsApi.deleteView(listId, viewId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
    },
  });
}
