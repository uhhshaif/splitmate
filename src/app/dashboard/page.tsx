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
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';

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
  const { currentUser, groups, expenses, profiles, trips, isLoading } = useStore();

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
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

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
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {currentUser.display_name}!
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Here is your financial status across all groups and trips.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/groups">
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4" />
              Manage Groups
            </Button>
          </Link>
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Net Balance */}
        <Card className={`relative overflow-hidden border-zinc-200 dark:border-white/10 text-foreground dark:text-white shadow-md border-l-4 transition-all duration-200 ${
          netBalance >= 0 
            ? 'border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-950/10' 
            : 'border-l-rose-500 bg-rose-500/5 dark:bg-rose-950/10'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Net Balance</span>
              <div className="rounded-lg bg-zinc-100 dark:bg-white/5 p-2 border border-zinc-200 dark:border-white/10">
                <Coins className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className={`text-3xl font-extrabold tracking-tight ${
                netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {netBalance >= 0 ? '+' : '-'}RM {Math.abs(netBalance).toFixed(2)}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Across all split networks</p>
            </div>
          </CardContent>
        </Card>

        {/* You Are Owed */}
        <Card className="relative overflow-hidden border-zinc-200 dark:border-white/10 border-l-4 border-l-blue-500 bg-blue-500/5 dark:bg-blue-950/10 text-foreground dark:text-white shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">You Are Owed</span>
              <div className="rounded-lg bg-blue-500/10 p-2 border border-blue-500/20">
                <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                RM {totalOwed.toFixed(2)}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Friends owe you this amount</p>
            </div>
          </CardContent>
        </Card>

        {/* You Owe */}
        <Card className="relative overflow-hidden border-zinc-200 dark:border-white/10 border-l-4 border-l-rose-500 bg-rose-500/5 dark:bg-rose-950/10 text-foreground dark:text-white shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">You Owe</span>
              <div className="rounded-lg bg-rose-500/10 p-2 border border-rose-500/20">
                <ArrowDownLeft className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                RM {totalOwe.toFixed(2)}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">You need to pay this back</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Groups, Category Distribution, and Recent Activities */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Groups List */}
          <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                  Your Active Groups
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">Collaborative bills splitting directories.</CardDescription>
              </div>
              <Link href="/groups" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1">
                View All
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No active splitting groups</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Create a group to start tracking bills with roommates or friends.</p>
                  </div>
                  <Link href="/groups">
                    <Button size="sm" variant="outline" className="text-xs mt-1 font-semibold">
                      Create Group
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {groups.slice(0, 4).map((group) => {
                    // Count member avatars
                    return (
                      <Link key={group.id} href={`/groups/${group.id}`}>
                        <div className="group rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/60 p-5 transition hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900/90 flex flex-col justify-between h-36">
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate">{group.name}</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">{group.description}</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/5 pt-3 mt-3">
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">{group.members.length} members</span>
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {group.members.slice(0, 3).map((mid) => (
                                <Avatar key={mid} className="h-5 w-5 ring-1 ring-white dark:ring-zinc-950">
                                  <AvatarImage src={profiles[mid]?.avatar_url} />
                                  <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[8px]">
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
          <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                Recent Group Activities
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">Newly recorded expenditures.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">No expenses added yet.</div>
              ) : (
                <div className="space-y-4">
                  {recentExpenses.map((exp) => {
                    const payer = profiles[exp.paid_by_id];
                    const activeGroup = groups.find((g) => g.id === exp.group_id);
                    const isSettlement = exp.category === 'settlement';

                    return (
                      <div key={exp.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg border flex items-center justify-center font-bold text-xs ${getCategoryColor(exp.category)}`}>
                            {exp.category.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{exp.description}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Paid by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{payer?.display_name || 'Someone'}</span>
                              {activeGroup && <> in <span className="text-zinc-500 dark:text-zinc-400">{activeGroup.name}</span></>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isSettlement ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                            RM {exp.amount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{exp.date}</p>
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
          {/* Category Spending Progress Bars */}
          <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                Spending Breakdown
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                Your personal shares by categories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {totalSpending === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">No personal spending logged.</div>
              ) : (
                Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => {
                    const percentage = (amt / totalSpending) * 100;
                    const catInfo = CATEGORIES.find((c) => c.value === cat) || { label: 'General' };

                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-zinc-700 dark:text-zinc-300 capitalize">{catInfo.label}</span>
                          <span className="text-zinc-500 dark:text-zinc-400">RM {amt.toFixed(2)} ({percentage.toFixed(0)}%)</span>
                        </div>
                        {/* Custom Progress bar */}
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>

          {/* Quick Stats & Trip Planner widget */}
          <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 text-foreground dark:text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-emerald-500 shrink-0" />
                  Active Trips
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">Your travel companions budget.</CardDescription>
              </div>
              <Link href="/trips" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1">
                View All
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {trips.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500">
                    <Plane className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No travel plans yet</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Plan a trip to track budgets and travel itineraries.</p>
                  </div>
                  <Link href="/trips">
                    <Button size="sm" variant="outline" className="text-xs font-semibold mt-1">
                      Plan a Trip
                    </Button>
                  </Link>
                </div>
              ) : (
                trips.slice(0, 2).map((trip) => {
                  // Calculate budget percentage spent
                  const tripExpenses = expenses.filter(e => e.trip_id === trip.id);
                  const totalSpent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const budgetPercentage = trip.budget > 0 ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;

                  return (
                    <Link key={trip.id} href={`/trips/${trip.id}`} className="block">
                      <div className="rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/60 p-4 transition hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-900/90 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="truncate pr-2">
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{trip.name}</h4>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{trip.start_date} to {trip.end_date}</p>
                          </div>
                          <span className="text-[10px] bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                            Trip
                          </span>
                        </div>
                        
                        {/* Budget Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                            <span>Spent: RM {totalSpent.toFixed(0)}</span>
                            <span>Budget: RM {trip.budget.toFixed(0)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${budgetPercentage > 90 ? 'bg-rose-500' : 'bg-teal-500'}`}
                              style={{ width: `${budgetPercentage}%` }}
                            />
                          </div>
                        </div>
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

