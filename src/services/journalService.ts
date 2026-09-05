import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, type FirebaseUser } from '../lib/firebase';
import { JournalEntry, JournalMessage, UserProfile } from '../types';

// Helper to generate compliant document IDs (regex: ^[a-zA-Z0-9_\-]+$)
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomStr}`;
}

// Sync user profile in Firestore
export async function syncUserProfile(user: FirebaseUser): Promise<void> {
  if (!user.uid) return;
  const userRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const profile: UserProfile = {
        userId: user.uid,
        displayName: user.displayName || (user.isAnonymous ? 'Guest Reflective Writer' : 'Reflective Writer'),
        email: user.email || null,
        photoURL: user.photoURL || null,
        createdAt: now,
        updatedAt: now
      };
      await setDoc(userRef, profile);
    } else {
      await updateDoc(userRef, {
        updatedAt: now,
        displayName: user.displayName || snap.data()?.displayName || 'Reflective Writer',
        photoURL: user.photoURL || snap.data()?.photoURL || null
      });
    }
  } catch (error) {
    console.error('Failed to sync user profile:', error);
  }
}

// Subscribe to user's private journal entries
export function subscribeEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      onUpdate(entries);
    },
    (error) => {
      console.error('Firestore entries subscription error:', error);
      if (onError) onError(error);
    }
  );
}

// Create a new journal entry
export async function createJournalEntry(
  userId: string,
  data: {
    title: string;
    content: string;
    mood?: JournalEntry['mood'];
    reflection?: string;
    summary?: string;
    tags?: string[];
  }
): Promise<JournalEntry> {
  const entryId = generateId('entry');
  const now = new Date().toISOString();
  const entryRef = doc(db, 'users', userId, 'entries', entryId);

  const newEntry: JournalEntry = {
    id: entryId,
    userId,
    title: data.title.trim() || 'Untitled Reflection',
    content: data.content,
    mood: data.mood || 'reflective',
    reflection: data.reflection || '',
    summary: data.summary || '',
    tags: data.tags || ['reflection'],
    createdAt: now,
    updatedAt: now
  };

  await setDoc(entryRef, newEntry);
  return newEntry;
}

// Update an existing journal entry
export async function updateJournalEntry(
  userId: string,
  entryId: string,
  updates: Partial<Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  const now = new Date().toISOString();
  await updateDoc(entryRef, {
    ...updates,
    updatedAt: now
  });
}

// Delete an entry
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
}

// Subscribe to multi-turn discussion messages for an entry
export function subscribeEntryMessages(
  userId: string,
  entryId: string,
  onUpdate: (messages: JournalMessage[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const messagesRef = collection(db, 'users', userId, 'entries', entryId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: JournalMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push(docSnap.data() as JournalMessage);
      });
      onUpdate(messages);
    },
    (error) => {
      console.error('Firestore messages subscription error:', error);
      if (onError) onError(error);
    }
  );
}

// Add a message to an entry's discussion
export async function addEntryMessage(
  userId: string,
  entryId: string,
  role: 'user' | 'model',
  content: string
): Promise<JournalMessage> {
  const messageId = generateId('msg');
  const now = new Date().toISOString();
  const messageRef = doc(db, 'users', userId, 'entries', entryId, 'messages', messageId);

  const message: JournalMessage = {
    id: messageId,
    entryId,
    userId,
    role,
    content,
    createdAt: now
  };

  await setDoc(messageRef, message);
  return message;
}
