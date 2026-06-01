'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isMockMode, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, User, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';

export default function Register() {
  const router = useRouter();
  const { currentUser, signInMock, initialize } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoadingSubmit(true);

    if (!name.trim()) {
      setErrorMsg('Name is required');
      setIsLoadingSubmit(false);
      return;
    }

    try {
      if (isMockMode) {
        // Mock Register
        signInMock(email, name);
        router.push('/dashboard');
      } else {
        // Supabase Auth Register
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name,
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
            }
          }
        });

        if (error) throw error;
        
        // Re-initialize store
        await initialize();
        router.push('/dashboard');
      }
    } catch (err: any) {
      // handle silently — error shown in UI
      setErrorMsg(err.message || 'Registration failed. Check details.');
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background font-sans text-foreground">
      <title>Create Account | Splitmate</title>
      {/* Public Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/50 dark:border-white/5 bg-white/70 dark:bg-zinc-950/40 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-sans text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-md shadow-emerald-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span>split<span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">mate</span></span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-white/5 rounded-xl">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Header Hero */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/" className="flex items-center gap-2 font-sans text-2xl font-bold tracking-tight text-foreground mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span>split<span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">mate</span></span>
          </Link>
          <h2 className="text-xl font-extrabold text-foreground">Create Account</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sign up to start splitting bills and tracking shared expenses.
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

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">Display Name</Label>
              <div className="relative mt-1.5">
                <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

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
              <Label htmlFor="password" className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
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
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Prompt to login */}
          <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}

