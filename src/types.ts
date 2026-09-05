export type MoodType =
  | 'peaceful'
  | 'reflective'
  | 'energized'
  | 'anxious'
  | 'grateful'
  | 'overwhelmed'
  | 'curious'
  | 'neutral';

export type ReflectionMode = 'reflect' | 'brainstorm' | 'summarize';

export interface UserProfile {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood?: MoodType;
  summary?: string;
  reflection?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface JournalMessage {
  id: string;
  entryId: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

export interface ReflectionResponse {
  reflection: string;
  summary: string;
  mode: ReflectionMode;
}
