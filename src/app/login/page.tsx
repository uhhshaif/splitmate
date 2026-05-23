'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isMockMode, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const { currentUser, signInMock, initialize } = useStore();
  const [email, setEmail] = useState('alex@splitmate.com');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoadingSubmit(true);

    try {
      if (isMockMode) {
        // Mock Login
        // Infer display name from email
        const baseName = email.split('@')[0];
        const displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        signInMock(email, displayName);
        router.push('/dashboard');
      } else {
        // Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Re-initialize store to fetch database state
        await initialize();
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  const selectMockUser = (mockEmail: string) => {
    setEmail(mockEmail);
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center min-h-[90vh] overflow-hidden bg-background px-4 py-16 font-sans text-foreground sm:px-6 lg:px-8">
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Header Hero */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/" className="flex items-center gap-2 font-sans text-2xl font-bold tracking-tight text-foreground mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span>split<span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">mate</span></span>
          </Link>
          <h2 className="text-xl font-extrabold text-foreground">Welcome Back</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Log in to manage bills and settle group balances.
          </p>
        </div>

        {/* Card Form */}
        <div className="overflow-hidden rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-8 shadow-sm">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">Email Address</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">Password</Label>
                <Link href="/forgot-password" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoadingSubmit}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-2 font-semibold shadow-sm mt-6"
            >
              {isLoadingSubmit ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Log In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Prompt to register */}
          <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {"Don't have an account?"}{' '}
            <Link href="/register" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              Register Here
            </Link>
          </div>

          {/* Quick Select Mock Users (Only visible in Mock Mode) */}
          {isMockMode && (
            <div className="mt-6 border-t border-zinc-200 dark:border-white/5 pt-4">
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-2.5 text-center uppercase tracking-wider">Quick Mock Profiles (Offline Mode):</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Alex Rivera', email: 'alex@splitmate.com' },
                  { name: 'Jessica Chen', email: 'jessica@splitmate.com' },
                  { name: 'Marcus Vance', email: 'marcus@splitmate.com' },
                  { name: 'Sarah Jenkins', email: 'sarah@splitmate.com' },
                ].map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => selectMockUser(user.email)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                      email === user.email
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-white font-bold'
                        : 'border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {user.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

