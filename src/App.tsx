import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, type FirebaseUser, testFirestoreConnection } from './lib/firebase';
import { JournalEntry, MoodType, ReflectionMode } from './types';
import {
  syncUserProfile,
  subscribeEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry
} from './services/journalService';
import { requestGeminiReflection } from './services/geminiService';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { JournalList } from './components/JournalList';
import { JournalEditor } from './components/JournalEditor';
import { ReflectionPanel } from './components/ReflectionPanel';
import { ChatDiscussion } from './components/ChatDiscussion';
import { Loader2, BookOpen } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'reflection' | 'discussion'>('editor');
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Sync profile record in Firestore
        syncUserProfile(user);
        // Test Firestore connection on boot
        testFirestoreConnection();
      } else {
        setEntries([]);
        setSelectedEntryId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to user's private Firestore entries
  useEffect(() => {
    if (!currentUser) return;

    const unsub = subscribeEntries(
      currentUser.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);

        // If currently selecting an entry, update reference or keep valid
        if (selectedEntryId) {
          const stillExists = fetchedEntries.some((e) => e.id === selectedEntryId);
          if (!stillExists && fetchedEntries.length > 0) {
            setSelectedEntryId(fetchedEntries[0].id);
          }
        }
      },
      (error) => {
        console.error('Firestore entries subscription error:', error);
      }
    );

    return () => unsub();
  }, [currentUser, selectedEntryId]);

  const activeEntry = entries.find((e) => e.id === selectedEntryId) || null;

  // Handle creating a new entry
  const handleStartNewEntry = () => {
    setSelectedEntryId(null);
    setIsCreatingNew(true);
    setViewMode('editor');
    setActiveError(null);
  };

  // Handle selecting an entry from the list
  const handleSelectEntry = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    setIsCreatingNew(false);
    setActiveError(null);
    if (entry.reflection) {
      setViewMode('reflection');
    } else {
      setViewMode('editor');
    }
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser) return;
    try {
      await deleteJournalEntry(currentUser.uid, entryId);
      if (selectedEntryId === entryId) {
        handleStartNewEntry();
      }
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      setActiveError(err.message || 'Could not delete entry.');
    }
  };

  // Save entry (with or without Gemini reflection)
  const handleSaveEntry = async (data: {
    title: string;
    content: string;
    mood: MoodType;
    mode: ReflectionMode;
    triggerAi: boolean;
  }) => {
    if (!currentUser) return;
    setActiveError(null);

    let generatedReflection = activeEntry?.reflection || '';
    let generatedSummary = activeEntry?.summary || '';
    let aiFailedNotice: string | null = null;

    if (data.triggerAi) {
      setIsGenerating(true);
      try {
        const aiResponse = await requestGeminiReflection({
          title: data.title,
          content: data.content,
          mood: data.mood,
          mode: data.mode
        });

        generatedReflection = aiResponse.reflection;
        generatedSummary = aiResponse.summary;
      } catch (err: any) {
        console.warn('Gemini Reflection temporary failure:', err);
        aiFailedNotice = err.message || 'AI reflection is currently experiencing temporary high demand. Your journal was saved securely; you can generate reflection anytime.';
      } finally {
        setIsGenerating(false);
      }
    }

    try {
      let savedEntryId = activeEntry?.id;

      if (isCreatingNew || !activeEntry) {
        // Create new document in user's isolated collection
        const newEntry = await createJournalEntry(currentUser.uid, {
          title: data.title,
          content: data.content,
          mood: data.mood,
          reflection: generatedReflection,
          summary: generatedSummary,
          tags: ['journal', data.mood]
        });

        savedEntryId = newEntry.id;
        setSelectedEntryId(newEntry.id);
        setIsCreatingNew(false);
      } else {
        // Update existing document
        await updateJournalEntry(currentUser.uid, activeEntry.id, {
          title: data.title,
          content: data.content,
          mood: data.mood,
          reflection: generatedReflection,
          summary: generatedSummary
        });
      }

      if (aiFailedNotice) {
        setActiveError(aiFailedNotice);
        setViewMode('reflection');
      } else if (data.triggerAi && generatedReflection) {
        setViewMode('reflection');
      }
    } catch (err: any) {
      console.error('Failed to save journal to Firestore:', err);
      setActiveError(err.message || 'Failed to save to Firestore.');
    }
  };

  // Generate / Regenerate reflection on an already saved entry
  const handleGenerateReflection = async () => {
    if (!currentUser || !activeEntry) return;
    setActiveError(null);
    setIsGenerating(true);

    try {
      const aiResponse = await requestGeminiReflection({
        title: activeEntry.title,
        content: activeEntry.content,
        mood: activeEntry.mood,
        mode: 'reflect'
      });

      await updateJournalEntry(currentUser.uid, activeEntry.id, {
        reflection: aiResponse.reflection,
        summary: aiResponse.summary
      });
    } catch (err: any) {
      console.error('Failed to generate reflection:', err);
      setActiveError(err.message || 'AI is currently experiencing high demand. Please try again shortly.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading spinner during initial auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-sm">
            <BookOpen className="w-5 h-5 animate-pulse" />
          </div>
          <p className="text-xs font-medium text-stone-500 font-mono">Initializing private journal...</p>
        </div>
      </div>
    );
  }

  // Not authenticated: show landing page with Google / Guest sign-in
  if (!currentUser) {
    return <LandingPage />;
  }

  // Authenticated user dashboard
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans selection:bg-stone-200">
      {/* Navbar */}
      <Navbar
        user={currentUser}
        onNewEntry={handleStartNewEntry}
        isCreating={isCreatingNew}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar: History of past entries */}
        <JournalList
          entries={entries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={handleSelectEntry}
          onDeleteEntry={handleDeleteEntry}
          onNewEntry={handleStartNewEntry}
        />

        {/* Content Canvas */}
        <main className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          {viewMode === 'editor' && (
            <JournalEditor
              entry={isCreatingNew ? null : activeEntry}
              onSave={handleSaveEntry}
              isGenerating={isGenerating}
              activeError={activeError}
            />
          )}

          {viewMode === 'reflection' && activeEntry && (
            <ReflectionPanel
              entry={activeEntry}
              onOpenDiscussion={() => setViewMode('discussion')}
              onEditEntry={() => setViewMode('editor')}
              onGenerateReflection={handleGenerateReflection}
              isGenerating={isGenerating}
              activeError={activeError}
            />
          )}

          {viewMode === 'discussion' && activeEntry && (
            <ChatDiscussion
              userId={currentUser.uid}
              entry={activeEntry}
              onBack={() => setViewMode('reflection')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
