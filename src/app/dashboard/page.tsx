'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, Group, Expense } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Plane,
  Plus,
  TrendingUp,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Check,
  X,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const SpendingChart = dynamic(() => import('@/components/dashboard/spending-chart'), { ssr: false });

const CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'housing', label: 'Rent & Housing' },
  { value: 'transport', label: 'Transport & Fuel' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'utilities', label: 'Bills & Utilities' },
  { value: 'lodging', label: 'Hotel & Lodging' },
  { value: 'general', label: 'General / Miscellaneous' },
];

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, groups, expenses, profiles, invitations, settlements, acceptInvitation, declineInvitation, confirmSettlement, declineSettlement, isLoading } = useStore();
  const [actioningGroupId, setActioningGroupId] = useState<string | null>(null);
  const [actioningSettlementId, setActioningSettlementId] = useState<string | null>(null);

  const handleConfirmSettlement = async (settlementId: string) => {
    setActioningSettlementId(settlementId);
    try {
      await confirmSettlement(settlementId);
    } catch (err: any) {
      // handle silently
    } finally {
      setActioningSettlementId(null);
    }
  };

  const handleDeclineSettlement = async (settlementId: string) => {
    setActioningSettlementId(settlementId);
    try {
      await declineSettlement(settlementId);
    } catch (err: any) {
      // handle silently
    } finally {
      setActioningSettlementId(null);
    }
  };

  const handleAcceptInvite = async (groupId: string) => {
    setActioningGroupId(groupId);
    try {
      await acceptInvitation(groupId);
    } catch (err: any) {
      // handle silently
    } finally {
      setActioningGroupId(null);
    }
  };

  const handleDeclineInvite = async (groupId: string) => {
    setActioningGroupId(groupId);
    try {
      await declineInvitation(groupId);
    } catch (err: any) {
      // handle silently
    } finally {
      setActioningGroupId(null);
    }
  };

  // Redirect to landing if not logged in
  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const userGroups = groups.filter(g => g.members.includes(currentUser.id) || g.created_by === currentUser.id);

  // 1. Calculate overall balance stats for the current user across all groups
  let totalOwed = 0; // People owe you (positive value)
  let totalOwe = 0;  // You owe people (negative value)

  const groupBalances: Record<string, number> = {}; // group_id -> balance

  expenses.forEach((e) => {
    const isPayer = e.paid_by_id === currentUser.id;
    const userSplit = e.splits.find((s) => s.profile_id === currentUser.id);
    const splitAmount = userSplit ? userSplit.amount : 0;

    if (e.category === 'settlement') {
      // Settlement transaction
      if (isPayer) {
        // Current user paid someone back
        // Wait: Alex paid Jessica $30.
        // Paid_by_id = Alex. Split = Jessica owes Alex.
        // It means Alex's debt to Jessica is reduced.
        // In our simple credit balance:
        // Alex spent $30 on behalf of Jessica.
        // So Alex gets credit +$30, Jessica gets debt -$30.
        // This is mathematically correct.
        totalOwed += e.amount;
      }
      if (userSplit && e.paid_by_id !== currentUser.id) {
        // Someone else settled with current user.
        totalOwe += e.amount;
      }
      return;
    }

    if (isPayer) {
      // Current user paid: credit = total amount - user's own share
      const othersShare = e.amount - splitAmount;
      totalOwed += othersShare;
    } else if (userSplit) {
      // Someone else paid, user splits: user owes the split amount
      totalOwe += splitAmount;
    }
  });

  const netBalance = totalOwed - totalOwe;

  // 2. Spending by category calculation
  const categoryTotals: Record<string, number> = {};
  let totalSpending = 0;

  // Only sum expenses where current user paid or is split into
  expenses.filter(e => e.category !== 'settlement').forEach((e) => {
    const isPayer = e.paid_by_id === currentUser.id;
    const isSplitMember = e.splits.some((s) => s.profile_id === currentUser.id);

    if (isPayer || isSplitMember) {
      const userSplit = e.splits.find(s => s.profile_id === currentUser.id);
      const userShare = userSplit ? userSplit.amount : 0;
      
      const share = isPayer ? userShare + (e.amount - e.splits.reduce((acc, s) => acc + s.amount, 0)) : userShare;
      
      // Calculate how much current user contributed/is responsible for
      const actualCost = userSplit ? userSplit.amount : 0;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + actualCost;
      totalSpending += actualCost;
    }
  });

  // 3. Format recent activities (last 5 expenses)
  const userGroupIds = new Set(userGroups.map(g => g.id));
  const recentExpenses = [...expenses]
    .filter(e => userGroupIds.has(e.group_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const pendingApprovals = (settlements || []).filter(
    (s) => s.to_user === currentUser?.id && s.settled === false
  );

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'food': return 'bg-orange-500/20 text-orange-400 border-orange-500/15';
      case 'housing': return 'bg-blue-500/20 text-blue-400 border-blue-500/15';
      case 'transport': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/15';
      case 'entertainment': return 'bg-pink-500/20 text-pink-400 border-pink-500/15';
      case 'utilities': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/15';
      case 'lodging': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/15';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <title>Dashboard | Splitmate</title>
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Welcome back, {currentUser.display_name}!
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Here is your financial status across all active splitting groups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/groups">
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 text-sm font-semibold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 rounded-xl px-5 py-2.5 transition-all duration-200 scale-100 hover:scale-[1.01] active:scale-[0.99]">
              <Plus className="h-4 w-4" />
              Manage Groups
            </Button>
          </Link>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        {/* Net Balance */}
        <Card className={`relative overflow-hidden border border-zinc-200 dark:border-zinc-800/80 text-foreground dark:text-white shadow-sm border-l-4 transition-all duration-200 rounded-2xl ${
          netBalance >= 0 
            ? 'border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/10' 
            : 'border-l-rose-500 bg-rose-500/5 dark:bg-rose-950/10'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Net Balance</span>
              <div className="rounded-xl bg-zinc-100 dark:bg-white/5 p-2 border border-zinc-200 dark:border-white/10">
                <Coins className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className={`text-3xl font-black tracking-tight ${
                netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {netBalance >= 0 ? '+' : '-'}RM {Math.abs(netBalance).toFixed(2)}
              </h3>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Across all groups</p>
            </div>
          </CardContent>
        </Card>

        {/* You Are Owed */}
        <Card className="relative overflow-hidden border border-zinc-200 dark:border-zinc-800/80 border-l-4 border-l-blue-500 bg-blue-500/5 dark:bg-blue-950/10 text-foreground dark:text-white shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">You Are Owed</span>
              <div className="rounded-xl bg-blue-500/10 p-2 border border-blue-500/20">
                <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                RM {totalOwed.toFixed(2)}
              </h3>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Friends owe you this</p>
            </div>
          </CardContent>
        </Card>

        {/* You Owe */}
        <Card className="relative overflow-hidden border border-zinc-200 dark:border-zinc-800/80 border-l-4 border-l-rose-500 bg-rose-500/5 dark:bg-rose-950/10 text-foreground dark:text-white shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">You Owe</span>
              <div className="rounded-xl bg-rose-500/10 p-2 border border-rose-500/20">
                <ArrowDownLeft className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                RM {totalOwe.toFixed(2)}
              </h3>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1">You owe friends this</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Groups, Category Distribution, and Recent Activities */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Groups List */}
          <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/30 text-foreground dark:text-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                  Your Active Groups
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">Collaborative bill splitting workspaces.</CardDescription>
              </div>
              <Link href="/groups" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1">
                View All
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {userGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No active splitting groups</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Create a group to start tracking bills with roommates or friends.</p>
                  </div>
                  <Link href="/groups">
                    <Button size="sm" variant="outline" className="text-xs mt-1 font-bold rounded-xl px-4 py-2 border-zinc-200 dark:border-zinc-800">
                      Create Group
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {userGroups.slice(0, 4).map((group) => {
                    const groupExpenses = expenses.filter(e => e.group_id === group.id);
                    let userNetBalance = 0;
                    groupExpenses.forEach(e => {
                      const isPayer = e.paid_by_id === currentUser.id;
                      const userSplit = e.splits.find((s) => s.profile_id === currentUser.id);
                      const splitAmount = userSplit ? userSplit.amount : 0;
                      if (isPayer) userNetBalance += e.amount;
                      if (userSplit) userNetBalance -= splitAmount;
                    });

                    return (
                      <Link key={group.id} href={`/groups/${group.id}`}>
                        <div className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30 p-5 transition hover:border-emerald-500/20 hover:bg-white dark:hover:bg-zinc-900/60 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between h-36 duration-200">
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate text-sm">{group.name}</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 min-h-8">{group.description || 'No description.'}</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800/80 pt-3 mt-3">
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{group.members.length} members</span>
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {group.members.slice(0, 3).map((mid) => (
                                <Avatar key={mid} className="h-5 w-5 ring-1 ring-white dark:ring-zinc-950">
                                  <AvatarImage src={profiles[mid]?.avatar_url} />
                                  <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[8px] font-bold">
                                    {profiles[mid]?.display_name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/30 text-foreground dark:text-white shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                Recent Group Activities
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">Newly recorded expenditures.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm italic font-medium">No expenses added yet.</div>
              ) : (
                <div className="space-y-3.5">
                  {recentExpenses.map((exp) => {
                    const payer = profiles[exp.paid_by_id];
                    const activeGroup = groups.find((g) => g.id === exp.group_id);
                    const isSettlement = exp.category === 'settlement';

                    return (
                      <div key={exp.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-xl border flex items-center justify-center font-bold text-[10px] shrink-0 ${getCategoryColor(exp.category)}`}>
                            {exp.category.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{exp.description}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              Paid by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{payer?.display_name || 'Someone'}</span>
                              {activeGroup && <> in <span className="text-zinc-500 dark:text-zinc-400 font-bold">{activeGroup.name}</span></>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold font-mono ${isSettlement ? 'text-teal-600 dark:text-teal-400 font-black' : 'text-zinc-800 dark:text-zinc-200'}`}>
                            RM {exp.amount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider">{exp.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Group Invitations Card */}
          <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/30 text-foreground dark:text-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                  Group Invitations
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                  Respond to pending workspace invites.
                </CardDescription>
              </div>
              {invitations && invitations.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400 animate-pulse">
                  {invitations.length}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!invitations || invitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 bg-zinc-50/10 dark:bg-zinc-900/10 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500">
                    <Check className="h-4.5 w-4.5 text-zinc-400 dark:text-zinc-505" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 p-4 space-y-2 hover:border-emerald-500/15 transition duration-205"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{inv.group_name}</h4>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                          From <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{inv.invited_by_name}</span>
                        </p>
                        {inv.group_description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-450 line-clamp-2 mt-1.5 leading-relaxed">
                            {inv.group_description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-900/80">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeclineInvite(inv.group_id)}
                          disabled={actioningGroupId !== null}
                          className="flex-1 text-[11px] font-bold text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl h-8 transition-colors duration-200"
                        >
                          {actioningGroupId === inv.group_id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <X className="h-3 w-3 mr-1" />
                          )}
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvite(inv.group_id)}
                          disabled={actioningGroupId !== null}
                          className="flex-1 text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-650 rounded-xl h-8 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                        >
                          {actioningGroupId === inv.group_id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settlement Approvals Card */}
          <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/30 text-foreground dark:text-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                  Settlement Approvals
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                  Approve or decline recorded payments to you.
                </CardDescription>
              </div>
              {pendingApprovals.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400 animate-pulse">
                  {pendingApprovals.length}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-3 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-2xl border border-emerald-500/10 dark:border-emerald-500/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 animate-pulse">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-zinc-850 dark:text-zinc-200">You're all settled!</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[200px] mx-auto leading-relaxed">
                      No pending settlements require your approval.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {pendingApprovals.map((settlement) => {
                    const payer = profiles[settlement.from_user];
                    const activeGroup = groups.find((g) => g.id === settlement.group_id);
                    return (
                      <div
                        key={settlement.id}
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 p-4 space-y-2 hover:border-emerald-500/15 transition duration-205"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {payer?.display_name || 'Someone'}
                            </h4>
                            <span className="font-extrabold font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg shrink-0">
                              RM {settlement.amount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mt-1">
                            In group: <span className="text-zinc-700 dark:text-zinc-300 font-extrabold">{activeGroup?.name || 'Unknown'}</span>
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-900/80">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeclineSettlement(settlement.id)}
                            disabled={actioningSettlementId !== null}
                            className="flex-1 text-[11px] font-bold text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl h-8 transition-colors duration-200"
                          >
                            {actioningSettlementId === settlement.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConfirmSettlement(settlement.id)}
                            disabled={actioningSettlementId !== null}
                            className="flex-1 text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-650 rounded-xl h-8 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                          >
                            {actioningSettlementId === settlement.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Check className="h-3 w-3 mr-1" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Spending Progress Bars */}
          <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/30 text-foreground dark:text-white shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                Spending Breakdown
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                Your personal shares by categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpendingChart
                categoryTotals={categoryTotals}
                totalSpending={totalSpending}
              />
            </CardContent>
          </Card>

          {/* Group Balances Overview Card */}
          <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/30 text-foreground dark:text-white shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                Groups Balances
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">Your net balance in each group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {userGroups.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-zinc-500 text-xs italic font-medium">No groups found.</p>
                    <Link href="/groups?create=true" className="inline-block">
                      <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl text-[11px] h-9 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition duration-200">
                        <Plus className="h-3.5 w-3.5 mr-1 shrink-0" />
                        Create or Join a Group
                      </Button>
                    </Link>
                  </div>
                ) : (
                  userGroups.slice(0, 4).map((group) => {
                  const groupExpenses = expenses.filter(e => e.group_id === group.id);
                  let userNetBalance = 0;
                  groupExpenses.forEach(e => {
                    const isPayer = e.paid_by_id === currentUser.id;
                    const userSplit = e.splits.find(s => s.profile_id === currentUser.id);
                    const splitAmount = userSplit ? userSplit.amount : 0;
                    if (isPayer) userNetBalance += e.amount;
                    if (userSplit) userNetBalance -= splitAmount;
                  });

                  return (
                    <Link key={group.id} href={`/groups/${group.id}`} className="block">
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30 p-3.5 transition hover:border-emerald-500/15 hover:bg-white dark:hover:bg-zinc-900/60 flex justify-between items-center duration-200">
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">{group.name}</span>
                        <span className={`text-xs font-extrabold font-mono ${
                          userNetBalance > 0.005 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : userNetBalance < -0.005 
                              ? 'text-rose-600 dark:text-rose-400' 
                              : 'text-zinc-500'
                        }`}>
                          {userNetBalance > 0.005 
                            ? `+RM ${userNetBalance.toFixed(2)}` 
                            : userNetBalance < -0.005 
                              ? `-RM ${Math.abs(userNetBalance).toFixed(2)}` 
                              : 'Settled'
                          }
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

