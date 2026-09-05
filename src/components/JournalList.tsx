import React, { useState, useMemo } from 'react';
import { Search, Trash2, Calendar, Sparkles, Filter, Smile, HelpCircle } from 'lucide-react';
import { JournalEntry, MoodType } from '../types';

interface JournalListProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onNewEntry: () => void;
}

const moodConfig: Record<
  MoodType,
  { label: string; bg: string; text: string; border: string }
> = {
  peaceful: { label: 'Peaceful', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  reflective: { label: 'Reflective', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  energized: { label: 'Energized', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  anxious: { label: 'Anxious', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  grateful: { label: 'Grateful', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  overwhelmed: { label: 'Overwhelmed', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  curious: { label: 'Curious', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  neutral: { label: 'Neutral', bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200' }
};

export const JournalList: React.FC<JournalListProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMood = selectedMood === 'all' || entry.mood === selectedMood;

      return matchesSearch && matchesMood;
    });
  }, [entries, searchQuery, selectedMood]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recent';
    }
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEntryToDelete(id);
  };

  const handleConfirmDelete = (id: string) => {
    onDeleteEntry(id);
    setEntryToDelete(null);
  };

  return (
    <aside className="w-full lg:w-88 flex flex-col bg-stone-50/50 border-r border-stone-200 h-full">
      {/* Header and Search */}
      <div className="p-4 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-serif font-semibold text-stone-900 text-sm sm:text-base">Journal History</h2>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">
              {entries.length}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="journal-search-input"
            type="text"
            placeholder="Search past reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-stone-100/70 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white text-stone-800 placeholder-stone-400"
          />
        </div>

        {/* Mood Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => setSelectedMood('all')}
            className={`px-2.5 py-1 rounded-md transition-colors shrink-0 font-medium ${
              selectedMood === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All
          </button>
          {Object.entries(moodConfig).map(([moodKey, conf]) => (
            <button
              key={moodKey}
              onClick={() => setSelectedMood(moodKey)}
              className={`px-2 py-1 rounded-md transition-colors shrink-0 font-medium ${
                selectedMood === moodKey
                  ? 'bg-stone-800 text-white'
                  : `${conf.bg} ${conf.text} border ${conf.border} hover:opacity-80`
              }`}
            >
              {conf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-stone-400">
            {searchQuery || selectedMood !== 'all' ? (
              <>
                <Filter className="w-8 h-8 mb-2 stroke-1 text-stone-300" />
                <p className="text-xs font-medium text-stone-600">No matching entries found</p>
                <p className="text-[11px] text-stone-400 mt-1">Try clearing your search query or mood filter</p>
              </>
            ) : (
              <>
                <Smile className="w-8 h-8 mb-2 stroke-1 text-stone-300" />
                <p className="text-xs font-medium text-stone-600">Your journal is ready</p>
                <p className="text-[11px] text-stone-400 mt-1">Write your first reflection to receive Gemini insights</p>
                <button
                  onClick={onNewEntry}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  Start Writing
                </button>
              </>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            const mood = entry.mood ? moodConfig[entry.mood] : moodConfig.reflective;

            return (
              <div
                key={entry.id}
                id={`entry-card-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-white border-stone-900 shadow-xs ring-1 ring-stone-900'
                    : 'bg-white border-stone-200/80 hover:border-stone-300 hover:shadow-xs'
                }`}
              >
                {/* Meta header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                        mood ? `${mood.bg} ${mood.text} ${mood.border}` : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {mood ? mood.label : 'Reflective'}
                    </span>
                    <span className="text-[11px] text-stone-400 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>

                  <button
                    onClick={(e) => confirmDelete(e, entry.id)}
                    title="Delete Entry"
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Title */}
                <h3 className="font-serif font-medium text-stone-900 text-sm line-clamp-1">
                  {entry.title || 'Untitled Reflection'}
                </h3>

                {/* Content preview */}
                <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                  {entry.content}
                </p>

                {/* AI badge if reflection exists */}
                {entry.reflection && (
                  <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[11px] text-stone-600">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="line-clamp-1 italic font-sans text-stone-600">
                      {entry.summary || 'Gemini reflection available'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-stone-200 shadow-lg">
            <h3 className="text-base font-semibold text-stone-900 font-serif">Delete this Reflection?</h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              This entry and its associated multi-turn Gemini conversation will be permanently removed from your private Firestore database.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(entryToDelete)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
