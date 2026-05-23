'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isMockMode, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowLeft, Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoadingSubmit(true);

    try {
      if (isMockMode) {
        // Mock request
        await new Promise((resolve) => setTimeout(resolve, 800));
        setSuccessMsg('Mock Mode: Password recovery link sent successfully to ' + email);
      } else {
        // Supabase Auth reset password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`, // Redirect back to login after resetting
        });

        if (error) throw error;
        setSuccessMsg('A password recovery email has been sent to ' + email);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send recovery email. Try again.');
    } finally {
      setIsLoadingSubmit(false);
    }
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
          <h2 className="text-xl font-extrabold text-foreground">Reset Password</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter your email to receive a password recovery link.
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

          {successMsg ? (
            <div className="space-y-4 text-center py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{successMsg}</p>
              <Link href="/login" className="block pt-2">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="space-y-4">
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

              <Button
                type="submit"
                disabled={isLoadingSubmit || !email.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center justify-center gap-2 font-semibold shadow-sm mt-6"
              >
                {isLoadingSubmit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Prompt to register or login */}
          {!successMsg && (
            <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-4 flex justify-between items-center">
              <Link href="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Back to Log In
              </Link>
              <Link href="/register" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Register Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
