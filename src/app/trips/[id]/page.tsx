'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore, ItineraryItem } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Calendar, DollarSign, Compass, Clock, CheckSquare, Trash2 } from 'lucide-react';
import ExpenseForm from '@/components/expenses/expense-form';
import Link from 'next/link';

export default function TripDetail() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;

  const { currentUser, trips, groups, expenses, profiles, updateTripItinerary, isLoading } = useStore();
  
  // States
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newActivity, setNewActivity] = useState('');

  const trip = trips.find((t) => t.id === tripId);
  const connectedGroup = trip ? groups.find((g) => g.id === trip.group_id) : undefined;

  useEffect(() => {
    if (!isLoading && !trip) {
      router.push('/trips');
    }
  }, [trip, isLoading, router]);

  if (isLoading || !currentUser || !trip) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading trip itinerary...</p>
        </div>
      </div>
    );
  }

  // Calculate budget statistics
  const tripExpenses = expenses.filter((e) => e.trip_id === tripId);
  const totalSpent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
  const percentSpent = trip.budget > 0 ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;
  const isOverBudget = totalSpent > trip.budget;

  // Add itinerary item handler
  const handleAddItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;

    const currentItinerary = trip.itinerary || [];
    // Sort itinerary by time
    const updated = [...currentItinerary, { time: newTime || 'All Day', activity: newActivity }];
    updated.sort((a, b) => a.time.localeCompare(b.time));

    await updateTripItinerary(trip.id, updated);
    setNewTime('');
    setNewActivity('');
  };

  // Delete itinerary item handler
  const handleDeleteItinerary = async (idxToDelete: number) => {
    const currentItinerary = trip.itinerary || [];
    const updated = currentItinerary.filter((_, i) => i !== idxToDelete);
    await updateTripItinerary(trip.id, updated);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link href="/trips" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Trips
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            {trip.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {trip.description || 'No description provided.'}
          </p>
        </div>

        {connectedGroup && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setExpenseFormOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 flex items-center gap-2 font-semibold shadow-md"
            >
              <Plus className="h-4 w-4" />
              Add Trip Expense
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Budget Progress Card */}
        <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 text-foreground dark:text-white col-span-1 sm:col-span-2">
          <CardHeader className="py-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Trip Budget Progress</span>
          </CardHeader>
          <CardContent className="pb-4 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Total spent:</span>
                <h3 className={`text-2xl font-black ${isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  RM {totalSpent.toFixed(2)}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Trip Budget:</span>
                <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">RM {trip.budget.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isOverBudget ? 'bg-rose-500' : 'bg-teal-500'}`}
                  style={{ width: `${percentSpent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
                <span>{percentSpent.toFixed(0)}% spent</span>
                {isOverBudget ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold uppercase">Over budget by RM {(totalSpent - trip.budget).toFixed(2)}!</span>
                ) : (
                  <span>Remaining budget: RM {(trip.budget - totalSpent).toFixed(2)}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group details card */}
        <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 text-foreground dark:text-white">
          <CardHeader className="py-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Connected Group</span>
          </CardHeader>
          <CardContent className="pb-4">
            {connectedGroup ? (
              <div className="space-y-3">
                <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{connectedGroup.name}</p>
                <div className="flex -space-x-1 overflow-hidden">
                  {connectedGroup.members.map((mid) => (
                    <Avatar key={mid} className="h-6 w-6 ring-2 ring-white dark:ring-zinc-900">
                      <AvatarImage src={profiles[mid]?.avatar_url} />
                      <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-[8px] text-zinc-600 dark:text-zinc-300">
                        {profiles[mid]?.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <Link href={`/groups/${connectedGroup.id}`} className="block">
                  <Button variant="link" className="p-0 text-emerald-600 dark:text-emerald-400 hover:text-zinc-950 dark:hover:text-white text-xs h-auto">
                    Go to group ledger
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">No splitmate group linked to this trip.</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Expenses cannot be split without a connected group.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main layout tabs */}
      <Tabs defaultValue="itinerary" className="space-y-4">
        <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-0.5 border border-zinc-200 dark:border-white/5">
          <TabsTrigger value="itinerary" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm dark:data-[state=active]:text-white text-zinc-500 dark:text-zinc-400 text-xs font-semibold rounded-md px-4 py-1.5 capitalize">
            Itinerary Schedule
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm dark:data-[state=active]:text-white text-zinc-500 dark:text-zinc-400 text-xs font-semibold rounded-md px-4 py-1.5 capitalize">
            Trip Expenses ({tripExpenses.length})
          </TabsTrigger>
        </TabsList>

        {/* Itinerary Tab */}
        <TabsContent value="itinerary" className="grid gap-6 lg:grid-cols-3 focus:outline-none">
          {/* Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Compass className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  Journey Schedule
                </CardTitle>
                <CardDescription className="text-muted-foreground">Timeline of planned logistics and sightseeing.</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {!trip.itinerary || trip.itinerary.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-sm">
                    No itinerary items added yet. Write down your travel plans on the right panel!
                  </div>
                ) : (
                  <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-4 space-y-6">
                    {trip.itinerary.map((item, idx) => (
                      <div key={idx} className="relative group">
                        {/* Timeline dot */}
                        <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border border-emerald-500 bg-white dark:bg-zinc-950" />
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 dark:bg-emerald-600/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/10 mb-1">
                              <Clock className="h-3 w-3" />
                              {item.time}
                            </span>
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-1">{item.activity}</p>
                          </div>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteItinerary(idx)}
                            className="opacity-0 group-hover:opacity-100 transition h-7 w-7 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Activity Panel */}
          <div>
            <Card className="border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/30 text-foreground dark:text-white">
              <CardHeader>
                <CardTitle className="text-base font-bold">Add Activity</CardTitle>
                <CardDescription className="text-muted-foreground">Inject plans into the trip timeline.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddItinerary} className="space-y-4">
                  <div>
                    <Label htmlFor="time" className="text-zinc-600 dark:text-zinc-300">Time (e.g. 10:00, 15:30 or Date)</Label>
                    <Input
                      id="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      placeholder="e.g., 10:00 AM or Day 1"
                      className="mt-1.5 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity" className="text-zinc-600 dark:text-zinc-300">Activity</Label>
                    <textarea
                      id="activity"
                      value={newActivity}
                      onChange={(e) => setNewActivity(e.target.value)}
                      placeholder="e.g., Gaudi architecture walking tour"
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2.5 text-sm text-foreground placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none min-h-24"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5">
                    <Plus className="h-4 w-4" />
                    Inject Plan
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trip Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4 focus:outline-none">
          {tripExpenses.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm border border-zinc-200 dark:border-zinc-900 rounded-2xl bg-zinc-50 dark:bg-zinc-900/10">
              No expenses registered for this trip yet.
            </div>
          ) : (
            <div className="space-y-3">
              {tripExpenses.map((exp) => {
                const payer = profiles[exp.paid_by_id];
                return (
                  <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/20">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">
                        {exp.category.substring(0, 3)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{exp.description}</p>
                        <p className="text-xs text-zinc-500">
                          Paid by <span className="font-semibold text-zinc-500 dark:text-zinc-400">{payer?.display_name || 'Someone'}</span> on {exp.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-foreground dark:text-white">RM {exp.amount.toFixed(2)}</p>
                      <p className="text-[9px] text-zinc-500 dark:text-zinc-500">{exp.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Trip Expense Dialog Form */}
      {expenseFormOpen && connectedGroup && (
        <ExpenseForm
          groupId={connectedGroup.id}
          tripId={trip.id}
          isOpen={expenseFormOpen}
          onClose={() => setExpenseFormOpen(false)}
        />
      )}
    </div>
  );
}
