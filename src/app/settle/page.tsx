'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Coins, AlertCircle } from 'lucide-react';
import DebtVisualizer from '@/components/settle/debt-visualizer';

export default function Settle() {
  const router = useRouter();
  const { currentUser, groups, isLoading } = useStore();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
          <Coins className="h-7 w-7 text-emerald-500" />
          Settle Up Balances
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Review minimized transfers calculated by our debt-simplification engine to quickly settle up balances across all your groups.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 rounded-3xl p-16 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Active Ledgers</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">Once you join a group and log shared expenses, payment settlement instructions will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Group:</span>
                <h2 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">{group.name}</h2>
              </div>
              <DebtVisualizer groupId={group.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

