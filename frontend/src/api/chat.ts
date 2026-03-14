import api from './client';
import type { ChatRequest, ChatResponse, CompletionRequest, CompletionResponse, GeminiModel } from '../types';

export const chatApi = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const { data } = await api.post('/chat', request);
    return data;
  },

  getModels: async (): Promise<GeminiModel[]> => {
    const { data } = await api.get('/chat/models');
    return data;
  },

  completeColumn: async (request: CompletionRequest): Promise<CompletionResponse> => {
    const { data } = await api.post('/chat/complete', request);
    return data;
  },
};
