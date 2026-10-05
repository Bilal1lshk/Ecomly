'use client';

import { useState, useCallback } from 'react';

export interface ProductInput {
  name: string;
  category: string;
  color?: string;
  description?: string;
  style?: string;
  model?: string;
  seed?: number;
  enhance?: boolean;
  width?: number;
  height?: number;
}

interface UseProductImageReturn {
  imageUrl: string | null;
  prompt: string | null;
  isLoading: boolean;
  error: string | null;
  generate: (product: ProductInput) => Promise<void>;
  reset: () => void;
}

export function useProductImage(): UseProductImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompt,   setPrompt]   = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const generate = useCallback(async (product: ProductInput) => {
    setIsLoading(true);
    setError(null);
    setImageUrl(null);
    setPrompt(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Request failed');
      }

      const data = await res.json();
      setPrompt(data.prompt);
      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setImageUrl(null);
    setPrompt(null);
    setError(null);
  }, []);

  return { imageUrl, prompt, isLoading, error, generate, reset };
}