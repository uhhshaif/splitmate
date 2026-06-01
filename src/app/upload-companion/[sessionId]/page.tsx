'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Camera, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

export default function CompanionUploadPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify laptop that phone is connected as soon as page loads
  useEffect(() => {
    if (sessionId) {
      fetch('/api/companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          status: 'connected',
        }),
      }).catch((err) => { /* handle silently */ });
    }
  }, [sessionId]);

  const uploadImage = async (base64Data: string) => {
    if (!sessionId) return;
    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          image: base64Data,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed');
      }

      // Vibrate mobile device briefly to give haptic success confirmation
      if (typeof window !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(120);
      }

      setIsSuccess(true);
    } catch (err: any) {
      // console.error(err);
      setError(err.message || 'Failed to upload image. Please snap another photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      if (reader.result) {
        const base64 = reader.result as string;
        await uploadImage(base64);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image. Please capture again.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground flex flex-col justify-between p-6 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between py-4 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">splitmate</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
          Mobile Link
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center my-6 space-y-6">
        {isSuccess ? (
          /* Success Screen */
          <div className="text-center space-y-4 animate-scaleUp">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">Snap Uploaded!</h2>
              <p className="text-xs text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                The receipt has been sent to your laptop screen. You can safely close this browser tab now.
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-full w-fit mx-auto">
              <Sparkles className="h-3 w-3" />
              Synced in Real-time
            </div>
          </div>
        ) : isUploading ? (
          /* Uploading Screen */
          <div className="text-center space-y-4 animate-scaleUp">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Uploading receipt...</h3>
              <p className="text-xs text-zinc-400">Syncing with your laptop, please wait.</p>
            </div>
          </div>
        ) : (
          /* Capture Trigger Screen */
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Receipt Snap Camera</h2>
              <p className="text-xs text-zinc-400 max-w-[260px] mx-auto leading-relaxed">
                Use your device camera to take a sharp, clear photo of the receipt items and totals.
              </p>
            </div>

            {error && (
              <div className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <label className="mx-auto flex flex-col items-center justify-center h-44 w-44 rounded-full border-2 border-dashed border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 transition duration-300 cursor-pointer shadow-lg active:scale-95">
              <div className="flex flex-col items-center space-y-2 text-zinc-500">
                <Camera className="h-10 w-10 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Snap Receipt</span>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-zinc-900">
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
          Powered by Splitmate AI Core
        </p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scaleUp {
          animation: scaleUp 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
