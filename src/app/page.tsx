'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Coins,
  Scan,
  Users,
  Plane,
  ArrowRightLeft,
  ReceiptText,
  Zap,
  UserCheck
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { currentUser } = useStore();

  // Redirect if already signed in
  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 font-sans text-foreground sm:px-6 lg:px-8">
      <div className="relative z-10 w-full max-w-6xl space-y-16">
        
        {/* Two-Column Hero section */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
          
          {/* Left Column: Headline and Call-to-action */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Next-Gen Expense Splitting
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-6xl lg:leading-[1.1]">
              Split bills easily. <br />
              Settle debts{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
                intelligently.
              </span>
            </h1>
            
            <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Splitmate combines AI receipt scanning and transaction-minimizing math algorithms to take the headache out of group finances.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/register">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 px-8 py-6 text-base font-semibold shadow-sm flex items-center justify-center gap-2 rounded-xl">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full sm:w-auto border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 px-8 py-6 text-base font-semibold rounded-xl">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Micro stats banner */}
            <div className="grid grid-cols-3 gap-4 border-t border-zinc-200 dark:border-white/5 pt-8 mt-8">
              <div>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">RM 0.00</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Group debt simplification</p>
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">100%</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Automatic OCR accuracy</p>
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">Instant</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Cloud database sync</p>
              </div>
            </div>
          </div>

          {/* Right Column: High-fidelity interactive mock interface preview */}
          <div className="lg:col-span-5 relative">
            {/* Main Mock Window Container */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/80 p-6 shadow-xl">
              {/* Mock App Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                  Live Preview: Debt Simplifier
                </div>
              </div>

              {/* Mock Screen Content */}
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950/40 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Bali Trip Balances</span>
                    <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      AI Auto-Calculated
                    </span>
                  </div>

                  {/* Visualizer Flow Graph */}
                  <div className="space-y-3">
                    {/* Raw Debts */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Raw transactions (Before)</span>
                        <span className="font-semibold text-rose-500">2 transfers</span>
                      </div>
                      
                      {/* Flow 1 */}
                      <div className="flex items-center justify-between rounded-lg bg-zinc-100 dark:bg-white/5 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 font-medium">
                          <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] flex items-center justify-center font-bold">A</div>
                          <span>Alex owes Jessica</span>
                        </div>
                        <span className="font-extrabold text-zinc-800 dark:text-zinc-200">RM 50.00</span>
                      </div>

                      {/* Flow 2 */}
                      <div className="flex items-center justify-between rounded-lg bg-zinc-100 dark:bg-white/5 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 font-medium">
                          <div className="h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] flex items-center justify-center font-bold">J</div>
                          <span>Jessica owes Marcus</span>
                        </div>
                        <span className="font-extrabold text-zinc-800 dark:text-zinc-200">RM 50.00</span>
                      </div>
                    </div>

                    {/* Simplification divider arrow */}
                    <div className="flex items-center justify-center py-1">
                      <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                        <ArrowRightLeft className="h-3 w-3" />
                        Minimizing Transfers
                      </div>
                    </div>

                    {/* Simplified Debts */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Optimized result (After)</span>
                        <span className="font-semibold text-emerald-500">1 transfer only</span>
                      </div>
                      
                      {/* Optimized Flow */}
                      <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs animate-pulse">
                        <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                          <div className="h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">âœ“</div>
                          <span>Alex pays Marcus</span>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">RM 50.00</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Mini Log Card */}
                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/5 p-3 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20">
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-emerald-500 animate-bounce" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-zinc-950 dark:text-white">AI OCR Scan</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">"Jessica paid RM90.50 at Cafe"</p>
                    </div>
                  </div>
                  <span className="text-[9px] border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">
                    Scanned
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid Section */}
        <div id="features-section" className="space-y-6 border-t border-zinc-200 dark:border-white/5 pt-16">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">Packed with Powerful Utilities</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">Everything you need to streamline and track shared balances without stress.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'AI Receipt Scanner',
                description: 'Snap a picture and let Claude extract items, total, date, and category in seconds.',
                icon: Scan,
                color: 'from-emerald-500 to-emerald-500 animate-pulse',
              },
              {
                title: 'Debt Simplification',
                description: 'Math algorithms that reduce total transfers, telling you exactly who pays whom.',
                icon: Coins,
                color: 'from-teal-500 to-blue-500',
              },
              {
                title: 'Simplified Settlements',
                description: 'Clear balances inside groups directly with smart transaction-minimizing suggestions.',
                icon: ArrowRightLeft,
                color: 'from-cyan-500 to-blue-500',
              },
              {
                title: 'Smart Custom Splits',
                description: 'Split equally, unequally, by percentages, or shares with simple input toggles.',
                icon: Users,
                color: 'from-fuchsia-500 to-pink-500',
              },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/50 p-6 transition-all duration-300 hover:border-zinc-300 dark:hover:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 hover:-translate-y-1 hover:shadow-lg group"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${feat.color} mb-4 shadow-md group-hover:scale-110 transition duration-200`}>
                  <feat.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

