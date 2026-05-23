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
import { ArrowLeft, Plus, Trash2, Search, Filter, Calendar, DollarSign, Sparkles, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import ExpenseForm from '@/components/expenses/expense-form';
import DebtVisualizer from '@/components/settle/debt-visualizer';
import Link from 'next/link';
import { parseNaturalLanguageWithAI } from '@/lib/ai';

export default function GroupDetail() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.id as string;

  const { currentUser, groups, expenses, profiles, deleteExpense, isLoading } = useStore();
  
  // Dialog Open States
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // NLP parsing states
  const [nlpText, setNlpText] = useState('');
  const [isParsingNLP, setIsParsingNLP] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);
  const [nlpInitialData, setNlpInitialData] = useState<any | null>(null);

  const group = groups.find((g) => g.id === groupId);

  const handleNLPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpText.trim()) return;

    setIsParsingNLP(true);
    setNlpError(null);
    try {
      const response = await parseNaturalLanguageWithAI(nlpText, memberProfiles, currentUser?.id || '');
      if (response.success) {
        setNlpInitialData({
          description: response.description,
          amount: response.amount,
          paid_by_id: response.paid_by_id,
          category: response.category,
          date: response.date,
          splits: response.splits,
          splitType: 'exact'
        });
        setExpenseFormOpen(true);
        setNlpText('');
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
    
    // Add to payer's paid total
    if (memberBalances[e.paid_by_id]) {
      memberBalances[e.paid_by_id].paid += e.amount;
      memberBalances[e.paid_by_id].net += e.amount;
    }
    
    // Distribute splits
    e.splits.forEach((s) => {
      if (memberBalances[s.profile_id]) {
        memberBalances[s.profile_id].owed += s.amount;
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
      case 'lodging': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'settlement': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50';
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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setExpenseFormOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 font-semibold shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
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
                onChange={(e) => setNlpText(e.target.value)}
                disabled={isParsingNLP}
                placeholder='Try: "Ali paid RM45 for dinner, me and Reza split equally" or "Jessica paid RM80 for taxi, Marcus and Sarah split"'
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 px-4 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            <Button
              type="submit"
              disabled={isParsingNLP || !nlpText.trim()}
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
          {nlpError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              {nlpError}
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
                            <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center font-bold text-xs ${getCategoryBadgeColor(exp.category)}`}>
                              {exp.category.charAt(0).toUpperCase()}
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

                            {/* Delete Button (Allowed for current user or expense creator) */}
                            {(isUserPayer || exp.created_by === currentUser.id) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteExpense(exp.id)}
                                className="opacity-0 group-hover:opacity-100 transition h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
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
    </div>
  );
}
