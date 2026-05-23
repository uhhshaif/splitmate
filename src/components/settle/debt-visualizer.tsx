'use client';

import React, { useState } from 'react';
import { useStore, Group } from '@/lib/store';
import { simplifyDebts, Transaction } from '@/lib/debt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { ArrowRight, Coins, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import DuitNowDialog from './duitnow-dialog';

interface DebtVisualizerProps {
  groupId: string;
}

export default function DebtVisualizer({ groupId }: DebtVisualizerProps) {
  const { groups, expenses, profiles, settleDebt } = useStore();
  const group = groups.find((g) => g.id === groupId);
  
  // DuitNow settlement states
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [duitNowOpen, setDuitNowOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!group) return null;

  // 1. Calculate net balance for each member in this group
  // Net balance = (total paid by member) - (total member owes)
  const balances: Record<string, number> = {};
  group.members.forEach((mid) => {
    balances[mid] = 0;
  });

  const groupExpenses = expenses.filter((e) => e.group_id === groupId && e.category !== 'settlement');

  groupExpenses.forEach((e) => {
    // Add to payer's credit
    if (balances[e.paid_by_id] !== undefined) {
      balances[e.paid_by_id] += e.amount;
    }
    // Deduct from each split recipient's debt
    e.splits.forEach((s) => {
      if (balances[s.profile_id] !== undefined) {
        balances[s.profile_id] -= s.amount;
      }
    });
  });

  // 2. Simplify debts using our algorithm
  const simplifiedTransactions = simplifyDebts(balances);

  const handleSettleClick = (tx: Transaction) => {
    setActiveTx(tx);
    setDuitNowOpen(true);
  };

  const handleConfirmSettle = async () => {
    if (!activeTx) return;
    try {
      await settleDebt(activeTx.from, activeTx.to, activeTx.amount, groupId);
      const fromName = profiles[activeTx.from]?.display_name || 'Someone';
      const toName = profiles[activeTx.to]?.display_name || 'Someone';
      setSuccessMsg(`Successfully recorded settlement: ${fromName} paid ${toName} RM ${activeTx.amount.toFixed(2)}`);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-foreground dark:text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white">
          <Coins className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          Debt Simplification (Minimized Transfers)
        </CardTitle>
        <CardDescription className="text-zinc-500 dark:text-zinc-400">
          We simplified balances to minimize the total number of payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {successMsg && (
          <Alert className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        {simplifiedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5">
              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">All Settled Up!</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[240px] mt-1">No outstanding balances or payments required for this group.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/60 dark:divide-white/5">
            {simplifiedTransactions.map((tx, idx) => {
              const debtor = profiles[tx.from];
              const creditor = profiles[tx.to];

              if (!debtor || !creditor) return null;

              return (
                <div key={idx} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  {/* Debtor Profile */}
                  <div className="flex items-center gap-3 w-1/3">
                    <Avatar className="h-9 w-9 ring-1 ring-zinc-200 dark:ring-white/10">
                      <AvatarImage src={debtor.avatar_url} alt={debtor.display_name} />
                      <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {debtor.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{debtor.display_name}</p>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">owes</p>
                    </div>
                  </div>

                  {/* Arrow & Amount */}
                  <div className="flex flex-col items-center justify-center px-2 w-1/3 text-center">
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/5 px-3 py-1 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm whitespace-nowrap">
                      RM {tx.amount.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1 mt-1 text-zinc-400 dark:text-zinc-500">
                      <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800" />
                      <ArrowRight className="h-3.5 w-3.5" />
                      <div className="h-px w-8 bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                  </div>

                  {/* Creditor Profile */}
                  <div className="flex items-center justify-end gap-3 w-1/3 text-right">
                    <div className="truncate">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{creditor.display_name}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">gets paid</p>
                    </div>
                    <Avatar className="h-9 w-9 ring-1 ring-zinc-200 dark:ring-white/10">
                      <AvatarImage src={creditor.avatar_url} alt={creditor.display_name} />
                      <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-300">
                        {creditor.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Settle Action Button */}
                  <div className="pl-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSettleClick(tx)}
                      className="text-xs font-semibold transition hover:bg-teal-600 dark:hover:bg-teal-700 hover:text-white border-teal-500/20"
                    >
                      Settle
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DuitNow Settle Modal */}
        {duitNowOpen && activeTx && (
          <DuitNowDialog
            isOpen={duitNowOpen}
            onClose={() => {
              setDuitNowOpen(false);
              setActiveTx(null);
            }}
            onConfirm={handleConfirmSettle}
            fromName={profiles[activeTx.from]?.display_name || 'Someone'}
            toName={profiles[activeTx.to]?.display_name || 'Someone'}
            amount={activeTx.amount}
          />
        )}
      </CardContent>
    </Card>
  );
}

