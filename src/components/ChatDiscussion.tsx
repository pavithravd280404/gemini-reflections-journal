import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  Send,
  Loader2,
  ArrowLeft,
  Sparkles,
  User,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { JournalEntry, JournalMessage } from '../types';
import { subscribeEntryMessages, addEntryMessage } from '../services/journalService';
import { sendGeminiChatMessage } from '../services/geminiService';

interface ChatDiscussionProps {
  userId: string;
  entry: JournalEntry;
  onBack: () => void;
}

const starterSuggestions = [
  'Help me reframe this thought more compassionately.',
  'What is a practical micro-step I can take tomorrow?',
  'Why might I be reacting with this particular emotion?',
  'Can you brainstorm 3 alternative ways to view this situation?'
];

export const ChatDiscussion: React.FC<ChatDiscussionProps> = ({
  userId,
  entry,
  onBack
}) => {
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to Firestore multi-turn messages
  useEffect(() => {
    const unsub = subscribeEntryMessages(
      userId,
      entry.id,
      (msgs) => {
        setMessages(msgs);
      },
      (err) => {
        console.error('Error listening to chat messages:', err);
      }
    );

    return () => unsub();
  }, [userId, entry.id]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string, isRetry: boolean = false) => {
    const content = (textToSend || inputText).trim();
    if (!content || isSending) return;

    if (!isRetry) {
      setInputText('');
    }
    setChatError(null);
    setIsSending(true);
    setLastUserPrompt(content);

    try {
      if (!isRetry) {
        // 1. Save user turn to Firestore
        await addEntryMessage(userId, entry.id, 'user', content);
      }

      // 2. Prepare context for Gemini chat
      const chatHistory = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        ...(isRetry ? [] : [{ role: 'user' as const, content }])
      ];

      // 3. Request reply from backend Gemini API
      const result = await sendGeminiChatMessage({
        messages: chatHistory,
        journalContext: {
          title: entry.title,
          content: entry.content,
          reflection: entry.reflection
        }
      });

      // 4. Save Gemini model turn to Firestore
      await addEntryMessage(userId, entry.id, 'model', result.reply);
      setLastUserPrompt(null);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setChatError(err.message || 'Gemini is currently experiencing high demand. Please click Retry.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-50/50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Back to Reflection"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-semibold font-serif text-stone-900 line-clamp-1">
              Discussion: {entry.title || 'Untitled Reflection'}
            </h2>
            <p className="text-[11px] text-stone-400">
              Multi-turn dialogue saved isolated to your private Firestore
            </p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-3xl w-full mx-auto">
        {/* Context Card */}
        <div className="p-3.5 rounded-xl bg-white border border-stone-200/80 shadow-xs text-xs text-stone-600">
          <div className="flex items-center gap-1.5 font-semibold text-stone-700 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Discussing Original Journal Entry:</span>
          </div>
          <p className="italic line-clamp-3 text-stone-600">"{entry.content}"</p>
        </div>

        {/* Empty state when no messages yet */}
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-stone-500 mb-3">
              Ask Gemini follow-up questions, request deeper reframing, or explore concrete actions:
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {starterSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion)}
                  disabled={isSending}
                  className="text-left text-xs px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-stone-300 text-stone-700 hover:text-stone-900 transition-colors shadow-2xs cursor-pointer"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'model' && (
              <div className="w-7 h-7 rounded-lg bg-stone-900 flex items-center justify-center text-amber-300 shrink-0 mt-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                msg.role === 'user'
                  ? 'bg-stone-900 text-white rounded-tr-xs'
                  : 'bg-white border border-stone-200/90 text-stone-800 rounded-tl-xs'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose prose-stone max-w-none text-xs sm:text-sm leading-relaxed space-y-2">
                  <Markdown>{msg.content}</Markdown>
                </div>
              )}
              <span
                className={`block text-[10px] mt-1.5 font-mono ${
                  msg.role === 'user' ? 'text-stone-400 text-right' : 'text-stone-400'
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-stone-200 flex items-center justify-center text-stone-700 shrink-0 mt-1">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator when Gemini is thinking */}
        {isSending && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-stone-900 flex items-center justify-center text-amber-300 shrink-0 mt-1">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs p-4 text-xs text-stone-500 shadow-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
              <span>Gemini is generating response...</span>
            </div>
          </div>
        )}

        {/* Error notice with retry button */}
        {chatError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{chatError}</span>
            </div>
            {lastUserPrompt && (
              <button
                type="button"
                id="chat-retry-button"
                onClick={() => handleSendMessage(lastUserPrompt, true)}
                disabled={isSending}
                className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="bg-white border-t border-stone-200 p-4 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            id="chat-discussion-input"
            rows={2}
            placeholder="Ask a question or continue the conversation with Gemini..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 p-3 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white text-stone-800 placeholder-stone-400 resize-none leading-relaxed"
          />

          <button
            id="chat-send-button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending}
            className="h-11 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center transition-colors shadow-xs disabled:opacity-40 cursor-pointer shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
