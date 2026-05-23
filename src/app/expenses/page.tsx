'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Trash2, Calendar, FileText, Sparkles, Plus } from 'lucide-react';
import ExpenseForm from '@/components/expenses/expense-form';
import Link from 'next/link';

export default function Expenses() {
  const router = useRouter();
  const { currentUser, expenses, groups, profiles, deleteExpense, isLoading } = useStore();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');

  // Expense Form Modal State
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);

  // Set default group when opening the modal
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      const timer = setTimeout(() => {
        setSelectedGroupId(groups[0].id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [groups, selectedGroupId]);

  if (isLoading || !currentUser) return null;

  const handleOpenAddExpense = () => {
    if (groups.length === 0) {
      alert('Please create a group first before logging expenses!');
      return;
    }
    setExpenseFormOpen(true);
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'food': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20';
      case 'housing': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      case 'transport': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20';
      case 'entertainment': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/20';
      case 'utilities': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20';
      case 'lodging': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'settlement': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/20';
      default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50';
    }
  };

  // Filter expenses
  const filteredExpenses = expenses
    .filter((e) => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesGroup = groupFilter === 'all' || e.group_id === groupFilter;
      return matchesSearch && matchesCategory && matchesGroup;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <FileText className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
            Global Expenses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, search, and manage all your expenditures across all split networks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {groups.length > 0 && (
            <Button
              onClick={handleOpenAddExpense}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 font-semibold shadow-md"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters Card */}
      <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white shadow-md">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Search Input */}
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">Search Merchant / Item</Label>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="search"
                  placeholder="Rent, dinners, groceries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 pl-10 text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
              <Label className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">Filter by Category</Label>
              <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'all')}>
                <SelectTrigger className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-foreground capitalize">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="lodging">Lodging</SelectItem>
                  <SelectItem value="settlement">Settlements</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group Filter */}
            <div className="space-y-1.5">
              <Label className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold">Filter by Group</Label>
              <Select value={groupFilter} onValueChange={(val) => setGroupFilter(val || 'all')}>
                <SelectTrigger className="border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-foreground">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-foreground">
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Feed */}
      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 rounded-3xl p-16 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Expenses Found</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">Use search criteria or add new bills to view global ledger.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((exp) => {
            const payer = profiles[exp.paid_by_id];
            const activeGroup = groups.find((g) => g.id === exp.group_id);
            const isUserPayer = exp.paid_by_id === currentUser.id;
            const isSettlement = exp.category === 'settlement';
            const userSplit = exp.splits.find((s) => s.profile_id === currentUser.id);

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
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{exp.description}</h4>
                        {activeGroup && (
                          <Badge variant="outline" className="border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-white/5 text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 py-0 px-1.5 rounded">
                            {activeGroup.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 mt-1">
                        <span>Paid by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{payer?.display_name || 'Someone'}</span></span>
                        <span>â€¢</span>
                        <span>{exp.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className={`text-base font-extrabold ${isSettlement ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        RM {exp.amount.toFixed(2)}
                      </p>
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

                    {(isUserPayer || exp.created_by === currentUser.id) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteExpense(exp.id)}
                        className="opacity-0 group-hover:opacity-100 transition h-8 w-8 text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10"
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

      {/* Global Add Expense Modal Dialog */}
      {expenseFormOpen && selectedGroupId && (
        <ExpenseForm
          groupId={selectedGroupId}
          isOpen={expenseFormOpen}
          onClose={() => setExpenseFormOpen(false)}
        />
      )}
    </div>
  );
}

