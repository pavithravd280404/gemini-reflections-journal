import React from 'react';
import { Sparkles, Plus, LogOut, ShieldCheck, User } from 'lucide-react';
import { signOut, auth, type FirebaseUser } from '../lib/firebase';

interface NavbarProps {
  user: FirebaseUser;
  onNewEntry: () => void;
  isCreating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onNewEntry, isCreating }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  return (
    <header className="w-full bg-white border-b border-stone-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif font-semibold text-base sm:text-lg text-stone-900 tracking-tight">
              Reflections
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 ml-2.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Isolated Firestore</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            id="nav-new-entry-button"
            onClick={onNewEntry}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-xs ${
              isCreating
                ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>

          {/* User info & Sign out */}
          <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-stone-300 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600">
                <User className="w-4 h-4" />
              </div>
            )}

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-stone-800 leading-tight truncate max-w-[140px]">
                {user.displayName || (user.isAnonymous ? 'Guest Writer' : 'Reflective Writer')}
              </span>
              <span className="text-[10px] text-stone-500 truncate max-w-[140px]">
                {user.email || 'Private Guest Account'}
              </span>
            </div>

            <button
              id="nav-sign-out-button"
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
