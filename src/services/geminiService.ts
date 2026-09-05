import { ReflectionMode, ReflectionResponse } from '../types';

function extractErrorMessage(response: Response, errData: any, fallbackAction: string): string {
  if (response.status === 503 || errData.code === 503 || errData.status === 'UNAVAILABLE') {
    return 'All Gemini models are temporarily experiencing high demand. Spikes are brief—please click Retry in a few moments.';
  }
  if (errData?.error && typeof errData.error === 'string') {
    return errData.error;
  }
  return `${fallbackAction} encountered a temporary issue (HTTP ${response.status}). Please try again.`;
}

export async function requestGeminiReflection(params: {
  title: string;
  content: string;
  mood?: string;
  mode: ReflectionMode;
}): Promise<ReflectionResponse & { modelUsed?: string }> {
  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(response, errData, 'Reflection generation'));
  }

  return response.json();
}

export async function sendGeminiChatMessage(params: {
  messages: Array<{ role: 'user' | 'model'; content: string }>;
  journalContext?: {
    title: string;
    content: string;
    reflection?: string;
  };
}): Promise<{ reply: string; modelUsed?: string }> {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(response, errData, 'Chat discussion'));
  }

  return response.json();
}

export async function requestGeminiTitle(content: string): Promise<string> {
  const response = await fetch('/api/gemini/title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(response, errData, 'Title generation'));
  }

  const data = await response.json();
  return data.title || 'Mindful Reflection';
}

export async function requestGeminiSummary(params: {
  content: string;
  title?: string;
}): Promise<string> {
  const response = await fetch('/api/gemini/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(response, errData, 'Summary generation'));
  }

  const data = await response.json();
  return data.summary || '';
}

export async function requestGeminiInsights(params: {
  content: string;
  mood?: string;
}): Promise<string> {
  const response = await fetch('/api/gemini/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(response, errData, 'Insights analysis'));
  }

  const data = await response.json();
  return data.insights || '';
}
