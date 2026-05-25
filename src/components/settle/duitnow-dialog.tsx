'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, QrCode, AlertCircle, ShieldCheck, Loader2, Info } from 'lucide-react';
import { useStore } from '@/lib/store';

interface DuitNowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  fromId: string;
  toId: string;
  amount: number;
}

const MALAYSIAN_PAYMENT_METHODS = [
  { name: 'TNG eWallet', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { name: 'MAE by Maybank', color: 'bg-yellow-500 hover:bg-yellow-600 text-zinc-900' },
  { name: 'CIMB Clicks', color: 'bg-red-700 hover:bg-red-800 text-white' },
  { name: 'Touch \'n Go eWallet', color: 'bg-cyan-600 hover:bg-cyan-700 text-white' },
];

export default function DuitNowDialog({ isOpen, onClose, onConfirm, fromId, toId, amount }: DuitNowDialogProps) {
  const { profiles } = useStore();
  const creditorProfile = profiles[toId];
  const fromName = profiles[fromId]?.display_name || 'Someone';
  const toName = profiles[toId]?.display_name || 'Someone';

  const [selectedMethod, setSelectedMethod] = useState('TNG eWallet');
  const [isSettling, setIsSettling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSettleSubmit = async () => {
    setIsSettling(true);
    setErrorMsg(null);
    try {
      await onConfirm();
      setIsSettling(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Settlement failed. Please try again.');
      setIsSettling(false);
    }
  };

  // Generate a mock unique reference number
  const [mockRefNo] = useState(() => `DN-${Math.floor(10000000 + Math.random() * 90000000)}`);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-zinc-200 dark:border-white/10 bg-background text-foreground overflow-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <QrCode className="h-5 w-5 text-pink-500 animate-pulse" />
            DuitNow Instant Settlement
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Scan this mock national DuitNow QR or simulate bank transfers to settle up instantly.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* DuitNow Terminal QR Card */}
        <div className="relative mx-auto my-4 w-72 rounded-2xl overflow-hidden border border-pink-500/35 bg-white p-5 text-center shadow-lg shadow-pink-500/10 select-none">
          {/* DuitNow Header bar */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              {/* Pink DuitNow Icon Block */}
              <div className="flex h-5 w-5 items-center justify-center rounded bg-pink-600 font-black text-[9px] text-white">
                DN
              </div>
              <span className="font-extrabold text-[12px] tracking-tight text-zinc-900 uppercase">DuitNow QR</span>
            </div>
            <Badge className="bg-emerald-600/10 hover:bg-emerald-600/10 border-emerald-500/20 text-emerald-600 text-[8px] font-bold uppercase rounded py-0.5 px-1.5">
              Mock Terminal
            </Badge>
          </div>

          {/* Dynamic SVG QR Code Design */}
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center bg-zinc-50 border border-zinc-200/50 rounded-xl p-2.5">
            {/* Outer border markers */}
            <div className="absolute top-2.5 left-2.5 h-6 w-6 border-t-4 border-l-4 border-zinc-900" />
            <div className="absolute top-2.5 right-2.5 h-6 w-6 border-t-4 border-r-4 border-zinc-900" />
            <div className="absolute bottom-2.5 left-2.5 h-6 w-6 border-b-4 border-l-4 border-zinc-900" />
            <div className="absolute bottom-2.5 right-2.5 h-6 w-6 border-b-4 border-r-4 border-zinc-900" />

            {/* Stylized QR Grid elements */}
            <svg viewBox="0 0 100 100" className="h-full w-full opacity-90 text-zinc-800" fill="currentColor">
              {/* Standard QR squares */}
              <rect x="15" y="15" width="20" height="20" />
              <rect x="19" y="19" width="12" height="12" fill="white" />
              <rect x="22" y="22" width="6" height="6" />

              <rect x="65" y="15" width="20" height="20" />
              <rect x="69" y="19" width="12" height="12" fill="white" />
              <rect x="72" y="22" width="6" height="6" />

              <rect x="15" y="65" width="20" height="20" />
              <rect x="19" y="69" width="12" height="12" fill="white" />
              <rect x="22" y="72" width="6" height="6" />

              {/* Random blocks */}
              <rect x="42" y="15" width="12" height="8" />
              <rect x="48" y="27" width="8" height="15" />
              <rect x="15" y="42" width="8" height="12" />
              <rect x="27" y="48" width="12" height="8" />
              
              <rect x="65" y="42" width="15" height="10" />
              <rect x="45" y="65" width="10" height="15" />
              <rect x="65" y="65" width="10" height="10" />
              
              {/* Central Pink DuitNow Logo Badge */}
              <rect x="40" y="40" width="20" height="20" fill="white" rx="2" />
              <circle cx="50" cy="50" r="7" fill="#db2777" />
            </svg>
          </div>

          {/* Payment metadata */}
          <div className="mt-4 space-y-1 text-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pay to Creditor</span>
            <p className="font-extrabold text-sm text-zinc-800">{toName}</p>
            {creditorProfile?.duitnow_id && (
              <p className="text-[9px] font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full inline-block border border-pink-100 mt-0.5">
                DN ID ({creditorProfile.duitnow_type || 'Phone'}): {creditorProfile.duitnow_id}
              </p>
            )}
            <div className="block mt-1.5">
              <div className="inline-block font-black text-xl text-pink-600 bg-pink-50 rounded-full px-4 py-1 border border-pink-100 shadow-sm">
                RM {amount.toFixed(2)}
              </div>
            </div>
            <p className="text-[9px] text-zinc-400 mt-1">{mockRefNo}</p>
          </div>
        </div>

        {/* Banking App Selectors */}
        <div className="space-y-2 mt-4">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Simulate Scan using Bank Portal:</span>
          <div className="grid grid-cols-2 gap-2">
            {MALAYSIAN_PAYMENT_METHODS.map((method) => {
              const isSelected = selectedMethod === method.name;
              return (
                <button
                  key={method.name}
                  type="button"
                  onClick={() => setSelectedMethod(method.name)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition duration-200 ${
                    isSelected
                      ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-white font-bold'
                      : 'border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-pink-500' : 'bg-transparent'}`} />
                    <span className="truncate">{method.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Creditor Payment Information Details */}
        {creditorProfile && (
          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-950/20 p-3 mt-4 text-xs space-y-1.5">
            <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Info className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              Creditor Payment Accounts
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
              {creditorProfile.duitnow_id && (
                <>
                  <span>DuitNow ({creditorProfile.duitnow_type}):</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-right">{creditorProfile.duitnow_id}</span>
                </>
              )}
              {creditorProfile.tng_phone && (
                <>
                  <span>Touch 'n Go Phone:</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-right">{creditorProfile.tng_phone}</span>
                </>
              )}
              {creditorProfile.mae_account && (
                <>
                  <span>MAE Account:</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-right">{creditorProfile.mae_account}</span>
                </>
              )}
              {creditorProfile.paypal_email && (
                <>
                  <span>PayPal Email:</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-right break-all">{creditorProfile.paypal_email}</span>
                </>
              )}
              {creditorProfile.venmo_handle && (
                <>
                  <span>Venmo Handle:</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-right">{creditorProfile.venmo_handle}</span>
                </>
              )}
              {!creditorProfile.duitnow_id && !creditorProfile.tng_phone && !creditorProfile.mae_account && !creditorProfile.paypal_email && !creditorProfile.venmo_handle && (
                <span className="col-span-2 text-zinc-400 italic">No payment details configured by creditor. Settle manually.</span>
              )}
            </div>
          </div>
        )}

        {/* Instructive warning */}
        <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-3 mt-4 text-[11px] text-zinc-600 dark:text-zinc-400">
          <ShieldCheck className="h-4 w-4 text-pink-500 dark:text-pink-400 shrink-0 mt-0.5" />
          <p>
            This executes a mock DuitNow transaction. Confirming will settle the outstanding debt of <span className="font-bold text-zinc-800 dark:text-zinc-200">RM {amount.toFixed(2)}</span> between <span className="font-semibold text-zinc-700 dark:text-zinc-300">{fromName}</span> and <span className="font-semibold text-zinc-700 dark:text-zinc-300">{toName}</span> in the SplitMate ledger.
          </p>
        </div>

        <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
            disabled={isSettling}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSettleSubmit}
            className="bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:from-pink-500 hover:to-rose-500 font-bold shadow-md shadow-pink-500/10 flex items-center gap-2"
            disabled={isSettling}
          >
            {isSettling ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Settling...
              </>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

