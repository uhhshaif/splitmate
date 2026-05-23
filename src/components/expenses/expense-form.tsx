'use client';

import React, { useState, useEffect } from 'react';
import { useStore, Profile, ExpenseSplit } from '@/lib/store';
import { scanReceiptWithAI } from '@/lib/ai';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Sparkles, Calendar, DollarSign, Loader2, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface ExpenseFormProps {
  groupId: string;
  tripId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: {
    description?: string;
    amount?: number;
    paid_by_id?: string;
    category?: string;
    date?: string;
    splits?: { profile_id: string; amount: number }[];
    splitType?: 'equal' | 'exact' | 'percent' | 'shares';
  } | null;
}

const CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'housing', label: 'Rent & Housing' },
  { value: 'transport', label: 'Transport & Fuel' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'utilities', label: 'Bills & Utilities' },
  { value: 'lodging', label: 'Hotel & Lodging' },
  { value: 'general', label: 'General / Miscellaneous' },
];

export default function ExpenseForm({ groupId, tripId, isOpen, onClose, onSuccess, initialData }: ExpenseFormProps) {
  const { groups, profiles, currentUser, addExpense } = useStore();
  const group = groups.find((g) => g.id === groupId);

  // Form State
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('general');
  const [paidById, setPaidById] = useState(currentUser?.id || '');
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percent' | 'shares'>('equal');

  // Member splits state: record of profileId -> input value
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [exactSplits, setExactSplits] = useState<Record<string, string>>({});
  const [percentSplits, setPercentSplits] = useState<Record<string, string>>({});
  const [shareSplits, setShareSplits] = useState<Record<string, string>>({});

  // AI Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scannedBadge, setScannedBadge] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group members list
  const memberProfiles = group
    ? group.members.map((mid) => profiles[mid]).filter(Boolean)
    : [];

  // Reset/Initialize members on group change, open state, or initialData change
  useEffect(() => {
    if (!group) return;

    const timer = setTimeout(() => {
      if (initialData) {
        setDescription(initialData.description || '');
        setAmountStr(initialData.amount ? initialData.amount.toString() : '');
        setCategory(initialData.category || 'general');
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setPaidById(initialData.paid_by_id || currentUser?.id || '');
        setSplitType(initialData.splitType || 'equal');

        const activeSplits = initialData.splits || [];
        if (activeSplits.length > 0) {
          const splitMemberIds = activeSplits.map((s) => s.profile_id);
          setSelectedMembers(splitMemberIds);

          const newExactSplits: Record<string, string> = {};
          const newPercentSplits: Record<string, string> = {};
          const newShareSplits: Record<string, string> = {};

          group.members.forEach((mid) => {
            const foundSplit = activeSplits.find((s) => s.profile_id === mid);
            newExactSplits[mid] = foundSplit ? foundSplit.amount.toString() : '';
            newPercentSplits[mid] = '';
            newShareSplits[mid] = '1';
          });

          setExactSplits(newExactSplits);
          setPercentSplits(newPercentSplits);
          setShareSplits(newShareSplits);
        }
      } else {
        setSelectedMembers(group.members);
        // Initialize inputs
        const initialSplits: Record<string, string> = {};
        group.members.forEach((mid) => {
          initialSplits[mid] = '';
        });
        // Share defaults to 1 share per person
        const initialShares: Record<string, string> = {};
        group.members.forEach((mid) => {
          initialShares[mid] = '1';
        });
        setExactSplits(initialSplits);
        setPercentSplits(initialSplits);
        setShareSplits(initialShares);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [group, isOpen, initialData, currentUser]);

  // Recalculate automatic/equal splits preview
  const getSplitsPreview = (): ExpenseSplit[] => {
    const totalAmount = parseFloat(amountStr) || 0;
    if (totalAmount <= 0 || selectedMembers.length === 0) return [];

    if (splitType === 'equal') {
      const share = Math.round((totalAmount / selectedMembers.length) * 100) / 100;
      let sum = 0;
      const calculated = selectedMembers.map((mid, idx) => {
        // Adjust for floating point round off on the last member
        const amt = idx === selectedMembers.length - 1 ? Math.round((totalAmount - sum) * 100) / 100 : share;
        sum += amt;
        return { profile_id: mid, amount: amt };
      });
      return calculated;
    }

    if (splitType === 'exact') {
      return selectedMembers.map((mid) => ({
        profile_id: mid,
        amount: parseFloat(exactSplits[mid]) || 0,
      }));
    }

    if (splitType === 'percent') {
      return selectedMembers.map((mid) => {
        const pct = parseFloat(percentSplits[mid]) || 0;
        const amt = Math.round(((totalAmount * pct) / 100) * 100) / 100;
        return { profile_id: mid, amount: amt };
      });
    }

    if (splitType === 'shares') {
      const totalShares = selectedMembers.reduce((sum, mid) => sum + (parseFloat(shareSplits[mid]) || 0), 0);
      if (totalShares <= 0) return [];
      const costPerShare = totalAmount / totalShares;
      let sum = 0;
      return selectedMembers.map((mid, idx) => {
        const userShares = parseFloat(shareSplits[mid]) || 0;
        const amt = idx === selectedMembers.length - 1 
          ? Math.round((totalAmount - sum) * 100) / 100 
          : Math.round(costPerShare * userShares * 100) / 100;
        sum += amt;
        return { profile_id: mid, amount: amt };
      });
    }

    return [];
  };

  const handleMemberToggle = (mid: string) => {
    if (selectedMembers.includes(mid)) {
      if (selectedMembers.length > 1) {
        setSelectedMembers(selectedMembers.filter((id) => id !== mid));
      }
    } else {
      setSelectedMembers([...selectedMembers, mid]);
    }
  };

  // Receipt File Scan Handler
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanMessage('Uploading receipt image...');
    setValidationError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setScanMessage('Claude AI is scanning items, category, & total...');
        
        const result = await scanReceiptWithAI(base64, file.name);
        
        setIsScanning(false);
        if (result.success) {
          setDescription(result.description);
          setAmountStr(result.amount.toString());
          setCategory(result.category);
          setDate(result.date);
          setScannedBadge(true);
          setScanMessage('');
        } else {
          setValidationError(result.message || 'Claude failed to parse the receipt. You can still input manually.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setIsScanning(false);
      setValidationError('Error reading file. Please try again.');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const totalAmount = parseFloat(amountStr);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      setValidationError('Please enter a valid amount greater than 0');
      return;
    }

    if (selectedMembers.length === 0) {
      setValidationError('Please select at least one member to split with');
      return;
    }

    const finalSplits = getSplitsPreview();

    // Validations based on splitType
    if (splitType === 'exact') {
      const sum = finalSplits.reduce((acc, s) => acc + s.amount, 0);
      if (Math.abs(sum - totalAmount) >= 0.05) {
        setValidationError(`Sum of split amounts (RM ${sum.toFixed(2)}) must equal total amount (RM ${totalAmount.toFixed(2)})`);
        return;
      }
    } else if (splitType === 'percent') {
      const totalPct = selectedMembers.reduce((acc, mid) => acc + (parseFloat(percentSplits[mid]) || 0), 0);
      if (Math.abs(totalPct - 100) >= 0.1) {
        setValidationError(`Sum of percentages (${totalPct}%) must equal 100%`);
        return;
      }
    } else if (splitType === 'shares') {
      const totalShares = selectedMembers.reduce((acc, mid) => acc + (parseFloat(shareSplits[mid]) || 0), 0);
      if (totalShares <= 0) {
        setValidationError('Sum of shares must be greater than 0');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const id = await addExpense(
        groupId,
        description || 'General Expense',
        totalAmount,
        date,
        paidById,
        category,
        finalSplits,
        tripId
      );

      if (id) {
        // Reset form
        setDescription('');
        setAmountStr('');
        setScannedBadge(false);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setValidationError('Failed to add expense. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const splitsPreview = getSplitsPreview();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-zinc-200 dark:border-white/10 bg-background text-foreground scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Sparkles className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Add New Expense
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Log an expense manually or upload a receipt to scan with Claude AI.
          </DialogDescription>
        </DialogHeader>

        {/* AI Scanner Input */}
        <div className="mb-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-900/80">
          <div className="flex flex-col items-center justify-center text-center">
            {isScanning ? (
              <div className="flex flex-col items-center py-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 dark:text-emerald-400" />
                <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">{scanMessage}</p>
                {/* CSS scanner effect */}
                <div className="relative mt-3 h-1 w-48 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
                  <div className="absolute top-0 h-full w-24 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-shimmer" style={{ animationDuration: '1.5s', animationIterationCount: 'infinite' }} />
                </div>
              </div>
            ) : (
              <label className="flex w-full cursor-pointer flex-col items-center justify-center py-2">
                <Upload className="h-8 w-8 text-zinc-400 dark:text-zinc-500 transition hover:text-emerald-500 dark:hover:text-emerald-400" />
                <span className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Scan Receipt with Claude AI</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-500">Supports JPG, PNG, PDF receipts</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleReceiptUpload}
                  disabled={isScanning}
                />
              </label>
            )}
          </div>
        </div>

        {validationError && (
          <Alert variant="destructive" className="border-rose-200 dark:border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description & Amount */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="description" className="text-zinc-600 dark:text-zinc-300 font-medium">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Groceries, Dinner, Taxi..."
                className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount" className="text-zinc-600 dark:text-zinc-300 font-medium">Amount</Label>
              <div className="relative mt-1.5">
                <div className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-zinc-500 dark:text-zinc-400 select-none">RM</div>
                <Input
                  id="amount"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Category, Date & Paid By */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="category" className="text-zinc-600 dark:text-zinc-300 font-medium">Category</Label>
              <Select value={category} onValueChange={(val) => setCategory(val || 'general')}>
                <SelectTrigger id="category" className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date" className="text-zinc-600 dark:text-zinc-300 font-medium">Date</Label>
              <div className="relative mt-1.5">
                <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 text-foreground focus:border-emerald-500"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="paidBy" className="text-zinc-600 dark:text-zinc-300 font-medium">Paid By</Label>
              <Select value={paidById} onValueChange={(val) => setPaidById(val || '')}>
                <SelectTrigger id="paidBy" className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground">
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground">
                  {memberProfiles.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800">
                      {member.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Split Type Selector */}
          <div>
            <Label className="text-zinc-600 dark:text-zinc-300 font-medium">Split Method</Label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1 ring-1 ring-zinc-200 dark:ring-zinc-800">
              {(['equal', 'exact', 'percent', 'shares'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`rounded-md py-1.5 text-xs font-semibold capitalize transition ${
                    splitType === type
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  {type === 'equal' ? 'Equally' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Members Split Details */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
            <Label className="text-zinc-600 dark:text-zinc-300 font-medium mb-2 block">Split Shares</Label>
            
            <div className="space-y-3">
              {memberProfiles.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                
                // Get precalculated split preview value
                const calculatedPreview = splitsPreview.find((s) => s.profile_id === member.id)?.amount || 0;

                return (
                  <div key={member.id} className="flex items-center justify-between py-1 border-b border-zinc-200 dark:border-zinc-900/50 last:border-0">
                    <button
                      type="button"
                      onClick={() => handleMemberToggle(member.id)}
                      className="flex items-center gap-3 text-left focus:outline-none"
                    >
                      <div className={`flex h-4 w-4 items-center justify-center rounded border border-zinc-300 dark:border-zinc-700 transition ${
                        isSelected ? 'bg-emerald-600 border-emerald-600' : 'bg-transparent'
                      }`}>
                        {isSelected && <span className="text-[10px] text-white">âœ“</span>}
                      </div>
                      <span className={`text-sm font-medium transition ${isSelected ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {member.display_name}
                      </span>
                    </button>

                    {/* Custom Split Inputs */}
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        {splitType === 'exact' && (
                          <div className="relative w-28">
                            <div className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 select-none">RM</div>
                            <Input
                              type="number"
                              step="0.01"
                              value={exactSplits[member.id] || ''}
                              onChange={(e) => setExactSplits({ ...exactSplits, [member.id]: e.target.value })}
                              placeholder="0.00"
                              className="h-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-8 text-xs text-foreground focus:border-emerald-500"
                            />
                          </div>
                        )}
                        {splitType === 'percent' && (
                          <div className="relative w-24">
                            <Input
                              type="number"
                              value={percentSplits[member.id] || ''}
                              onChange={(e) => setPercentSplits({ ...percentSplits, [member.id]: e.target.value })}
                              placeholder="0"
                              className="h-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pr-6 text-xs text-foreground focus:border-emerald-500"
                            />
                            <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-zinc-500">%</span>
                          </div>
                        )}
                        {splitType === 'shares' && (
                          <div className="relative w-24">
                            <Input
                              type="number"
                              value={shareSplits[member.id] || ''}
                              onChange={(e) => setShareSplits({ ...shareSplits, [member.id]: e.target.value })}
                              placeholder="1"
                              className="h-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-foreground focus:border-emerald-500"
                            />
                            <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] text-zinc-500">share</span>
                          </div>
                        )}
                        
                        {/* Dynamic share amount preview */}
                        {splitType !== 'exact' && (
                          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-20 text-right">
                            RM {calculatedPreview.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="relative flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-semibold"
              disabled={isSubmitting || isScanning}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Expense'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

