'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore, Expense } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Plus, Trash2, Search, Filter, Calendar, DollarSign, Sparkles, Loader2, AlertCircle, ArrowRight,
  Home, Utensils, Car, Film, Zap, Bed, Handshake, UserPlus, LogOut, Pencil, ShoppingBag, Upload, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ExpenseForm from '@/components/expenses/expense-form';
import DebtVisualizer from '@/components/settle/debt-visualizer';
import Link from 'next/link';
import { parseNaturalLanguageWithAI, scanReceiptWithAI } from '@/lib/ai';

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'food':
      return <Utensils className="h-5 w-5" />;
    case 'housing':
      return <Home className="h-5 w-5" />;
    case 'transport':
      return <Car className="h-5 w-5" />;
    case 'entertainment':
      return <Film className="h-5 w-5" />;
    case 'utilities':
      return <Zap className="h-5 w-5" />;
    case 'lodging':
    case 'accommodation':
      return <Bed className="h-5 w-5" />;
    case 'shopping':
      return <ShoppingBag className="h-5 w-5" />;
    case 'settlement':
      return <Handshake className="h-5 w-5" />;
    case 'general':
    case 'others':
    default:
      return <DollarSign className="h-5 w-5" />;
  }
};

export default function GroupDetail() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.id as string;

  const { currentUser, groups, expenses, profiles, deleteExpense, addExpense, updateExpense, leaveGroup, deleteGroup, inviteMemberToGroup, isLoading } = useStore();
  
  // Dialog Open States
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Invite states
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Reusable confirmation states
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  // NLP parsing states
  const [nlpText, setNlpText] = useState('');
  const [isParsingNLP, setIsParsingNLP] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);
  const [nlpSuccess, setNlpSuccess] = useState<string | null>(null);
  const [nlpInitialData, setNlpInitialData] = useState<any | null>(null);

  // Receipt Scanning & Splitting states
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scannedReceiptData, setScannedReceiptData] = useState<{
    title: string;
    amount: number;
    category: string;
    date: string;
    items: { name: string; amount: number }[];
  } | null>(null);
  const [receiptSplitterOpen, setReceiptSplitterOpen] = useState(false);
  const [receiptPayerId, setReceiptPayerId] = useState('');
  const [receiptItemAssignments, setReceiptItemAssignments] = useState<Record<number, string[]>>({});
  const [receiptItemCustomAmounts, setReceiptItemCustomAmounts] = useState<Record<number, Record<string, string>>>({});
  const [receiptTaxPercent, setReceiptTaxPercent] = useState('0');
  const [receiptChargePercent, setReceiptChargePercent] = useState('0');

  const group = groups.find((g) => g.id === groupId);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await inviteMemberToGroup(groupId, inviteEmail.trim());
      setInviteSuccess(`Successfully added ${inviteEmail} to the group!`);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSuccess(null);
        setInviteOpen(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setInviteError(err.message || 'Failed to invite user. Make sure they are registered.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleLeaveGroupClick = () => {
    setLeaveConfirmOpen(true);
  };

  const handleDeleteGroupClick = () => {
    setDeleteConfirmOpen(true);
  };

  const executeLeaveGroup = async () => {
    setIsExecutingAction(true);
    try {
      await leaveGroup(groupId);
      setLeaveConfirmOpen(false);
      router.push('/groups');
    } catch (err: any) {
      alert(err.message || 'Failed to leave the group. Please try again.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const executeDeleteGroup = async () => {
    setIsExecutingAction(true);
    try {
      await deleteGroup(groupId);
      setDeleteConfirmOpen(false);
      router.push('/groups');
    } catch (err: any) {
      alert(err.message || 'Failed to delete the group. Please try again.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const executeDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsExecutingAction(true);
    try {
      await deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete the expense. Please try again.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleEditExpenseClick = (exp: Expense) => {
    setNlpInitialData({
      id: exp.id,
      description: exp.description,
      amount: exp.amount,
      paid_by_id: exp.paid_by_id,
      category: exp.category,
      date: exp.date,
      splits: exp.splits,
      splitType: 'equal'
    });
    setExpenseFormOpen(true);
  };

  const handleNLPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpText.trim()) return;

    setIsParsingNLP(true);
    setNlpError(null);
    setNlpSuccess(null);
    try {
      const response = await parseNaturalLanguageWithAI(nlpText, memberProfiles, currentUser?.id || '');
      if (response.success) {
        if (!response.amount || response.amount <= 0) {
          throw new Error('AI could not parse a valid amount.');
        }
        if (!response.splits || response.splits.length === 0) {
          throw new Error('AI could not determine how to split the expense.');
        }

        const id = await addExpense(
          groupId,
          response.description || 'Quick AI Expense',
          response.amount,
          response.date,
          response.paid_by_id,
          response.category,
          response.splits
        );

        if (id) {
          setNlpSuccess(`Expense "${response.description}" (RM ${response.amount.toFixed(2)}) logged successfully!`);
          setNlpText('');
          // Clear success message after 5 seconds
          setTimeout(() => {
            setNlpSuccess(null);
          }, 5000);
        } else {
          setNlpError('Failed to save the parsed expense.');
        }
      } else {
        setNlpError(response.message || 'Failed to parse text. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setNlpError(err.message || 'An error occurred while parsing text.');
    } finally {
      setIsParsingNLP(false);
    }
  };

  const handleAIReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!group) return;

    // Reset value so selecting the same file triggers onChange again
    e.target.value = '';

    setIsScanningReceipt(true);
    setNlpError(null);
    setNlpSuccess(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Image = reader.result as string;
        const response = await scanReceiptWithAI(base64Image, file.name);
        
        if (response.success) {
          const items = response.items && response.items.length > 0 
            ? response.items 
            : [{ name: response.description || 'Total Receipt Charge', amount: response.amount }];
          
          setScannedReceiptData({
            title: response.description || 'Scanned Receipt',
            amount: response.amount || items.reduce((sum, item) => sum + item.amount, 0),
            category: response.category || 'others',
            date: response.date || new Date().toISOString().split('T')[0],
            items
          });
          
          // Default item assignments: all members in the group split all items
          const initialAssigns: Record<number, string[]> = {};
          items.forEach((_, idx) => {
            initialAssigns[idx] = [...group.members];
          });
          setReceiptItemAssignments(initialAssigns);
          setReceiptItemCustomAmounts({});
          setReceiptTaxPercent('0');
          setReceiptChargePercent('0');
          
          // Set payer to current user by default
          setReceiptPayerId(currentUser?.id || '');
          setReceiptSplitterOpen(true);
        } else {
          setNlpError(response.message || 'Failed to scan receipt image.');
        }
        setIsScanningReceipt(false);
      };
      reader.onerror = () => {
        setNlpError('Failed to read image file.');
        setIsScanningReceipt(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setNlpError(err.message || 'An error occurred during receipt scanning.');
      setIsScanningReceipt(false);
    }
  };

  const getItemSplits = (item: { name: string; amount: number }, itemIdx: number) => {
    if (!group) return [];
    const assigned = receiptItemAssignments[itemIdx] || [];
    if (assigned.length === 0) return [];

    const customRecord = receiptItemCustomAmounts[itemIdx] || {};
    const explicitMembers = assigned.filter(
      (mid) => customRecord[mid] !== undefined && customRecord[mid] !== ''
    );
    const explicitTotal = explicitMembers.reduce(
      (sum, mid) => sum + (parseFloat(customRecord[mid]) || 0),
      0
    );
    
    const autoMembers = assigned.filter(
      (mid) => customRecord[mid] === undefined || customRecord[mid] === ''
    );
    const remainingAmount = Math.max(0, item.amount - explicitTotal);
    const autoShare = autoMembers.length > 0 ? remainingAmount / autoMembers.length : 0;

    // First round, round everything to 2 decimals
    const splits = assigned.map((mid) => {
      const isExplicit = customRecord[mid] !== undefined && customRecord[mid] !== '';
      const amt = isExplicit ? (parseFloat(customRecord[mid]) || 0) : autoShare;
      return { profile_id: mid, amount: Math.round(amt * 100) / 100, isAuto: !isExplicit };
    });

    // Check sum
    const splitsSum = splits.reduce((sum, s) => sum + s.amount, 0);
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

  const getReceiptComputedSplits = () => {
    if (!scannedReceiptData || !group) return [];
    
    const memberShares: Record<string, number> = {};
    group.members.forEach(mid => {
      memberShares[mid] = 0;
    });

    scannedReceiptData.items.forEach((item, itemIdx) => {
      const splits = getItemSplits(item, itemIdx);
      splits.forEach(s => {
        if (memberShares[s.profile_id] !== undefined) {
          memberShares[s.profile_id] += s.amount;
        }
      });
    });

    // Apply tax and charge
    const taxRate = (parseFloat(receiptTaxPercent) || 0) / 100;
    const chargeRate = (parseFloat(receiptChargePercent) || 0) / 100;

    const finalSplits = group.members.map((mid) => {
      const baseShare = memberShares[mid] || 0;
      const amtWithTax = baseShare * (1 + taxRate + chargeRate);
      return {
        profile_id: mid,
        amount: Math.round(amtWithTax * 100) / 100
      };
    });

    // Reconcile overall rounding error
    const itemsTotal = scannedReceiptData.items.reduce((sum, item) => sum + item.amount, 0);
    const finalTotal = itemsTotal * (1 + taxRate + chargeRate);
    const splitsSum = finalSplits.reduce((sum, s) => sum + s.amount, 0);
    const diff = finalTotal - splitsSum;
    
    if (Math.abs(diff) > 0.01 && finalSplits.length > 0) {
      const splitToAdjust = finalSplits.find(s => s.amount > 0) || finalSplits[0];
      if (splitToAdjust) {
        splitToAdjust.amount = Math.round((splitToAdjust.amount + diff) * 100) / 100;
      }
    }

    return finalSplits;
  };

  // Redirect if not logged in or group not found (only when store has loaded)
  useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.push('/login');
      } else if (!group) {
        router.push('/groups');
      }
    }
  }, [group, currentUser, isLoading, router]);

  if (isLoading || !currentUser || !group) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading group details...</p>
        </div>
      </div>
    );
  }

  // Group Members profile mapping
  const memberProfiles = group.members.map((mid) => profiles[mid]).filter(Boolean);

  // Calculate Group Statistics
  const groupExpenses = expenses.filter((e) => e.group_id === groupId);
  const totalSpend = groupExpenses
    .filter(e => e.category !== 'settlement')
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate Balances for each member
  // Net balance = paid_by_member - owed_by_member
  const memberBalances: Record<string, { paid: number; owed: number; net: number }> = {};
  group.members.forEach((mid) => {
    memberBalances[mid] = { paid: 0, owed: 0, net: 0 };
  });

  groupExpenses.forEach((e) => {
    const isSettlement = e.category === 'settlement';
    
    // Add to payer's paid total (only if not a settlement)
    if (memberBalances[e.paid_by_id]) {
      if (!isSettlement) {
        memberBalances[e.paid_by_id].paid += e.amount;
      }
      memberBalances[e.paid_by_id].net += e.amount;
    }
    
    // Distribute splits
    e.splits.forEach((s) => {
      if (memberBalances[s.profile_id]) {
        if (!isSettlement) {
          memberBalances[s.profile_id].owed += s.amount;
        }
        memberBalances[s.profile_id].net -= s.amount;
      }
    });
  });

  // Filter expenses based on search & category
  const filteredExpenses = groupExpenses
    .filter((e) => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'food': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'housing': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'transport': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'entertainment': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
      case 'utilities': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'lodging':
      case 'accommodation':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'shopping':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'settlement': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'general':
      case 'others':
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50';
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link href="/groups" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Groups
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{group.name}</h1>
          <p className="text-sm text-zinc-400">{group.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Invite Member Trigger */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger render={<Button variant="outline" className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-1.5 font-semibold text-xs py-2 px-3 rounded-lg" />}>
              <UserPlus className="h-3.5 w-3.5" />
              Invite Member
            </DialogTrigger>
            <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                  <UserPlus className="h-4.5 w-4.5 text-emerald-500" />
                  Invite Friend to Group
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Type their registered email to add them instantly to this splitting directory.
                </DialogDescription>
              </DialogHeader>

              {inviteError && (
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-2.5 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              {inviteSuccess && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-2.5 rounded-lg">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              <form onSubmit={handleInviteMember} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteEmail" className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (inviteError) setInviteError(null);
                      if (inviteSuccess) setInviteSuccess(null);
                    }}
                    placeholder="friend@email.com"
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-foreground text-xs"
                    required
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setInviteOpen(false);
                      setInviteEmail('');
                      setInviteError(null);
                      setInviteSuccess(null);
                    }}
                    className="text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    disabled={isInviting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    disabled={isInviting || !inviteEmail.trim()}
                  >
                    {isInviting ? 'Adding...' : 'Add Member'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Expense */}
          <Button
            onClick={() => setExpenseFormOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-1.5 font-bold shadow-sm text-xs py-2 px-3 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Expense
          </Button>

          {/* Leave Group (Available to all members) */}
          <Button
            variant="outline"
            onClick={handleLeaveGroupClick}
            className="border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 flex items-center gap-1.5 font-semibold text-xs py-2 px-3 rounded-lg"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave Group
          </Button>

          {/* Delete Group (Visible to creator only) */}
          {group.created_by === currentUser.id && (
            <Button
              variant="outline"
              onClick={handleDeleteGroupClick}
              className="border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 flex items-center gap-1.5 font-semibold text-xs py-2 px-3 rounded-lg"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Group
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 text-foreground dark:text-white">
          <CardHeader className="py-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Group Spending</span>
          </CardHeader>
          <CardContent className="pb-4">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white">RM {totalSpend.toFixed(2)}</h3>
            <p className="text-[10px] text-zinc-500 mt-1">Excludes direct settlements</p>
          </CardContent>
        </Card>

        {/* User Balance within group */}
        {(() => {
          const userBalance = memberBalances[currentUser.id]?.net || 0;
          return (
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 text-foreground dark:text-white">
              <CardHeader className="py-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Your Balance in Group</span>
              </CardHeader>
              <CardContent className="pb-4">
                <h3 className={`text-2xl font-black ${userBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {userBalance >= 0 ? '+' : '-'}RM {Math.abs(userBalance).toFixed(2)}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {userBalance >= 0 ? 'You are owed in this group' : 'You owe group members'}
                </p>
              </CardContent>
            </Card>
          );
        })()}

        <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 text-foreground dark:text-white">
          <CardHeader className="py-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Members Network</span>
          </CardHeader>
          <CardContent className="pb-4 flex items-center gap-2">
            <span className="text-2xl font-black text-zinc-800 dark:text-zinc-200">{memberProfiles.length}</span>
            <div className="flex -space-x-1.5 overflow-hidden">
              {memberProfiles.slice(0, 5).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 ring-2 ring-white dark:ring-zinc-900">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-[8px] text-zinc-600 dark:text-zinc-300">
                    {member.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Natural Language Quick Log Bar */}
      <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 opacity-50 transition duration-300 group-hover:opacity-100" />
        <CardContent className="p-4 sm:p-5 relative z-10">
          <form onSubmit={handleNLPSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">AI Quick Log:</span>
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={nlpText}
                onChange={(e) => {
                  setNlpText(e.target.value);
                  if (nlpError) setNlpError(null);
                  if (nlpSuccess) setNlpSuccess(null);
                }}
                disabled={isParsingNLP || isScanningReceipt}
                placeholder='Try: "Ali paid RM45 for dinner, me and Reza split equally" or upload a receipt'
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 px-4 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            <Button
              type="submit"
              disabled={isParsingNLP || isScanningReceipt || !nlpText.trim()}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shrink-0 text-xs font-semibold flex items-center gap-1.5"
            >
              {isParsingNLP ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <ArrowRight className="h-3.5 w-3.5" />
                  Parse Text
                </>
              )}
            </Button>
          </form>

          {/* Dynamic AI Quick Suggestions Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mr-1">Suggestions:</span>
            
            {/* Scan Receipt Button */}
            <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 dark:border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold transition-all duration-200 cursor-pointer shadow-sm">
              <Upload className="h-3.5 w-3.5 shrink-0" />
              Scan Receipt
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAIReceiptUpload}
                disabled={isParsingNLP || isScanningReceipt}
              />
            </label>

            {(() => {
              const otherMembers = memberProfiles
                .filter(m => m.id !== currentUser.id)
                .map(m => m.display_name.split(' ')[0]);
              
              const roommateName = otherMembers[0] || 'Roommate';
              const thirdPersonName = otherMembers[1] || 'Jessica';

              const suggestions = [
                {
                  label: '🍕 Dinner split',
                  text: `I paid 45rm for dinner at Mamak, split equally with ${roommateName}`,
                },
                {
                  label: '🏠 Rent split',
                  text: `I paid 1800rm for housing rent, split equally with ${roommateName} and ${thirdPersonName}`,
                },
                {
                  label: '🚕 Grab ride',
                  text: `${roommateName} paid 30rm for Grab to campus, split with me`,
                },
                {
                  label: '💡 Utilities',
                  text: `I paid 120rm for Wifi, split equally with ${roommateName}`,
                }
              ];

              return suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setNlpText(sug.text);
                    if (nlpError) setNlpError(null);
                    if (nlpSuccess) setNlpSuccess(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-200 dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 bg-zinc-50 hover:bg-emerald-500/5 dark:bg-zinc-950/40 dark:hover:bg-emerald-500/5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-all duration-200"
                >
                  {sug.label}
                </button>
              ));
            })()}
          </div>
          {isScanningReceipt && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-2.5 rounded-lg mt-3 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 shrink-0" />
              <span>AI is scanning receipt details & line items...</span>
            </div>
          )}
          {nlpError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1 animate-fadeIn">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              {nlpError}
            </p>
          )}
          {nlpSuccess && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 animate-fadeIn">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {nlpSuccess}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Grid: Split Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 columns - Tabs for Expenses list vs Balances Table */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="expenses" className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-2">
              <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-0.5 border border-zinc-200 dark:border-white/5">
                <TabsTrigger value="expenses" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm dark:data-[state=active]:text-white text-zinc-500 dark:text-zinc-400 text-xs font-semibold rounded-md px-4 py-1.5 capitalize">
                  Expenses
                </TabsTrigger>
                <TabsTrigger value="balances" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm dark:data-[state=active]:text-white text-zinc-500 dark:text-zinc-400 text-xs font-semibold rounded-md px-4 py-1.5 capitalize">
                  Balances Breakdown
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4 focus:outline-none">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 pl-10 pr-4 py-2 text-sm text-foreground dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-zinc-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-3 py-2 text-sm text-foreground dark:text-zinc-300 focus:border-emerald-500 focus:outline-none capitalize"
                  >
                    <option value="all">All Categories</option>
                    <option value="food">Food</option>
                    <option value="housing">Housing</option>
                    <option value="transport">Transport</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="utilities">Utilities</option>
                    <option value="lodging">Lodging</option>
                    <option value="settlement">Settlements</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              {/* Expenses List */}
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/10">
                  No expenses match your search.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map((exp) => {
                    const payer = profiles[exp.paid_by_id];
                    const isSettlement = exp.category === 'settlement';
                    const isUserPayer = exp.paid_by_id === currentUser.id;
                    const userSplit = exp.splits.find(s => s.profile_id === currentUser.id);

                    return (
                      <div
                        key={exp.id}
                        className={`group rounded-xl border p-4 transition-all duration-200 ${
                          isSettlement 
                            ? 'border-teal-500/20 bg-teal-500/5 dark:border-teal-500/10 dark:bg-teal-950/5' 
                            : 'border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/20 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-3 truncate">
                            <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${getCategoryBadgeColor(exp.category)}`}>
                              {getCategoryIcon(exp.category)}
                            </div>
                            <div className="truncate">
                              <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{exp.description}</h4>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 mt-1">
                                <span>Paid by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{payer?.display_name || 'Someone'}</span></span>
                                <span>•</span>
                                <span>{exp.date}</span>
                                {exp.category !== 'settlement' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[10px] uppercase font-bold text-zinc-500">{exp.splits.length} split shares</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 text-right">
                            <div>
                              <p className={`text-base font-extrabold ${isSettlement ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                RM {exp.amount.toFixed(2)}
                              </p>
                              {/* Display what user owes/gets for this specific expense */}
                              {exp.category !== 'settlement' && (
                                <p className={`text-[10px] font-semibold mt-0.5 ${
                                  isUserPayer
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : userSplit
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-zinc-500'
                                }`}>
                                  {isUserPayer 
                                    ? `You lent RM ${(exp.amount - (userSplit?.amount || 0)).toFixed(2)}` 
                                    : userSplit 
                                      ? `You owe RM ${userSplit.amount.toFixed(2)}` 
                                      : 'Not involved'
                                  }
                                </p>
                              )}
                            </div>

                             {/* Edit Button (Allowed for current user or expense creator) */}
                             {(isUserPayer || exp.created_by === currentUser.id) && (
                               <Button
                                 size="icon"
                                 variant="ghost"
                                 onClick={() => handleEditExpenseClick(exp)}
                                 className="opacity-40 sm:opacity-0 hover:opacity-100 sm:group-hover:opacity-100 transition h-8 w-8 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                               >
                                 <Pencil className="h-4 w-4" />
                               </Button>
                             )}

                             {/* Delete Button (Allowed for current user or expense creator) */}
                             {(isUserPayer || exp.created_by === currentUser.id) && (
                               <Button
                                 size="icon"
                                 variant="ghost"
                                 onClick={() => setExpenseToDelete(exp.id)}
                                 className="opacity-40 sm:opacity-0 hover:opacity-100 sm:group-hover:opacity-100 transition h-8 w-8 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Balances Breakdown Tab */}
            <TabsContent value="balances" className="focus:outline-none">
              <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Group Member Ledger</CardTitle>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400">Total spent versus owes per individual.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="border-zinc-200 dark:border-zinc-800">
                    <TableHeader className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800">
                      <TableRow className="border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs">Member</TableHead>
                        <TableHead className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs text-right">Paid</TableHead>
                        <TableHead className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs text-right">Owes</TableHead>
                        <TableHead className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs text-right">Net Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberProfiles.map((member) => {
                        const bal = memberBalances[member.id] || { paid: 0, owed: 0, net: 0 };
                        return (
                          <TableRow key={member.id} className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-white/5">
                            <TableCell className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar_url} />
                                <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
                                  {member.display_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{member.display_name}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm text-zinc-500 dark:text-zinc-400">RM {bal.paid.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm text-zinc-500 dark:text-zinc-400">RM {bal.owed.toFixed(2)}</TableCell>
                            <TableCell className={`text-right text-sm font-extrabold ${bal.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {bal.net >= 0 ? '+' : '-'}RM {Math.abs(bal.net).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column - Settle Debts visualizer */}
        <div className="space-y-6">
          <DebtVisualizer groupId={groupId} />
        </div>
      </div>

      {/* Create Expense Form Modal */}
      {expenseFormOpen && (
        <ExpenseForm
          groupId={groupId}
          isOpen={expenseFormOpen}
          onClose={() => {
            setExpenseFormOpen(false);
            setNlpInitialData(null); // clear initialData on close
          }}
          initialData={nlpInitialData}
        />
      )}

      {/* AI Receipt Splitter Modal */}
      {receiptSplitterOpen && scannedReceiptData && (
        <Dialog open={receiptSplitterOpen} onOpenChange={setReceiptSplitterOpen}>
          <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 text-foreground shadow-2xl p-6 rounded-2xl scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                AI Receipt Splitter
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm">
                AI successfully scanned your receipt! Adjust item amounts individually or toggle who spent on them.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Receipt metadata edits (Modern 2x2 Grid) */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="rc-title" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Merchant Title</Label>
                  <Input
                    id="rc-title"
                    value={scannedReceiptData.title}
                    onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, title: e.target.value })}
                    className="h-11 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 px-4 transition-all duration-200 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc-date" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Receipt Date</Label>
                  <Input
                    id="rc-date"
                    type="date"
                    value={scannedReceiptData.date}
                    onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, date: e.target.value })}
                    className="h-11 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 px-4 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc-category" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Category</Label>
                  <select
                    id="rc-category"
                    value={scannedReceiptData.category}
                    onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, category: e.target.value })}
                    className="w-full h-11 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-foreground focus:border-emerald-500 focus:outline-none capitalize font-semibold transition-all duration-200"
                  >
                    <option value="food">Food & Dining</option>
                    <option value="transport">Transport & Fuel</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="shopping">Shopping & Groceries</option>
                    <option value="housing">Rent & Housing</option>
                    <option value="utilities">Bills & Utilities</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc-payer" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Paid By</Label>
                  <select
                    id="rc-payer"
                    value={receiptPayerId}
                    onChange={(e) => setReceiptPayerId(e.target.value)}
                    className="w-full h-11 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-foreground focus:border-emerald-500 focus:outline-none font-semibold transition-all duration-200"
                  >
                    {memberProfiles.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checklist items section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-1">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Who spent on which items?</Label>
                  <span className="text-xs font-bold text-zinc-400 uppercase bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-full">
                    {scannedReceiptData.items.length} Scanned
                  </span>
                </div>
                <div className="space-y-4">
                  {scannedReceiptData.items.map((item, itemIdx) => {
                    const assigned = receiptItemAssignments[itemIdx] || [];
                    const customRecord = receiptItemCustomAmounts[itemIdx] || {};
                    
                    // Auto share placeholder math
                    const explicitMembers = assigned.filter(mid => customRecord[mid] !== undefined && customRecord[mid] !== '');
                    const explicitTotal = explicitMembers.reduce((sum, mid) => sum + (parseFloat(customRecord[mid]) || 0), 0);
                    const remainingAmount = Math.max(0, item.amount - explicitTotal);
                    const autoMembers = assigned.filter(mid => customRecord[mid] === undefined || customRecord[mid] === '');
                    const autoShare = autoMembers.length > 0 ? remainingAmount / autoMembers.length : 0;
                    
                    const itemSplits = getItemSplits(item, itemIdx);
                    const splitsSum = itemSplits.reduce((sum, s) => sum + s.amount, 0);
                    const isOver = Math.abs(splitsSum - item.amount) > 0.05 && explicitMembers.length === assigned.length;

                    return (
                      <div key={itemIdx} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/85 dark:border-zinc-800/90 p-5 space-y-4 shadow-sm hover:border-emerald-500/30 transition-all duration-200">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-extrabold text-zinc-900 dark:text-zinc-50 text-base truncate pr-3">{item.name}</span>
                          <span className="font-extrabold font-mono text-base text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 rounded-xl">
                            RM {item.amount.toFixed(2)}
                          </span>
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
                                    if (assigned.length > 1) {
                                      const nextAssigned = assigned.filter(id => id !== member.id);
                                      setReceiptItemAssignments({ ...receiptItemAssignments, [itemIdx]: nextAssigned });
                                      const nextCustoms = { ...customRecord };
                                      delete nextCustoms[member.id];
                                      setReceiptItemCustomAmounts({ ...receiptItemCustomAmounts, [itemIdx]: nextCustoms });
                                    }
                                  } else {
                                    setReceiptItemAssignments({ ...receiptItemAssignments, [itemIdx]: [...assigned, member.id] });
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
                                  <span className={`font-semibold transition-colors duration-200 ${
                                    isAssigned ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-500'
                                  }`}>
                                    {member.display_name}
                                  </span>
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
                                        setReceiptItemCustomAmounts({ ...receiptItemCustomAmounts, [itemIdx]: nextRecord });
                                      }}
                                      className="w-24 h-9 border border-emerald-500/30 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-mono font-bold text-right text-sm transition-all duration-200"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-600 italic">not included</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Discrepancy warning */}
                        {isOver && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold animate-fadeIn">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>Mismatch: Share total (RM {splitsSum.toFixed(2)}) must equal item total (RM {item.amount.toFixed(2)})</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Tax and Service Charges input section */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="rc-tax" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Sales Tax / GST / SST (%)</Label>
                  <div className="relative">
                    <Input
                      id="rc-tax"
                      type="number"
                      value={receiptTaxPercent}
                      onChange={(e) => setReceiptTaxPercent(e.target.value)}
                      placeholder="0"
                      className="h-11 pr-8 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground focus:border-emerald-500 font-semibold text-right"
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-zinc-400 select-none">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rc-charge" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Service Charge / Tip (%)</Label>
                  <div className="relative">
                    <Input
                      id="rc-charge"
                      type="number"
                      value={receiptChargePercent}
                      onChange={(e) => setReceiptChargePercent(e.target.value)}
                      placeholder="0"
                      className="h-11 pr-8 text-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground focus:border-emerald-500 font-semibold text-right"
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-zinc-400 select-none">%</span>
                  </div>
                </div>
              </div>

              {/* Ledger Preview / Splits Summary (Invoice-Style) */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 space-y-3.5 shadow-sm">
                <div className="flex justify-between items-center pb-1 border-b border-zinc-150 dark:border-zinc-800">
                  <Label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Split ledger summary</Label>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Including Tax & Service Charges</span>
                </div>
                <div className="space-y-2">
                  {getReceiptComputedSplits().map((split) => {
                    const profile = profiles[split.profile_id];
                    const isPayer = split.profile_id === receiptPayerId;
                    return (
                      <div key={split.profile_id} className="flex justify-between items-center text-sm">
                        <span className="text-zinc-700 dark:text-zinc-200 font-bold">
                          {profile?.display_name || 'Unknown'} {isPayer && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded font-black uppercase tracking-wider ml-1.5">(Payer)</span>}
                        </span>
                        <span className="font-extrabold text-zinc-800 dark:text-zinc-200 font-mono text-sm">
                          RM {split.amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3.5 flex justify-between items-center font-extrabold text-sm">
                  <span className="text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Total Bill Amount</span>
                  {(() => {
                    const itemsTotal = scannedReceiptData.items.reduce((sum, item) => sum + item.amount, 0);
                    const taxRate = (parseFloat(receiptTaxPercent) || 0) / 100;
                    const chargeRate = (parseFloat(receiptChargePercent) || 0) / 100;
                    const finalTotal = itemsTotal * (1 + taxRate + chargeRate);
                    return <span className="text-lg text-emerald-600 dark:text-emerald-400 font-black font-mono">RM {finalTotal.toFixed(2)}</span>;
                  })()}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReceiptSplitterOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl px-4 py-2 font-semibold text-sm transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={(() => {
                  // Disable if any item split is over total when all members are explicitly set
                  const hasDiscrepancy = scannedReceiptData.items.some((item, itemIdx) => {
                    const assigned = receiptItemAssignments[itemIdx] || [];
                    const customRecord = receiptItemCustomAmounts[itemIdx] || {};
                    const explicitMembers = assigned.filter(mid => customRecord[mid] !== undefined && customRecord[mid] !== '');
                    if (explicitMembers.length === assigned.length) {
                      const itemSplits = getItemSplits(item, itemIdx);
                      const splitsSum = itemSplits.reduce((sum, s) => sum + s.amount, 0);
                      return Math.abs(splitsSum - item.amount) > 0.05;
                    }
                    return false;
                  });
                  return hasDiscrepancy;
                })()}
                onClick={async () => {
                  try {
                    const finalSplits = getReceiptComputedSplits();
                    const itemsTotal = scannedReceiptData.items.reduce((sum, item) => sum + item.amount, 0);
                    const taxRate = (parseFloat(receiptTaxPercent) || 0) / 100;
                    const chargeRate = (parseFloat(receiptChargePercent) || 0) / 100;
                    const totalAmount = itemsTotal * (1 + taxRate + chargeRate);
                    
                    const id = await addExpense(
                      groupId,
                      scannedReceiptData.title || 'AI Scanned Expense',
                      totalAmount,
                      scannedReceiptData.date,
                      receiptPayerId,
                      scannedReceiptData.category,
                      finalSplits
                    );

                    if (id) {
                      setNlpSuccess(`Expense "${scannedReceiptData.title}" (RM ${totalAmount.toFixed(2)}) split and logged successfully!`);
                      setReceiptSplitterOpen(false);
                      setScannedReceiptData(null);
                      setTimeout(() => setNlpSuccess(null), 5000);
                    } else {
                      setNlpError('Failed to save the splits.');
                    }
                  } catch (err: any) {
                    console.error(err);
                    setNlpError(err.message || 'Failed to save scanned receipt expense.');
                  }
                }}
                className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-semibold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 rounded-xl px-5 py-2.5 text-sm transition-all duration-200 scale-100 hover:scale-[1.01] active:scale-[0.99]"
              >
                Log Split Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 1. Leave Group Confirmation Dialog */}
      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Leave Group
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              Are you sure you want to leave <strong>{group.name}</strong>? You will no longer be able to view expenses, log transactions, or settle balances in this directory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setLeaveConfirmOpen(false)}
              className="text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              disabled={isExecutingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={executeLeaveGroup}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              disabled={isExecutingAction}
            >
              {isExecutingAction ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Leaving...
                </>
              ) : (
                'Leave Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Delete Group Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Delete Group
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              Are you sure you want to permanently delete <strong>{group.name}</strong>? This action is irreversible and will delete all group history, expenses, and settlements.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              disabled={isExecutingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={executeDeleteGroup}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              disabled={isExecutingAction}
            >
              {isExecutingAction ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Delete Expense Confirmation Dialog */}
      <Dialog open={expenseToDelete !== null} onOpenChange={(open) => { if (!open) setExpenseToDelete(null); }}>
        <DialogContent className="border-zinc-200 dark:border-white/10 bg-background text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Delete Expense
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              Are you sure you want to delete this expense? This will recalculate all member balances in this group.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setExpenseToDelete(null)}
              className="text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-950"
              disabled={isExecutingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={executeDeleteExpense}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              disabled={isExecutingAction}
            >
              {isExecutingAction ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Expense'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
