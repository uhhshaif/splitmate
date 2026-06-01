'use client';

import React, { useState } from 'react';
import { useStore, Group } from '@/lib/store';
import { simplifyDebts, Transaction } from '@/lib/debt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { ArrowRight, Coins, CheckCircle, Loader2, Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import DuitNowDialog from './duitnow-dialog';

interface DebtVisualizerProps {
  groupId: string;
}

export default function DebtVisualizer({ groupId }: DebtVisualizerProps) {
  const { currentUser, groups, expenses, profiles, settleDebt } = useStore();
  const group = groups.find((g) => g.id === groupId);
  
  // DuitNow settlement states
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [duitNowOpen, setDuitNowOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!group) return null;

  // 1. Calculate net balance for each member in this group
  const balances: Record<string, number> = {};
  group.members.forEach((mid) => {
    balances[mid] = 0;
  });

  const groupExpenses = expenses.filter((e) => e.group_id === groupId);

  groupExpenses.forEach((e) => {
    if (balances[e.paid_by_id] !== undefined) {
      balances[e.paid_by_id] += e.amount;
    }
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
      const toName = profiles[activeTx.to]?.display_name || 'Someone';
      setSuccessMsg(`Payment recorded! Awaiting confirmation from ${toName}.`);
    } catch (err: any) {
      // re-throw so caller handles
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
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
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
                <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center justify-between py-4 first:pt-0 last:pb-0 gap-y-3 gap-x-2 border-b border-zinc-100 dark:border-white/5 last:border-0">
                  {/* Transaction Core */}
                  <div className="flex items-center justify-between flex-1 min-w-0 basis-full sm:basis-auto gap-2">
                    {/* Debtor Profile */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Avatar className="h-9 w-9 ring-1 ring-zinc-200 dark:ring-white/10 shrink-0">
                        <AvatarImage src={debtor.avatar_url} alt={debtor.display_name} />
                        <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          {debtor.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-tight break-words">{debtor.display_name}</p>
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">owes</p>
                      </div>
                    </div>

                    {/* Arrow & Amount */}
                    <div className="flex flex-col items-center justify-center px-0.5 sm:px-1 text-center shrink-0">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/10 shadow-sm whitespace-nowrap">
                        RM {tx.amount.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1 mt-1 text-zinc-400 dark:text-zinc-500">
                        <div className="h-px w-3 sm:w-5 bg-zinc-200 dark:bg-zinc-800" />
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <div className="h-px w-3 sm:w-5 bg-zinc-200 dark:bg-zinc-800" />
                      </div>
                    </div>

                    {/* Creditor Profile */}
                    <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-tight break-words">{creditor.display_name}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">gets paid</p>
                      </div>
                      <Avatar className="h-9 w-9 ring-1 ring-zinc-200 dark:ring-white/10 shrink-0">
                        <AvatarImage src={creditor.avatar_url} alt={creditor.display_name} />
                        <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-300">
                          {creditor.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Settle Action Button */}
                  <div className="flex items-center justify-end gap-2 shrink-0 basis-full sm:basis-auto sm:pl-2">
                    {currentUser?.id === tx.to && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const debtorName = debtor.display_name.split(' ')[0];
                          let paymentDetails = '';
                          if (currentUser.duitnow_id) {
                            paymentDetails += `\n- DuitNow (${currentUser.duitnow_type || 'phone'}): ${currentUser.duitnow_id}`;
                          }
                          if (currentUser.tng_phone) {
                            paymentDetails += `\n- Touch 'n Go eWallet: ${currentUser.tng_phone}`;
                          }
                          if (currentUser.mae_account) {
                            paymentDetails += `\n- MAE (Maybank): ${currentUser.mae_account}`;
                          }
                          if (currentUser.paypal_email) {
                            paymentDetails += `\n- PayPal: ${currentUser.paypal_email}`;
                          }

                          const text = `Hey ${debtorName}! Just a friendly reminder to settle RM ${tx.amount.toFixed(2)} for our shared expenses in "${group.name}" on Splitmate.${paymentDetails ? ` You can transfer to me via:${paymentDetails}` : ''}\nThanks! 🙏`;
                          
                          try {
                            if (navigator.clipboard && window.isSecureContext) {
                              await navigator.clipboard.writeText(text);
                            } else {
                              const textArea = document.createElement("textarea");
                              textArea.value = text;
                              textArea.style.position = "fixed";
                              textArea.style.left = "-999999px";
                              textArea.style.top = "-999999px";
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              const successful = document.execCommand('copy');
                              textArea.remove();
                              if (!successful) throw new Error("Fallback copy failed");
                            }
                            setSuccessMsg(`Friendly reminder message for ${debtor.display_name} copied to clipboard!`);
                            setTimeout(() => setSuccessMsg(null), 4500);
                          } catch (err) {
                            console.error("Clipboard copy error:", err);
                            alert("Unable to copy to clipboard. Please copy manually.");
                          }
                        }}
                        title="Copy payment reminder"
                        className="text-xs font-semibold hover:bg-amber-500/10 hover:text-amber-600 text-zinc-400 h-8 w-8 p-0 rounded-lg shrink-0"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    )}
                    {currentUser?.id === tx.from && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSettleClick(tx)}
                        className="text-xs font-semibold transition hover:bg-teal-600 dark:hover:bg-teal-700 hover:text-white border-teal-500/20 shrink-0 w-full sm:w-auto"
                      >
                        Settle
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DuitNow Settle Modal */}
        <DuitNowDialog
          isOpen={duitNowOpen && !!activeTx}
          onClose={() => {
            setDuitNowOpen(false);
            setActiveTx(null);
          }}
          onConfirm={handleConfirmSettle}
          fromId={activeTx?.from || ''}
          toId={activeTx?.to || ''}
          amount={activeTx?.amount || 0}
        />
      </CardContent>
    </Card>
  );
}
