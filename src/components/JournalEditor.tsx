import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lightbulb,
  FileText,
  Compass,
  Save,
  Loader2,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Wand2
} from 'lucide-react';
import { JournalEntry, MoodType, ReflectionMode } from '../types';
import { requestGeminiTitle } from '../services/geminiService';

interface JournalEditorProps {
  entry: JournalEntry | null;
  onSave: (data: {
    title: string;
    content: string;
    mood: MoodType;
    mode: ReflectionMode;
    triggerAi: boolean;
  }) => Promise<void>;
  isGenerating: boolean;
  activeError?: string | null;
}

const moods: Array<{ id: MoodType; label: string; dot: string }> = [
  { id: 'reflective', label: 'Reflective', dot: 'bg-indigo-400' },
  { id: 'peaceful', label: 'Peaceful', dot: 'bg-teal-400' },
  { id: 'grateful', label: 'Grateful', dot: 'bg-emerald-400' },
  { id: 'curious', label: 'Curious', dot: 'bg-blue-400' },
  { id: 'energized', label: 'Energized', dot: 'bg-amber-400' },
  { id: 'anxious', label: 'Anxious', dot: 'bg-rose-400' },
  { id: 'overwhelmed', label: 'Overwhelmed', dot: 'bg-purple-400' }
];

const promptSparks = [
  'What is something that felt unexpectedly heavy or meaningful today?',
  'What is a belief or assumption I have been holding that might deserve questioning?',
  'Where did I experience friction or resistance recently, and what might it be pointing to?',
  'What is one small truth I have been hesitating to admit to myself?',
  'What would feeling genuinely content or at peace look like right now?'
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entry,
  onSave,
  isGenerating,
  activeError
}) => {
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState<MoodType>(entry?.mood || 'reflective');
  const [mode, setMode] = useState<ReflectionMode>('reflect');
  const [showSparks, setShowSparks] = useState(false);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Sync state if entry prop changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setMood(entry.mood || 'reflective');
    } else {
      setTitle('');
      setContent('');
      setMood('reflective');
    }
  }, [entry]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleSparkClick = (sparkText: string) => {
    setContent((prev) => (prev ? `${prev}\n\n${sparkText} ` : `${sparkText} `));
    setShowSparks(false);
  };

  const handleSuggestTitle = async () => {
    if (!content.trim()) return;
    setIsSuggestingTitle(true);
    setTitleError(null);
    try {
      const generatedTitle = await requestGeminiTitle(content);
      if (generatedTitle) {
        setTitle(generatedTitle);
      }
    } catch (err: any) {
      console.warn('Could not generate title:', err);
      setTitleError('Title suggestion is busy. You can type one directly.');
    } finally {
      setIsSuggestingTitle(false);
    }
  };

  const handleTriggerReflection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    await onSave({
      title: title.trim() || 'Untitled Reflection',
      content,
      mood,
      mode,
      triggerAi: true
    });
  };

  const handleSaveOnly = async () => {
    if (!content.trim()) return;

    await onSave({
      title: title.trim() || 'Untitled Reflection',
      content,
      mood,
      mode,
      triggerAi: false
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto p-6 sm:p-8 flex flex-col min-h-full">
        {/* Error notification with dedicated retry */}
        {activeError && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{activeError}</span>
            </div>
            <button
              type="button"
              id="editor-retry-button"
              onClick={() => handleTriggerReflection()}
              disabled={isGenerating || !content.trim()}
              className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Prompt Sparks Toolbar */}
        <div className="relative mb-4">
          <button
            type="button"
            id="prompt-sparks-toggle"
            onClick={() => setShowSparks(!showSparks)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Prompt Sparks & Inquiries</span>
            <ChevronDown className={`w-3 h-3 text-stone-500 transition-transform ${showSparks ? 'rotate-180' : ''}`} />
          </button>

          {showSparks && (
            <div className="absolute left-0 top-9 w-full sm:w-96 bg-white border border-stone-200 rounded-xl shadow-md p-2 z-20 space-y-1">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-2 py-1">
                Choose a reflection spark:
              </p>
              {promptSparks.map((spark, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSparkClick(spark)}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors leading-relaxed block"
                >
                  "{spark}"
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title Input with Gemini Title Suggester */}
        <div className="mb-3 flex items-center gap-2">
          <input
            id="journal-title-input"
            type="text"
            placeholder="Reflection Title or Core Topic..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-xl sm:text-2xl font-serif font-semibold text-stone-900 placeholder-stone-300 border-none outline-none focus:ring-0 px-0 bg-transparent"
          />

          {content.trim().length > 20 && (
            <button
              type="button"
              id="suggest-title-button"
              onClick={handleSuggestTitle}
              disabled={isSuggestingTitle}
              title="Suggest a title using Gemini"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 text-xs transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            >
              {isSuggestingTitle ? (
                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
              ) : (
                <Wand2 className="w-3 h-3 text-amber-500" />
              )}
              <span className="hidden sm:inline">Suggest Title</span>
            </button>
          )}
        </div>

        {titleError && (
          <p className="text-[11px] text-amber-700 mb-2">{titleError}</p>
        )}

        {/* Mood Selection Pills */}
        <div className="mb-4 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-stone-400 font-medium mr-1">Emotional Tone:</span>
          {moods.map((m) => (
            <button
              key={m.id}
              type="button"
              id={`mood-pill-${m.id}`}
              onClick={() => setMood(m.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                mood === m.id
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Journal Textarea */}
        <div className="flex-1 flex flex-col min-h-[260px] relative">
          <textarea
            id="journal-content-input"
            placeholder="Write your reflection freely here... What happened? How did it make you feel? What thoughts are turning over in your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isGenerating}
            className="w-full flex-1 p-0 text-sm sm:text-base text-stone-800 placeholder-stone-300 border-none outline-none focus:ring-0 resize-none font-sans leading-relaxed bg-transparent"
          />

          {/* Word count */}
          <div className="flex items-center justify-between py-2 text-[11px] text-stone-400 border-t border-stone-100">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span>Private & encrypted in your Firestore</span>
          </div>
        </div>

        {/* Reflection Mode Selector */}
        <div className="mt-4 pt-4 border-t border-stone-200/80">
          <p className="text-xs font-semibold text-stone-500 mb-2">Select Gemini Perspective:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              id="mode-reflect-button"
              onClick={() => setMode('reflect')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                mode === 'reflect'
                  ? 'border-stone-900 bg-stone-50/70 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-stone-900">Deep Reflection</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                Empathetic validation, cognitive patterns & introspective questions.
              </p>
            </button>

            <button
              type="button"
              id="mode-brainstorm-button"
              onClick={() => setMode('brainstorm')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                mode === 'brainstorm'
                  ? 'border-stone-900 bg-stone-50/70 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-stone-900">Brainstorm Ideas</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                Fresh angles, thought experiments & actionable experiments.
              </p>
            </button>

            <button
              type="button"
              id="mode-summarize-button"
              onClick={() => setMode('summarize')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                mode === 'summarize'
                  ? 'border-stone-900 bg-stone-50/70 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-stone-900">Synthesize & Summarize</span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                Distill executive essence, emotional themes & closing takeaways.
              </p>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            id="journal-save-only-button"
            onClick={handleSaveOnly}
            disabled={!content.trim() || isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs sm:text-sm font-medium hover:bg-stone-50 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Entry (Raw)</span>
          </button>

          <button
            type="button"
            id="journal-reflect-ai-button"
            onClick={handleTriggerReflection}
            disabled={!content.trim() || isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Gemini is Reflecting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Reflect with Gemini</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
