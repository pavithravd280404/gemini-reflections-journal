import React, { useState } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Copy,
  Check,
  MessageSquare,
  Compass,
  Edit3,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { JournalEntry } from '../types';

interface ReflectionPanelProps {
  entry: JournalEntry;
  onOpenDiscussion: () => void;
  onEditEntry: () => void;
  onGenerateReflection?: () => void;
  isGenerating?: boolean;
  activeError?: string | null;
}

export const ReflectionPanel: React.FC<ReflectionPanelProps> = ({
  entry,
  onOpenDiscussion,
  onEditEntry,
  onGenerateReflection,
  isGenerating = false,
  activeError
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!entry.reflection) return;
    try {
      await navigator.clipboard.writeText(entry.reflection);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto p-6 sm:p-8 flex flex-col min-h-full">
        {/* Error notification if any */}
        {activeError && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{activeError}</span>
            </div>
            {onGenerateReflection && (
              <button
                onClick={onGenerateReflection}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium text-xs cursor-pointer shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Top Header */}
        <div className="pb-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Gemini Reflection</span>
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900">
              {entry.title || 'Untitled Reflection'}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onGenerateReflection && (
              <button
                onClick={onGenerateReflection}
                disabled={isGenerating}
                title="Regenerate Gemini reflection"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{entry.reflection ? 'Regenerate' : 'Reflect with AI'}</span>
              </button>
            )}

            <button
              onClick={onEditEntry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Journal</span>
            </button>

            {entry.reflection && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* User Original Journal snippet */}
        <div className="my-5 p-4 rounded-xl bg-stone-50 border border-stone-200/80">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-stone-400" />
              <span>Your Written Thought:</span>
            </span>
            {entry.mood && (
              <span className="capitalize text-stone-600 font-semibold">Mood: {entry.mood}</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed italic whitespace-pre-wrap">
            "{entry.content}"
          </p>
        </div>

        {/* Summary Callout if available */}
        {entry.summary && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs sm:text-sm text-stone-800 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-900 block mb-0.5">Key Distillation:</span>
              <p className="text-stone-700 leading-relaxed">{entry.summary}</p>
            </div>
          </div>
        )}

        {/* Full Gemini Reflection Markdown Body */}
        <div className="flex-1">
          {entry.reflection ? (
            <div className="prose prose-stone max-w-none text-stone-800 text-sm sm:text-base leading-relaxed space-y-4">
              <Markdown>{entry.reflection}</Markdown>
            </div>
          ) : (
            <div className="my-8 p-8 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-serif font-semibold text-stone-900">
                Ready for AI Reflection?
              </h3>
              <p className="text-xs text-stone-600 max-w-md mt-1 mb-5 leading-relaxed">
                Generate psychological insights, uncover cognitive patterns, and explore deepening introspective questions with Gemini.
              </p>
              {onGenerateReflection && (
                <button
                  onClick={onGenerateReflection}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isGenerating ? 'Generating Reflection...' : 'Reflect with Gemini'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Call to action for multi-turn chat */}
        <div className="mt-8 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-50/70 -mx-6 -mb-6 p-6 rounded-b-2xl">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Want to delve deeper?
            </h4>
            <p className="text-xs text-stone-600 mt-0.5">
              Continue with a multi-turn conversation with Gemini on this reflection.
            </p>
          </div>

          <button
            id="start-discussion-button"
            onClick={onOpenDiscussion}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Discussion Thread</span>
          </button>
        </div>
      </div>
    </div>
  );
};
