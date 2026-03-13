import api from './client';
import type { ChatRequest, ChatResponse, GeminiModel } from '../types';

export const chatApi = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const { data } = await api.post('/chat', request);
    return data;
  },

  getModels: async (): Promise<GeminiModel[]> => {
    const { data } = await api.get('/chat/models');
    return data;
  },
};
