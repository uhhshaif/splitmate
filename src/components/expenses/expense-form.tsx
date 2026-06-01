'use client';

import React, { useState, useEffect } from 'react';
import { useStore, Profile, ExpenseSplit, ExpenseItem } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Sparkles, Calendar, DollarSign, Loader2, Upload, AlertCircle, Users, ScanLine, X, Plus, Trash2, ZoomIn, ZoomOut, RotateCcw, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';



interface ExpenseFormProps {
  groupId?: string; // optional — when absent a group selector is shown
  tripId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: {
    id?: string;
    description?: string;
    amount?: number;
    paid_by_id?: string;
    category?: string;
    date?: string;
    splits?: { profile_id: string; amount: number }[];
    splitType?: 'equal' | 'exact' | 'percent' | 'shares' | 'itemized';
    items?: ExpenseItem[];
    receipt_url?: string;
    receiptUrl?: string;
  } | null;
}

const CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'transport', label: 'Transport & Fuel' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'shopping', label: 'Shopping & Groceries' },
  { value: 'housing', label: 'Rent & Housing' },
  { value: 'utilities', label: 'Bills & Utilities' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'others', label: 'Others' }
];

export default function ExpenseForm({ groupId: propGroupId, tripId, isOpen, onClose, onSuccess, initialData }: ExpenseFormProps) {
  const { groups, profiles, currentUser, addExpense, updateExpense } = useStore();

  // Internal group selection state (used when no groupId is passed in from parent)
  const [selectedGroupId, setSelectedGroupId] = useState<string>(propGroupId || '');

  // Resolve the active group
  const activeGroupId = propGroupId || selectedGroupId;
  const group = groups.find((g) => g.id === activeGroupId);

  // Form State
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('others');
  const [paidById, setPaidById] = useState(currentUser?.id || '');
  const [splitType, setSplitType] = useState<'equal' | 'exact' | 'percent' | 'shares' | 'itemized'>('equal');

  // Itemized split state
  const [itemizedItems, setItemizedItems] = useState<{ name: string; amount: number }[]>([]);
  const [itemAssignments, setItemAssignments] = useState<Record<number, string[]>>({});
  const [itemCustomAmounts, setItemCustomAmounts] = useState<Record<number, Record<string, string>>>({});
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);

  // Tax & Tip
  const [taxPct, setTaxPct] = useState('');
  const [tipPct, setTipPct] = useState('');

  // Currency conversion state
  const [expenseCurrency, setExpenseCurrency] = useState('RM');
  const { exchangeRates } = useStore();

  // Member splits state: record of profileId -> input value
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [exactSplits, setExactSplits] = useState<Record<string, string>>({});
  const [percentSplits, setPercentSplits] = useState<Record<string, string>>({});
  const [shareSplits, setShareSplits] = useState<Record<string, string>>({});

  // Form Submission State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group members list
  const memberProfiles = group
    ? group.members.map((mid) => profiles[mid]).filter(Boolean)
    : [];

  // When propGroupId changes externally (parent passes a specific group), sync internal state
  useEffect(() => {
    if (propGroupId) {
      setSelectedGroupId(propGroupId);
    }
  }, [propGroupId]);

  // When modal opens with no propGroupId, default to first group
  useEffect(() => {
    if (isOpen && !propGroupId && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [isOpen, propGroupId, groups, selectedGroupId]);

  // Reset/Initialize splits when group, open state, or initialData change
  useEffect(() => {
    if (!group) return;

    const timer = setTimeout(() => {
      if (initialData) {
        setDescription(initialData.description || '');
        setAmountStr(initialData.amount ? initialData.amount.toString() : '');
        const getNormalizedCategory = (cat: string) => {
          if (cat === 'lodging') return 'accommodation';
          if (cat === 'general') return 'others';
          return cat;
        };
        setCategory(getNormalizedCategory(initialData.category || 'others'));
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        
        const initialSplitType = (
          (initialData.items && initialData.items.length > 0) ||
          initialData.receiptUrl ||
          initialData.receipt_url ||
          initialData.splitType === 'itemized'
        ) ? 'itemized' : (initialData.splitType || 'equal');
        setSplitType(initialSplitType);

        // Resolve payer: try to match parsed payer to this group's members
        const parsedPayer = initialData.paid_by_id || currentUser?.id || '';
        const payerInGroup = group.members.includes(parsedPayer);
        setPaidById(payerInGroup ? parsedPayer : (currentUser?.id || ''));

        setReceiptUrl(initialData.receiptUrl || initialData.receipt_url || undefined);
        setZoom(1);
        setRotate(0);

        if (initialSplitType === 'itemized' && initialData.items && initialData.items.length > 0) {
          const itemsList = initialData.items.map(item => ({ name: item.name, amount: item.amount }));
          setItemizedItems(itemsList);
          
          const assigns: Record<number, string[]> = {};
          initialData.items.forEach((item, idx) => {
            assigns[idx] = item.members || [];
          });
          setItemAssignments(assigns);
          setItemCustomAmounts({});
        } else {
          setItemizedItems([]);
          setItemAssignments({});
          setItemCustomAmounts({});
        }

        const activeSplits = initialData.splits || [];
        if (activeSplits.length > 0) {
          // Filter splits to only members that belong to this group
          const validSplits = activeSplits.filter(s => group.members.includes(s.profile_id));
          const splitMemberIds = validSplits.length > 0
            ? validSplits.map((s) => s.profile_id)
            : group.members;
          setSelectedMembers(splitMemberIds);

          const newExactSplits: Record<string, string> = {};
          const newPercentSplits: Record<string, string> = {};
          const newShareSplits: Record<string, string> = {};

          group.members.forEach((mid) => {
            const foundSplit = validSplits.find((s) => s.profile_id === mid);
            newExactSplits[mid] = foundSplit ? foundSplit.amount.toString() : '';
            newPercentSplits[mid] = '';
            newShareSplits[mid] = '1';
          });

          setExactSplits(newExactSplits);
          setPercentSplits(newPercentSplits);
          setShareSplits(newShareSplits);
        } else {
          // No splits provided — default to all members equally
          resetSplitsToGroup(group.members);
        }
      } else {
        resetSplitsToGroup(group.members);
        setDescription('');
        setAmountStr('');
        setCategory('others');
        setDate(new Date().toISOString().split('T')[0]);
        setPaidById(currentUser?.id || '');
        setSplitType('equal');
        setTaxPct('');
        setTipPct('');
        setReceiptUrl(undefined);
        setZoom(1);
        setRotate(0);
        setItemizedItems([]);
        setItemAssignments({});
        setItemCustomAmounts({});
        setValidationError(null);
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, isOpen, initialData, currentUser]);



  // Default itemized state initialization when switching to itemized split method
  // Only for NEW expenses — when editing, don't create fake placeholder items
  useEffect(() => {
    if (splitType === 'itemized' && itemizedItems.length === 0 && group && !initialData?.id) {
      setItemizedItems([{ name: 'Item 1', amount: parseFloat(amountStr) || 0 }]);
      setItemAssignments({ 0: group.members });
      setItemCustomAmounts({});
    }
  }, [splitType, group, amountStr, itemizedItems.length, initialData?.id]);

  const resetSplitsToGroup = (memberIds: string[]) => {
    setSelectedMembers(memberIds);
    const initialSplits: Record<string, string> = {};
    const initialShares: Record<string, string> = {};
    memberIds.forEach((mid) => {
      initialSplits[mid] = '';
      initialShares[mid] = '1';
    });
    setExactSplits(initialSplits);
    setPercentSplits(initialSplits);
    setShareSplits(initialShares);
  };

  const getItemSplits = (item: { name: string; amount: number }, itemIdx: number) => {
    if (!group) return [];
    const assigned = itemAssignments[itemIdx] || [];
    if (assigned.length === 0) return [];

    const customRecord = itemCustomAmounts[itemIdx] || {};
    const explicitMembers = assigned.filter(
      (mid: string) => customRecord[mid] !== undefined && customRecord[mid] !== ''
    );
    const explicitTotal = explicitMembers.reduce(
      (sum: number, mid: string) => sum + (parseFloat(customRecord[mid]) || 0),
      0
    );
    
    const autoMembers = assigned.filter(
      (mid: string) => customRecord[mid] === undefined || customRecord[mid] === ''
    );
    const remainingAmount = Math.max(0, item.amount - explicitTotal);
    const autoShare = autoMembers.length > 0 ? remainingAmount / autoMembers.length : 0;

    // First round, round everything to 2 decimals
    const splits = assigned.map((mid: string) => {
      const isExplicit = customRecord[mid] !== undefined && customRecord[mid] !== '';
      const amt = isExplicit ? (parseFloat(customRecord[mid]) || 0) : autoShare;
      return { profile_id: mid, amount: Math.round(amt * 100) / 100, isAuto: !isExplicit };
    });

    // Check sum
    const splitsSum = splits.reduce((sum: number, s) => sum + s.amount, 0);
    const diff = item.amount - splitsSum;

    if (Math.abs(diff) > 0.001 && Math.abs(diff) < 0.1) {
      // Reconcile rounding error on one of the auto-split members
      const adjustTarget = splits.find(s => s.isAuto) || splits[splits.length - 1];
      if (adjustTarget) {
        adjustTarget.amount = Math.round((adjustTarget.amount + diff) * 100) / 100;
      }
    }

    return splits;
  };

  const getItemizedComputedSplits = (): ExpenseSplit[] => {
    if (!group) return [];
    
    const memberShares: Record<string, number> = {};
    group.members.forEach((mid: string) => {
      memberShares[mid] = 0;
    });

    itemizedItems.forEach((item: { name: string; amount: number }, itemIdx: number) => {
      const splits = getItemSplits(item, itemIdx);
      splits.forEach((s) => {
        if (memberShares[s.profile_id] !== undefined) {
          memberShares[s.profile_id] += s.amount;
        }
      });
    });

    // Apply tax and tip/charge
    const taxRate = (parseFloat(taxPct) || 0) / 100;
    const tipRate = (parseFloat(tipPct) || 0) / 100;

    const baseSplits = group.members.map((mid: string) => {
      const baseShare = memberShares[mid] || 0;
      const amtWithExtras = baseShare * (1 + taxRate + tipRate);
      return {
        profile_id: mid,
        amount: Math.round(amtWithExtras * 100) / 100
      };
    });

    // Reconcile rounding error relative to effectiveTotal
    const totalAmount = effectiveTotal || 0;
    const splitsSum = baseSplits.reduce((sum: number, s) => sum + s.amount, 0);
    const diff = totalAmount - splitsSum;

    if (Math.abs(diff) > 0.001 && Math.abs(diff) < 0.5) {
      const adjustTarget = baseSplits.find((s) => s.amount > 0) || baseSplits[baseSplits.length - 1];
      if (adjustTarget) {
        adjustTarget.amount = Math.round((adjustTarget.amount + diff) * 100) / 100;
      }
    }

    return baseSplits;
  };

  // Recalculate automatic/equal splits preview
  const getSplitsPreview = (): ExpenseSplit[] => {
    const totalAmount = effectiveTotal || 0;
    if (totalAmount <= 0) return [];

    if (splitType === 'itemized') {
      return getItemizedComputedSplits();
    }

    if (selectedMembers.length === 0) return [];

    if (splitType === 'equal') {
      const share = Math.round((totalAmount / selectedMembers.length) * 100) / 100;
      let sum = 0;
      const calculated = selectedMembers.map((mid, idx) => {
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



  // Compute effective total (base + tax + tip) for live preview
  const baseAmount = splitType === 'itemized'
    ? itemizedItems.reduce((sum, item) => sum + item.amount, 0)
    : parseFloat(amountStr) || 0;
  const taxMultiplierPreview = 1 + (parseFloat(taxPct) || 0) / 100;
  const tipAmountPreview = (parseFloat(tipPct) || 0) / 100 * baseAmount;
  const effectiveTotal = Math.round((baseAmount * taxMultiplierPreview + tipAmountPreview) * 100) / 100;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!activeGroupId) {
      setValidationError('Please select a group for this expense.');
      return;
    }

    const inputAmount = splitType === 'itemized' ? baseAmount : parseFloat(amountStr);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      setValidationError('Please enter a valid amount greater than 0');
      return;
    }

    if (splitType === 'itemized') {
      if (itemizedItems.length === 0) {
        setValidationError('Please add at least one item.');
        return;
      }
      for (let i = 0; i < itemizedItems.length; i++) {
        const item = itemizedItems[i];
        if (!item.name.trim()) {
          setValidationError(`Item #${i + 1} must have a name.`);
          return;
        }
        if (item.amount <= 0) {
          setValidationError(`Item "${item.name}" must have an amount greater than 0.`);
          return;
        }
        const assigned = itemAssignments[i] || [];
        if (assigned.length === 0) {
          setValidationError(`Item "${item.name}" must be split with at least 1 member.`);
          return;
        }
        // Custom amounts discrepancy validation
        const customRecord = itemCustomAmounts[i] || {};
        const explicitMembers = assigned.filter(
          (mid) => customRecord[mid] !== undefined && customRecord[mid] !== ''
        );
        if (explicitMembers.length === assigned.length) {
          const splits = getItemSplits(item, i);
          const splitsSum = splits.reduce((sum, s) => sum + s.amount, 0);
          if (Math.abs(splitsSum - item.amount) > 0.05) {
            setValidationError(`Mismatch on item "${item.name}": Share total (RM ${splitsSum.toFixed(2)}) must equal item total (RM ${item.amount.toFixed(2)})`);
            return;
          }
        }
      }
    } else {
      if (selectedMembers.length === 0) {
        setValidationError('Please select at least one member to split with');
        return;
      }
    }

    // Apply tax & tip
    const taxMultiplier = 1 + (parseFloat(taxPct) || 0) / 100;
    const tipAmount = (parseFloat(tipPct) || 0) / 100 * inputAmount;
    const inputAmountWithExtras = Math.round((inputAmount * taxMultiplier + tipAmount) * 100) / 100;

    // Convert values to RM if foreign currency is used
    const rateToMYR = exchangeRates[expenseCurrency] || 1;
    const totalAmount = expenseCurrency === 'RM' ? inputAmountWithExtras : (inputAmountWithExtras / rateToMYR);

    const baseSplits = getSplitsPreview();
    const finalSplits = baseSplits.map(s => ({
      profile_id: s.profile_id,
      amount: expenseCurrency === 'RM' ? s.amount : Math.round((s.amount / rateToMYR) * 100) / 100
    }));

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
      let id: string | null = null;
      if (initialData?.id) {
        await updateExpense(
          initialData.id,
          description || 'General Expense',
          totalAmount,
          date,
          paidById,
          category,
          finalSplits,
          initialData.receipt_url || undefined,
          splitType === 'itemized' ? itemizedItems.map((item, itemIdx) => ({
            name: item.name,
            amount: item.amount,
            members: itemAssignments[itemIdx] || []
          })) : undefined,
          splitType
        );
        id = initialData.id;
      } else {
        id = await addExpense(
          activeGroupId,
          description || 'General Expense',
          totalAmount,
          date,
          paidById,
          category,
          finalSplits,
          tripId,
          undefined,
          splitType === 'itemized' ? itemizedItems.map((item, itemIdx) => ({
            name: item.name,
            amount: item.amount,
            members: itemAssignments[itemIdx] || []
          })) : undefined,
          splitType
        );
      }

      if (id) {
        setDescription('');
        setAmountStr('');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setValidationError('Failed to add expense. Please try again.');
      }
    } catch (err: any) {
      // handle silently — error shown in UI
      setValidationError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const splitsPreview = getSplitsPreview();
  const showGroupSelector = !propGroupId && !initialData?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`w-full max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 text-foreground shadow-2xl p-6 rounded-2xl transition-all duration-200 ${
        splitType === 'itemized' ? 'sm:max-w-5xl' : 'sm:max-w-2xl'
      }`}>
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            {initialData?.id ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm">
            {initialData?.id
              ? 'Modify expense metadata, amount, or split distributions.'
              : 'Log details about a transaction and split it with group members.'}
          </DialogDescription>
        </DialogHeader>

        {showGroupSelector && (
          <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ef-group" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Log to Group</Label>
              <select
                id="ef-group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full h-11 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-foreground focus:border-emerald-500 focus:outline-none font-semibold transition-all duration-200"
              >
                <option value="">Choose a group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {initialData && !initialData.id && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 px-4 py-3">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
              AI parsed — review details below and adjust if needed before saving.
            </span>
          </div>
        )}

        {validationError && (
          <Alert variant="destructive" className="border-rose-200 dark:border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertDescription className="text-xs font-semibold">{validationError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={splitType === 'itemized' ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn' : 'space-y-5'}>
            
            {/* Left Column: Receipt image (only when splitType is itemized and receiptUrl is present) */}
            {splitType === 'itemized' && receiptUrl && (
              <div className="lg:col-span-5 lg:sticky lg:top-0 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Receipt Image</Label>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full font-bold">Zoom & Rotate Enabled</span>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950/20 aspect-[3/4] flex items-center justify-center shadow-inner">
                  <img
                    src={receiptUrl}
                    alt="Receipt"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotate}deg)`,
                      transition: 'transform 200ms ease-out'
                    }}
                    className="max-h-full max-w-full object-contain pointer-events-none select-none"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 z-10">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                      className="h-7 w-7 text-white hover:text-emerald-400 hover:bg-white/10 rounded-lg"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                      className="h-7 w-7 text-white hover:text-emerald-400 hover:bg-white/10 rounded-lg"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setRotate(prev => (prev + 90) % 360)}
                      className="h-7 w-7 text-white hover:text-emerald-400 hover:bg-white/10 rounded-lg"
                      title="Rotate"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => { setZoom(1); setRotate(0); }}
                      className="h-7 w-7 text-white hover:text-emerald-400 hover:bg-white/10 rounded-lg"
                      title="Reset"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Right Column / Main details */}
            <div className={splitType === 'itemized' ? (receiptUrl ? 'lg:col-span-7 space-y-5' : 'lg:col-span-12 space-y-5') : 'space-y-5'}>
              {/* Metadata card — matches receipt scanner layout exactly */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="ef-description" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Description</Label>
                  <Input
                    id="ef-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Groceries, Dinner, Taxi..."
                    className="h-11 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 px-4 transition-all duration-200 font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ef-date" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Receipt Date</Label>
                  <Input
                    id="ef-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 px-4 transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ef-category" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Category</Label>
                  <select
                    id="ef-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-foreground focus:border-emerald-500 focus:outline-none capitalize font-semibold transition-all duration-200"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ef-paidBy" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Paid By</Label>
                  <select
                    id="ef-paidBy"
                    value={paidById}
                    onChange={(e) => setPaidById(e.target.value)}
                    className="w-full h-11 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-foreground focus:border-emerald-500 focus:outline-none font-semibold transition-all duration-200"
                  >
                    {memberProfiles.map((member) => (
                      <option key={member.id} value={member.id}>{member.display_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount field */}
              <div className="space-y-1.5">
                <Label htmlFor="ef-amount" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                  {splitType === 'itemized' ? 'Amount (Calculated from Items)' : 'Amount'}
                </Label>
                <div className="relative">
                  <div className="absolute top-1/2 left-4 -translate-y-1/2 text-sm font-bold text-zinc-400 dark:text-zinc-500 select-none">RM</div>
                  <Input
                    id="ef-amount"
                    type="number"
                    step="0.01"
                    value={splitType === 'itemized' ? baseAmount.toFixed(2) : amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0.00"
                    readOnly={splitType === 'itemized'}
                    className={`h-11 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-11 text-sm font-bold text-foreground rounded-xl placeholder-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 w-full font-mono ${
                      splitType === 'itemized' ? 'bg-zinc-50 dark:bg-zinc-900/50 cursor-not-allowed select-none' : ''
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Tax & Tip panel */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Tax */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ef-tax" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Tax %</Label>
                    <div className="relative">
                      <input
                        id="ef-tax"
                        type="number"
                        min="0"
                        step="0.1"
                        value={taxPct}
                        onChange={(e) => setTaxPct(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-4 pr-8 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono font-bold text-sm transition-all duration-200"
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 select-none">%</span>
                    </div>
                    {baseAmount > 0 && parseFloat(taxPct) > 0 && (
                      <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tabular-nums">
                        + RM {(baseAmount * (parseFloat(taxPct) / 100)).toFixed(2)}
                      </p>
                    )}
                  </div>
                  {/* Tip */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ef-tip" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Tip %</Label>
                    <div className="relative">
                      <input
                        id="ef-tip"
                        type="number"
                        min="0"
                        step="0.5"
                        value={tipPct}
                        onChange={(e) => setTipPct(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-4 pr-8 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono font-bold text-sm transition-all duration-200"
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 select-none">%</span>
                    </div>
                    {baseAmount > 0 && parseFloat(tipPct) > 0 && (
                      <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tabular-nums">
                        + RM {tipAmountPreview.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Effective total row */}
                {baseAmount > 0 && (parseFloat(taxPct) > 0 || parseFloat(tipPct) > 0) && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/8 dark:bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 animate-fadeIn">
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total to split</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">RM {effectiveTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Split Method selector — hidden when editing an existing itemized/scanned expense */}
              {!(initialData?.id && splitType === 'itemized') && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Split Method</Label>
                  <div className="grid grid-cols-5 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 p-1 border border-zinc-200 dark:border-zinc-800 shadow-inner">
                    {(['equal', 'exact', 'percent', 'shares', 'itemized'] as const).map((type) => {
                      const isActive = splitType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSplitType(type)}
                          className={`rounded-lg py-2 text-xs font-bold capitalize transition-all duration-200 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20 scale-[1.01]'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                          }`}
                        >
                          {type === 'equal' ? 'Equally' : type === 'itemized' ? 'Itemized' : type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Split Shares or Itemized Splits */}
              {splitType === 'itemized' ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center pb-1 border-b border-zinc-200 dark:border-zinc-800">
                    <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Who spent on which items?</Label>
                    <span className="text-xs font-bold text-zinc-400 uppercase bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-full">
                      {itemizedItems.length} Scanned
                    </span>
                  </div>
                  <div className="space-y-4">
                    {itemizedItems.map((item, itemIdx) => {
                      const assigned = itemAssignments[itemIdx] || [];
                      const customRecord = itemCustomAmounts[itemIdx] || {};
                      
                      // Auto share placeholder math
                      const explicitMembers = assigned.filter((mid: string) => customRecord[mid] !== undefined && customRecord[mid] !== '');
                      const explicitTotal = explicitMembers.reduce((sum: number, mid: string) => sum + (parseFloat(customRecord[mid]) || 0), 0);
                      const remainingAmount = Math.max(0, item.amount - explicitTotal);
                      const autoMembers = assigned.filter((mid: string) => customRecord[mid] === undefined || customRecord[mid] === '');
                      const autoShare = autoMembers.length > 0 ? remainingAmount / autoMembers.length : 0;
                      
                      const itemSplits = getItemSplits(item, itemIdx);
                      const splitsSum = itemSplits.reduce((sum: number, s) => sum + s.amount, 0);
                      const isOver = Math.abs(splitsSum - item.amount) > 0.05 && explicitMembers.length === assigned.length;

                      return (
                        <div key={itemIdx} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/85 dark:border-zinc-800/90 p-5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all duration-200">
                          {/* Item Title & Amount static display */}
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-extrabold text-zinc-900 dark:text-zinc-50 text-base truncate pr-3">{item.name}</span>
                            <span className="font-extrabold font-mono text-base text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 rounded-xl">
                              RM {item.amount.toFixed(2)}
                            </span>
                          </div>

                          {/* Member Checklist Shortcuts (Select All / Clear All) */}
                          <div className="flex items-center justify-between border-t border-b border-zinc-200/50 dark:border-zinc-800/50 py-2 text-xs font-semibold">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
                              Split with ({assigned.length} {assigned.length === 1 ? 'person' : 'people'})
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setItemAssignments({
                                    ...itemAssignments,
                                    [itemIdx]: group ? [...group.members] : []
                                  });
                                }}
                                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer hover:underline animate-fadeIn"
                              >
                                Select All
                              </button>
                              <span className="text-zinc-300 dark:text-zinc-800 select-none">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setItemAssignments({
                                    ...itemAssignments,
                                    [itemIdx]: []
                                  });
                                  const nextCustoms = { ...customRecord };
                                  group?.members.forEach(mid => delete nextCustoms[mid]);
                                  setItemCustomAmounts({
                                    ...itemCustomAmounts,
                                    [itemIdx]: nextCustoms
                                  });
                                }}
                                className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer hover:underline animate-fadeIn"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          
                          {/* All members — toggle highlight */}
                          <div className="space-y-2">
                            {memberProfiles.map((member) => {
                              const isAssigned = assigned.includes(member.id);
                              const isExplicit = customRecord[member.id] !== undefined && customRecord[member.id] !== '';
                              const val = customRecord[member.id] || '';
                              const calculatedVal = isExplicit ? parseFloat(val) || 0 : autoShare;

                              return (
                                <div
                                  key={member.id}
                                  onClick={() => {
                                    if (isAssigned) {
                                      const nextAssigned = assigned.filter((id: string) => id !== member.id);
                                      setItemAssignments({ ...itemAssignments, [itemIdx]: nextAssigned });
                                      const nextCustoms = { ...customRecord };
                                      delete nextCustoms[member.id];
                                      setItemCustomAmounts({ ...itemCustomAmounts, [itemIdx]: nextCustoms });
                                    } else {
                                      setItemAssignments({ ...itemAssignments, [itemIdx]: [...assigned, member.id] });
                                    }
                                  }}
                                  className={`group flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-sm cursor-pointer select-none transition-all duration-200 ${
                                    isAssigned
                                      ? 'bg-white dark:bg-zinc-900 border-emerald-500/40 dark:border-emerald-500/30 shadow-md shadow-emerald-500/5 hover:border-rose-400/40 dark:hover:border-rose-500/30'
                                      : 'bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800/40 opacity-40 hover:opacity-60'
                                  }`}
                                >
                                  {/* Left — checkmark + name */}
                                  <div className="flex items-center gap-3">
                                    <div className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                      isAssigned
                                        ? 'bg-emerald-500 border-emerald-500 group-hover:bg-rose-500 group-hover:border-rose-500'
                                        : 'bg-transparent border-zinc-300 dark:border-zinc-700'
                                    }`}>
                                      {isAssigned && (
                                        <>
                                          {/* Checkmark — visible by default, hidden on hover */}
                                          <svg className="h-3 w-3 text-white transition-opacity duration-150 group-hover:opacity-0" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                          {/* X — hidden by default, visible on hover */}
                                          <svg className="absolute h-3 w-3 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100" viewBox="0 0 12 12" fill="none">
                                            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                          </svg>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className={`font-semibold transition-colors duration-200 ${
                                        isAssigned ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-500'
                                      }`}>
                                        {member.display_name}
                                      </span>
                                      {member.id === currentUser?.id && (
                                        <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">you</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right — amount input (only when assigned) */}
                                  {isAssigned ? (
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-xs text-zinc-400 dark:text-zinc-500 font-extrabold select-none">RM</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={val}
                                        placeholder={calculatedVal.toFixed(2)}
                                        onChange={(e) => {
                                          const nextRecord = { ...customRecord, [member.id]: e.target.value };
                                          setItemCustomAmounts({ ...itemCustomAmounts, [itemIdx]: nextRecord });
                                        }}
                                        className="w-24 h-9 border border-emerald-500/30 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono font-bold text-right text-sm transition-all duration-200"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 italic select-none">not split</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* 0 members warning */}
                          {assigned.length === 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/25 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-xs font-bold animate-fadeIn">
                              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                              <span>Select at least 1 member to split this item</span>
                            </div>
                          )}

                          {/* Discrepancy warning */}
                          {isOver && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-500/25 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold animate-fadeIn">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <span>Mismatch: Share total (RM {splitsSum.toFixed(2)}) must equal item total (RM {item.amount.toFixed(2)})</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200/85 dark:border-zinc-800/90 bg-zinc-50 dark:bg-zinc-900/50 p-5 space-y-4 shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center pb-1 border-b border-zinc-200 dark:border-zinc-800">
                    <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Who spent on this?</Label>
                    <span className="text-xs font-bold text-zinc-400 uppercase bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-full">
                      {selectedMembers.length} Selected
                    </span>
                  </div>

                  {memberProfiles.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4 font-medium italic">
                      {activeGroupId ? 'No members found in this group.' : 'Select a group above to see members.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {memberProfiles.map((member) => {
                        const isSelected = selectedMembers.includes(member.id);
                        const calculatedPreview = splitsPreview.find((s) => s.profile_id === member.id)?.amount || 0;

                        return (
                          <div
                            key={member.id}
                            onClick={() => handleMemberToggle(member.id)}
                            className={`group flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-sm cursor-pointer select-none transition-all duration-200 ${
                              isSelected
                                ? 'bg-white dark:bg-zinc-900 border-emerald-500/40 dark:border-emerald-500/30 shadow-md shadow-emerald-500/5 hover:border-rose-400/40 dark:hover:border-rose-500/30'
                                : 'bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800/40 opacity-40 hover:opacity-60'
                            }`}
                          >
                            {/* Left — toggle indicator + name */}
                            <div className="flex items-center gap-3">
                              <div className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                isSelected
                                  ? 'bg-emerald-500 border-emerald-500 group-hover:bg-rose-500 group-hover:border-rose-500'
                                  : 'bg-transparent border-zinc-300 dark:border-zinc-700'
                              }`}>
                                {isSelected && (
                                  <>
                                    {/* Checkmark — visible by default, hidden on hover */}
                                    <svg className="h-3 w-3 text-white transition-opacity duration-150 group-hover:opacity-0" viewBox="0 0 12 12" fill="none">
                                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    {/* X — hidden by default, visible on hover */}
                                    <svg className="absolute h-3 w-3 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100" viewBox="0 0 12 12" fill="none">
                                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                  </>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={`font-semibold transition-colors duration-200 ${
                                  isSelected ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-500'
                                }`}>
                                  {member.display_name}
                                </span>
                                {member.id === currentUser?.id && (
                                  <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">you</span>
                                )}
                              </div>
                            </div>

                            {/* Right — amount input / preview (only when selected) */}
                            {isSelected && (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {splitType === 'exact' && (
                                  <div className="relative w-28">
                                    <div className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-extrabold text-zinc-400 dark:text-zinc-500 select-none">RM</div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={exactSplits[member.id] || ''}
                                      onChange={(e) => setExactSplits({ ...exactSplits, [member.id]: e.target.value })}
                                      placeholder="0.00"
                                      className="w-full h-9 border border-emerald-500/30 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 pl-8 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono font-bold text-right text-sm transition-all duration-200"
                                    />
                                  </div>
                                )}
                                {splitType === 'percent' && (
                                  <div className="relative w-24">
                                    <input
                                      type="number"
                                      value={percentSplits[member.id] || ''}
                                      onChange={(e) => setPercentSplits({ ...percentSplits, [member.id]: e.target.value })}
                                      placeholder="0"
                                      className="w-full h-9 border border-emerald-500/30 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 pr-7 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono font-bold text-right text-sm transition-all duration-200"
                                    />
                                    <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-bold text-zinc-400 dark:text-zinc-500 select-none">%</span>
                                  </div>
                                )}
                                {splitType === 'shares' && (
                                  <div className="relative w-24">
                                    <input
                                      type="number"
                                      value={shareSplits[member.id] || ''}
                                      onChange={(e) => setShareSplits({ ...shareSplits, [member.id]: e.target.value })}
                                      placeholder="1"
                                      className="w-full h-9 border border-emerald-500/30 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 pr-11 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono font-bold text-right text-sm transition-all duration-200"
                                    />
                                    <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[9px] font-bold text-zinc-400 uppercase select-none">share</span>
                                  </div>
                                )}
                                {splitType !== 'exact' && (
                                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm shrink-0 tabular-nums">
                                    RM {calculatedPreview.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Dimmed placeholder when not selected */}
                            {!isSelected && (
                              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 italic">not included</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Overall Summary Row for Itemized Splits */}
              {splitType === 'itemized' && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 space-y-3 animate-fadeIn">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Split Summary (includes Tax & Tip)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {memberProfiles.map((member) => {
                      const totalShare = splitsPreview.find((s) => s.profile_id === member.id)?.amount || 0;
                      if (totalShare <= 0) return null;
                      return (
                        <div key={member.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 p-3 rounded-xl flex items-center gap-3 shadow-sm hover:border-emerald-500/20 transition-all duration-200">
                          <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {member.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate">{member.display_name}</p>
                            <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">RM {totalShare.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white rounded-xl px-4 py-2 font-semibold text-sm transition-all duration-200"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="relative flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-bold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 rounded-xl px-5 py-2.5 text-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              disabled={isSubmitting || !activeGroupId}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Saving...
                </>
              ) : (
                initialData?.id ? 'Save Changes' : 'Add Expense'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
