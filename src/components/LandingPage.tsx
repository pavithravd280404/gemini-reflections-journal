import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  BookOpen,
  MessageSquare,
  Lock,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { signInWithPopup, signInAnonymously, auth, googleProvider } from '../lib/firebase';

interface LandingPageProps {
  onAuthSuccess?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by browser. You can click Guest Sign-In below or allow popups in your browser settings.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in was cancelled. Please try again.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. You can use Guest Sign-In to preview immediately.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Guest Sign-In Error:', err);
      setErrorMsg(err.message || 'Could not start guest session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between selection:bg-stone-200">
      {/* Top Banner */}
      <header className="w-full border-b border-stone-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif font-semibold text-lg tracking-tight">Reflections</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-medium">
                Gemini + Firestore
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="header-sign-in-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Card */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 flex flex-col items-center justify-center">
        {/* Error notification */}
        {errorMsg && (
          <div className="w-full max-w-md mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Authentication Notice</p>
              <p className="text-amber-800 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/80 text-stone-700 text-xs font-medium mb-4">
            <Lock className="w-3 h-3 text-stone-600" />
            <span>Strict Zero-Trust User Isolation</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-semibold tracking-tight text-stone-900 leading-tight">
            A private space for your thoughts, deepened by AI.
          </h1>
          <p className="mt-4 text-stone-600 text-base sm:text-lg leading-relaxed">
            Write unhurried journal entries, explore multi-turn reflections with Gemini,
            and keep every insight securely saved in your private Firestore database.
          </p>
        </div>

        {/* Auth Action Card */}
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-stone-900 font-serif">Sign in to your Journal</h2>
            <p className="text-xs text-stone-500 mt-1">
              Isolated user credentials powered by Firebase Authentication
            </p>
          </div>

          <div className="space-y-3">
            <button
              id="hero-google-auth-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-3 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium text-sm transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
            </button>

            <div className="relative py-2 flex items-center justify-center">
              <div className="w-full border-t border-stone-200"></div>
              <span className="bg-white px-3 text-xs text-stone-400 uppercase tracking-wider font-mono">or</span>
            </div>

            <button
              id="hero-guest-auth-button"
              onClick={handleGuestSignIn}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Instant Guest Mode (Preview & Test)</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-stone-100 text-xs text-stone-500 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Personal Firestore collection strictly bound to your UID</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Multi-turn chat discussions on every journal thought</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Server-side protected Gemini 3.8 Flash model</span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="bg-white border border-stone-200/80 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800 mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-1">Unhurried Journaling</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Express your feelings, dilemmas, or milestones with intuitive mood tags and prompt sparks.
            </p>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800 mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-1">Gemini AI Reflections</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Gain empathetic perspectives, identify recurring cognitive themes, and receive actionable next steps.
            </p>
          </div>

          <div className="bg-white border border-stone-200/80 rounded-xl p-6 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800 mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-1">Multi-Turn Discussion</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Converse with Gemini directly about your entry to unpack nuances and brainstorm new ideas.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <p>Private & secure journaling • Powered by Firebase Auth, Cloud Firestore & Gemini API</p>
      </footer>
    </div>
  );
};
