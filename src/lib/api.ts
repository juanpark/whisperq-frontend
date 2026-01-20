// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Session API
export async function getSessionByCode(code: string) {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${code}`);
  if (!response.ok) {
    throw new Error('Session not found');
  }
  return response.json();
}

export async function createSession(title: string, facilitatorId: number) {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, facilitatorId }),
  });
  if (!response.ok) {
    throw new Error('Failed to create session');
  }
  return response.json();
}

// Reaction API (HTTP fallback)
export async function sendReactionHttp(sessionId: string, type: 'CONFUSED' | 'MORE') {
  const response = await fetch(`${API_BASE_URL}/api/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, type }),
  });
  if (!response.ok) {
    throw new Error('Failed to send reaction');
  }
  return response.json();
}

// Question API
// Note: Backend QuestionResponse currently only returns id, content, createdAt
// writerName and sessionId are stored but not exposed in current API
export interface Question {
  id: number;
  content: string;
  createdAt: string;
  // These fields are NOT returned by backend currently, but we keep them optional for future
  sessionId?: number;
  writerName?: string;
  answered?: boolean;
}

export async function createQuestion(sessionId: string, text: string, guestName?: string, userId?: number) {
  const response = await fetch(`${API_BASE_URL}/api/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, text, guestName, userId }),
  });
  if (!response.ok) {
    throw new Error('Failed to create question');
  }
  return response.json();
}

export async function getQuestions(): Promise<Question[]> {
  const response = await fetch(`${API_BASE_URL}/api/questions`);
  if (!response.ok) {
    throw new Error('Failed to fetch questions');
  }
  return response.json();
}

// WebSocket Configuration
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

export function getReactionTopic(sessionId: string) {
  return `/topic/session/${sessionId}/reactions`;
}

export function getReactionDestination() {
  return '/app/reactions';
}
