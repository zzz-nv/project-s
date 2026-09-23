'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

    // If we land on login page fresh, make sure no stale splash is showing
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('hide-splash'));
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus(isSignUp ? 'Creating account…' : 'Signing in…');

    if (isSignUp) {
      const cleanUsername = username.toLowerCase().replace(/\s+/g, '');
      if (cleanUsername.length < 3) {
        setError('Username must be at least 3 characters.');
        setLoading(false);
        return;
      }

      // Check if username is taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', cleanUsername)
        .single();

      if (existingUser) {
        setError('Username is already taken.');
        setLoading(false);
        return;
      }

      // Create Auth Account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        setError(authError?.message || 'Failed to sign up.');
        setLoading(false);
        return;
      }

      // Create Public Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: cleanUsername,
          display_name: cleanUsername,
        });

      if (profileError) {
        setError('Failed to set username.');
        setLoading(false);
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }

    setStatus('Almost there…');

    // Poll for session readiness before redirecting
    for (let i = 0; i < 30; i++) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Cover the login → feed transition with the splash
        window.dispatchEvent(new CustomEvent('show-splash'));
        router.push('/');
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    setError('Login succeeded but session not ready. Please refresh.');
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-white select-none font-sans">
      <div className="w-full max-w-sm bg-surface p-8 rounded-3xl border border-border-subtle shadow-2xl">
        <div className="mb-8 text-center">
         <div className="w-20 h-14 mx-auto mb-6 flex items-center justify-center">
          <img src="/S_logo.svg" alt="S" className="w-full h-full" />
        </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isSignUp ? 'Join Project S' : 'Welcome Back'}
          </h1>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase tracking-wider">Username</label>
              <div className="flex bg-background border border-border-subtle rounded-xl px-4 py-3 focus-within:border-brand transition-colors">
                <span className="text-text-muted mr-2 font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="bg-transparent outline-none w-full text-white placeholder-zinc-700"
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-brand transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-brand transition-colors"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm font-semibold text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-100 hover:bg-white text-background font-bold py-3.5 rounded-xl transition active:scale-95 mt-4 disabled:opacity-50"
          >
          {loading ? status || 'Processing…' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-text-muted hover:text-zinc-300 text-sm font-medium transition"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}