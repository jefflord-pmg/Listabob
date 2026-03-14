import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui';
import { chatApi } from '../../api/chat';
import { ItemCompletionTab } from './ItemCompletionTab';
import type { ChatMessage, Column, Item, GeminiModel } from '../../types';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  item: Item;
  columns: Column[];
}

type TabId = 'chat' | 'complete';

export function ChatModal({ isOpen, onClose, listId, listName, item, columns }: ChatModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('complete');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Build a readable context from the item data
  const itemContext: Record<string, unknown> = {};
  for (const col of columns) {
    const val = item.values[col.id];
    if (val != null && val !== '') {
      itemContext[col.name] = val;
    }
  }

  // Fetch models when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  // Focus input when modal opens or tab switches to chat
  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInput('');
      setError(null);
      setActiveTab('chat');
    }
  }, [isOpen]);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const result = await chatApi.getModels();
      setModels(result);
      // Try to load saved model from config
      const configResp = await fetch('/api/system/config');
      if (configResp.ok) {
        const config = await configResp.json();
        if (config.gemini_model) {
          setSelectedModel(config.gemini_model);
        } else if (result.length > 0) {
          // Default to first flash model or first model
          const flash = result.find(m => m.id.includes('flash'));
          setSelectedModel(flash?.id || result[0].id);
        }
      }
    } catch {
      // Models will just be empty, user can still type a model name
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({
        list_name: listName,
        item_context: itemContext,
        messages: newMessages,
        model: selectedModel || undefined,
      });

      setMessages([...newMessages, { role: 'assistant', content: response.message }]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || 'Failed to get response from Gemini';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Build a summary of the item for the header
  const firstCol = columns[0];
  const itemLabel = firstCol && item.values[firstCol.id]
    ? String(item.values[firstCol.id])
    : 'Item';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === 'chat' ? `Chat about: ${itemLabel}` : `AI Complete: ${itemLabel}`}
      className="max-w-2xl h-[80vh] flex flex-col"
    >
      {/* Tabs */}
      <div role="tablist" className="tabs tabs-bordered -mt-2 mb-3 flex-shrink-0">
        <button
          role="tab"
          className={`tab ${activeTab === 'complete' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('complete')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Complete
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === 'chat' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Model selector */}
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <label className="text-xs text-base-content/60">Model:</label>
            {loadingModels ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : models.length > 0 ? (
              <select
                className="select select-bordered select-xs flex-1"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="input input-bordered input-xs flex-1"
                placeholder="e.g. gemini-2.0-flash"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              />
            )}
          </div>

          {/* Item context summary */}
          <div className="bg-base-200 rounded-lg p-3 mb-3 flex-shrink-0 max-h-32 overflow-y-auto">
            <div className="text-xs text-base-content/60 mb-1 font-semibold">Item Context — {listName}</div>
            <div className="text-xs space-y-0.5">
              {Object.entries(itemContext).map(([key, val]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span>{' '}
                  <span className="text-base-content/80">{String(val)}</span>
                </div>
              ))}
              {Object.keys(itemContext).length === 0 && (
                <span className="text-base-content/40 italic">No data in this item</span>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-base-content/40 py-8">
                <p className="text-sm">Ask a question about this item</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
              >
                <div className={`chat-bubble ${
                  msg.role === 'user' 
                    ? 'chat-bubble-primary' 
                    : 'chat-bubble-neutral'
                } text-sm whitespace-pre-wrap`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat chat-start">
                <div className="chat-bubble chat-bubble-neutral">
                  <span className="loading loading-dots loading-sm"></span>
                </div>
              </div>
            )}
            {error && (
              <div className="alert alert-error text-sm py-2">
                <span>{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex gap-2 flex-shrink-0">
            <textarea
              ref={inputRef}
              className="textarea textarea-bordered flex-1 resize-none text-sm"
              placeholder="Ask about this item... (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={isLoading}
            />
            <button
              className="btn btn-primary btn-sm self-end"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Complete Tab */}
      {activeTab === 'complete' && (
        <ItemCompletionTab
          listId={listId}
          listName={listName}
          item={item}
          columns={columns}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          loadingModels={loadingModels}
        />
      )}
    </Modal>
  );
}
