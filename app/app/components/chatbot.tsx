'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState, type FormEvent } from 'react';

export default function Chatbot() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/auth/Eco-Bot' }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const canSubmit = !isLoading && input.trim().length > 0;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    void sendMessage({ text });
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-[500px] max-w-md border rounded-lg shadow-lg bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg font-semibold">
        Ecomly Assistant
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-4">
            Ask me anything about Ecomly products, shipping, or policies.
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-blue-100 text-gray-900'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {m.parts
                .filter((part) => part.type === 'text')
                .map((part) => part.text)
                .join('')}
            </div>
          </div>
        ))}

        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error.message || 'The assistant could not respond. Please try again.'}
          </p>
        )}

        {isLoading && (
          <div className="text-gray-400 text-sm flex items-center gap-1">
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
        
        {/* Invisible anchor element for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
        <input
          className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about Ecomly..."
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
