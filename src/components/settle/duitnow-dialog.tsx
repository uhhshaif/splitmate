'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertCircle, Loader2, Info, Maximize2, Download, X } from 'lucide-react';
import { useStore } from '@/lib/store';

interface DuitNowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  fromId: string;
  toId: string;
  amount: number;
}

export default function DuitNowDialog({ isOpen, onClose, onConfirm, fromId, toId, amount }: DuitNowDialogProps) {
  const { profiles } = useStore();
  const creditorProfile = profiles[toId];
  const toName = profiles[toId]?.display_name || 'Someone';

  const [isQrZoomed, setIsQrZoomed] = useState(false);
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
      // console.error(err);
      setErrorMsg(err.message || 'Settlement failed. Please try again.');
      setIsSettling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-zinc-200 dark:border-white/10 bg-background text-foreground overflow-hidden p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Settle Balance
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Transfer funds to the creditor and record the settlement.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400 my-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Payment Summary Box */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 rounded-2xl p-5 text-center my-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Paying Creditor</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-white mt-0.5">{toName}</p>
          <div className="mt-3">
            <span className="inline-block font-black text-2xl text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full px-5 py-1.5 border border-emerald-500/20 shadow-sm">
              RM {amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Creditor QR Code */}
        {creditorProfile?.qr_code_url && (
          <div className="flex flex-col items-center justify-center gap-3 my-4">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Scan QR Code to Transfer:</p>
            <div 
              onClick={() => setIsQrZoomed(true)}
              className="relative flex h-40 w-40 items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-2.5 overflow-hidden shadow-sm group cursor-pointer transition hover:border-emerald-500/40"
              title="Click to expand QR Code"
            >
              <img 
                src={creditorProfile.qr_code_url} 
                alt={`${toName}'s Payment QR`} 
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                <Maximize2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsQrZoomed(true)}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-full px-3 py-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Maximize2 className="h-3 w-3" />
              View Large QR
            </button>
          </div>
        )}

        {/* Creditor Payment Accounts */}
        {creditorProfile && (creditorProfile.duitnow_id || creditorProfile.tng_phone || creditorProfile.mae_account || creditorProfile.paypal_email || creditorProfile.venmo_handle) ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-950/20 p-4 mt-2 text-xs space-y-2">
            <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Info className="h-4 w-4 text-emerald-500 shrink-0" />
              Creditor Payment Accounts
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
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
            </div>
          </div>
        ) : (
          !creditorProfile?.qr_code_url && (
            <div className="rounded-xl border border-zinc-200/60 dark:border-white/5 bg-zinc-100/30 dark:bg-zinc-900/10 p-3.5 mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400 italic">
              No payment accounts configured by {toName}. Please arrange offline payment and click Pay Now to record it.
            </div>
          )
        )}

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
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-bold shadow-md shadow-emerald-500/10 flex items-center gap-2"
            disabled={isSettling}
          >
            {isSettling ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Settling...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Lightbox / Zoom Overlay */}
      {isQrZoomed && creditorProfile?.qr_code_url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative max-w-sm w-full bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col items-center gap-4 text-center select-none">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsQrZoomed(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="space-y-1 mt-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Scan QR to Settle</h3>
              <p className="text-xs text-zinc-500">{toName}&apos;s verified payment QR</p>
            </div>

            {/* Expanded Image */}
            <div className="bg-white border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl w-64 h-64 flex items-center justify-center shadow-inner overflow-hidden">
              <img
                src={creditorProfile.qr_code_url}
                alt={`${toName}'s Payment QR`}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="w-full flex gap-3 pt-2">
              <a
                href={creditorProfile.qr_code_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-bold py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Full Size
              </a>
              <Button
                type="button"
                onClick={() => setIsQrZoomed(false)}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-xl shadow"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
